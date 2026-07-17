
import sys
import os
import json
import torch

# Thêm đường dẫn để import src
sys.path.append(os.getcwd())

from src.search import BookSearcher

def observe():
    print("🚀 Đang khởi động BookSearcher để thám mã điểm số...")
    searcher = BookSearcher()
    
    with open("evaluation/qa_ground_truth.json", "r", encoding="utf-8") as f:
        qa_data = json.load(f)
    
    results_detailed = []
    
    print(f"\n🔍 Đang kiểm tra {len(qa_data)} câu hỏi mẫu...")
    print("-" * 60)
    
    for item in qa_data:
        query = item["query"]
        expected_doc = item["expected_doc"]
        
        # Thực hiện search
        try:
            results, _, _, status = searcher.search(query, limit=5)
            
            top_score = results[0]["score"] if results else -10.0
            top_title = results[0]["title"] if results else "N/A"
            
            is_correct = (top_title.lower() == expected_doc.lower()) or (expected_doc == "Out-of-scope" and status == "no_match")
            
            match_status = "✅ ĐÚNG" if is_correct else "❌ SAI "
            print(f"{match_status} | Score: {top_score:7.4f} | Query: {query[:40]}...")
            
            results_detailed.append({
                "query": query,
                "expected": expected_doc,
                "top_score": top_score,
                "is_correct": is_correct
            })
        except Exception as e:
            print(f"❌ LỖI | Query: {query[:40]}... (Error: {e})")

    # Phân tích thống kê
    correct_scores = [r["top_score"] for r in results_detailed if r["is_correct"] and r["expected"] != "Out-of-scope"]
    wrong_scores = [r["top_score"] for r in results_detailed if not r["is_correct"]]
    out_of_scope_scores = [r["top_score"] for r in results_detailed if r["expected"] == "Out-of-scope"]

    print("\n" + "="*40)
    print("📊 KẾT QUẢ PHÂN TÍCH ĐIỂM SỐ (RAW LOGITS)")
    print("="*40)
    
    if correct_scores:
        print(f"Câu hỏi ĐÚNG:")
        print(f"  - Min Score: {min(correct_scores):.4f}")
        print(f"  - Max Score: {max(correct_scores):.4f}")
        print(f"  - Avg Score: {sum(correct_scores)/len(correct_scores):.4f}")
    
    if wrong_scores:
        print(f"\nCâu hỏi SAI (Top-1 không khớp):")
        print(f"  - Min Score: {min(wrong_scores):.4f}")
        print(f"  - Max Score: {max(wrong_scores):.4f}")
        print(f"  - Avg Score: {sum(wrong_scores)/len(wrong_scores):.4f}")

    if out_of_scope_scores:
        print(f"\nCâu hỏi Ngoài phạm vi (Out-of-scope):")
        print(f"  - Min Score: {min(out_of_scope_scores):.4f}")
        print(f"  - Max Score: {max(out_of_scope_scores):.4f}")
        print(f"  - Avg Score: {sum(out_of_scope_scores)/len(out_of_scope_scores):.4f}")

    print("\n🎯 GỢI Ý NGƯỠNG (THRESHOLDS):")
    if correct_scores and wrong_scores:
        # Ngưỡng Good nên nằm trên mức cao nhất của SAI hoặc trung bình của ĐÚNG
        suggested_good = max([max(wrong_scores) if wrong_scores else -10, max(out_of_scope_scores) if out_of_scope_scores else -10]) + 0.3
        suggested_low = min(correct_scores) - 0.2
        print(f"  - Suggested GOOD threshold: {suggested_good:.2f}")
        print(f"  - Suggested LOW threshold:  {suggested_low:.2f}")
    
if __name__ == "__main__":
    observe()
