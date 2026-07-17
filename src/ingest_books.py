import json
import uuid
from tqdm import tqdm
from qdrant_client import QdrantClient
from qdrant_client import models
from qdrant_client.models import VectorParams, Distance, PointStruct, SparseVectorParams
from fastembed import SparseTextEmbedding

from src import config
from src.embedding import get_embedding_model

COLLECTION_NAME = config.COLLECTION_NAME

# ====================== CẤU HÌNH TỔI ƯU CHO MÁY BẠN ======================
BATCH_SIZE = config.EMBEDDING_BATCH_SIZE
UPSERT_BATCH = config.UPSERT_BATCH
USE_GPU = True
FORCE_RESET = False    # <--- ĐÃ KHÓA AN TOÀN (CHỈ NẠP THÊM)

print("Loading Dense embedding model (BGE-M3)...")
model = get_embedding_model()

print("Loading Sparse BM25 model via fastembed (chạy bằng CPU/RAM)...")
sparse_model = SparseTextEmbedding(model_name=config.SPARSE_MODEL)

print(f"Model dimension: {model.dimension}")
print(f"Batch size: {BATCH_SIZE} | Upsert batch: {UPSERT_BATCH}")

# Connect Qdrant
print("Connecting Qdrant...")
client = QdrantClient(
    host=config.QDRANT_HOST,
    port=config.QDRANT_PORT,
    prefer_grpc=True,
    timeout=300
)

# Check collection
collections = client.get_collections().collections
exists = any(c.name == COLLECTION_NAME for c in collections)

if exists and FORCE_RESET:
    print(f"⚠️ FORCE_RESET=True: Đang xóa collection '{COLLECTION_NAME}' để nạp lại mới...")
    client.delete_collection(collection_name=COLLECTION_NAME)
    exists = False

# Create collection if not exists
if not exists:
    print(f"Creating collection '{COLLECTION_NAME}'...")
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config={
            "dense": VectorParams(
                size=model.dimension,
                distance=Distance.COSINE
            )
        },
        sparse_vectors_config={
            "sparse": SparseVectorParams(
                 modifier=models.Modifier.IDF
            )
        }
    )
    print("Collection created!")
else:
    print(f"Collection '{COLLECTION_NAME}' already exists. Switching to Incremental Mode.")

# Lấy danh sách TOÀN BỘ các book_id đã tồn tại trong Qdrant để tránh nạp trùng
existing_book_ids = set()
try:
    # Sử dụng scroll để quét qua toàn bộ dữ liệu hiện có
    next_offset = None
    while True:
        scroll_result, next_offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=1000, 
            with_payload=["book_id"],
            with_vectors=False,
            offset=next_offset
        )
        for point in scroll_result:
            if "book_id" in point.payload:
                existing_book_ids.add(point.payload["book_id"])
        
        if next_offset is None:
            break
            
    print(f"[INFO] Phát hiện {len(existing_book_ids)} sách đã có trong database.")
except Exception as e:
    print(f"[WARNING] Không thể kiểm tra dữ liệu cũ: {e}")

# Load chunks
print("Loading chunks...")
with open(config.CHUNKS_OUTPUT, "r", encoding="utf-8") as f:
    all_chunks = json.load(f)

# LOC RA NHUNG CHUNK CUA SACH MOI
chunks = [c for c in all_chunks if c["book_id"] not in existing_book_ids]

if not chunks:
    print("✅ Tat ca du lieu da duoc nạp. Khong co gi moi de ingest.")
    exit()

print(f"Total chunks in file: {len(all_chunks)}")
print(f"🚀 Chunks can nạp moi: {len(chunks)}")

# Load metadata (để bổ sung thông tin sạch hơn)
with open(config.METADATA_OUTPUT, "r", encoding="utf-8") as f:
    metadata_list = json.load(f)

metadata_dict = {m["book_id"]: m for m in metadata_list}

# ====================== INGEST ======================
points_buffer = []
processed = 0

print("Bắt đầu ingest vào Qdrant... (tối ưu cho RTX 3050 Ti 4GB)")

for i in tqdm(range(0, len(chunks), BATCH_SIZE)):
    batch = chunks[i:i + BATCH_SIZE]
    
    # Lấy embedding_text
    texts = [c["embedding_text"] for c in batch]

    # Embed batch (Mix Dense + Sparse)
    try:
        vectors = model.embed_batch(texts, batch_size=BATCH_SIZE)
        sparse_vectors = list(sparse_model.embed(texts, batch_size=BATCH_SIZE))
    except Exception as e:
        print(f"\n⚠️ Lỗi embed batch tại {i}, thử giảm batch size...")
        vectors = model.embed_batch(texts, batch_size=8)   # fallback nhỏ hơn
        sparse_vectors = list(sparse_model.embed(texts, batch_size=8))

    for c, vector, sparse_v in zip(batch, vectors, sparse_vectors):
        book_meta = metadata_dict.get(c["book_id"], {})

        # Payload tối ưu - chỉ giữ thông tin cần thiết
        payload = {
            "chunk_id": c["chunk_id"],
            "book_id": c["book_id"],
            "title": c.get("title", ""),
            "author": c.get("author", "Unknown"),
            "year": c.get("year"),
            "category": c.get("category", "Unknown"),
            "summary": c.get("summary", ""),
            "language": c.get("language", "en"),
            "text": c["text"],                    # nội dung chunk để hiển thị
            "chunk_index": c.get("chunk_index", 0),
            "total_chunks": c.get("total_chunks", 0),
            "file_name": c.get("file_name", "")
        }

        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, c["chunk_id"]))

        points_buffer.append(
            PointStruct(
                id=point_id,
                vector={
                    "dense": vector.tolist(),
                    "sparse": models.SparseVector(
                        indices=sparse_v.indices.tolist(),
                        values=sparse_v.values.tolist()
                    )
                },
                payload=payload
            )
        )

    # Upsert khi đủ batch
    if len(points_buffer) >= UPSERT_BATCH:
        client.upsert(collection_name=COLLECTION_NAME, points=points_buffer)
        points_buffer = []
        processed += UPSERT_BATCH

    # Giải phóng bộ nhớ định kỳ
    if i % 500 == 0 and i > 0:
        print(f"Processed {i}/{len(chunks)} chunks...")

# Upsert phần còn lại
if points_buffer:
    client.upsert(collection_name=COLLECTION_NAME, points=points_buffer)

print("\n✅ Ingest hoàn tất!")
print(f"   Tổng chunks đã ingest: {len(chunks)}")

# Tạo index cho filter
print("Creating payload indexes for filtering...")
client.create_payload_index(COLLECTION_NAME, "category", "keyword")
client.create_payload_index(COLLECTION_NAME, "language", "keyword")
client.create_payload_index(COLLECTION_NAME, "author", "keyword")

print("DONE INGEST! 🚀 Hệ thống đã sẵn sàng tìm kiếm.")