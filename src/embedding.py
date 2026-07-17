import os
import pickle
import torch
import gc
import hashlib
from typing import List, Dict, Union

from sentence_transformers import SentenceTransformer

from src import config

# ====================== CONFIG ======================
CACHE_DIR = config.CACHE_DIR
os.makedirs(CACHE_DIR, exist_ok=True)

DEFAULT_BATCH_SIZE = config.EMBEDDING_BATCH_SIZE
USE_FP16 = config.USE_FP16

# ====================== CACHE ======================
def _get_cache_path(text: str):
    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    return os.path.join(CACHE_DIR, f"{text_hash}.pkl")


# ====================== BUILD EMBEDDING TEXT (TỐI ƯU) ======================
def build_embedding_text(chunk: Dict) -> str:
    """
    Xây dựng embedding_text rõ ràng, giàu thông tin để hỗ trợ tốt cho reranker và semantic search.
    """
    title = chunk.get("title", "").strip()
    author = chunk.get("author", "Unknown").strip()
    category = chunk.get("category", "").strip()
    keywords = chunk.get("keywords", []) # Lấy keywords nếu có (từ JSON)
    language = chunk.get("language", "en")
    summary = chunk.get("summary", "").strip()
    text = chunk.get("text", "").strip()

    # Giới hạn độ dài nội dung để tránh vượt context quá nhiều
    content = text[:850] if len(text) > 850 else text

    parts = [
        f"Title: {title}",
        f"Author: {author}"
    ]
    
    if summary:
        parts.append(f"Summary: {summary}")

    if category and category != "Unknown":
        parts.append(f"Category: {category}")
        
    if keywords:
        parts.append(f"Keywords: {', '.join(keywords) if isinstance(keywords, list) else keywords}")
    
    if language == "vi":
        parts.append("Language: Vietnamese")
    else:
        parts.append("Language: English")

    parts.append(f"Content: {content}")

    # Dùng newline để reranker hiểu rõ cấu trúc
    return "\n".join(parts)


# ====================== EMBEDDING MODEL ======================
class EmbeddingModel:
    def __init__(self, model_name: str = config.EMBEDDING_MODEL):
        self.device = config.DEVICE
        self.model_name = model_name

        print(f"Loading embedding model: {model_name}")
        print(f"Device: {self.device} | FP16: {USE_FP16}")

        model_kwargs = {"torch_dtype": torch.float16} if self.device == "cuda" and USE_FP16 else {}

        self.model = SentenceTransformer(
            model_name,
            device=self.device,
            model_kwargs=model_kwargs,
            trust_remote_code=True
        )
        self.model.max_seq_length = config.MAX_SEQ_LENGTH

        self.dimension = self.model.get_sentence_embedding_dimension()
        print(f"Embedding dimension: {self.dimension}")

        if self.device == "cuda":
            torch.cuda.empty_cache()

    def embed_batch(self, inputs: List[Union[str, Dict]], batch_size=DEFAULT_BATCH_SIZE):
        """Embed batch với cache và xử lý OOM"""
        results = [None] * len(inputs)
        uncached_texts = []
        uncached_indices = []

        # Chuẩn bị text
        texts = []
        for item in inputs:
            if isinstance(item, dict):
                text = item.get("embedding_text") or build_embedding_text(item)
            else:
                text = str(item)
            texts.append(text)

        # Kiểm tra cache
        for i, text in enumerate(texts):
            cache_path = _get_cache_path(text)
            if os.path.exists(cache_path):
                with open(cache_path, "rb") as f:
                    results[i] = pickle.load(f)
            else:
                uncached_texts.append(text)
                uncached_indices.append(i)

        if not uncached_texts:
            return results

        # Encode
        try:
            with torch.no_grad():
                new_embeddings = self.model.encode(
                    uncached_texts,
                    batch_size=batch_size,
                    normalize_embeddings=True,
                    convert_to_numpy=True,
                    show_progress_bar=False
                )
        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                print("⚠️ CUDA Out of Memory → Giảm batch size")
                torch.cuda.empty_cache()
                gc.collect()
                new_embeddings = self.model.encode(
                    uncached_texts,
                    batch_size=max(4, batch_size // 4),
                    normalize_embeddings=True,
                    convert_to_numpy=True,
                    show_progress_bar=False
                )
            else:
                raise e

        # Lưu vào cache
        for idx, emb in zip(uncached_indices, new_embeddings):
            results[idx] = emb
            with open(_get_cache_path(texts[idx]), "wb") as f:
                pickle.dump(emb, f)

        if self.device == "cuda":
            torch.cuda.empty_cache()

        return results

    def embed_query(self, query: str):
        """Embed query với prefix chuẩn cho BGE-M3 retrieval"""
        prefix = "Represent this sentence for searching relevant passages: "
        query_with_prefix = prefix + query

        with torch.no_grad():
            embedding = self.model.encode(
                [query_with_prefix],
                normalize_embeddings=True,
                convert_to_numpy=True
            )[0]
        return embedding


# ====================== SINGLETON ======================
_model = None

def get_embedding_model():
    global _model
    if _model is None:
        _model = EmbeddingModel()
    return _model


# ====================== TEST ======================
if __name__ == "__main__":
    model = get_embedding_model()
    
    test_chunk = {
        "title": "Alice’s Adventures in Wonderland",
        "author": "Lewis Carroll",
        "category": "Fantasy",
        "language": "en",
        "text": "Alice was beginning to get very tired of sitting by her sister on the bank..."
    }

    emb = model.embed_batch([test_chunk])[0]
    print(f"Embedding shape: {emb.shape}")

    q_emb = model.embed_query("Alice rơi vào hố thỏ gặp những gì?")
    print("Query embedding computed successfully")