import urllib.request
import urllib.error
import json

try:
    req = urllib.request.urlopen('http://localhost:8000/book/en_11_alice_in_wonderland_lewis_carroll/content?page=1&page_size=5')
    print("SUCCESS")
    data = json.loads(req.read())
    print("Keys:", data.keys())
    print("Content length:", len(data['content']))
    print("Content snippet:", str(data['content'])[:100])
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print(e.read().decode())
except Exception as e:
    print("OTHER ERROR:", e)
