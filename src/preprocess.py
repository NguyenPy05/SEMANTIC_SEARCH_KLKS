import sys
sys.stdout.reconfigure(encoding='utf-8')
import re
import json
import time
from pathlib import Path
from tqdm import tqdm
from collections import OrderedDict
import unicodedata
from underthesea import sent_tokenize
from src.auto_category import AutoCategorizer

from src import config
from src.embedding import get_embedding_model, build_embedding_text

BOOKS_FOLDER = config.BOOKS_FOLDER
CHUNKS_OUTPUT = config.CHUNKS_OUTPUT
METADATA_OUTPUT = config.METADATA_OUTPUT

Path(CHUNKS_OUTPUT).parent.mkdir(parents=True, exist_ok=True)

CHUNK_SIZE = config.CHUNK_SIZE
CHUNK_OVERLAP = config.CHUNK_OVERLAP
MIN_CHUNK_LEN = config.MIN_CHUNK_LEN

# === (Hệ thống CATEGORY_KEYWORDS cũ đã được thay thế bằng AutoCategorizer trong auto_category.py) ===

def detect_language(text: str) -> str:
    """Nhận diện ngôn ngữ dựa trên mật độ ký tự tiếng Việt có dấu"""
    if not text:
        return "en"
    # Các ký tự tiếng Việt có dấu đặc trưng
    vi_chars = re.findall(r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]', text.lower())
    # Tăng ngưỡng lên 1% để chính xác hơn (tránh nhiễu trong sách tiếng Anh)
    ratio = len(vi_chars) / len(text)
    return "vi" if ratio > 0.01 else "en"

# === (Hệ thống enrich_category cũ đã được thay thế bằng logic trong AutoCategorizer) ===

def slugify(text: str) -> str:
    """Tạo ID sạch từ tên file để làm book_id cố định"""
    # Chuyển tiếng Việt có dấu thành không dấu
    text = text.lower()
    patterns = {
        '[àáảãạăằắẳẵặâầấẩẫậ]': 'a',
        '[èéẻẽẹêềếểễệ]': 'e',
        '[ìíỉĩị]': 'i',
        '[òóỏõọôồốổỗộơờớởỡợ]': 'o',
        '[ùúủũụưừứửữự]': 'u',
        '[ỳýỷỹỵ]': 'y',
        'đ': 'd'
    }
    for pattern, replacement in patterns.items():
        text = re.sub(pattern, replacement, text)
    
    # Xóa ký tự đặc biệt và thay khoảng trắng bằng gạch nối
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')


# ====================== CLEANING ======================
def clean_gutenberg_noise(text: str) -> str:
    # Xóa header Gutenberg và các mục lục đầu sách (Table of Contents / Mục lục)
    text = re.sub(r'(?is)^.*?(Project Gutenberg|THE MILLENNIUM FULCRUM|Produced by|This eBook is for the use of anyone anywhere).*?(?=\s*(CHAPTER I|Down the Rabbit-Hole|CHAPTER\s+[IVX]+|MỤC LỤC|CHƯƠNG I))', '', text)
    text = re.sub(r'(?is)\*\*\*\s*END OF.*PROJECT GUTENBERG.*', '', text)
    
    # Xóa các dòng chỉ chứa mục lục hoặc tiêu đề chương ngắn
    lines = []
    for line in text.split('\n'):
        clean_line = line.strip()
        # Bỏ qua dòng quá ngắn mà lại viết hoa hết (thường là tiêu đề) hoặc chứa từ khóa rác
        if len(clean_line) < 40 and (clean_line.isupper() or any(k in clean_line.lower() for k in ["mục lục", "chapter", "chương", "phần"])):
            continue
        lines.append(line)
    return '\n'.join(lines).strip()


def clean_vietnamese_text(text: str) -> str:
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'^\s*(Page|Trang) \d+\s*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
    text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)
    # Loại bỏ các dòng lặp lại kiểu "Đầu trang", "Cuối trang"
    text = re.sub(r'^\s*(Đầu trang|Cuối trang|Chi tiết sách|Mục lục|Trở về).*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
    return text.strip()


def clean_text(text: str) -> str:
    # Chỉ giữ lại các ký tự chữ cái, số và dấu câu cơ bản
    text = re.sub(r'[^\w\sÀ-ỹ.,!?;:\'\"()\-\–\“\”\‘\’]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()



# ====================== UTILS ======================
def is_clean_chunk(text: str) -> bool:
    text_lower = text.lower()
    # Chặn các từ khóa rác phổ biến
    bad_keywords = ["project gutenberg", "this ebook", "produced by", "table of contents", "mục lục", "illustration", "copyright", "trang ", "page "]
    if any(b in text_lower for b in bad_keywords):
        return False
        
    # Chặn các chunk có mật độ chữ viết hoa quá cao (thường là danh sách hoặc tiêu đề)
    upper_chars = len([c for c in text if c.isupper()])
    if len(text) > 0 and (upper_chars / len(text)) > 0.4:
        return False
        
    return len(text.split()) >= 40 # Tăng giới hạn tối thiểu lên 40 từ


def chunk_text(text: str, language: str = "en", chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Tối ưu hóa tách câu với underthesea cho tiếng Việt"""
    if language == "vi":
        # Tách câu chuẩn xác bằng underthesea
        sentences = sent_tokenize(text)
    else:
        # Tách câu bằng Regex cho tiếng Anh
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sent in sentences:
        sent_words = sent.split()
        sent_len = len(sent_words)
        
        if current_length + sent_len > chunk_size:
            # Lưu chunk hiện tại
            chunk_content = " ".join(current_chunk).strip()
            if len(chunk_content) >= MIN_CHUNK_LEN and is_clean_chunk(chunk_content):
                chunks.append(chunk_content)
            
            # Giữ lại một số câu cuối để làm overlap
            overlap_words = 0
            new_chunk = []
            for s in reversed(current_chunk):
                s_len = len(s.split())
                if overlap_words + s_len <= overlap:
                    new_chunk.insert(0, s)
                    overlap_words += s_len
                else:
                    break
            current_chunk = new_chunk
            current_length = overlap_words
            
        current_chunk.append(sent)
        current_length += sent_len
        
    if current_chunk:
        chunk_content = " ".join(current_chunk).strip()
        if len(chunk_content) >= MIN_CHUNK_LEN and is_clean_chunk(chunk_content):
            chunks.append(chunk_content)
            
    return chunks




# ===================== MAIN =====================
def process_books(folder):
    # 1. LOAD DATA HIỆN CÓ (Để thực hiện Incremental Update)
    all_chunks = []
    books_metadata = OrderedDict()
    
    if Path(METADATA_OUTPUT).exists():
        try:
            with open(METADATA_OUTPUT, "r", encoding="utf-8") as f:
                old_meta = json.load(f)
                for item in old_meta:
                    books_metadata[item["book_id"]] = item
            print(f"[INFO] Da tai {len(books_metadata)} sach tu metadata cu.")
        except Exception as e:
            print(f"[WARNING] Khong the tai metadata cu: {e}")

    if Path(CHUNKS_OUTPUT).exists():
        try:
            with open(CHUNKS_OUTPUT, "r", encoding="utf-8") as f:
                all_chunks = json.load(f)
            print(f"[INFO] Da tai {len(all_chunks)} chunks tu data cu.")
        except Exception as e:
            print(f"[WARNING] Khong the tai chunks cu: {e}")

    # KHỞI TẠO BỘ TỰ ĐỘNG PHÂN LOẠI
    print("\n[INFO] Bat dau huan luyen bo tu dong phan loai (AutoCategorizer)...")
    categorizer = AutoCategorizer(corpus_path=folder)
    categorizer.fit()

    files = list(Path(folder).glob("*.txt"))
    
    # Lọc ra những file CẦN xử lý
    # Cuốn nào đã có trong metadata VÀ có đủ từ khóa (>5 từ) thì coi là đã xong
    existing_filenames = {
        m["file_name"] for m in books_metadata.values() 
        if len(m.get("keywords", [])) > 5
    }
    
    new_files = [f for f in files if f.name not in existing_filenames]
    
    if not new_files:
        print("✅ Khong co sach moi nao can xu ly.")
        return

    print(f"\n[INFO] Phat hien {len(new_files)} cuon sach moi (hoac can xu ly lai). Dang xu ly...")

    # QUAN TRỌNG: Loại bỏ các chunks cũ của những cuốn sách sắp được xử lý lại để tránh trùng lặp
    new_file_names = {f.name for f in new_files}
    all_chunks = [c for c in all_chunks if c.get("file_name") not in new_file_names]

    for file_path in tqdm(new_files):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_text = f.read()

            if file_path.name.startswith("vi_"):
                cleaned = clean_vietnamese_text(raw_text)
            else:
                cleaned = clean_gutenberg_noise(raw_text)

            cleaned = clean_text(cleaned)

            if len(cleaned) < 1500:
                print(f"⚠️ Bo qua {file_path.name} do noi dung qua ngan.")
                continue

            # SỬ DỤNG BỘ NÃO HYBRID (AI + TF-IDF)
            meta = categorizer.get_metadata(file_path.stem)
            if not meta:
                continue

            title = meta["title"]
            author = meta["author"]
            category = meta["category"]
            keywords = meta["keywords"]
            language = detect_language(raw_text[:5000])

            # Trích xuất Năm (Year) từ văn bản
            year_match = re.search(r'\b(18[0-9]{2}|19[0-9]{2}|20[0-2][0-9])\b', raw_text[:3000])
            year = int(year_match.group(1)) if year_match else None

            # Tách chunk
            chunks = chunk_text(cleaned, language=language)

            # ID CO DINH THEO TEN FILE
            book_id = slugify(file_path.stem)

            books_metadata[book_id] = {
                "book_id": book_id,
                "title": title,
                "author": author,
                "year": year,
                "language": language,
                "category": category,
                "summary": meta.get("summary", ""),
                "keywords": keywords,
                "total_chunks": len(chunks),
                "file_name": file_path.name,
                "source": "book"
            }

            for k, chunk in enumerate(chunks):
                all_chunks.append({
                    "chunk_id": f"{book_id}_{k:04d}",
                    "book_id": book_id,
                    "title": title,
                    "author": author,
                    "year": year,
                    "category": category,
                    "language": language,
                    "chunk_index": k,
                    "total_chunks": len(chunks),
                    "source": "book",
                    "file_name": file_path.name,
                    "text": chunk,
                    "summary": meta.get("summary", ""),
                    "keywords": keywords,
                    "embedding_text": build_embedding_text({
                        "title": title,
                        "author": author,
                        "category": category,
                        "summary": meta.get("summary", ""),
                        "keywords": keywords,
                        "language": language,
                        "text": chunk
                    })
                })

        except Exception as e:
            print(f"❌ Lỗi xử lý {file_path.name}: {e}")

    # LƯU LẠI TOÀN BỘ (Dữ liệu cũ + Dữ liệu mới)
    metadata_list = list(books_metadata.values())
    with open(METADATA_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(metadata_list, f, ensure_ascii=False, indent=2)

    with open(CHUNKS_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"\n[SUCCESS] DA CAP NHAT XU LY!")
    print(f"   Tong so sach hien tai   : {len(books_metadata)}")
    print(f"   Tong so chunks hien tai : {len(all_chunks)}")


if __name__ == "__main__":
    print("=== preprocess.py (Incremental Edition) ===\n")
    process_books(BOOKS_FOLDER)