# Updated auth and rbac v1.2
import json
import logging
import os
import threading
import time
import uuid
import unicodedata
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException, Path, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from typing import List, Optional
from src import config
# Import Search Engine (Hybrid Mode Only)
from src.search import BookSearcher
from src.auth import get_current_user, RoleChecker, create_access_token, verify_password, load_users, User

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("SmartLibraryAPI")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Quản lý khởi tạo và giải phóng tài nguyên hệ thống"""
    logger.info("🚀 Khởi động Smart Library API (Hybrid Mode)...")
    
    try:
        app.state.searcher = BookSearcher()
        logger.info("✅ Hybrid Searcher đã sẵn sàng.")
    except Exception as e:
        logger.error(f"❌ Lỗi khởi tạo Searcher: {e}")
        app.state.searcher_error = str(e)
    
    try:
        with open(config.METADATA_OUTPUT, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        app.state.metadata_cache = {b["book_id"]: b for b in metadata}
        logger.info(f"✅ Đã cache metadata của {len(metadata)} cuốn sách.")
    except Exception as e:
        logger.error(f"❌ Lỗi khi nạp metadata: {e}")
        app.state.metadata_cache = {}

    yield
    
    if hasattr(app.state, "searcher"):
        del app.state.searcher

app = FastAPI(
    title="Smart Library Hybrid Search API v5.1",
    description="Backend API sử dụng kiến trúc tìm kiếm 2 giai đoạn (Retrieval + Reranking) tích hợp Rich Context & XAI.",
    version="5.1.0",
    lifespan=lifespan
)

# Cấu hình CORS (Chỉ cho phép các nguồn tin cậy để đảm bảo an toàn cho demo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # React Frontend (Vite)
        "http://127.0.0.1:5173",    # Local IP cho React
        "http://localhost:8501",    # Streamlit Dashboard (nếu dùng)
        "http://127.0.0.1:8501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BookResult(BaseModel):
    rank: int
    score: float
    rrf_score: float
    dense_score: Optional[float] = 0.0
    sparse_score: Optional[float] = 0.0
    
    book_id: str
    title: str
    author: str = "Unknown"
    year: Optional[int] = None
    category: str = "Unknown"
    language: str = "en"
    
    summary: str = "Chưa có tóm tắt."
    text_snippet: str = Field(..., alias="text")
    chunk_id: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    intent: str
    status: str
    processing_time_ms: float
    total_results: int
    results: List[BookResult]

class BookDetail(BaseModel):
    book_id: str
    title: str
    author: str
    year: Optional[int]
    category: str
    language: str
    summary: str
    total_chunks: int
    file_name: str

class BookTestResult(BaseModel):
    query: str
    type: str
    success: bool
    rank: int
    score: float
    text_evidence: Optional[str] = None

class BookEvaluationResponse(BaseModel):
    book_id: str
    results: List[BookTestResult]
    average_score: float

class BookContentResponse(BaseModel):
    book_id: str
    page: int
    total_pages: int
    content: List[str]

class FilterOptions(BaseModel):
    categories: List[str]
    languages: List[str]

class LibraryResponse(BaseModel):
    total: int
    page: int
    limit: int
    books: List[BookDetail]

def normalize_text_for_match(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = normalized.replace("đ", "d").replace("Đ", "D")
    return " ".join(normalized.lower().strip().split())

HISTORY_FILE = config.HISTORY_FILE
_history_lock = threading.Lock()

class SearchHistoryItem(BaseModel):
    id: str
    query: str
    timestamp: float
    intent: str
    status: str
    results_count: int
    processing_time_ms: float

def save_search_history(query: str, intent: str, status: str, results_count: int, duration_ms: float):
    with _history_lock:
        try:
            if not os.path.exists(HISTORY_FILE):
                history = []
            else:
                with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                    history = json.load(f)
            
            new_item = {
                "id": str(uuid.uuid4()),
                "query": query,
                "timestamp": time.time(),
                "intent": intent,
                "status": status,
                "results_count": results_count,
                "processing_time_ms": duration_ms
            }
            
            # Keep only the last 100 items
            history = [new_item] + history[:99]
            
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving search history: {e}")

def infer_category_from_query(query: str, categories: List[str]) -> Optional[str]:
    q_norm = normalize_text_for_match(query)
    category_keywords = ["the loai", "loai sach", "genre", "books in", "sách thuộc thể loại"]
    if not any(k in q_norm for k in category_keywords): return None

    normalized_pairs = [(c, normalize_text_for_match(c)) for c in categories if isinstance(c, str)]
    matched = [p for p in normalized_pairs if p[1] and p[1] in q_norm]
    if not matched: return None
    matched.sort(key=lambda p: len(p[1]), reverse=True)
    return matched[0][0]

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/auth/login", tags=["Xác thực"])
async def login_swagger(form_data: OAuth2PasswordRequestForm = Depends()):
    users = load_users()
    user_db = users.get(form_data.username)
    if not user_db or not verify_password(form_data.password, user_db["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Tài khoản hoặc mật khẩu không chính xác"
        )
    access_token = create_access_token(
        data={"sub": form_data.username, "role": user_db["role"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": form_data.username,
            "role": user_db["role"]
        }
    }

@app.post("/auth/login-json", tags=["Xác thực"])
async def login_json(request: LoginRequest):
    users = load_users()
    user_db = users.get(request.username)
    if not user_db or not verify_password(request.password, user_db["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Tài khoản hoặc mật khẩu không chính xác"
        )
    access_token = create_access_token(
        data={"sub": request.username, "role": user_db["role"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": request.username,
            "role": user_db["role"]
        }
    }

@app.get("/", tags=["Thông tin"])
async def root():
    return {"status": "online", "api_name": "Smart Library Hybrid API", "version": "5.1.0"}

@app.get("/search", response_model=SearchResponse, tags=["Tìm kiếm"])
async def search_books(
    q: str = Query(..., min_length=2, description="Nội dung tìm kiếm"),
    limit: int = Query(5, ge=1, le=50, description="Số lượng kết quả"),
    category: Optional[str] = Query(None, description="Lọc theo thể loại"),
    language: Optional[str] = Query(None, description="Lọc theo ngôn ngữ (en/vi)"),
    mode: str = Query("hybrid", description="Chế độ tìm kiếm: keyword, semantic, hybrid, hybrid_no_rerank"),
    current_user: User = Depends(RoleChecker(["reader", "admin"]))
):
    start_time = time.time()
    if not hasattr(app.state, "searcher"):
        raise HTTPException(status_code=503, detail="Hệ thống đang khởi động...")
    
    try:
        available_categories = sorted({b.get("category", "Unknown").strip() for b in app.state.metadata_cache.values() if b.get("category")})
        effective_category = category or infer_category_from_query(q, available_categories)

        # Thực hiện tìm kiếm với chế độ được chỉ định
        results, _, intent, status = app.state.searcher.search(
            query=q, 
            limit=limit, 
            category_filter=effective_category, 
            language_filter=language,
            mode=mode
        )

        formatted_results = []

        for i, r in enumerate(results, 1):
            # Cải thiện text snippet
            raw_text = r.get("text", "")
            snippet = raw_text[:500]
            last_period = max(snippet.rfind('.'), snippet.rfind('!'), snippet.rfind('?'))
            if last_period > 100:
                snippet = snippet[:last_period + 1]

            title_val = r.get("title", "N/A")
            # Cải tiến: Lấy trực tiếp book_id từ kết quả của searcher
            b_id = r.get("book_id")
            if not b_id:
                # Fallback duyệt trong cache nếu book_id bị thiếu
                for k, v in app.state.metadata_cache.items():
                    if v.get("title") == title_val:
                        b_id = k
                        break
            
            formatted_results.append(
                BookResult(
                    rank=i,
                    score=round(float(r.get("score", 0)), 4),
                    rrf_score=round(float(r.get("rrf_score", 0)), 4),
                    dense_score=round(float(r.get("dense_score", 0)), 4),
                    sparse_score=round(float(r.get("sparse_score", 0)), 4),
                    book_id=b_id,
                    title=title_val,
                    author=r.get("author", "Unknown"),
                    year=r.get("year"),
                    category=r.get("category", "Unknown"),
                    language=r.get("language", "en"),
                    summary=r.get("summary") or "Chưa có tóm tắt.",
                    text=snippet,
                    chunk_id=r.get("chunk_id")
                )
            )

        duration = (time.time() - start_time) * 1000
        top_score = formatted_results[0].score if formatted_results else 0.0
        top_rrf = formatted_results[0].rrf_score if formatted_results else 0.0
        
        save_search_history(q, intent, status, len(formatted_results), duration)

        logger.info(f"REQ | q='{q}' | intent={intent} | status={status} | Top1_Score={top_score} | Top1_RRF={top_rrf} | {duration:.1f}ms")

        return SearchResponse(
            query=q,
            intent=intent,
            status=status,
            processing_time_ms=round(duration, 2),
            total_results=len(formatted_results),
            results=formatted_results
        )

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/books", response_model=LibraryResponse, tags=["Dữ liệu"])
async def get_books(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    current_user: User = Depends(RoleChecker(["reader", "admin"]))
):
    """Trả về danh sách sách có phân trang và lọc"""
    all_books = list(app.state.metadata_cache.values())
    
    # Lọc (Optional nhưng tốt cho UX)
    if category:
        all_books = [b for b in all_books if b.get("category") == category]
    if language:
        all_books = [b for b in all_books if b.get("language") == language]
    if q:
        q_norm = normalize_text_for_match(q)
        all_books = [
            b for b in all_books 
            if q_norm in normalize_text_for_match(b.get("title", "")) or
               q_norm in normalize_text_for_match(b.get("author", "")) or
               q_norm in normalize_text_for_match(b.get("category", ""))
        ]
        
    total = len(all_books)
    start = (page - 1) * limit
    end = start + limit
    
    return LibraryResponse(
        total=total,
        page=page,
        limit=limit,
        books=all_books[start:end]
    )

@app.get("/book/{book_id}", response_model=BookDetail, tags=["Dữ liệu"])
async def get_book_detail(book_id: str, current_user: User = Depends(RoleChecker(["reader", "admin"]))):
    book = app.state.metadata_cache.get(book_id)
    if not book: raise HTTPException(status_code=404, detail="Not found")
    return book

@app.get("/book/{book_id}/content", response_model=BookContentResponse, tags=["Dữ liệu"])
async def get_book_content(
    book_id: str, 
    page: int = Query(1, ge=1), 
    page_size: int = Query(50, ge=10, le=200),
    current_user: User = Depends(RoleChecker(["reader", "admin"]))
):
    book = app.state.metadata_cache.get(book_id)
    if not book: raise HTTPException(status_code=404, detail="Sách không tồn tại")
    
    file_path = os.path.join(config.DATA_DIR, "books", book["file_name"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy file nội dung sách")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
            
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        total_pages = max(1, (len(paragraphs) + page_size - 1) // page_size)
        
        # Cho phép trả về rỗng nếu page vượt quá, không nên throw 404 để frontend xử lý end of book dễ hơn
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return BookContentResponse(
            book_id=book_id,
            page=page,
            total_pages=total_pages,
            content=paragraphs[start_idx:end_idx] if start_idx < len(paragraphs) else []
        )
    except Exception as e:
        logger.error(f"Lỗi đọc nội dung sách: {e}")
        raise HTTPException(status_code=500, detail="Lỗi nội bộ khi đọc nội dung sách")

@app.get("/filters", response_model=FilterOptions, tags=["Dữ liệu"])
async def get_filter_options(current_user: User = Depends(RoleChecker(["reader", "admin"]))):
    metadata = app.state.metadata_cache.values()
    categories = sorted({b.get("category", "Unknown").strip() for b in metadata if b.get("category")})
    languages = sorted({b.get("language", "en").strip() for b in metadata if b.get("language")})
    return FilterOptions(categories=categories, languages=languages)

@app.get("/history", response_model=List[SearchHistoryItem], tags=["Lịch sử"])
async def get_search_history(current_user: User = Depends(RoleChecker(["admin"]))):
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading history: {e}")
        return []

@app.delete("/history", tags=["Lịch sử"])
async def clear_search_history(current_user: User = Depends(RoleChecker(["admin"]))):
    try:
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)
        return {"message": "Đã xóa lịch sử tìm kiếm"}
    except Exception as e:
        logger.error(f"Error clearing history: {e}")
        raise HTTPException(status_code=500, detail="Không thể xóa lịch sử")

@app.post("/evaluate/book/{book_id}", response_model=BookEvaluationResponse, tags=["Kiểm định"])
async def evaluate_book(book_id: str, current_user: User = Depends(RoleChecker(["admin"]))):
    """Tự động kiểm định khả năng truy xuất của AI đối với một cuốn sách cụ thể"""
    if not hasattr(app.state, "searcher"):
        raise HTTPException(status_code=503, detail="Hệ thống đang khởi động...")
        
    book = app.state.metadata_cache.get(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Sách không tồn tại trong cache")
    
    # 1. Tự động sinh câu hỏi kiểm thử từ CHÍNH NỘI DUNG SÁCH (Ground Truth)
    import random
    file_path = os.path.join(config.DATA_DIR, "books", book["file_name"])
    test_cases = []
    
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
        # Lấy các đoạn văn có độ dài vừa phải để làm test case
        paragraphs = [p.strip() for p in text.split("\n\n") if 150 < len(p.strip()) < 500]
        
        if len(paragraphs) >= 3:
            selected_paras = random.sample(paragraphs, 3)
            test_cases = [
                {"query": f"Tìm đoạn văn có nội dung: {selected_paras[0]}", "type": "Trích xuất 1"},
                {"query": f"Tìm đoạn văn có ý nghĩa: {selected_paras[1]}", "type": "Trích xuất 2"},
                {"query": f"Phân tích đoạn: {selected_paras[2]}", "type": "Ngữ nghĩa"}
            ]
            
    # Fallback nếu không đọc được file hoặc ít đoạn văn
    if not test_cases:
        summary_text = book.get('summary', book.get('title', ''))
        len_s = len(summary_text)
        part1 = summary_text[:200] if len_s > 200 else summary_text
        part2 = summary_text[len_s//3 : len_s//3 + 200] if len_s > 250 else book['title']
        part3 = summary_text[-200:] if len_s > 200 else summary_text
        
        test_cases = [
            {"query": f"Tìm tài liệu đề cập đến nội dung: {part1}", "type": "Chủ đề chính"},
            {"query": f"Sách thể loại {book.get('category', 'tổng hợp')} nói về: {part2}", "type": "Đặc trưng"},
            {"query": f"Phân tích ngữ nghĩa chuyên sâu: {part3}", "type": "Ngữ nghĩa"}
        ]
    
    evaluation_results = []
    total_score = 0.0
    
    for test in test_cases:
        # Thực hiện tìm kiếm thực tế qua engine
        docs, _, _, _ = app.state.searcher.search(test["query"], limit=5)
        
        found_rank = -1
        found_score = 0.0
        found_text = ""
        
        for i, d in enumerate(docs):
            if d["book_id"] == book_id:
                found_rank = i + 1
                found_score = d["score"]
                found_text = d.get("text", "")
                break
        
        evaluation_results.append(BookTestResult(
            query=test["query"],
            type=test["type"],
            success=(found_rank == 1),
            rank=found_rank if found_rank != -1 else 0,
            score=round(found_score, 4),
            text_evidence=found_text
        ))
        total_score += found_score
    
    return BookEvaluationResponse(
        book_id=book_id,
        results=evaluation_results,
        average_score=round(total_score / len(test_cases), 4)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api:app", host="0.0.0.0", port=8000, reload=True)