# 📚 Smart Library – Hệ Thống Tìm Kiếm Ngữ Nghĩa

![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-blue.svg?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-00a393.svg?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61dafb.svg?style=for-the-badge&logo=react)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-ff5252.svg?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-gray.svg?style=for-the-badge)

> **Khóa luận tốt nghiệp / Đồ án nghiên cứu**  
> **Đề tài:** Xây dựng hệ thống tìm kiếm ngữ nghĩa dựa trên Embedding và cơ sở dữ liệu vector Qdrant.  
> **Tác giả:** Đoàn Lê Anh Nguyên
> **Phiên bản:** 5.1 (Advanced Hybrid Search + React SPA)

---

## 📑 Mục Lục

1. [Tổng quan](#1-tổng-quan)
2. [Tính năng](#2-tính-năng)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Pipeline tìm kiếm](#4-pipeline-tìm-kiếm)
5. [Các chế độ tìm kiếm](#5-các-chế-độ-tìm-kiếm)
6. [Công nghệ sử dụng](#6-công-nghệ-sử-dụng)
7. [Cấu trúc dự án](#7-cấu-trúc-dự-án)
8. [Hướng dẫn cài đặt](#8-hướng-dẫn-cài-đặt)
9. [API Documentation](#9-api-documentation)
10. [Ví dụ tìm kiếm](#10-ví-dụ-tìm-kiếm)
11. [Đánh giá & Benchmark](#11-đánh-giá--benchmark)
12. [Giao diện Frontend](#12-giao-diện-frontend)
13. [Hiệu năng & Hạn chế](#13-hiệu-năng--hạn-chế)
14. [Hướng phát triển](#14-hướng-phát-triển)
15. [Giá trị nghiên cứu](#15-giá-trị-nghiên-cứu)

---

## 1. Tổng quan

**Smart Library Semantic Search** là hệ thống tìm kiếm thông tin (Information Retrieval) tiên tiến dành cho thư viện số, được xây dựng theo kiến trúc **Two-Stage Hybrid Retrieval**.

**Vấn đề:** Các hệ thống Keyword Search truyền thống (TF-IDF, BM25) chỉ khớp từ khóa chính xác (exact match). Chúng thất bại khi người dùng dùng từ đồng nghĩa, mô tả ý định hoặc đặt câu hỏi tự nhiên thay vì nhớ tên sách.

**Giải pháp:** Hệ thống triển khai **Hybrid Search** kết hợp Sparse Retrieval (BM25) và Dense Retrieval (BGE-M3), sau đó sử dụng **Cross-Encoder Reranker** để xếp hạng lại kết quả – khắc phục triệt để điểm yếu của từng phương pháp đơn lẻ.

---

## 2. Tính năng

| Tính năng | Mô tả |
|---|---|
| 🧠 **Semantic Search** | Hiểu ý định người dùng qua Dense Vector Embedding (BGE-M3 1024 chiều) |
| ⚡ **BM25 Keyword Search** | Tìm kiếm từ khóa chính xác qua Sparse Vector |
| 🔗 **Hybrid Search (RRF)** | Hợp nhất BM25 + Dense bằng Reciprocal Rank Fusion |
| 🎯 **Cross-Encoder Reranking** | Đánh giá lại Top-K ứng viên với ngữ cảnh đầy đủ |
| 🏷️ **Metadata Filtering** | Lọc theo Thể loại và Ngôn ngữ |
| 💡 **XAI – Explainability** | Hiển thị điểm thành phần (Dense, Sparse, RRF) minh bạch |
| 📊 **Evaluation Dashboard** | Đánh giá hệ thống thời gian thực với biểu đồ Radar, Line, Bar |
| 🕰️ **Search History** | Lưu trữ và quản lý lịch sử tìm kiếm (Admin) |
| 📖 **Book Reader** | Đọc sách trực tuyến theo trang ngay trong ứng dụng |
| 🔐 **Xác thực JWT** | Phân quyền Admin / Reader qua Bearer Token |
| 🌐 **RESTful API** | FastAPI với Swagger UI tự động |

---

## 3. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                   React SPA Frontend                     │
│   Search · Comparison · Library · Evaluation · XAI      │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP REST (JWT Auth)
┌───────────────────▼─────────────────────────────────────┐
│                  FastAPI Backend (src/api.py)            │
│         Auth · Search · Books · History · Evaluate       │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│              BookSearcher Engine (src/search.py)         │
│                                                          │
│  Query ──► Intent Detection                              │
│        ──► BGE-M3 (Dense Vector 1024D)                   │
│        ──► BM25 FastEmbed (Sparse Vector)                │
│        ──► Qdrant Vector DB (Parallel Query)             │
│        ──► RRF Fusion (Top-50 Dense + Top-50 Sparse)     │
│        ──► Cross-Encoder Reranker (BGE-Reranker-Base)    │
│        ──► Deduplication & Final Ranking                 │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│              Qdrant Vector Database                      │
│        Dense Collection + Sparse Collection              │
└─────────────────────────────────────────────────────────┘
```

**Data Pipeline (One-time ingestion):**
```
Raw Books (.txt) ──► Preprocess & Chunking ──► AutoCategorizer (TF-IDF + Gemini AI)
                 ──► Build Embedding Text ──► BGE-M3 Embed ──► Ingest to Qdrant
```

---

## 4. Pipeline tìm kiếm

Mỗi truy vấn được xử lý theo 8 bước chính:

1. **Intent Detection** – Nhận diện ý định: tìm tác giả, tóm tắt, hay tìm kiếm tổng quát.
2. **Embedding Generation** – Tạo song song Dense Vector (BGE-M3) và Sparse Vector (BM25).
3. **Parallel Vector Search** – Truy vấn đồng thời Qdrant với cả 2 vector, áp dụng metadata filter nếu có.
4. **Dense & Sparse Retrieval** – Lấy Top-50 kết quả tốt nhất từ mỗi phương pháp.
5. **RRF Fusion** – Gộp danh sách bằng `score = Σ 1/(k + rank_i)` (k=60).
6. **Cross-Encoder Reranking** *(chỉ chế độ hybrid)* – BGE-Reranker-Base tính điểm Attention chéo (Query × Context) → Raw Logit Scores.
7. **Deduplication** – Giữ lại chunk điểm cao nhất cho mỗi cuốn sách, loại bỏ trùng lặp.
8. **Final Ranking & XAI** – Chuẩn hóa điểm, trả về JSON kèm thông tin điểm thành phần.

---

## 5. Các chế độ tìm kiếm

| Chế độ | Cơ chế | Ưu điểm | Nhược điểm | Use Case |
|---|---|---|---|---|
| `keyword` | BM25 Sparse Vector | Nhanh, chính xác với tên riêng | Không hiểu từ đồng nghĩa | Tìm đúng tên sách, tác giả |
| `semantic` | Dense BGE-M3 | Hiểu ý nghĩa, tìm theo mô tả | Đôi khi "ảo giác" với khái niệm chung | Tìm theo cảm xúc, nội dung |
| `hybrid_no_rerank` | BM25 + Dense → RRF | Cân bằng, tốc độ cao | Chưa tối ưu thứ hạng | API public cần low latency |
| `hybrid` | RRF + Cross-Encoder | **Tốt nhất**, chính xác cao | Tốn tài nguyên, latency cao hơn | Tra cứu học thuật, thư viện |

---

## 6. Công nghệ sử dụng

| Layer | Công nghệ | Vai trò |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Framer Motion | SPA, routing, animation |
| **Backend** | FastAPI, Pydantic v2, Uvicorn | REST API, validation, auth JWT |
| **Vector DB** | Qdrant (local) | Lưu trữ và truy xuất Dense & Sparse vectors |
| **Bi-Encoder** | `BAAI/bge-m3` (1024D), `Qdrant/bm25` | Tạo vector ngữ nghĩa đa ngôn ngữ |
| **Reranker** | `BAAI/bge-reranker-base` | Cross-Encoder đánh giá sự tương đồng thực tế |
| **NLP** | `underthesea` (Vietnamese), `sentence-transformers` | Tách câu, embedding |
| **Metadata AI** | Google Gemini Flash | Tự động tạo summary, keywords, category |
| **Data Analysis** | Scikit-learn, Pandas, Matplotlib | TF-IDF phân loại, đánh giá benchmark |

---

## 7. Cấu trúc dự án

```
Semantic_Search/
├── 📂 src/                          # Backend Source Code
│   ├── api.py                       # FastAPI endpoints (Search, Books, Auth, History)
│   ├── search.py                    # Lõi Hybrid Search Engine (BookSearcher)
│   ├── embedding.py                 # EmbeddingModel + build_embedding_text()
│   ├── preprocess.py                # Chunking pipeline (Incremental Update)
│   ├── ingest_books.py              # Nạp dữ liệu vào Qdrant
│   ├── auto_category.py             # AutoCategorizer (TF-IDF + Gemini AI)
│   ├── auth.py                      # JWT Authentication
│   ├── rag.py                       # RAG pipeline (Retrieval-Augmented Generation)
│   ├── sync_metadata.py             # Đồng bộ metadata từ Gemini AI
│   ├── streamlit_dashboard.py       # Dashboard Streamlit (phụ trợ)
│   ├── download_books_en.py         # Tải sách tiếng Anh (Project Gutenberg)
│   ├── download_books_vi.py         # Tải sách tiếng Việt
│   └── config.py                    # Cấu hình toàn cục (hyperparameters)
│
├── 📂 frontend/                     # React SPA Frontend
│   └── src/
│       ├── pages/
│       │   ├── Search.tsx           # Trang tìm kiếm chính
│       │   ├── Comparison.tsx       # So sánh 3 chế độ song song
│       │   ├── Library.tsx          # Thư viện sách (Grid + Pagination)
│       │   ├── BookDetail.tsx       # Chi tiết sách
│       │   ├── BookReader.tsx       # Đọc sách theo trang
│       │   ├── Evaluation.tsx       # Dashboard đánh giá benchmark
│       │   ├── XAI.tsx              # Explainability Analysis
│       │   └── Login.tsx            # Đăng nhập
│       └── components/
│           ├── ResultCard.tsx       # Thẻ kết quả tìm kiếm
│           ├── SearchBar.tsx        # Thanh tìm kiếm + mode switcher
│           ├── RetrievalExplanation.tsx  # XAI panel giải thích kết quả
│           ├── MetricsChart.tsx     # Biểu đồ Radar / Line / Bar
│           ├── AIValidationLab.tsx  # Lab kiểm định AI
│           ├── SearchComparison.tsx # Component so sánh 3 cột
│           └── FilterPanel.tsx      # Bộ lọc category & language
│
├── 📂 data/                         # Dữ liệu
│   ├── books/                       # Kho sách gốc (53 cuốn .txt, EN + VI)
│   ├── chunks/all_chunks.json       # Dữ liệu sau chunking (~8000+ chunks)
│   ├── books_metadata.json          # Metadata AI-generated (53 cuốn)
│   ├── ground_truth.json            # Bộ dữ liệu QA chuẩn
│   ├── search_history.json          # Lịch sử tìm kiếm
│   └── users.json                   # Tài khoản người dùng
│
├── 📂 evaluation/                   # Công cụ Benchmark
│   ├── evaluate_comparison.py       # Script chạy benchmark 4 chế độ
│   ├── run_project_test_suite.py    # Test suite tổng hợp
│   ├── qa_ground_truth.json         # Bộ câu hỏi ground truth (35 câu)
│   ├── qa_semantic_vs_keyword.json  # Bộ câu hỏi nâng cao (50 câu)
│   ├── curated_question_sets.md     # Câu hỏi phân loại theo chiến lược (15 câu)
│   └── evaluation_results_analysis.md  # Phân tích kết quả thực nghiệm
│
├── 📂 tests/                        # Unit & Integration Tests
│   ├── test_integration.py          # Kiểm thử tích hợp API đầy đủ
│   ├── test_api_charset.py          # Kiểm tra UTF-8 header trên tất cả endpoints
│   ├── observe_scores.py            # Phân tích phân phối điểm số & đề xuất ngưỡng
│   ├── test_content_api.py          # Kiểm thử API đọc nội dung sách
│   └── debug_query.py               # Gỡ lỗi nhanh một truy vấn
│
├── 📂 scratch/                      # Script phân tích tạm thời (QA & Debug)
├── 📂 qdrant_data/                  # Dữ liệu Qdrant (local storage)
├── 📂 cache_embeddings/             # Cache embedding vectors (pickle)
├── .env                             # Biến môi trường (GEMINI_API_KEY, SECRET_KEY)
├── requirements.txt                 # Thư viện Python
└── README.md                        # Tài liệu này
```

---

## 8. Hướng dẫn cài đặt

### Yêu cầu hệ thống
- Python 3.10+ / Node.js 18+
- Docker (để chạy Qdrant)
- RAM ≥ 8GB (khuyến nghị 16GB nếu không có GPU)
- GPU CUDA (tuỳ chọn, giúp tăng tốc 5-10x)

### Bước 1: Khởi động Qdrant Vector Database

```bash
docker run -d -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_data:/qdrant/storage \
  qdrant/qdrant
```

### Bước 2: Cài đặt Backend

```bash
# Clone repository
git clone https://github.com/PhanTrongNhan91/SEMANTIC_SEARCH_KLKS.git
cd SEMANTIC_SEARCH_KLKS

# Tạo môi trường ảo (Conda hoặc Venv)
conda create -n semantic_search python=3.10
conda activate semantic_search

# Cài đặt thư viện
pip install -r requirements.txt

# Cấu hình biến môi trường
cp .env.example .env
# Chỉnh sửa .env: thêm GEMINI_API_KEY và SECRET_KEY

# (Lần đầu) Tiền xử lý sách và nạp vào Qdrant
python -m src.preprocess
python -m src.ingest_books

# Khởi động server Backend
uvicorn src.api:app --reload
```

API sẽ chạy tại: `http://localhost:8000`  
Swagger UI: `http://localhost:8000/docs`

### Bước 3: Cài đặt Frontend

```bash
cd frontend
npm install
npm run dev
```

Ứng dụng web tại: `http://localhost:5173`

### Tài khoản mặc định

| Tài khoản | Mật khẩu | Quyền |
|---|---|---|
| `admin` | `admin123` | Xem lịch sử, quản trị |
| `reader` | `reader123` | Tìm kiếm, đọc sách |

---

## 9. API Documentation

Swagger UI đầy đủ tại: `http://localhost:8000/docs`

| Endpoint | Method | Tham số chính | Mô tả |
|---|---|---|---|
| `/` | GET | — | Kiểm tra trạng thái API |
| `/search` | GET | `q`, `mode`, `limit`, `category`, `language` | Tìm kiếm sách |
| `/books` | GET | `page`, `limit`, `q`, `category`, `language` | Danh sách sách phân trang |
| `/book/{book_id}` | GET | `book_id` | Metadata chi tiết một cuốn sách |
| `/book/{book_id}/content` | GET | `page`, `page_size` | Nội dung sách theo trang |
| `/filters` | GET | — | Danh sách category & language |
| `/history` | GET | — | Lịch sử tìm kiếm *(Admin)* |
| `/history` | DELETE | — | Xóa lịch sử *(Admin)* |
| `/auth/login-json` | POST | `username`, `password` | Đăng nhập, nhận JWT token |
| `/evaluate/book/{id}` | POST | `book_id` | Tự đánh giá chất lượng tìm kiếm |

---

## 10. Ví dụ tìm kiếm

Bộ câu hỏi chiến lược được phân loại chi tiết trong file [`evaluation/curated_question_sets.md`](evaluation/curated_question_sets.md).

### Nhóm Keyword (Q1–Q5) – BM25 hoạt động tốt nhất:
```
Q1: "Tìm sách của tác giả Ian Sommerville xuất bản năm 2011"
     → Software Engineering ✅

Q3: "Tác phẩm khảo cứu Việt Nam Phong Tục của tác giả Phan Kế Bính"
     → VIỆT NAM PHONG TỤC ✅
```

### Nhóm Semantic (Q6–Q10) – BM25 bị MISS, Semantic tìm được:
```
Q9: "Tập tùy bút sâu sắc ghi lại những suy ngẫm của một nữ nhà văn
     châu Âu về những ngày tháng bị giam cầm tù đày..."
     → CHẤP NHẬN CUỘC ĐỜI ✅ (không chứa từ khóa nào trùng tên sách)

Q7: "Tác phẩm kinh điển mô tả những giằng xé nội tâm của một sinh viên
     nghèo sau khi thực hiện hành vi phạm tội giết người..."
     → Crime and Punishment ✅
```

### Nhóm Hybrid (Q11–Q15) – Cần kết hợp Keyword + Ngữ nghĩa:
```
Q11: "Tìm sách thám tử Sherlock Holmes của Conan Doyle về vụ án
      liên quan đến con quái thú ở vùng đầm lầy sương mù"
      → The Hound of the Baskervilles ✅ (phân biệt với các tập Sherlock khác)
```

---

## 11. Đánh giá & Benchmark

### Công cụ đánh giá

```bash
# Chạy benchmark đầy đủ 4 chế độ
python evaluation/evaluate_comparison.py

# Chạy test suite tổng hợp
python evaluation/run_project_test_suite.py

# Chạy Integration Tests
python -m pytest tests/test_integration.py -v

# Kiểm tra UTF-8 charset tất cả endpoints
python tests/test_api_charset.py --verbose
```

### Các chỉ số đánh giá

| Chỉ số | Mô tả |
|---|---|
| **Precision@1** | Tỉ lệ kết quả đúng ở vị trí số 1 |
| **Recall@5** | Tỉ lệ tìm thấy sách đúng trong Top 5 |
| **MRR** | Mean Reciprocal Rank – đo vị trí trung bình của kết quả đúng |
| **Hit@K** | Tỉ lệ câu hỏi có ít nhất 1 kết quả đúng trong Top K |

### Kết quả thực nghiệm (trên 35 câu hỏi Ground Truth)

| Mode | Precision@1 | Recall@5 | MRR | Avg Latency |
|---|---|---|---|---|
| Keyword (BM25) | ~32% | ~45% | 0.38 | ~120ms |
| Semantic (BGE-M3) | ~55% | ~72% | 0.62 | ~350ms |
| Hybrid (No Rerank) | ~68% | ~85% | 0.74 | ~500ms |
| **Hybrid + Rerank** | **~82%** | **~94%** | **0.87** | ~1500ms |

> **Kết luận:** Hybrid + Reranking đạt MRR cao hơn gấp hơn 2 lần so với Keyword đơn thuần, với đánh đổi latency cao hơn (có thể giảm bằng caching).

---

## 12. Giao diện Frontend

| Trang | Chức năng |
|---|---|
| **Search** | Tìm kiếm chính, hiển thị kết quả kèm Score badge, Confidence status, XAI panel |
| **Comparison** | So sánh 3 chế độ (Keyword / Semantic / Hybrid) song song trên cùng một màn hình |
| **Library** | Duyệt toàn bộ thư viện 53 cuốn sách theo Grid/List, lọc theo category/language |
| **Book Detail** | Metadata chi tiết, summary, keywords, link đọc sách |
| **Book Reader** | Đọc sách trực tuyến theo trang với phân trang mượt |
| **Evaluation** | Upload CSV benchmark, hiển thị biểu đồ Radar và Line Chart Hit@K |
| **XAI** | Phân tích chi tiết quá trình xếp hạng từng kết quả (Dense / Sparse / RRF) |

---

## 13. Hiệu năng & Hạn chế

**Điểm mạnh:**
- Hỗ trợ song ngữ Tiếng Anh & Tiếng Việt nhờ BGE-M3 đa ngôn ngữ.
- Kiến trúc Incremental Update: chỉ xử lý sách mới, không cần chạy lại toàn bộ pipeline.
- Cache Embedding: tránh tính toán lại vector cho các đoạn văn đã biết.
- Giao diện Real-time với Skeleton Loading và Framer Motion.

**Hạn chế:**
- **Latency Reranking:** Hybrid + Rerank mất ~1.5s/truy vấn (so với ~0.1s của BM25).
- **Chunk Quality:** Chunking sai mạch văn có thể làm Reranker chấm điểm lệch.
- **RAM Intensive:** Cần ≥8GB RAM để tải đồng thời BGE-M3 + Reranker.
- **Tìm kiếm theo năm:** Trường `year` hiện chưa được nhúng vào vector, chỉ tìm được gián tiếp qua nội dung văn bản.

---

## 14. Hướng phát triển

1. **Semantic Caching (Redis):** Cache embedding các truy vấn tương tự (Cosine < 0.05) – giảm 80% chi phí tính toán.
2. **Semantic Chunking:** Thay thế Fixed-size chunking bằng cắt đoạn theo cấu trúc ngữ nghĩa thực tế.
3. **Query Expansion (LLM):** Dùng LLM nhỏ để viết lại và mở rộng câu hỏi trước khi embedding.
4. **Bộ lọc theo năm:** Nhúng trường `year` vào embedding text và cấu hình Qdrant Filter cứng.
5. **Learning-to-Rank:** Thay RRF bằng mô hình học trọng số Dense/Sparse tự động từ log thực tế.

---

## 15. Giá trị nghiên cứu

Đồ án đóng góp thực nghiệm trong lĩnh vực **Information Retrieval (IR)**:

- **Minh chứng thực nghiệm** sự hạn chế của Lexical Search khi người dùng đặt câu hỏi tự nhiên (Natural Language Query).
- **Xác nhận hiệu quả** của Hybrid Search trong thực tế: MRR tăng từ 0.38 (BM25) lên 0.87 (Hybrid + Rerank).
- **Khẳng định vai trò** của Cross-Encoder Reranking trong giải quyết "ảo giác ngữ nghĩa" (Semantic Ambiguity) của Bi-Encoder.
- **Đề xuất bộ câu hỏi thực nghiệm** (15 câu chiến lược + 50 câu mở rộng) phân loại theo đặc tính của từng thuật toán.

---
