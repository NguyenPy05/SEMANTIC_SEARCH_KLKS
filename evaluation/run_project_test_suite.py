#!/usr/bin/env python3
import argparse
import csv
import json
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests


def normalize_text(value: str) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFD", value)
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = normalized.replace("đ", "d").replace("Đ", "D")
    return " ".join(normalized.lower().strip().split())


def title_match(expected: str, actual: str) -> bool:
    e = normalize_text(expected)
    a = normalize_text(actual)
    if not e or not a:
        return False
    return (e in a) or (a in e)


def check_endpoint(name: str, fn) -> Dict[str, Any]:
    start = time.time()
    try:
        ok, detail = fn()
        return {
            "name": name,
            "pass": bool(ok),
            "detail": detail,
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
    except Exception as exc:
        return {
            "name": name,
            "pass": False,
            "detail": f"Exception: {exc}",
            "latency_ms": round((time.time() - start) * 1000, 2),
        }


def find_match_rank(expected_title: str, results: List[Dict[str, Any]]) -> Tuple[Optional[int], str]:
    if not expected_title:
        return None, ""
    for idx, item in enumerate(results, start=1):
        title = str(item.get("title", ""))
        if title_match(expected_title, title):
            return idx, title
    return None, ""


def run_functional_tests(base_url: str) -> Tuple[List[Dict[str, Any]], str]:
    session = requests.Session()
    session.timeout = 90

    health_resp = session.get(f"{base_url}/", timeout=90)
    if health_resp.status_code != 200:
        raise RuntimeError(f"API health check failed: HTTP {health_resp.status_code}")

    tests: List[Dict[str, Any]] = []

    tests.append(
        check_endpoint(
            "GET /",
            lambda: (
                session.get(f"{base_url}/", timeout=90).status_code == 200,
                "API online",
            ),
        )
    )

    tests.append(
        check_endpoint(
            "GET /filters",
            lambda: (
                (
                    (r := session.get(f"{base_url}/filters", timeout=90)).status_code == 200
                    and len(r.json().get("categories", [])) > 0
                    and len(r.json().get("languages", [])) > 0
                ),
                "Filters available",
            ),
        )
    )

    books_cache: Dict[str, Any] = {"book_id": ""}

    def _books_test():
        r = session.get(f"{base_url}/books", timeout=90)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        data = r.json()
        if not isinstance(data, list) or not data:
            return False, "Books list empty"
        books_cache["book_id"] = data[0].get("book_id", "")
        return bool(books_cache["book_id"]), f"books={len(data)}"

    tests.append(check_endpoint("GET /books", _books_test))

    tests.append(
        check_endpoint(
            "GET /book/{id}",
            lambda: (
                (
                    books_cache["book_id"]
                    and session.get(f"{base_url}/book/{books_cache['book_id']}", timeout=90).status_code == 200
                ),
                f"book_id={books_cache['book_id']}",
            ),
        )
    )

    tests.append(
        check_endpoint(
            "GET /book/{id}/content",
            lambda: (
                (
                    books_cache["book_id"]
                    and session.get(
                        f"{base_url}/book/{books_cache['book_id']}/content",
                        params={"page": 1, "page_size": 20},
                        timeout=90,
                    ).status_code
                    == 200
                ),
                "Reader content endpoint works",
            ),
        )
    )

    tests.append(
        check_endpoint(
            "GET /history",
            lambda: (
                session.get(f"{base_url}/history", timeout=90).status_code == 200,
                "History endpoint works",
            ),
        )
    )

    for mode in ["keyword", "semantic", "hybrid", "hybrid_no_rerank"]:
        tests.append(
            check_endpoint(
                f"GET /search mode={mode}",
                lambda mode=mode: (
                    (
                        (r := session.get(
                            f"{base_url}/search",
                            params={"q": "Sherlock Holmes", "limit": 5, "mode": mode},
                            timeout=90,
                        )).status_code
                        == 200
                        and isinstance(r.json().get("results", []), list)
                    ),
                    "Search response schema ok",
                ),
            )
        )

    return tests, books_cache["book_id"]


def run_model_tests(
    base_url: str,
    questions_path: Path,
    modes: List[str],
    limit: int,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    with questions_path.open("r", encoding="utf-8") as f:
        questions = json.load(f)

    session = requests.Session()
    details: List[Dict[str, Any]] = []

    for q in questions:
        qid = q.get("id", "")
        query = q.get("query", "")
        expected_title = q.get("expected_title", "")
        expected_status = q.get("expected_status", "good")

        for mode in modes:
            start = time.time()
            try:
                resp = session.get(
                    f"{base_url}/search",
                    params={"q": query, "limit": limit, "mode": mode},
                    timeout=90,
                )
                latency_ms = round((time.time() - start) * 1000, 2)

                if resp.status_code != 200:
                    details.append(
                        {
                            "id": qid,
                            "mode": mode,
                            "query": query,
                            "expected_title": expected_title,
                            "expected_status": expected_status,
                            "actual_status": f"http_{resp.status_code}",
                            "actual_top1": "",
                            "matched_rank": "",
                            "pass": False,
                            "reason": "HTTP error",
                            "latency_ms": latency_ms,
                        }
                    )
                    continue

                data = resp.json()
                results = data.get("results", [])
                actual_status = str(data.get("status", ""))
                actual_top1 = results[0].get("title", "") if results else ""
                matched_rank, matched_title = find_match_rank(expected_title, results)

                if expected_status == "no_match":
                    passed = (actual_status == "no_match") or (not results)
                    reason = "Expected no_match"
                else:
                    passed = matched_rank == 1
                    reason = "Expected top1 exact/near title match"

                details.append(
                    {
                        "id": qid,
                        "mode": mode,
                        "query": query,
                        "expected_title": expected_title,
                        "expected_status": expected_status,
                        "actual_status": actual_status,
                        "actual_top1": actual_top1,
                        "matched_rank": matched_rank or "",
                        "matched_title": matched_title,
                        "pass": passed,
                        "reason": reason,
                        "latency_ms": latency_ms,
                    }
                )

            except Exception as exc:
                details.append(
                    {
                        "id": qid,
                        "mode": mode,
                        "query": query,
                        "expected_title": expected_title,
                        "expected_status": expected_status,
                        "actual_status": "exception",
                        "actual_top1": "",
                        "matched_rank": "",
                        "matched_title": "",
                        "pass": False,
                        "reason": f"Exception: {exc}",
                        "latency_ms": 0,
                    }
                )

    summary: List[Dict[str, Any]] = []
    for mode in modes:
        rows = [d for d in details if d["mode"] == mode]
        total = len(rows)
        passed = sum(1 for d in rows if d["pass"])
        top1_hits = sum(1 for d in rows if str(d.get("matched_rank", "")) == "1")
        top5_hits = sum(
            1
            for d in rows
            if str(d.get("matched_rank", "")).isdigit() and 1 <= int(d["matched_rank"]) <= 5
        )
        latencies = [float(d["latency_ms"]) for d in rows if float(d.get("latency_ms", 0)) > 0]
        avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0.0

        summary.append(
            {
                "mode": mode,
                "total": total,
                "passed": passed,
                "pass_rate": round((passed / total) * 100, 2) if total else 0.0,
                "hit_at_1": round((top1_hits / total) * 100, 2) if total else 0.0,
                "hit_at_5": round((top5_hits / total) * 100, 2) if total else 0.0,
                "avg_latency_ms": avg_latency,
            }
        )

    return details, summary


def write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run project functional tests + model expected-vs-actual tests")
    parser.add_argument("--base-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument(
        "--questions",
        default=str(Path(__file__).with_name("model_test_questions.json")),
        help="Path to model test question list JSON",
    )
    parser.add_argument(
        "--modes",
        nargs="+",
        default=["keyword", "semantic", "hybrid", "hybrid_no_rerank"],
        help="Search modes to test",
    )
    parser.add_argument("--limit", type=int, default=5, help="Top-K limit for search")
    parser.add_argument(
        "--out-dir",
        default=str(Path(__file__).with_name("reports")),
        help="Output directory for reports",
    )
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    started = time.time()

    print("=== RUN PROJECT TEST SUITE ===")
    print(f"API: {args.base_url}")
    print(f"Questions: {args.questions}")
    print(f"Modes: {', '.join(args.modes)}")

    functional_results, sample_book_id = run_functional_tests(args.base_url)
    details, model_summary = run_model_tests(
        base_url=args.base_url,
        questions_path=Path(args.questions),
        modes=args.modes,
        limit=args.limit,
    )

    functional_pass = sum(1 for x in functional_results if x["pass"])
    functional_total = len(functional_results)

    details_csv = out_dir / "model_test_details.csv"
    summary_csv = out_dir / "model_test_summary.csv"
    functional_csv = out_dir / "functional_test_results.csv"
    final_json = out_dir / "final_test_result.json"

    write_csv(details_csv, details)
    write_csv(summary_csv, model_summary)
    write_csv(functional_csv, functional_results)

    best_mode = max(model_summary, key=lambda x: x["pass_rate"]) if model_summary else None
    overall = {
        "api_base_url": args.base_url,
        "sample_book_id": sample_book_id,
        "functional": {
            "passed": functional_pass,
            "total": functional_total,
            "pass_rate": round((functional_pass / functional_total) * 100, 2) if functional_total else 0.0,
        },
        "model_summary": model_summary,
        "best_mode": best_mode,
        "generated_files": {
            "functional_csv": str(functional_csv),
            "model_summary_csv": str(summary_csv),
            "model_details_csv": str(details_csv),
        },
        "runtime_seconds": round(time.time() - started, 2),
    }

    final_json.write_text(json.dumps(overall, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n=== FINAL RESULT ===")
    print(f"Functional tests: {functional_pass}/{functional_total} passed")
    for item in model_summary:
        print(
            f"- {item['mode']}: pass_rate={item['pass_rate']}% | "
            f"hit@1={item['hit_at_1']}% | hit@5={item['hit_at_5']}% | "
            f"avg_latency={item['avg_latency_ms']}ms"
        )

    if best_mode:
        print(f"Best mode by pass_rate: {best_mode['mode']} ({best_mode['pass_rate']}%)")

    print(f"\nReports written to: {out_dir}")
    print(f"Final JSON: {final_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
