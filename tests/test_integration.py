import unittest
import requests
import time

BASE_URL = "http://localhost:8000"

class TestSmartLibraryAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        print(f"Waiting for API {BASE_URL} to be ready...")
        for _ in range(15):
            try:
                if requests.get(f"{BASE_URL}/").status_code == 200:
                    print("API is up!")
                    break
            except requests.exceptions.ConnectionError:
                time.sleep(2)
        else:
            raise Exception("API did not start in time. Make sure uvicorn is running.")

        # Đăng nhập lấy Token cho Reader
        try:
            res_reader = requests.post(
                f"{BASE_URL}/auth/login-json", 
                json={"username": "reader", "password": "reader123"}
            )
            if res_reader.status_code == 200:
                cls.reader_headers = {"Authorization": f"Bearer {res_reader.json()['access_token']}"}
            else:
                cls.reader_headers = {}
        except Exception:
            cls.reader_headers = {}

        # Đăng nhập lấy Token cho Admin
        try:
            res_admin = requests.post(
                f"{BASE_URL}/auth/login-json", 
                json={"username": "admin", "password": "admin123"}
            )
            if res_admin.status_code == 200:
                cls.admin_headers = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}
            else:
                cls.admin_headers = {}
        except Exception:
            cls.admin_headers = {}

    def test_root_endpoint(self):
        """Test the root endpoint for API info."""
        res = requests.get(f"{BASE_URL}/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("status", res.json())
        self.assertEqual(res.json()["status"], "online")

    def test_search_general_intent(self):
        """Test a general search query."""
        params = {"q": "hoàng tử", "limit": 3}
        res = requests.get(f"{BASE_URL}/search", params=params, headers=self.reader_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["query"], "hoàng tử")
        self.assertIn("intent", data)
        self.assertIn("status", data)
        self.assertTrue(isinstance(data["results"], list))

    def test_search_author_intent(self):
        """Test a search query intended for author search."""
        params = {"q": "tác giả của Moby Dick là ai", "limit": 1}
        res = requests.get(f"{BASE_URL}/search", params=params, headers=self.reader_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["intent"], "author_search")
        if data["results"]:
            self.assertIn("author", data["results"][0])

    def test_search_summarize_intent(self):
        """Test a search query intended for summarize."""
        params = {"q": "tóm tắt sách Đắc Nhân Tâm", "limit": 1}
        res = requests.get(f"{BASE_URL}/search", params=params, headers=self.reader_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["intent"], "summarize")

    def test_get_books(self):
        """Test retrieving all books from the cache."""
        res = requests.get(f"{BASE_URL}/books", headers=self.reader_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Chấp nhận cấu trúc phân trang LibraryResponse: { total, page, limit, books }
        self.assertIn("books", data)
        self.assertTrue(isinstance(data["books"], list))
        if data["books"]:
            self.assertIn("book_id", data["books"][0])

    def test_get_filters(self):
        """Test retrieving filter options (categories and languages)."""
        res = requests.get(f"{BASE_URL}/filters", headers=self.reader_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("categories", data)
        self.assertIn("languages", data)
        self.assertIsInstance(data["categories"], list)
        self.assertIsInstance(data["languages"], list)

    def test_search_with_filters(self):
        """Test searching with category and language filters."""
        params = {"q": "love", "limit": 2, "language": "en"}
        res = requests.get(f"{BASE_URL}/search", params=params, headers=self.reader_headers)
        self.assertEqual(res.status_code, 200)

    def test_history_endpoints(self):
        """Test fetching and clearing search history."""
        # 1. First make a search to guarantee history exists
        requests.get(f"{BASE_URL}/search", params={"q": "test query for history"}, headers=self.reader_headers)
        
        # 2. Fetch history (yêu cầu quyền Admin)
        res = requests.get(f"{BASE_URL}/history", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) > 0)
        
        # 3. Clear history (nếu cần test delete thì có thể bỏ comment, tạm thời pass)
        pass

if __name__ == "__main__":
    unittest.main(verbosity=2)
