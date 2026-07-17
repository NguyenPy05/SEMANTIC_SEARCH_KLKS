import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from tqdm import tqdm
import time
from src import config

# ====================== CẤU HÌNH ======================
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

BOOKS_FOLDER = config.BOOKS_FOLDER
GROUND_TRUTH_FILE = config.GROUND_TRUTH_FILE

# Model Gemini để sử dụng (Dùng Flash Lite mới nhất để có Quota cao nhất)
MODEL_NAME = config.GEMINI_MODEL

# Danh sách các cuốn sách cần chạy lại AI (Vượt qua kiểm tra "đã có tóm tắt")
FORCE_RECODE = []

def extract_metadata_with_ai(client, text, file_name):
    """Sử dụng Gemini để trích xuất metadata từ nội dung sách"""
    prompt = f"""
    Bạn là một chuyên gia quản lý thư viện người Việt Nam. Tôi có nội dung của một cuốn sách.
    Hãy trích xuất các thông tin sau dưới định dạng JSON:
    1. title: Tên cuốn sách chính xác nhất.
    2. author: Tên tác giả chính xác nhất.
    3. summary: Tạm tắt nội dung chính của cuốn sách trong khoảng 2-3 câu văn súc tích, hoàn toàn bằng TIẾNG VIỆT.
    4. category: Phân loại vào MỘT trong các nhóm TIẾNG VIỆT sau: [Kỳ ảo, Khoa học Viễn tưởng, Trinh thám, Văn học cổ điển, Lịch sử, Tâm lý & Kỹ năng, Triết học - Giáo dục, Kinh tế & Công nghệ, Văn học Việt Nam].

    Lưu ý: Kể cả sách gốc là tiếng Anh, bạn vẫn phải trả về tóm tắt (summary) và thể loại (category) bằng TIẾNG VIỆT.

    Tên file: {file_name}
    Nội dung sách:
    {text[:5000]}

    Chỉ trả về JSON, không giải thích gì thêm.
    """
    
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )
        # Trích xuất JSON từ phản hồi (đôi khi AI trả về markdown block ```json ... ```)
        res_text = response.text
        json_match = re.search(r'\{.*\}', res_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return None
    except Exception as e:
        print(f"Error calling Gemini for {file_name}: {e}")
        return None

def sync_metadata():
    if not API_KEY:
        print("❌ Lỗi: Không tìm thấy GEMINI_API_KEY trong file .env")
        return

    client = genai.Client(api_key=API_KEY)

    # 1. Load Ground Truth hiện tại
    if Path(GROUND_TRUTH_FILE).exists():
        with open(GROUND_TRUTH_FILE, "r", encoding="utf-8") as f:
            ground_truth = json.load(f)
    else:
        ground_truth = {}

    # 2. Quét thư mục sách
    book_files = list(Path(BOOKS_FOLDER).glob("*.txt"))
    updated = False

    print(f"🔍 Đang kiểm tra và làm giàu dữ liệu (enrichment) cho {len(book_files)} cuốn sách...")

    for file_path in tqdm(book_files):
        file_stem = file_path.stem
        
        # Kiểm tra xem đã có tóm tắt chưa
        existing = ground_truth.get(file_stem)
        
        # Bỏ qua nếu đã có tóm tắt VÀ không nằm trong danh sách ép chạy lại
        if existing and "summary" in existing and existing["summary"] and (file_stem not in FORCE_RECODE):
            continue

        if file_stem in FORCE_RECODE:
            print(f"\n🔄 Ép chạy lại (Force Recode): {file_stem}")
        elif not existing:
            print(f"\n🆕 Phát hiện sách mới: {file_stem}")
        else:
            print(f"\n✨ Đang bổ sung tóm tắt cho: {file_stem}")
        
        try:
            # Đọc nội dung sách
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read(5000)
                
            # Trích xuất metadata bằng AI với cơ chế thử lại (retry)
            new_metadata = None
            retries = 3
            for attempt in range(retries):
                try:
                    new_metadata = extract_metadata_with_ai(client, content, file_path.name)
                    if new_metadata:
                        break
                except Exception as ai_err:
                    err_msg = str(ai_err).lower()
                    if "429" in err_msg or "resource_exhausted" in err_msg:
                        wait_time = 60 if attempt == 0 else 120
                        print(f"\n⏳ Hết hạn mức phút (RPM). Đang tạm nghỉ {wait_time}s trước khi thử lại...")
                        time.sleep(wait_time)
                    else:
                        print(f"\n⚠️ Lỗi AI ({file_stem}): {ai_err}")
                        time.sleep(5)
                
                if attempt < retries - 1:
                    print(f"⚠️ Đang thử lại cuốn {file_stem} (Lần {attempt+1}/{retries})...")
                    time.sleep(10)
            
            if new_metadata:
                # Merge dữ liệu mới vào dữ liệu cũ
                if file_stem in ground_truth:
                    ground_truth[file_stem].update(new_metadata)
                else:
                    ground_truth[file_stem] = new_metadata
                
                print(f"✅ Thành công: {new_metadata.get('title', file_stem)}")
                updated = True
                
                # Lưu tạm thời ngay lập tức để tránh mất dữ liệu
                with open(GROUND_TRUTH_FILE, "w", encoding="utf-8") as f:
                    json.dump(ground_truth, f, ensure_ascii=False, indent=2)
            else:
                print(f"❌ Không thể trích xuất metadata cho {file_stem} sau {retries} lần thử.")
                
            # Đợi một chút để tránh dính Rate Limit (Gói free thường giới hạn 15 RPM)
            time.sleep(4)
                
        except Exception as e:
            print(f"❌ Lỗi hệ thống khi xử lý {file_path.name}: {e}")
            time.sleep(5)

    # 3. Lưu lại kết quả cuối cùng
    if updated:
        print(f"\n✨ Đã cập nhật {GROUND_TRUTH_FILE} hoàn tất!")
    else:
        print("\n✅ Tất cả sách đều đã có đầy đủ tóm tắt.")

if __name__ == "__main__":
    sync_metadata()
