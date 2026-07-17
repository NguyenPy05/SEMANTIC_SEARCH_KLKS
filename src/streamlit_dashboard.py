import streamlit as st
import requests
import time
import pandas as pd
import json

# ====================== CẤU HÌNH & GIAO DIỆN CAO CẤP ======================
API_BASE_URL = "http://localhost:8000"

st.set_page_config(
    page_title="Thư Viện AI - Semantic Search",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Nhúng Custom CSS Cao cấp (Glassmorphism & Gradients)
st.markdown("""
<style>
    /* Tổng quan */
    .stApp {
        background-color: #0d1117;
        font-family: 'Inter', sans-serif;
    }
    
    /* Box kết quả (Glassmorphism) */
    .premium-card {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 20px;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease-in-out, box-shadow 0.2s;
    }
    .premium-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 40px rgba(0, 242, 254, 0.15);
        border: 1px solid rgba(0, 242, 254, 0.3);
    }
    
    /* Đầu mục */
    .title-gradient {
        background: linear-gradient(90deg, #00f2fe 0%, #4facfe 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
        font-size: 28px;
        margin-bottom: 10px;
    }
    
    /* Badges */
    .badge-intent {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: bold;
        display: inline-block;
        margin-bottom: 15px;
        box-shadow: 0 4px 15px rgba(118, 75, 162, 0.4);
    }
    .badge-score {
        background: #161b22;
        color: #4facfe;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 14px;
        font-family: monospace;
        border: 1px solid #30363d;
    }
    
    /* Highlight vùng trả lời theo yêu cầu */
    .focus-box {
        background: linear-gradient(to right, rgba(0, 242, 254, 0.1), transparent);
        border-left: 4px solid #00f2fe;
        padding: 15px 20px;
        border-radius: 0 8px 8px 0;
        margin: 15px 0;
    }
    .focus-text {
        font-size: 18px;
        color: #e6edf3;
        line-height: 1.6;
    }
    .focus-author {
        font-size: 24px;
        font-weight: 800;
        color: #00f2fe;
        letter-spacing: 1px;
    }
    
    /* Button Recomendation */
    div.stButton > button {
        border-radius: 8px;
        transition: all 0.3s ease;
    }
    div.stButton > button:hover {
        transform: scale(1.02);
    }
    
    .xai-title {
        font-size: 13px; color: #8b949e; margin-bottom: -5px; margin-top: 10px;
    }
</style>
""", unsafe_allow_html=True)

# Khởi tạo trạng thái thanh tìm kiếm lưu trữ Session (Cho tính năng Suggestion)
if 'search_query' not in st.session_state:
    st.session_state['search_query'] = ""

# ====================== SIDEBAR ======================
with st.sidebar:
    st.markdown("<h2 style='text-align: center; color: white;'>AI LIBRARY</h2>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #8b949e;'>Semantic Search Engine</p>", unsafe_allow_html=True)
    st.markdown("---")
    
    tab_choice = st.radio(
        "ĐIỀU HƯỚNG CHỨC NĂNG",
        ["🔍 Trợ lý Tìm kiếm AI", "📋 Toàn bộ Dữ liệu", "📈 Tải file Đánh giá (CSV)", "🧠 Kiến trúc HT & XAI"],
        label_visibility="collapsed"
    )
    st.markdown("---")
    st.info("Hệ thống tích hợp BGE-M3 Đa ngôn ngữ và Hybrid Search.")


# ====================== TAB 1: TÌM KIẾM ĐA NHIỆM ======================
if tab_choice == "🔍 Trợ lý Tìm kiếm AI":
    st.markdown("<h1 class='title-gradient'>🔍 Trợ lí AI Tìm Kiếm Thông Minh</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #8b949e;'>Hệ thống tự động nhận diện Intent và giải thích mức độ khớp của ngữ nghĩa (XAI).</p>", unsafe_allow_html=True)
    
    # Khung tìm kiếm cốt lõi
    def submit_search():
        st.session_state['search_query'] = st.session_state.widget_search
        
    query = st.text_input(
        "Mời nhập yêu cầu của bạn:", 
        value=st.session_state['search_query'],
        key="widget_search",
        on_change=submit_search,
        placeholder="VD: Ai viết Moby Dick? / Cần đọc tóm tắt Peter Pan / Truyện về thám tử tư..."
    )
    
    # Khu vực Bộ Lọc (Glassmorphism expander)
    with st.expander("⚙️ Tùy chỉnh Bộ lọc (Tùy chọn)"):
        col_f1, col_f2, col_f3 = st.columns(3)
        limit_val = col_f1.slider("Giới hạn kết quả trả về", 1, 10, 3)
        cat_options = ["Tất cả", "Kỳ ảo", "Khoa học Viễn tưởng", "Trinh thám", "Văn học cổ điển", "Văn học Việt Nam", "Lịch sử", "Triết học - Giáo dục", "Tâm lý & Kỹ năng", "Kinh tế & Công nghệ"]
        category_sel = col_f2.selectbox("Thể loại", cat_options)
        language_sel = col_f3.selectbox("Ngôn ngữ", ["Tất cả", "vi", "en"])
        
    st.markdown("<br>", unsafe_allow_html=True)
    search_btn = st.button("🚀 Bắt đầu quét dữ liệu", use_container_width=True, type="primary")

    if (search_btn or st.session_state['search_query']) and query.strip():
        with st.spinner("Đang kích hoạt Mạng lưới Neural..."):
            try:
                params = {"q": query, "limit": limit_val}
                if category_sel != "Tất cả": params["category"] = category_sel
                if language_sel != "Tất cả": params["language"] = language_sel
                    
                response = requests.get(f"{API_BASE_URL}/search", params=params, timeout=30)
                
                if response.status_code == 200:
                    data = response.json()
                    intent = data['intent']
                    status = data['status']
                    
                    if status == "no_match" or not data["results"]:
                        st.error("❌ **HỆ THỐNG TỪ CHỐI:** Khớp với màng lọc nhiễu. Hệ thống quyết định vứt bỏ do dưới ngưỡng tin cậy (Out of scope).")
                    else:
                        if status == "low_confidence":
                            st.warning("⚠️ **Cảnh báo AI:** Kết quả này phân bổ dưới ngưỡng 0.5 Sigmoid. Máy tính không hoàn toàn tự tin.")
                        else:
                            st.success(f"⚡ Truy xuất qua ma trận triệu chiều hoàn tất trong **{data['processing_time_ms']} ms**.")

                        # --- RENDER KẾT QUẢ ---
                        for idx, item in enumerate(data["results"]):
                            with st.container():
                                st.markdown("<div class='premium-card'>", unsafe_allow_html=True)
                                
                                # Header Card
                                st.markdown(f"""
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="font-size: 22px; font-weight: 700; color: #e6edf3;">📚 {item['title']}</div>
                                        <div class="badge-score">Reranker Score: {item['score']:.4f}</div>
                                    </div>
                                    <div style="color: #8b949e; font-size: 14px; margin-top: 5px;">
                                        Thể loại: {item.get('category', 'N/A')} | Ngôn ngữ: {item.get('language', 'N/A')}
                                    </div>
                                """, unsafe_allow_html=True)
                                
                                # XỬ LÝ YÊU CẦU ĐẶC BIỆT DỰA VÀO INTENT
                                if intent == "author_search":
                                    st.markdown(f"""
                                        <div class='badge-intent'>📌 Phân tích Intent: Tìm Tác Giả</div>
                                        <div class='focus-box'>
                                            <div style="color:#8b949e">Tác giả của tác phẩm này là:</div>
                                            <div class='focus-author'>{item.get('author', 'Không xác định')}</div>
                                        </div>
                                    """, unsafe_allow_html=True)
                                    
                                elif intent == "summarize":
                                    st.markdown(f"""
                                        <div class='badge-intent'>📝 Phân tích Intent: Yêu Cầu Tóm Tắt</div>
                                        <div class='focus-box'>
                                            <div class='focus-text'>{item.get('summary', 'Chưa có tóm tắt trong CSDL.')}</div>
                                        </div>
                                        <div style="color: #4facfe; font-size: 14px; margin-top:10px;">✍️ Tác giả: {item.get('author', 'Unknown')}</div>
                                    """, unsafe_allow_html=True)
                                    
                                else:
                                    # general_search -> Hiện đầy đủ bối cảnh
                                    st.markdown(f"""
                                        <div class='badge-intent'>🌐 Phân tích Intent: Hybrid Context Search</div>
                                        <div style="margin-top: 15px;">
                                            <span style="color: #4facfe; font-weight: bold;">Tác giả:</span> <span style="color:#e6edf3">{item.get('author', 'Unknown')}</span>
                                        </div>
                                        <div style="background-color: #161b22; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #30363d;">
                                            <div style="color: #8b949e; margin-bottom: 5px; font-size: 14px;">Mảnh văn bản Map với Query (Chunk):</div>
                                            <div style="color: #c9d1d9; line-height: 1.6; font-style: italic;">"{item.get('text', '')}..."</div>
                                        </div>
                                    """, unsafe_allow_html=True)
                                
                                st.markdown("<hr style='border-color: #30363d; margin-top: 20px; margin-bottom: 10px;'>", unsafe_allow_html=True)
                                
                                # TÍNH NĂNG MỚI: XAI & RECOMMENDATION (Trong cùng 1 hàng)
                                col_xai, col_rec = st.columns([7, 3])
                                
                                # XAI Visualization Progress Bar
                                parsed_confidence = float(item['confidence'])
                                rrf_val = item.get('rrf_score', 0)
                                color_pbar = "normal" if parsed_confidence > 0.45 else "error"
                                with col_xai:
                                    st.markdown(f"<div class='xai-title'>🔎 Explainable AI (XAI): Chỉ số tin cậy Semantic Reranker</div>", unsafe_allow_html=True)
                                    st.progress(min(max(parsed_confidence, 0.0), 1.0), text=f"Độ khớp ngữ nghĩa {parsed_confidence*100:.2f}%")
                                    st.markdown(f"<div style='font-size: 11px; color: #8b949e; font-family: monospace;'>Hybrid RRF Retrieval Score: {rrf_val:.4f}</div>", unsafe_allow_html=True)
                                
                                # Nút đề xuất sách tương tự
                                with col_rec:
                                    st.markdown("<br>", unsafe_allow_html=True)
                                    if st.button(f"🔮 Đề xuất sách tương tự", key=f"rec_{idx}", use_container_width=True):
                                        # Gán lại session state và gọi lại hàm query
                                        st.session_state['search_query'] = f"Đề xuất sách có nội dung thuộc mảng {item.get('category')} giống như sách {item['title']} của {item['author']}"
                                        st.rerun() # Refresh màn hình liền lập tức
                                
                                st.markdown("</div>", unsafe_allow_html=True)
                                
                else:
                    st.error(f"Lỗi truy xuất Backend API ({response.status_code})")
                    
            except Exception as e:
                st.error(f"Chưa kết nối được hệ thống AI ({e}). Vui lòng kiểm tra Terminal chạy lệnh uvicorn.")


# ====================== TAB 2: QUẢN LÝ THƯ VIỆN ======================
elif tab_choice == "📋 Toàn bộ Dữ liệu":
    st.markdown("<h1 class='title-gradient'>📋 Bảng Xếp Dữ Liệu Thư Viện</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #8b949e;'>Tra cứu, kiểm tra danh mục toàn bộ sách đã được vector hóa và nạp vào Qdrant.</p>", unsafe_allow_html=True)
    
    try:
        with open("data/books_metadata.json", "r", encoding="utf-8") as f:
            books = json.load(f)
            
        st.info(f"💾 Hệ thống đang lưu trữ **{len(books)}** cuốn sách.")
        
        search_term = st.text_input("🔍 Tra cứu nhanh tên sách hoặc tác giả trong bảng:")
        
        display_data = []
        for b in books:
            match = True
            if search_term:
                search_lower = search_term.lower()
                if search_lower not in b["title"].lower() and search_lower not in b.get("author", "").lower():
                    match = False
            
            if match:
                display_data.append({
                    "Mã Sách": b["book_id"],
                    "Tiêu Đề Tác Phẩm": b["title"],
                    "✍️ Tác Giả": b.get("author", "Chưa rõ"),
                    "🔖 Thể Loại": b.get("category", "N/A"),
                    "🌐 Language": "Tiếng Việt" if b.get("language") == "vi" else "Tiếng Anh",
                    "Số Vectors": b.get("total_chunks", 0)
                })
        
        if display_data:
            df_books = pd.DataFrame(display_data)
            st.dataframe(df_books, use_container_width=True, height=600)
        else:
            st.warning("Không tìm thấy quyển sách nào khớp với từ khóa tra cứu của bạn.")
            
    except FileNotFoundError:
        st.error("Không tìm thấy file Database `data/books_metadata.json`")


# ====================== TAB 3: ĐÁNH GIÁ TỪ FILE CSV ======================
elif tab_choice == "📈 Tải file Đánh giá (CSV)":
    st.markdown("<h1 class='title-gradient'>📈 Đánh Giá Benchmark Từ File CSV</h1>", unsafe_allow_html=True)
    
    uploaded_file = st.file_uploader("Kéo thả hoặc chọn file CSV tại đây", type=['csv'])
    
    if uploaded_file is not None:
        try:
            df = pd.read_csv(uploaded_file)
            st.success("Tải file thành công! Đang phân tích dữ liệu...")
            
            total_queries = len(df)
            avg_latency = df["Độ Trễ (ms)"].mean() if "Độ Trễ (ms)" in df.columns else 0
            
            mrr = 0.0
            p1 = 0
            
            if "Xếp Hạng Tìm Được" in df.columns:
                for rank in df["Xếp Hạng Tìm Được"]:
                    if pd.notna(rank) and str(rank).strip().upper() != "N/A":
                        try:
                            r = int(float(rank))
                            if r > 0:
                                mrr += 1.0 / r
                                if r <= 1: p1 += 1
                        except ValueError:
                            pass
                        
                mrr = mrr / total_queries if total_queries > 0 else 0
                p1 = p1 / total_queries if total_queries > 0 else 0
            
            st.markdown("<div class='premium-card'>", unsafe_allow_html=True)
            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Tổng Số Câu Hỏi", f"{total_queries}")
            col2.metric("Tốc độ trung bình", f"{avg_latency/1000:.2f} s")
            col3.metric("MRR Score", f"{mrr:.4f}")
            col4.metric("Precision @ 1", f"{p1:.4f}")
            st.markdown("</div>", unsafe_allow_html=True)
            
            st.markdown("### Bảng Đối Chiếu Ground Truth Chi Tiết")
            
            def color_rank(val):
                if pd.isna(val) or str(val).strip().upper() == "N/A":
                    return 'color: #f85149; font-weight: bold;' 
                try:
                    r = int(float(val))
                    if r == 1:
                        return 'color: #3fb950; font-weight: bold;' 
                    elif r > 1:
                        return 'color: #d29922; font-weight: bold;' 
                except ValueError:
                    pass
                return 'color: #f85149; font-weight: bold;'

            if "Xếp Hạng Tìm Được" in df.columns:
                styled_df = df.style.map(color_rank, subset=['Xếp Hạng Tìm Được'])
                styled_df = styled_df.format({"Xếp Hạng Tìm Được": lambda x: f"{int(float(x))}" if pd.notna(x) and str(x).strip().upper() != "N/A" else "N/A"})
                st.dataframe(styled_df, use_container_width=True, height=500)
            else:
                st.dataframe(df, use_container_width=True)
                
        except Exception as e:
            st.error(f"Lỗi: {e}")
    else:
        st.info("💡 **Gợi ý:** File nằm ở `evaluation/evaluation_report.csv`")


# ====================== TAB 4: KIẾN TRÚC HỆ THỐNG XAI ======================
elif tab_choice == "🧠 Kiến trúc HT & XAI":
    st.markdown("<h1 class='title-gradient'>🧠 Cấu trúc Mạng Neural (Architecture)</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #8b949e;'>Mô tả minh bạch cơ chế hoạt động của thuật toán bên trong hộp đen.</p>", unsafe_allow_html=True)
    
    st.markdown("<div class='premium-card'>", unsafe_allow_html=True)
    st.subheader("1. Cơ chế Tìm Kép (Hybrid Search)")
    st.markdown("""
    Hệ thống kết hợp cùng lúc 2 dòng thuật toán để triệt tiêu nhược điểm của nhau:
    *   **Dense Retrieval (BGE-M3):** Băm ngôn ngữ thành ma trận Không gian 1024 chiều. Chuyên đặc trị lỗi chính tả, sai từ hay khác ngôn ngữ (Hỏi Tiếng Việt - Tìm Tiếng Anh). 
    *   **Sparse Retrieval (BM25 - Keyword):** Thuật toán truyền thống chuyên săn lùng chính xác các từ hiếm, cấu trúc thuật ngữ không được dịch.
    """)
    st.markdown("</div>", unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("<div class='premium-card'>", unsafe_allow_html=True)
        st.subheader("2. Tầng xếp hạng lõi (Cross-Encoder)")
        st.markdown("""
        Toàn bộ top văn bản sau khi qua vòng 1 sẽ bị đẩy vào máy quét lõi **BAAI/bge-reranker-base**.
        *   Thuật toán này ép câu truy vấn và văn bản chồng lên nhau ở tầng Attention Layer để bắt xác suất toán học.
        *   Kết quả phân phối **Sigmoid** 0.0 -> 1.0 (Output ở Progress bar). Ngưỡng dưới <0.2 bị khóa bộ lọc để khử nhiễu dữ liệu.
        """)
        st.markdown("</div>", unsafe_allow_html=True)
        
    with col2:
        st.markdown("<div class='premium-card'>", unsafe_allow_html=True)
        st.subheader("3. Đặc tả Kỹ thuật (Hardware)")
        st.markdown("""
        *   **Biên dịch mô hình:** Phân mảnh FP16 (Half-precision).
        *   **Tăng tốc phần cứng:** NVidia GPU (CUDA) giúp giảm độ trễ 75%.
        *   **Vector Database:** Qdrant Cloud Storage/Local Disk.
        *   **Thiết kế API:** FastAPI RESTful + CORSMiddleware.
        """)
        st.markdown("</div>", unsafe_allow_html=True)