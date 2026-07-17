#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Multi-Mode Search Comparison Script
Compares Keyword Search vs Semantic Search vs Hybrid Search
Generates comparison metrics and reports
"""

import sys
import os
import json
import time
import csv
import math
from typing import Dict, List, Tuple

# Add root directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.search import BookSearcher

def evaluate_all_modes(searcher: BookSearcher, modes: List[str] = None, questions_path: str = None):
    """
    Evaluate search system across multiple modes
    Modes: ['keyword', 'semantic', 'hybrid', 'hybrid_no_rerank']
    """
    if modes is None:
        modes = ["keyword", "semantic", "hybrid"]
    
    # 1. Load Ground Truth
    if questions_path is None:
        gt_path = os.path.join(os.path.dirname(__file__), "qa_ground_truth.json")
    else:
        gt_path = questions_path
    try:
        with open(gt_path, "r", encoding="utf-8") as f:
            ground_truth = json.load(f)
    except FileNotFoundError:
        print(f"❌ Lỗi: Không tìm thấy file {gt_path}!")
        return None
        
    total_queries = len(ground_truth)
    if total_queries == 0:
        print("❌ Ground truth trống!")
        return None

    print(f"\n🚀 Bắt đầu so sánh {len(modes)} chế độ tìm kiếm ({total_queries} câu hỏi)")
    print("="*80)
    
    K_VALUES = [1, 3, 5]
    
    # Initialize metrics for each mode
    mode_results = {mode: {
        "mrr_sum": 0.0,
        "precision_at_k": {k: 0.0 for k in K_VALUES},
        "recall_at_k": {k: 0.0 for k in K_VALUES},
        "ndcg_at_k": {k: 0.0 for k in K_VALUES},
        "latencies": [],
        "details": []
    } for mode in modes}
    
    # Process each query with each mode
    for idx, item in enumerate(ground_truth, 1):
        query = item["query"]
        expected_title = item.get("expected_title", "").lower()
        
        print(f"\n[{idx}/{total_queries}] Query: {query[:60]}...")
        
        for mode in modes:
            try:
                # Run search
                docs, proc_time, intent, status = searcher.search(
                    query=query, 
                    limit=max(K_VALUES),
                    mode=mode
                )
                
                returned_titles = [doc["title"].lower() for doc in docs]
                
                # Find rank of expected document
                rank = -1
                found_title = "N/A"
                for i, title in enumerate(returned_titles):
                    if expected_title in title or title in expected_title:
                        rank = i + 1
                        found_title = docs[i]["title"]
                        break
                
                if rank != -1:
                    mode_results[mode]["mrr_sum"] += 1.0 / rank
                
                # Calculate precision, recall, ndcg for each K
                for k in K_VALUES:
                    top_k_titles = returned_titles[:k]
                    is_found = any((expected_title in t) or (t in expected_title) for t in top_k_titles)
                    
                    if is_found:
                        mode_results[mode]["precision_at_k"][k] += 1.0 / k
                        mode_results[mode]["recall_at_k"][k] += 1.0
                    
                    if rank != -1 and rank <= k:
                        mode_results[mode]["ndcg_at_k"][k] += 1.0 / math.log2(rank + 1)
                
                mode_results[mode]["latencies"].append(proc_time)
                
                # Store detailed results
                mode_results[mode]["details"].append({
                    "query": query,
                    "expected_doc": expected_title,
                    "mode": mode,
                    "rank": rank if rank != -1 else "N/A",
                    "score": round(docs[0]["score"], 4) if docs else 0.0,
                    "status": status,
                    "latency": round(proc_time, 2)
                })
                
                rank_str = f"#{rank}" if rank != -1 else "MISS"
                print(f"  └─ {mode:20} → {rank_str:8} | {proc_time:7.1f}ms | {status}")
                
            except Exception as e:
                print(f"  └─ {mode:20} → ERROR: {str(e)[:40]}")
    
    # Calculate final metrics
    print("\n" + "="*80)
    print("📊 KẾT QUẢ SO SÁNH CUỐI CÙNG".center(80))
    print("="*80)
    
    summary_data = []
    
    for mode in modes:
        mrr = mode_results[mode]["mrr_sum"] / total_queries
        avg_latency = sum(mode_results[mode]["latencies"]) / len(mode_results[mode]["latencies"])
        
        print(f"\n🔍 CHẾ ĐỘ: {mode.upper()}")
        print("-" * 80)
        print(f"  Thời gian phản hồi TB: {avg_latency:8.2f} ms")
        print(f"  MRR @5               : {mrr:8.4f}")
        
        summary_row = {
            "Mode": mode,
            "MRR": round(mrr, 4),
            "Latency_ms": round(avg_latency, 2)
        }
        
        for k in K_VALUES:
            p_k = mode_results[mode]["precision_at_k"][k] / total_queries
            r_k = mode_results[mode]["recall_at_k"][k] / total_queries
            ndcg_k = mode_results[mode]["ndcg_at_k"][k] / total_queries
            print(f"  K={k}: P@{k} = {p_k:.4f} | R@{k} = {r_k:.4f} | nDCG@{k} = {ndcg_k:.4f}")
            
            summary_row[f"P@{k}"] = round(p_k, 4)
            summary_row[f"R@{k}"] = round(r_k, 4)
            summary_row[f"nDCG@{k}"] = round(ndcg_k, 4)
        
        summary_data.append(summary_row)
    
    # Export summary CSV
    summary_csv = os.path.join(os.path.dirname(__file__), "compare_summary.csv")
    if summary_data:
        keys = summary_data[0].keys()
        with open(summary_csv, 'w', newline='', encoding='utf-8-sig') as f:
            dict_writer = csv.DictWriter(f, keys)
            dict_writer.writeheader()
            dict_writer.writerows(summary_data)
        print(f"\n✅ Báo cáo tóm tắt: {summary_csv}")
    
    # Export detailed CSV
    detailed_csv = os.path.join(os.path.dirname(__file__), "compare_details.csv")
    all_details = []
    for mode in modes:
        all_details.extend(mode_results[mode]["details"])
    
    if all_details:
        keys = all_details[0].keys()
        with open(detailed_csv, 'w', newline='', encoding='utf-8-sig') as f:
            dict_writer = csv.DictWriter(f, keys)
            dict_writer.writeheader()
            dict_writer.writerows(all_details)
        print(f"✅ Báo cáo chi tiết: {detailed_csv}")
    
    print("\n" + "="*80)
    print("✅ Hoàn tất so sánh. Dữ liệu sẵn sàng cho báo cáo.")
    print("="*80 + "\n")
    
    return mode_results

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Compare search modes")
    parser.add_argument("--modes", nargs="+", default=["keyword", "semantic", "hybrid"],
                        help="Modes to compare (keyword, semantic, hybrid, hybrid_no_rerank)")
    parser.add_argument("--questions", default=None,
                        help="Path to the questions JSON file (defaults to qa_ground_truth.json)")
    args = parser.parse_args()
    
    print("=== CHƯƠNG TRÌNH SO SÁNH ĐA CHẾ ĐỘ TÌM KIẾM ===\n")
    searcher = BookSearcher()
    evaluate_all_modes(searcher, modes=args.modes, questions_path=args.questions)
    print("✅ Chương trình kết thúc.")
