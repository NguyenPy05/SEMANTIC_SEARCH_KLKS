import os
import requests
from tqdm import tqdm

os.makedirs("data/books", exist_ok=True)

books_en = {
    "1342": "Pride_and_Prejudice_Jane_Austen",
    "84": "Frankenstein_Mary_Shelley",
    "11": "Alice_in_Wonderland_Lewis_Carroll",
    "2701": "Moby_Dick_Herman_Melville",
    "98": "A_Tale_of_Two_Cities_Charles_Dickens",
    "76": "Adventures_of_Huckleberry_Finn_Mark_Twain",
    "74": "Adventures_of_Tom_Sawyer_Mark_Twain",
    "46": "A_Christmas_Carol_Charles_Dickens",
    "1661": "Adventures_of_Sherlock_Holmes_Arthur_Conan_Doyle",
    "2852": "Hound_of_the_Baskervilles_Arthur_Conan_Doyle",
    "35": "The_Time_Machine_HG_Wells",
    "36": "The_War_of_the_Worlds_HG_Wells",
    "55": "The_Wonderful_Wizard_of_Oz_L_Frank_Baum",
    "16": "Peter_Pan_JM_Barrie",
    "829": "Gullivers_Travels_Jonathan_Swift",
    "5200": "Metamorphosis_Franz_Kafka",
    "1232": "The_Prince_Niccolo_Machiavelli",
    "25344": "The_Art_of_War_Sun_Tzu",
    "768": "Wuthering_Heights_Emily_Bronte",
    "145": "Middlemarch_George_Eliot",
    "2554": "Crime_and_Punishment_Fyodor_Dostoevsky",
    "1400": "Great_Expectations_Charles_Dickens",
    "244": "Gullivers_Travels_Another_Edition", 
}

def download_book(book_id: str, title: str):
    # Ưu tiên UTF-8 plain text
    url = f"https://www.gutenberg.org/files/{book_id}/{book_id}-0.txt"
    print(f"Đang tải: {title} ...")
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Lưu với tên rõ ràng
        filename = f"data/books/en_{book_id}_{title}.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(response.text)
        
        print(f"✅ Hoàn tất: {title}")
        return True
    except Exception as e:
        print(f"❌ Lỗi tải {title}: {e}")
        return False

if __name__ == "__main__":
    print("=== TẢI SÁCH TIẾNG ANH TỪ PROJECT GUTENBERG ===\n")
    success = 0
    for book_id, title in tqdm(books_en.items()):
        if download_book(book_id, title):
            success += 1
    print(f"\n✅ Hoàn tất! Tải thành công {success}/{len(books_en)} cuốn sách tiếng Anh.")