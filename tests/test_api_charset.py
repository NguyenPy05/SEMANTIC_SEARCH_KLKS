"""Smoke test JSON endpoint charset headers.

Usage:
  python scratch/test_api_charset.py
  python scratch/test_api_charset.py --base-url http://localhost:8000 --verbose
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import requests


@dataclass
class TestResult:
    method: str
    path: str
    url: str
    status_code: Optional[int]
    content_type: str
    has_json: bool
    has_utf8: bool
    ok: bool
    note: str = ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate UTF-8 charset on JSON API responses")
    parser.add_argument("--base-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--timeout", type=float, default=20.0, help="Request timeout in seconds")
    parser.add_argument("--verbose", action="store_true", help="Print additional debug info")
    return parser.parse_args()


def normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def get_openapi_spec(session: requests.Session, base_url: str, timeout: float) -> dict:
    response = session.get(f"{base_url}/openapi.json", timeout=timeout)
    response.raise_for_status()
    return response.json()


def extract_json_get_endpoints(spec: dict) -> List[str]:
    endpoints: List[str] = []
    paths = spec.get("paths", {})
    for path, ops in paths.items():
        get_op = (ops or {}).get("get")
        if not get_op:
            continue
        responses = get_op.get("responses", {})
        # Consider endpoint JSON if any response content includes application/json.
        is_json_endpoint = False
        for resp in responses.values():
            content = (resp or {}).get("content", {})
            for media_type in content.keys():
                if media_type.startswith("application/json"):
                    is_json_endpoint = True
                    break
            if is_json_endpoint:
                break
        if is_json_endpoint:
            endpoints.append(path)
    return sorted(endpoints)


def derive_book_id_from_search_payload(search_payload: dict) -> Optional[str]:
    results = search_payload.get("results") or []
    if not results:
        return None

    chunk_id = results[0].get("chunk_id")
    if not chunk_id or not isinstance(chunk_id, str):
        return None

    # Typical chunk_id pattern: <book_id>_0001
    match = re.match(r"^(.*)_\d{4}$", chunk_id)
    if match:
        return match.group(1)
    return None


def request_endpoint(
    session: requests.Session,
    base_url: str,
    path: str,
    timeout: float,
    context: Dict[str, str],
) -> Tuple[requests.Response, str]:
    url = f"{base_url}{path}"

    if path == "/search":
        response = session.get(url, params={"q": "Sherlock", "limit": 1}, timeout=timeout)
        if response.ok:
            payload = response.json()
            maybe_book_id = derive_book_id_from_search_payload(payload)
            if maybe_book_id:
                context["book_id"] = maybe_book_id
        return response, url

    if path == "/book/{book_id}":
        book_id = context.get("book_id")
        if not book_id:
            # Try fetch from /search once to get a valid dynamic id.
            search_response = session.get(
                f"{base_url}/search",
                params={"q": "Sherlock", "limit": 1},
                timeout=timeout,
            )
            search_response.raise_for_status()
            maybe_book_id = derive_book_id_from_search_payload(search_response.json())
            if not maybe_book_id:
                raise RuntimeError("Could not derive book_id from /search response")
            context["book_id"] = maybe_book_id
            book_id = maybe_book_id
        concrete_path = f"/book/{book_id}"
        concrete_url = f"{base_url}{concrete_path}"
        return session.get(concrete_url, timeout=timeout), concrete_url

    return session.get(url, timeout=timeout), url


def evaluate_response(method: str, path: str, url: str, response: requests.Response) -> TestResult:
    content_type = response.headers.get("content-type", "")
    normalized = content_type.lower()
    has_json = "application/json" in normalized
    has_utf8 = "charset=utf-8" in normalized
    ok = response.ok and has_json and has_utf8

    note = ""
    if not response.ok:
        note = f"HTTP {response.status_code}"
    elif not has_json:
        note = "Missing application/json in Content-Type"
    elif not has_utf8:
        note = "Missing charset=utf-8 in Content-Type"

    return TestResult(
        method=method,
        path=path,
        url=url,
        status_code=response.status_code,
        content_type=content_type,
        has_json=has_json,
        has_utf8=has_utf8,
        ok=ok,
        note=note,
    )


def print_results(results: List[TestResult]) -> None:
    print("\n=== Charset Validation Results ===")
    for item in results:
        status = "PASS" if item.ok else "FAIL"
        print(f"[{status}] {item.method} {item.path} -> {item.status_code}")
        print(f"       URL: {item.url}")
        print(f"       Content-Type: {item.content_type or '<missing>'}")
        if item.note:
            print(f"       Note: {item.note}")


def main() -> int:
    args = parse_args()
    base_url = normalize_base_url(args.base_url)
    session = requests.Session()

    try:
        spec = get_openapi_spec(session, base_url, args.timeout)
    except Exception as exc:
        print(f"ERROR: Could not load OpenAPI spec from {base_url}/openapi.json: {exc}")
        return 2

    json_endpoints = extract_json_get_endpoints(spec)
    if not json_endpoints:
        print("ERROR: No JSON GET endpoints found in OpenAPI spec.")
        return 2

    if args.verbose:
        print("JSON endpoints discovered:")
        for ep in json_endpoints:
            print(f"- {ep}")

    context: Dict[str, str] = {}
    results: List[TestResult] = []

    for path in json_endpoints:
        try:
            response, used_url = request_endpoint(session, base_url, path, args.timeout, context)
            result = evaluate_response("GET", path, used_url, response)
        except Exception as exc:
            result = TestResult(
                method="GET",
                path=path,
                url=f"{base_url}{path}",
                status_code=None,
                content_type="",
                has_json=False,
                has_utf8=False,
                ok=False,
                note=str(exc),
            )
        results.append(result)

    print_results(results)

    total = len(results)
    passed = sum(1 for r in results if r.ok)
    failed = total - passed
    print(f"\nSummary: {passed}/{total} passed, {failed} failed")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
