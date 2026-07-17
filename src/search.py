import sys
sys.stdout.reconfigure(encoding='utf-8')

import time
import re
import gc
import torch
import math
from qdrant_client import QdrantClient
from qdrant_client import models
from sentence_transformers import CrossEncoder
from fastembed import SparseTextEmbedding

from src import config
from src.embedding import get_embedding_model

COLLECTION_NAME = config.COLLECTION_NAME

class BookSearcher:
    def __init__(self, host=config.QDRANT_HOST, port=config.QDRANT_PORT):
        print("Initializing BookSearcher (Hybrid Mode)...")
        self.device = config.DEVICE
        
        print(f"→ Loading Dense Embedding model on {self.device}...")
        self.model = get_embedding_model()
        
        print("→ Connecting to Qdrant...")
        self.client = QdrantClient(host=host, port=port, prefer_grpc=True)
        self.collection_name = COLLECTION_NAME
        
        # Các mô hình sẽ được nạp trì hoãn (Lazy Loading) để tiết kiệm RAM
        self._sparse_model = None
        self._reranker = None
        
        print("✅ Hybrid + Rerank System initialized (Standby Mode).")

    def _get_sparse_model(self):
        """Nạp mô hình BM25 khi cần thiết"""
        if self._sparse_model is None:
            print("\n[AI STEP 1/2] 🧠 Đang nạp mô hình Từ khóa (BM25)...")
            self._sparse_model = SparseTextEmbedding(model_name=config.SPARSE_MODEL)
            gc.collect() # Dọn dẹp bộ nhớ sau khi nạp
        return self._sparse_model

    def _get_reranker(self):
        """Nạp mô hình Reranker khi cần thiết"""
        if self._reranker is None:
            print(f"\n[AI STEP 2/2] 🚀 Đang nạp mô hình Reranker ({self.device})...")
            self._reranker = CrossEncoder(config.RERANKER_MODEL, device=self.device)
            gc.collect() # Dọn dẹp bộ nhớ sau khi nạp
            if self.device == "cuda":
                torch.cuda.empty_cache()
        return self._reranker


    def search(self, query: str, limit: int = 5, category_filter: str = None, language_filter: str = None, mode: str = "hybrid"):
        """
        Thực hiện tìm kiếm với các chế độ khác nhau:
        - "keyword"         : Pure BM25 (Sparse vectors only) — không rerank
        - "semantic"        : Pure Dense Embedding (Bi-Encoder only) — không rerank
        - "hybrid"          : Dense + Sparse với RRF + Reranking (mặc định, tốt nhất)
        - "hybrid_no_rerank": Dense + Sparse với RRF, không Reranking
        """
        start = time.time()
        intent = detect_intent(query)
        
        # Validate mode
        valid_modes = ["keyword", "semantic", "hybrid", "hybrid_no_rerank"]
        if mode not in valid_modes:
            mode = "hybrid"

        # 1. Sinh vector (Dense & Sparse) - chỉ lấy cái cần thiết
        query_vector = None
        sparse_vector = None
        
        if mode in ["semantic", "hybrid", "hybrid_no_rerank"]:
            query_vector = self.model.embed_query(query)
            
        if mode in ["keyword", "hybrid", "hybrid_no_rerank"]:
            sparse_model = self._get_sparse_model()
            sparse_vector = list(sparse_model.query_embed(query))[0]

        # 2. Xây dựng Filter
        must_conditions = []
        if category_filter:
            must_conditions.append(models.FieldCondition(key="category", match=models.MatchValue(value=category_filter)))
        if language_filter:
            must_conditions.append(models.FieldCondition(key="language", match=models.MatchValue(value=language_filter)))
        
        query_filter = models.Filter(must=must_conditions) if must_conditions else None

        # 3. Thực hiện Search dựa trên mode
        try:
            fetch_limit = 50
            
            if mode == "keyword":
                # Chỉ dùng BM25 (Sparse vectors)
                results = self.client.query_points(
                    collection_name=self.collection_name,
                    query=models.SparseVector(
                        indices=sparse_vector.indices.tolist(),
                        values=sparse_vector.values.tolist()
                    ),
                    using="sparse",
                    limit=fetch_limit,
                    query_filter=query_filter,
                    with_payload=True
                )
                candidates = []
                for pnt in results.points:
                    candidates.append({
                        "book_id": pnt.payload.get("book_id"),
                        "title": pnt.payload.get("title", "Unknown"),
                        "author": pnt.payload.get("author", "Unknown"),
                        "year": pnt.payload.get("year"),
                        "category": pnt.payload.get("category", "Unknown"),
                        "language": pnt.payload.get("language", "en"),
                        "summary": pnt.payload.get("summary", ""),
                        "text": pnt.payload.get("text", ""),
                        "chunk_id": str(pnt.id),
                        "rrf_score": float(pnt.score) if pnt.score else 0.0,
                        "dense_score": 0.0,
                        "sparse_score": float(pnt.score) if pnt.score else 0.0
                    })
            elif mode == "semantic":
                # Chỉ dùng Dense embedding
                results = self.client.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    using="dense",
                    limit=fetch_limit,
                    query_filter=query_filter,
                    with_payload=True
                )
                candidates = []
                for pnt in results.points:
                    candidates.append({
                        "book_id": pnt.payload.get("book_id"),
                        "title": pnt.payload.get("title", "Unknown"),
                        "author": pnt.payload.get("author", "Unknown"),
                        "year": pnt.payload.get("year"),
                        "category": pnt.payload.get("category", "Unknown"),
                        "language": pnt.payload.get("language", "en"),
                        "summary": pnt.payload.get("summary", ""),
                        "text": pnt.payload.get("text", ""),
                        "chunk_id": str(pnt.id),
                        "rrf_score": float(pnt.score) if pnt.score else 0.0,
                        "dense_score": float(pnt.score) if pnt.score else 0.0,
                        "sparse_score": 0.0
                    })
            else:
                # Hybrid: Tách riêng 2 query để lấy điểm chi tiết phục vụ Explainability (XAI)
                dense_res = self.client.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    using="dense",
                    limit=fetch_limit,
                    query_filter=query_filter,
                    with_payload=True
                )
                sparse_res = self.client.query_points(
                    collection_name=self.collection_name,
                    query=models.SparseVector(
                        indices=sparse_vector.indices.tolist(),
                        values=sparse_vector.values.tolist()
                    ),
                    using="sparse",
                    limit=fetch_limit,
                    query_filter=query_filter,
                    with_payload=True
                )
                
                # Cấu hình RRF k
                RRF_K = 60
                candidates_dict = {}
                
                # Xử lý Dense results
                for i, p in enumerate(dense_res.points):
                    candidates_dict[p.id] = {
                        "payload": p.payload, 
                        "dense_score": p.score, 
                        "dense_rank": i + 1, 
                        "sparse_score": 0.0, 
                        "sparse_rank": RRF_K
                    }
                
                # Xử lý Sparse results
                for i, p in enumerate(sparse_res.points):
                    if p.id in candidates_dict:
                        candidates_dict[p.id]["sparse_score"] = p.score
                        candidates_dict[p.id]["sparse_rank"] = i + 1
                    else:
                        candidates_dict[p.id] = {
                            "payload": p.payload, 
                            "dense_score": 0.0, 
                            "dense_rank": RRF_K, 
                            "sparse_score": p.score, 
                            "sparse_rank": i + 1
                        }
                
                candidates = []
                for cid, data in candidates_dict.items():
                    rrf = (1.0 / (RRF_K + data["dense_rank"])) + (1.0 / (RRF_K + data["sparse_rank"]))
                    candidates.append({
                        "book_id": data["payload"].get("book_id"),
                        "title": data["payload"].get("title", "Unknown"),
                        "author": data["payload"].get("author", "Unknown"),
                        "year": data["payload"].get("year"),
                        "category": data["payload"].get("category", "Unknown"),
                        "language": data["payload"].get("language", "en"),
                        "summary": data["payload"].get("summary", ""),
                        "text": data["payload"].get("text", ""),
                        "chunk_id": str(cid),
                        "rrf_score": rrf,
                        "dense_score": float(data["dense_score"]),
                        "sparse_score": float(data["sparse_score"])
                    })
                
                # Sort theo RRF và cắt top
                candidates.sort(key=lambda x: x["rrf_score"], reverse=True)
                candidates = candidates[:fetch_limit]

            # Giai đoạn 2: Reranking
            # Chỉ áp dụng cho hybrid — KHÔNG áp dụng cho semantic (Pure Dense) hay keyword (Pure BM25)
            # Điều này đảm bảo benchmark: keyword=Pure BM25, semantic=Pure Dense, hybrid=Dense+Sparse+RRF+Rerank
            if candidates and mode == "hybrid":
                reranker = self._get_reranker()
                
                # Xây dựng ngữ cảnh giàu metadata để Reranker đánh giá chính xác nhất
                rerank_pairs = []
                for doc in candidates:
                    rich_context = f"Sách: {doc.get('title')} | Tác giả: {doc.get('author')}\nTóm tắt: {doc.get('summary')}\nNội dung: {doc.get('text')}"
                    rerank_pairs.append([query, rich_context])
                
                # Tính toán điểm số tương đồng thực tế (Raw Logits)
                try:
                    if self.device == 'cuda':
                        torch.cuda.empty_cache()
                    
                    # Rerank toàn bộ candidates
                    rerank_scores = reranker.predict(rerank_pairs, batch_size=4, show_progress_bar=False)
                except Exception as e:
                    print(f"Lỗi Reranking (OOM?): {e}")
                    rerank_scores = [0.0] * len(candidates)
                
                # Gán điểm Raw 
                for i, doc in enumerate(candidates):
                    raw_score = float(rerank_scores[i])
                    doc["score"] = raw_score 

                # 5. Deduplication SAU KHI Rerank: Chọn chunk tốt nhất cho mỗi cuốn sách
                seen_titles = {}
                for doc in candidates:
                    title = doc["title"]
                    if title not in seen_titles or doc["score"] > seen_titles[title]["score"]:
                        seen_titles[title] = doc
                
                unique_docs = list(seen_titles.values())

                # Sắp xếp lại danh sách theo điểm Reranker Raw (giảm dần)
                unique_docs.sort(key=lambda x: x["score"], reverse=True)
            else:
                # Không rerank: deduplication theo score gốc của từng mode
                # - keyword / hybrid_no_rerank: dùng rrf_score (Qdrant RRF fusion score)
                # - semantic: dùng rrf_score (thực ra là cosine similarity score từ dense)
                seen_titles = {}
                for doc in candidates:
                    title = doc["title"]
                    if title not in seen_titles or doc["rrf_score"] > seen_titles[title]["rrf_score"]:
                        seen_titles[title] = doc
                
                unique_docs = list(seen_titles.values())
                
                # Sắp xếp theo score gốc (cosine score cho semantic, RRF score cho keyword/hybrid_no_rerank)
                unique_docs.sort(key=lambda x: x["rrf_score"], reverse=True)
                
                # Set score = rrf_score để các bước sau dùng thống nhất
                for doc in unique_docs:
                    doc["score"] = doc["rrf_score"]
            
            final_docs = unique_docs[:limit]

        except Exception as e:
            print(f"Lỗi truy vấn Qdrant: {e}")
            final_docs = []

        proc_time = (time.time() - start) * 1000
        
        # Xác định trạng thái dựa trên Score linh hoạt theo từng Mode
        top_score = final_docs[0]["score"] if final_docs else 0.0
        
        # --- BƯỚC CHUẨN HÓA ĐIỂM THÀNH PHẦN (Dành cho XAI Dashboard) ---
        for d in final_docs:
            # 1. Chuẩn hóa Dense Score (Cosine: 0-1) - Giữ nguyên vì đã chuẩn
            if "dense_score" in d:
                d["dense_score"] = max(0.0, min(1.0, float(d["dense_score"])))
            
            # 2. Chuẩn hóa Sparse Score (BM25: 0-vô cùng) sang 0-1 bằng hàm bão hòa
            # Công thức: score / (score + 2) -> BM25=8 sẽ xấp xỉ 0.8 (Rất đẹp)
            if "sparse_score" in d:
                raw_sparse = float(d["sparse_score"])
                d["sparse_score"] = raw_sparse / (raw_sparse + 2.0) if raw_sparse > 0 else 0.0

        # --- BƯỚC XÁC ĐỊNH STATUS VÀ CHUẨN HÓA ĐIỂM CUỐI (FINAL SCORE) ---
        if mode == "hybrid":
            # Normalize Rerank Score (Logit) sang 0-1 bằng Sigmoid để dễ hiển thị UX
            for d in final_docs:
                # Tránh lỗi overflow nếu score quá nhỏ
                s = d["score"]
                d["score"] = 1 / (1 + math.exp(-max(-20, min(20, s))))
            
            # Cập nhật lại top_score sau khi normalize
            top_score = final_docs[0]["score"] if final_docs else 0.0
            if top_score > 0.85: status = "good"
            elif top_score > 0.6: status = "low_confidence"
            else: status = "no_match"

        elif mode == "semantic":
            if top_score > 0.65: status = "good"
            elif top_score > 0.45: status = "low_confidence"
            else: status = "no_match"

        elif mode == "keyword":
            # Lưu ý: Ở mode keyword, top_score đang là BM25 chưa chuẩn hóa
            # Nhưng d["sparse_score"] đã được chuẩn hóa ở trên để hiện UI
            if top_score > 8.0: status = "good"
            elif top_score > 3.0: status = "low_confidence"
            else: status = "no_match"
            
            # Sau khi xét status xong, ta cũng chuẩn hóa luôn top_score để UI đồng bộ
            for d in final_docs:
                raw_s = d["score"]
                d["score"] = raw_s / (raw_s + 2.0) if raw_s > 0 else 0.0

        elif mode == "hybrid_no_rerank":
            if top_score > 0.03: status = "good"
            elif top_score > 0.015: status = "low_confidence"
            else: status = "no_match"
        
        else:
            # Fallback 
            if top_score > 0.5: status = "good"
            elif top_score > 0.2: status = "low_confidence"
            else: status = "no_match"

        return final_docs, proc_time, intent, status

def is_clean_chunk(text: str) -> bool:
    """Lọc các đoạn rác dựa trên từ khóa và cấu trúc văn bản (Từ cấu trúc cũ)"""
    text_lower = text.lower()
    # Chặn các từ khóa rác phổ biến
    bad_keywords = ["project gutenberg", "this ebook", "produced by", "table of contents", "mục lục", "illustration", "copyright", "trang ", "page "]
    if any(b in text_lower for b in bad_keywords):
        return False
        
    # Chặn các chunk có mật độ chữ viết hoa quá cao (thường là danh sách hoặc tiêu đề)
    if len(text) > 0:
        upper_chars = len([c for c in text if c.isupper()])
        if (upper_chars / len(text)) > 0.4:
            return False

    return len(text.split()) >= 35


def detect_intent(query: str):
    """Phân loại ý định sử dụng logic mở rộng - Tinh chỉnh độ chính xác cao"""
    q = query.lower()
    if any(k in q for k in ["tóm tắt", "nội dung", "kể tóm tắt", "summary", "nói về"]):
        return "summarize"
    # Chỉ nhận diện tìm tác giả nếu có từ khóa định danh rõ ràng
    if any(k in q for k in ["tác giả", "ai viết", "who wrote", "là ai", "ai là", "viết bởi", "author"]):
        return "author_search"
    return "general_search"


if __name__ == "__main__":
    print("=== HỆ THỐNG TÌM KIẾM HYBRID (BI-ENCODER + BM25) ===\n")
    searcher = BookSearcher()
    
    while True:
        q = input("👉 Nhập truy vấn: ").strip()
        if q.lower() in ["exit", "quit", "thoát"]:
            break
        if not q:
            continue

        print(f"🔍 Đang tìm kiếm: '{q}'...")
        result, time_ms, intent, status = searcher.search(q)

        print(f"🧠 Intent: {intent} | Thời gian: {time_ms:.1f} ms | Status: {status}")
        print("-" * 100)

        if status == "no_match":
            print("❌ Không tìm thấy kết quả phù hợp.")
            continue
            
        for i, doc in enumerate(result[:2], 1):
            print(f"{i}. ⭐ Score: {doc['score']:.4f} | {doc.get('title')} ({doc.get('author')})")
            print(f"   📖 Trích đoạn: {doc.get('text', '')[:200]}...\n")
