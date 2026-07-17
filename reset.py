from qdrant_client import QdrantClient

COLLECTION_NAME = "books_semantic_search"

client = QdrantClient(host="localhost", port=6333)

if client.collection_exists(COLLECTION_NAME):
    client.delete_collection(COLLECTION_NAME)
    print("Deleted collection:", COLLECTION_NAME)
else:
    print("Collection does not exist")