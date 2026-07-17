import os
import json
import re
import time
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ====================== CẤU HÌNH FULL AUTO ======================
# Danh sách các thể loại mục tiêu (Tối giản, không cần Anchor keywords thủ công)
CATEGORIES = [
    "Kỳ ảo", "Khoa học Viễn tưởng", "Trinh thám", "Văn học Việt Nam", 
    "Lịch sử", "Tâm lý & Kỹ năng", "Triết học - Giáo dục", 
    "Văn học cổ điển", "Kinh tế & Công nghệ"
]

class AutoCategorizer:
    def __init__(self, corpus_path="data/books"):
        self.corpus_path = corpus_path
        self.api_key = os.getenv("QWEN_API_KEY")
        self.base_url = os.getenv("QWEN_BASE_URL", "https://api.groq.com/openai/v1")
        self.model_name = os.getenv("QWEN_MODEL", "qwen-2.5-72b-preview")
        
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
            print(f"🤖 AutoCategorizer: Chế độ FULL AUTO với Qwen AI đã sẵn sàng.")
        else:
            self.client = None
            print("⚠️ AutoCategorizer: Không tìm thấy QWEN_API_KEY, hệ thống sẽ bị hạn chế.")

        self.books_data = {} # Dictionary of {stem: {keywords, category}}
        self.ground_truth = {}
        self._load_ground_truth()

    def _load_ground_truth(self):
        """Nạp dữ liệu đã được gán nhãn trước đó (từ sync_metadata.py)"""
        gt_path = Path("data/ground_truth.json")
        if gt_path.exists():
            try:
                with open(gt_path, "r", encoding="utf-8") as f:
                    self.ground_truth = json.load(f)
                print(f"[INFO] Đã nạp {len(self.ground_truth)} mục từ ground_truth.json")
            except Exception as e:
                print(f"[WARNING] Không thể nạp ground_truth.json: {e}")

    def fit(self):
        """Phân tích toàn bộ thư mục sách và làm giàu dữ liệu keywords nếu còn thiếu"""
        paths = list(Path(self.corpus_path).glob("*.txt"))
        if not paths:
            return
            
        print(f"🔍 Bắt đầu kiểm tra và làm giàu dữ liệu cho {len(paths)} cuốn sách...")
        
        for p in paths:
            title = p.stem
            
            # Kiểm tra xem đã có dữ liệu trong ground_truth chưa và keywords có trống không
            has_gt = title in self.ground_truth
            existing_keywords = self.ground_truth[title].get("keywords", []) if has_gt else []
            
            # Lọc keywords cũ (chỉ lấy cụm từ 2 chữ trở lên)
            valid_existing_keywords = [k for k in existing_keywords if len(k.split()) >= 2]

            # TRƯỜNG HỢP 1: Đã có đầy đủ dữ liệu (Ground Truth + Keywords tốt)
            if has_gt and len(valid_existing_keywords) >= 10:
                self.books_data[title] = {
                    "keywords": valid_existing_keywords[:20],
                    "category": self.ground_truth[title].get("category", "Văn học cổ điển")
                }
                continue

            # TRƯỜNG HỢP 2: Thiếu dữ liệu hoặc Keywords bị trống -> Gọi Qwen AI
            if self.client:
                try:
                    # Nếu đã có summary từ Ground Truth, ta gửi summary cho AI sẽ nhanh và chính xác hơn gửi cả nội dung
                    if has_gt and self.ground_truth[title].get("summary"):
                        context = self.ground_truth[title]["summary"]
                    else:
                        with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                            context = f.read(5000)
                    
                    print(f"✨ Đang bổ sung Keywords cho: {title}...")
                    result = self._ask_qwen(context, title)
                    
                    # Ưu tiên lấy category từ Ground Truth nếu đã có, nếu chưa thì lấy từ AI
                    final_category = self.ground_truth[title].get("category") if has_gt else result["category"]
                    if not final_category: final_category = result["category"]

                    self.books_data[title] = {
                        "keywords": result["keywords"],
                        "category": final_category
                    }
                    
                    # Nghỉ 2 giây để tránh Rate Limit
                    time.sleep(2)
                except Exception as e:
                    print(f"❌ Lỗi khi làm giàu dữ liệu cho {title}: {e}")
                    # Fallback cơ bản
                    self.books_data[title] = {
                        "keywords": valid_existing_keywords if valid_existing_keywords else [title.replace("_", " ")],
                        "category": self.ground_truth[title].get("category", "Văn học cổ điển") if has_gt else "Văn học cổ điển"
                    }
            else:
                # Fallback hoàn toàn nếu không có API Key
                self.books_data[title] = {
                    "keywords": valid_existing_keywords if valid_existing_keywords else [title.replace("_", " ")],
                    "category": self.ground_truth[title].get("category", "Văn học cổ điển") if has_gt else "Văn học cổ điển"
                }

    def _ask_qwen(self, text, title):
        """Gọi Qwen AI để trích xuất Keywords (2+ từ) và Category"""
        prompt = f"""Bạn là một thủ thư chuyên nghiệp. Hãy phân tích nội dung cuốn sách "{title}":

VĂN BẢN TRÍCH ĐOẠN:
{text[:4500]}

YÊU CẦU:
1. Trích xuất 15 từ khóa quan trọng nhất.
2. MỖI TỪ KHÓA PHẢI CÓ TỪ 2 CHỮ TRỞ LÊN (Ví dụ: 'phép thuật', 'vũ trụ', 'chiến tranh'). KHÔNG lấy từ đơn.
3. Chọn duy nhất 1 thể loại phù hợp nhất trong danh sách: {CATEGORIES}.

Trả về kết quả duy nhất ở định dạng JSON:
{{
  "keywords": ["từ khóa 1", "từ khóa 2", ...],
  "category": "Tên thể loại"
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "Bạn là chuyên gia phân tích sách, chỉ trả về JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" },
                temperature=0.1
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            raise e

    def get_metadata(self, file_stem):
        """Trả về metadata hoàn chỉnh cho một cuốn sách"""
        if file_stem in self.books_data:
            data = self.books_data[file_stem]
            # Bổ sung Title, Author, Summary từ Ground Truth nếu có
            if file_stem in self.ground_truth:
                ref = self.ground_truth[file_stem]
                return {
                    "title": ref.get("title", file_stem.replace("_", " ")),
                    "author": ref.get("author", "Unknown"),
                    "summary": ref.get("summary", ""),
                    "category": data["category"],
                    "keywords": data["keywords"]
                }
            return {
                "title": file_stem.replace("_", " "),
                "author": "Unknown",
                "summary": "",
                "category": data["category"],
                "keywords": data["keywords"]
            }
        return None
