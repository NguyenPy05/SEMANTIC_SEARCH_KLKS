import sys
import os
sys.path.append(os.getcwd())
from src.search import BookSearcher

searcher = BookSearcher()
query = "Những tác phẩm tiêu biểu của Lewis Carroll trong thư viện?"
results, time_ms, intent, status = searcher.search(query, limit=5)

print(f"Query: {query}")
print(f"Intent: {intent}")
print(f"Status: {status}")
print("-" * 50)
for i, doc in enumerate(results):
    print(f"Rank {i+1}: {doc['title']} by {doc['author']}")
    print(f"Score: {doc['score']:.4f}")
    # print(f"Snippet: {doc['text'][:100]}...")
    print("-" * 20)
