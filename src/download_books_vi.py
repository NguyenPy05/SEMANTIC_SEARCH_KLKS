from datasets import load_dataset
import os
from tqdm import tqdm
import re

os.makedirs("data/books", exist_ok=True)

print("Đang tải UVB-v0.1 - Vietnamese Books Dataset (447 cuốn)...")

# Tải dataset
dataset = load_dataset("undertheseanlp/UVB-v0.1", split="train")

# Số lượng sách muốn tải (20-30 cuốn là đủ cho đồ án, có thể tăng sau)
MAX_BOOKS = 30
selected_books = dataset.select(range(MAX_BOOKS))

print(f"Đang lưu {MAX_BOOKS} cuốn sách tiếng Việt chất lượng cao...")

saved_count = 0

for i, book in enumerate(tqdm(selected_books)):
    title = book.get("title", f"Unknown_Book_{i}").strip()
    content = book.get("content", "")

    # Lọc sách quá ngắn hoặc không có nội dung
    if not content or len(content.strip()) < 8000:
        continue

    # Làm sạch nhẹ trước khi lưu (giúp preprocess sau dễ hơn)
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)  # Giảm khoảng trắng thừa
    content = re.sub(r'Page \d+|\d+/\d+', '', content)  # Xóa số trang nếu có

    # Tạo tên file rõ ràng, dễ quản lý
    clean_title = re.sub(r'[^a-zA-Z0-9\sÀ-ỹ\-]', '', title)[:80].strip().replace(" ", "_")
    filename = f"data/books/vi_{i:03d}_{clean_title}.txt"

    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

    saved_count += 1

    if saved_count % 5 == 0:
        print(f"Đã lưu {saved_count} cuốn...")

print(f"\n✅ Hoàn tất! Đã lưu {saved_count} cuốn sách tiếng Việt từ UVB dataset.")
print("   → Nguồn: https://huggingface.co/datasets/undertheseanlp/UVB-v0.1")
print("   → Ưu điểm: Full text, có metadata, ít noise hơn so với scan PDF.")