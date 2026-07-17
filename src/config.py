import os
import torch
from pathlib import Path

# ====================== FILE PATHS ======================
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
BOOKS_FOLDER = DATA_DIR / "books_clean" if (DATA_DIR / "books_clean").exists() else DATA_DIR / "books"
CHUNKS_OUTPUT = DATA_DIR / "chunks" / "all_chunks.json"
METADATA_OUTPUT = DATA_DIR / "books_metadata.json"
GROUND_TRUTH_FILE = DATA_DIR / "ground_truth.json"
HISTORY_FILE = DATA_DIR / "search_history.json"

# ====================== MODELS & DEVICE ======================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Embedding Model (Bi-Encoder)
EMBEDDING_MODEL = "BAAI/bge-m3"
EMBEDDING_BATCH_SIZE = 32  # Tối ưu cho 4GB VRAM
USE_FP16 = True
MAX_SEQ_LENGTH = 512
CACHE_DIR = BASE_DIR / "cache_embeddings"

# Sparse Model (BM25)
SPARSE_MODEL = "Qdrant/bm25"

# Reranker Model (Cross-Encoder)
RERANKER_MODEL = "BAAI/bge-reranker-base"

# Gemini Model for enrichment
GEMINI_MODEL = "gemini-flash-lite-latest"

# ====================== DATABASE ======================
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION_NAME = "books_semantic_search"
UPSERT_BATCH = 256

# ====================== PREPROCESSING ======================
CHUNK_SIZE = 400
CHUNK_OVERLAP = 80
MIN_CHUNK_LEN = 150