# BỘ CÂU HỎI THỬ NGHIỆM ĐƯỢC THIẾT KẾ CHO CÁC MÔ HÌNH RIÊNG BIỆT

Bộ câu hỏi này được phân loại chi tiết nhằm tối ưu hóa thế mạnh của từng chế độ tìm kiếm, đồng thời làm rõ ranh giới hiệu năng giữa chúng.

---

## 1. NHÓM CÂU HỎI TẬP TRUNG CHO KEYWORD SEARCH (BM25)
**Đặc trưng:** Chứa các tên riêng cụ thể, mã sách, tác giả hoặc năm xuất bản độc nhất. BM25 sẽ hoạt động nhanh nhất và đạt Rank 1 tuyệt đối nhờ cơ chế khớp từ khóa chính xác.

| STT | Câu hỏi kiểm thử | Sách mục tiêu kỳ vọng (Expected Book) | Giải thích kỹ thuật |
| :---: | :--- | :--- | :--- |
| **Q1** | "Tìm sách của tác giả Ian Sommerville xuất bản năm 2011" | **Software Engineering** | Chứa từ khóa định danh tác giả riêng biệt và năm xuất bản cụ thể. |
| **Q2** | "Sách The Digital Economy 20th Anniversary Edition của Don Tapscott" | **The Digital Economy 20th Anniversary Edition Rethinking Promise and Peril...** | Chứa tiêu đề dài, viết hoa đặc trưng và tên tác giả. |
| **Q3** | "Tác phẩm khảo cứu Việt Nam Phong Tục của tác giả Phan Kế Bính" | **VIỆT NAM PHONG TỤC** | Khớp chính xác tên riêng tác giả tiếng Việt và tên sách. |
| **Q4** | "Grimm's Fairy Tales by The Brothers Grimm" | **Grimm's Fairy Tales** | Khớp chính xác tiêu đề và tên tác giả bằng tiếng Anh để tránh nhiễu từ dừng. |
| **Q5** | "Sách tiểu sử Steve Jobs do Walter Isaacson viết" | **Steve Jobs** | Tên nhân vật nổi tiếng kết hợp tên tác giả cụ thể. |

---

## 2. NHÓM CÂU HỎI TẬP TRUNG CHO SEMANTIC SEARCH (Đa câu, giàu ngữ nghĩa)
**Đặc trưng:** Câu hỏi gồm nhiều câu, mô tả dài, giàu sắc thái ngữ nghĩa, ẩn dụ hoặc dịch nghĩa gián tiếp. **Hoàn toàn không chứa** các từ khóa trùng khớp trong tựa sách hay tóm tắt của sách, khiến BM25 bị **MISS** nhưng Semantic Search tìm thấy dễ dàng.

| STT | Câu hỏi kiểm thử (Đa câu, Giàu ngữ nghĩa) | Sách mục tiêu kỳ vọng (Expected Book) | Giải thích kỹ thuật |
| :---: | :--- | :--- | :--- |
| **Q6** | "Câu chuyện kể về cuộc hành trình kỳ lạ của một cô bé đuổi theo sinh vật có chiếc đồng hồ bỏ túi. Cô bé vô tình bị rơi xuống một cái giếng sâu hoang dã rồi lạc vào một thế giới kỳ lạ với bữa tiệc trà điên rồ và những quân bài biết nói." | **Alice’s Adventures in Wonderland** | Không chứa từ khóa "Alice", "Wonderland", "hang thỏ". Thay thế bằng mô tả chuỗi hành động hành trình và bữa tiệc trà kỳ diệu. |
| **Q7** | "Tác phẩm kinh điển mô tả những giằng xé nội tâm đầy đau đớn của một chàng sinh viên nghèo khổ sau khi thực hiện hành vi phạm tội giết người. Anh ta liên tục rơi vào trạng thái hoảng loạn và phải lựa chọn giữa việc tự thú hay tiếp tục che giấu tội lỗi trước sự truy lùng của cảnh sát." | **Crime and Punishment** | Không chứa từ "Crime", "Punishment", "Raskolnikov". Dùng các cụm từ đồng nghĩa mô tả tâm lý: "giằng xé nội tâm", "hành vi phạm tội giết người", "che giấu tội lỗi". |
| **Q8** | "Cuốn sách hướng dẫn con người cách nhìn nhận về sự vô thường của cuộc đời và chuẩn bị tâm lý cho thời khắc lìa trần. Tác phẩm đi sâu vào các nghi lễ tâm linh, trạng thái trung gian của cái chết và khái niệm luân hồi chuyển kiếp." | **The Tibetan Book of Living and Dying** | Không chứa từ "Tibetan", "Living", "Dying". Thay thế bằng các khái niệm tôn giáo: "vô thường", "lìa trần", "luân hồi chuyển kiếp", "trạng thái trung gian". |
| **Q9** | "Tập tùy bút sâu sắc ghi lại những suy ngẫm của một nữ nhà văn châu Âu về những ngày tháng bị giam cầm tù đày. Tác phẩm tôn vinh tự do nội tâm, thái độ dũng cảm chấp nhận định mệnh và nghị lực phi thường vượt qua mọi nghịch cảnh cuộc sống." | **CHẤP NHẬN CUỘC ĐỜI** | Không chứa tiêu đề sách. Thay thế bằng "tự do nội tâm", "chấp nhận định mệnh", "nghịch cảnh cuộc sống" để ánh xạ đến nội dung tinh thần của tác phẩm. |
| **Q10** | "Tác phẩm trinh thám bắt đầu bằng một vụ án mạng đầy bí ẩn diễn ra tại London cổ kính. Câu chuyện giới thiệu lần đầu tiên sự xuất hiện của một thám tử lập dị có óc quan sát thiên tài cùng người bạn thân là vị bác sĩ quân y vừa trở về từ chiến trường hoang tàn." | **A Study in Scarlet** | Không chứa từ "Sherlock Holmes", "John Watson" hay tiêu đề "A Study in Scarlet". Dùng mô tả đặc trưng: "thám tử lập dị", "bác sĩ quân y trở về từ chiến trường". |

---

## 3. NHÓM CÂU HỎI TẬP TRUNG CHO HYBRID SEARCH (Kết hợp Reranker)
**Đặc trưng:** Yêu cầu sự kết hợp của cả hai thế mạnh: vừa cần từ khóa neo (keyword anchor) để khoanh vùng và phân biệt giữa các sách có cùng thể loại/tác giả, vừa cần hiểu ngữ nghĩa chi tiết để mô hình Cross-Encoder Reranker chọn đúng cuốn sách mục tiêu ở vị trí số 1.

| STT | Câu hỏi kiểm thử | Sách mục tiêu kỳ vọng (Expected Book) | Giải thích kỹ thuật |
| :---: | :--- | :--- | :--- |
| **Q11** | "Tìm sách thám tử Sherlock Holmes của tác giả Conan Doyle nhưng kể về vụ án mạng liên quan đến lời đồn về con quái thú phát sáng hung tợn ở vùng đầm lầy sương mù." | **The Hound of the Baskervilles** | Từ khóa "Sherlock Holmes", "Conan Doyle" giúp BM25 gom nhóm các sách trinh thám của Doyle. Ngữ nghĩa "quái thú vùng đầm lầy" giúp Reranker chọn đúng cuốn *Hound of the Baskervilles* thay vì các tập truyện ngắn khác. |
| **Q12** | "Cuốn sách viết về cuộc đời Steve Jobs của nhà văn Walter Isaacson nhưng tập trung phân tích sâu sắc tư duy quản trị và thiết kế đột phá chứ không phải cuốn tiểu sử thông thường." | **Inside Steve's Brain** | Từ khóa "Steve Jobs" kéo các sách liên quan đến Jobs. Ngữ nghĩa "tư duy thiết kế đột phá chứ không phải tiểu sử thông thường" giúp Reranker phân biệt giữa cuốn tiểu sử của Walter Isaacson và cuốn phân tích tư duy *Inside Steve's Brain*. |
| **Q13** | "Sách triết học nhập môn xuất bản năm 1969 giới thiệu các trường phái nhận thức luận cơ bản." | **Triết Học Nhập Môn** | Từ khóa "1969" giúp lọc chính xác năm. Ngữ nghĩa "triết học nhập môn", "nhận thức luận" giúp Reranker định vị đúng cuốn của tác giả Karl Jaspers. |
| **Q14** | "Cuốn sách của học giả Nguyễn Hiến Lê viết năm 1954 hướng dẫn phương pháp tự trau dồi tri thức và rèn luyện tư duy suốt đời." | **Tự học, một nhu cầu của thời đại** | Từ khóa "Nguyễn Hiến Lê", "1954" làm mốc lọc. Ngữ nghĩa "tự trau dồi tri thức suốt đời" khớp ngữ cảnh cuốn *Tự học*. |
| **Q15** | "Sách hướng dẫn thắt nút dây dù thủ công phục vụ sinh tồn xuất bản năm 2014." | **Paracord Bracelet Instructions** | Từ khóa "dây dù", "2014" neo giữ. Ngữ nghĩa "thắt nút thủ công", "sinh tồn" khớp cuốn sách đan vòng paracord. |
