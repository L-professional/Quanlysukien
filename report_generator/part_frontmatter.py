from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from report_generator.styles import (
    add_p, add_h1, add_styled_table, COLOR_PRIMARY, COLOR_SECONDARY, setup_page_margins
)

def build_frontmatter(doc):
    # ------------------ COVER PAGE ------------------
    p_uni = doc.add_paragraph()
    p_uni.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_uni.paragraph_format.space_before = Pt(12)
    p_uni.paragraph_format.space_after = Pt(2)
    r = p_uni.add_run("ĐẠI HỌC THÁI NGUYÊN\nTRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG\nKHOA CÔNG NGHỆ THÔNG TIN")
    r.font.name = "Times New Roman"
    r.font.size = Pt(13)
    r.bold = True
    r.font.color.rgb = COLOR_PRIMARY

    # Decorative line
    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_line.paragraph_format.space_before = Pt(2)
    p_line.paragraph_format.space_after = Pt(40)
    r_line = p_line.add_run("━━━━━━━━━━━━━━━━━━━━")
    r_line.font.name = "Times New Roman"
    r_line.font.size = Pt(12)
    r_line.bold = True
    r_line.font.color.rgb = COLOR_SECONDARY

    p_type = doc.add_paragraph()
    p_type.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_type.paragraph_format.space_before = Pt(0)
    p_type.paragraph_format.space_after = Pt(8)
    r_type = p_type.add_run("BÁO CÁO ĐỒ ÁN MÔN HỌC\nHỌC PHẦN: ỨNG DỤNG TRÍ TUỆ NHÂN TẠO")
    r_type.font.name = "Times New Roman"
    r_type.font.size = Pt(14)
    r_type.bold = True

    p_title_intro = doc.add_paragraph()
    p_title_intro.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title_intro.paragraph_format.space_before = Pt(20)
    p_title_intro.paragraph_format.space_after = Pt(6)
    r_ti = p_title_intro.add_run("ĐỀ TÀI:")
    r_ti.font.name = "Times New Roman"
    r_ti.font.size = Pt(14)
    r_ti.bold = True
    r_ti.font.color.rgb = COLOR_SECONDARY

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(60)
    r_title = p_title.add_run("HỆ THỐNG QUẢN LÝ SPA VÀ CHĂM SÓC SẮC ĐẸP\nTÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI)")
    r_title.font.name = "Times New Roman"
    r_title.font.size = Pt(18)
    r_title.bold = True
    r_title.font.color.rgb = COLOR_PRIMARY

    # Author info table
    tbl = doc.add_table(rows=5, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_data = [
        ("Giảng viên hướng dẫn:", "TS. Nguyễn Tuấn Linh"),
        ("Sinh viên thực hiện:", "1. Trần Thùy Dương – Lớp CNTT K23L\n2. Sằm Thị Linh Anh – Lớp CNTT K23L\n3. Nguyễn Minh Hoài – Lớp CNTT K23L"),
        ("Mã số sinh viên:", "[CẦN XÁC NHẬN - Nhóm bổ sung mã SV trước khi nộp]"),
        ("Ngành đào tạo:", "Công nghệ Thông tin"),
        ("Khóa học:", "2023 – 2027")
    ]
    for idx, (label, val) in enumerate(tbl_data):
        c0 = tbl.cell(idx, 0)
        c1 = tbl.cell(idx, 1)
        c0.width = Inches(2.2)
        c1.width = Inches(4.1)
        
        p0 = c0.paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p0.paragraph_format.space_after = Pt(3)
        r0 = p0.add_run(label)
        r0.font.name = "Times New Roman"
        r0.font.size = Pt(12)
        r0.bold = True

        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p1.paragraph_format.space_after = Pt(3)
        r1 = p1.add_run(val)
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(12)

    p_loc = doc.add_paragraph()
    p_loc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_loc.paragraph_format.space_before = Pt(80)
    p_loc.paragraph_format.space_after = Pt(0)
    r_loc = p_loc.add_run("THÁI NGUYÊN – NĂM 2026")
    r_loc.font.name = "Times New Roman"
    r_loc.font.size = Pt(13)
    r_loc.bold = True

    doc.add_page_break()

    # ------------------ LỜI CAM ĐOAN ------------------
    p_cd_h = add_h1(doc, "LỜI CAM ĐOAN")
    p_cd_h.alignment = WD_ALIGN_PARAGRAPH.CENTER

    add_p(doc, "Nhóm sinh viên chúng tôi xin cam đoan đề tài nghiên cứu và xây dựng \"Hệ thống quản lý Spa và chăm sóc sắc đẹp tích hợp Trí tuệ nhân tạo (AI)\" là công trình học thuật được thực hiện dưới sự hướng dẫn trực tiếp của Thầy TS. Nguyễn Tuấn Linh trong khuôn khổ học phần Ứng dụng Trí tuệ Nhân tạo tại Khoa Công nghệ Thông tin, Trường Đại học Công nghệ Thông tin và Truyền thông – Đại học Thái Nguyên.")
    add_p(doc, "Toàn bộ các số liệu khảo sát, quy trình nghiệp vụ, lược đồ thiết kế cơ sở dữ liệu, kiến trúc phần mềm, kịch bản xử lý AI Guardrails và các kết quả kiểm thử được trình bày trong bản báo cáo này hoàn toàn xuất phát từ quá trình nghiên cứu, khảo sát thực tế và triển khai thực nghiệm của nhóm.")
    add_p(doc, "Các tài liệu tham khảo, thư viện mã nguồn mở và nền tảng trí tuệ nhân tạo (Google Gemini API, FastAPI, ReactJS, PostgreSQL) được sử dụng đều được trích dẫn nguồn gốc rõ ràng, minh bạch theo đúng quy chuẩn học thuật. Nhóm chúng tôi xin hoàn toàn chịu trách nhiệm trước Nhà trường, Hội đồng chấm báo cáo và pháp luật nếu có bất kỳ sự không trung thực hay sao chép trái phép nào.")

    p_sign = doc.add_paragraph()
    p_sign.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_sign.paragraph_format.space_before = Pt(20)
    p_sign.paragraph_format.space_after = Pt(4)
    r_sign1 = p_sign.add_run("Thái Nguyên, ngày 31 tháng 10 năm 2026\nĐại diện nhóm sinh viên thực hiện\n\n\n\n")
    r_sign1.font.name = "Times New Roman"
    r_sign1.font.size = Pt(12)
    r_sign1.italic = True
    r_sign2 = p_sign.add_run("Trần Thùy Dương – Sằm Thị Linh Anh – Nguyễn Minh Hoài")
    r_sign2.font.name = "Times New Roman"
    r_sign2.font.size = Pt(12)
    r_sign2.bold = True

    doc.add_page_break()

    # ------------------ LỜI CẢM ƠN ------------------
    p_co_h = add_h1(doc, "LỜI CẢM ƠN")
    p_co_h.alignment = WD_ALIGN_PARAGRAPH.CENTER

    add_p(doc, "Để hoàn thành tốt báo cáo đồ án môn học này, trước hết nhóm sinh viên chúng em xin bày tỏ lòng biết ơn sâu sắc và chân thành nhất tới Thầy TS. Nguyễn Tuấn Linh – Giảng viên trực tiếp giảng dạy và hướng dẫn học phần Ứng dụng Trí tuệ Nhân tạo. Trong suốt thời gian qua, Thầy đã luôn tận tâm truyền đạt những kiến thức chuyên môn cốt lõi về kỹ thuật Prompt Engineering, mô hình ngôn ngữ lớn (LLMs), các giải pháp bảo vệ dữ liệu AI Guardrails cũng như định hướng phương pháp tư duy hệ thống mạch lạc cho chúng em.")
    add_p(doc, "Những lời nhận xét sắc bén, sự chỉ dẫn kỹ thuật sát sao và tinh thần trách nhiệm của Thầy là động lực to lớn giúp nhóm chúng em vượt qua các rào cản kỹ thuật phức tạp: từ bài toán kiểm tra xung đột lịch làm việc của kỹ thuật viên theo thời gian thực đến cơ chế che giấu thông tin cá nhân (PII Masking) và phòng chống Prompt Injection khi gọi Gemini API.")
    add_p(doc, "Đồng thời, nhóm cũng xin gửi lời cảm ơn trân trọng tới Ban Giám hiệu Trường Đại học Công nghệ Thông tin và Truyền thông – Đại học Thái Nguyên, các Thầy Cô giáo trong Khoa Công nghệ Thông tin đã tạo điều kiện tối đa về môi trường học tập, cơ sở vật chất và hệ thống học liệu trong suốt quá trình học tập tại trường.")
    add_p(doc, "Mặc dù nhóm đã nỗ lực hết mình với tinh thần nghiêm túc và cầu thị, song do giới hạn về mặt thời gian và kinh nghiệm triển khai dự án thực tế, bản báo cáo khó tránh khỏi những điểm thiếu sót nhất định. Nhóm chúng em rất mong nhận được những ý kiến đóng góp quý báu từ quý Thầy Cô để hệ thống ngày càng hoàn thiện, thực tế và ứng dụng hiệu quả hơn.")
    add_p(doc, "Kính chúc quý Thầy Cô luôn dồi dào sức khỏe, niềm vui và gặt hái thêm nhiều thành tựu rực rỡ trong sự nghiệp trồng người!")

    doc.add_page_break()

    # ------------------ DANH MỤC TỪ VIẾT TẮT ------------------
    add_h1(doc, "DANH MỤC TỪ VIẾT TẮT")
    abbr_headers = ["STT", "Từ viết tắt", "Tên tiếng Anh", "Ý nghĩa / Giải thích"]
    abbr_data = [
        ("1", "AI", "Artificial Intelligence", "Trí tuệ nhân tạo"),
        ("2", "API", "Application Programming Interface", "Giao diện lập trình ứng dụng"),
        ("3", "CRUD", "Create, Read, Update, Delete", "Bốn thao tác dữ liệu cơ bản: Tạo, Đọc, Sửa, Xóa"),
        ("4", "DFD", "Data Flow Diagram", "Sơ đồ luồng dữ liệu"),
        ("5", "ERD", "Entity Relationship Diagram", "Sơ đồ quan hệ thực thể"),
        ("6", "FK", "Foreign Key", "Khóa ngoại trong cơ sở dữ liệu quan hệ"),
        ("7", "FR", "Functional Requirement", "Yêu cầu chức năng của hệ thống"),
        ("8", "JWT", "JSON Web Token", "Chuẩn mã hóa token xác thực người dùng không trạng thái"),
        ("9", "KTV", "Technician / Therapist", "Kỹ thuật viên thực hiện dịch vụ làm đẹp / trị liệu"),
        ("10", "LLM", "Large Language Model", "Mô hình ngôn ngữ lớn (ví dụ: Google Gemini)"),
        ("11", "NFR", "Non-Functional Requirement", "Yêu cầu phi chức năng (hiệu năng, bảo mật,...)"),
        ("12", "PII", "Personally Identifiable Information", "Thông tin nhận dạng cá nhân (họ tên, SĐT, địa chỉ)"),
        ("13", "PK", "Primary Key", "Khóa chính trong bảng cơ sở dữ liệu"),
        ("14", "RAG", "Retrieval-Augmented Generation", "Kỹ thuật tăng cường sinh văn bản bằng truy xuất dữ liệu"),
        ("15", "RBAC", "Role-Based Access Control", "Kiểm soát truy cập dựa trên vai trò"),
        ("16", "REST", "Representational State Transfer", "Kiểu kiến trúc thiết kế dịch vụ web API"),
        ("17", "SPA", "Single Page Application", "Ứng dụng web đơn trang (Frontend ReactJS)"),
        ("18", "UC", "Use Case", "Ca sử dụng mô tả tương tác tác nhân - hệ thống"),
        ("19", "3NF", "Third Normal Form", "Dạng chuẩn 3 trong chuẩn hóa cơ sở dữ liệu quan hệ")
    ]
    add_styled_table(doc, "Bảng 0.1. Danh mục các thuật ngữ và từ viết tắt trong báo cáo", abbr_headers, abbr_data, [Inches(0.6), Inches(1.3), Inches(2.2), Inches(2.2)])

    doc.add_page_break()

    # ------------------ DANH MỤC HÌNH VẼ ------------------
    add_h1(doc, "DANH MỤC HÌNH VẼ")
    fig_headers = ["Số hiệu", "Tên hình vẽ / Sơ đồ", "Vị trí trong báo cáo"]
    fig_data = [
        ("Hình 1.1", "Hiện trạng quy trình ghi chép thủ công và 5 điểm nghẽn nghiệp vụ Spa", "Chương 1"),
        ("Hình 1.2", "Sơ đồ Use Case tổng quát Hệ thống Quản lý Spa tích hợp AI", "Chương 1"),
        ("Hình 1.3", "Mô hình phân quyền kiểm soát truy cập hình tháp (RBAC)", "Chương 1"),
        ("Hình 2.1", "Kiến trúc tổng thể hệ thống 3 phân tầng (Frontend, Backend, Data/AI)", "Chương 2"),
        ("Hình 2.2", "Sơ đồ hoạt động (Activity Diagram): Quy trình đặt lịch và kiểm tra xung đột KTV", "Chương 2"),
        ("Hình 2.3", "Sơ đồ tuần tự (Sequence Diagram): Xử lý tư vấn AI có bảo vệ PII Guardrails", "Chương 2"),
        ("Hình 2.4", "Sơ đồ tuần tự (Sequence Diagram): Lập lịch hẹn và xác thực thời gian trống", "Chương 2"),
        ("Hình 2.5", "Mô hình lớp (Class Diagram) tổng quan các thực thể cốt lõi", "Chương 2"),
        ("Hình 2.6", "Chi tiết cấu trúc và phương thức lớp Appointment (Thuật toán kiểm tra lịch)", "Chương 2"),
        ("Hình 3.1", "Lược đồ quan hệ thực thể (ERD) hoàn chỉnh trên PostgreSQL 15", "Chương 3"),
        ("Hình 3.2", "Sơ đồ phân chia 6 phân hệ dữ liệu chính của hệ thống", "Chương 3"),
        ("Hình 3.3", "Các mối quan hệ dữ liệu cốt lõi (1-1, 1-N, N-N) và ràng buộc toàn vẹn", "Chương 3"),
        ("Hình 4.1", "Kiến trúc tích hợp mô hình AI và luồng xử lý Backend trung gian", "Chương 4"),
        ("Hình 4.2", "Quy trình bảo mật AI Guardrails 8 bước bảo vệ dữ liệu người dùng", "Chương 4"),
        ("Hình 4.3", "Kỹ thuật kết hợp 3 thành phần trong Prompt Engineering: System, History, Need", "Chương 4"),
        ("Hình 4.4", "Cơ chế Fallback thông minh: Tự động chuyển hướng khi API AI quá tải", "Chương 4"),
        ("Hình 5.1", "Mô hình ngăn xếp công nghệ (Technology Stack) hoàn chỉnh", "Chương 5"),
        ("Hình 5.2", "Sơ đồ luồng điều hướng màn hình người dùng (Screen Flow)", "Chương 5"),
        ("Hình 5.3", "Giao diện Dashboard Quản lý vận hành và doanh thu thời gian thực", "Chương 5"),
        ("Hình 5.4", "Giao diện công cụ AI Tool: Tư vấn dịch vụ và sinh nội dung cá nhân hóa", "Chương 5"),
        ("Hình 6.1", "Biểu đồ so sánh thời gian phản hồi API nghiệp vụ và API Trí tuệ nhân tạo", "Chương 6")
    ]
    add_styled_table(doc, "Bảng 0.2. Danh mục các hình vẽ và sơ đồ minh họa", fig_headers, fig_data, [Inches(1.1), Inches(3.8), Inches(1.4)])

    doc.add_page_break()

    # ------------------ DANH MỤC BẢNG BIỂU ------------------
    add_h1(doc, "DANH MỤC BẢNG BIỂU")
    tbl_headers = ["Số hiệu", "Tên bảng biểu", "Vị trí trong báo cáo"]
    tbl_list = [
        ("Bảng 1.1", "Ma trận phân tích các tác nhân (Actors) và phạm vi quyền hạn", "Chương 1"),
        ("Bảng 1.2", "Danh mục các yêu cầu chức năng (FR-01 đến FR-11)", "Chương 1"),
        ("Bảng 1.3", "Danh mục các yêu cầu phi chức năng (NFR-01 đến NFR-06)", "Chương 1"),
        ("Bảng 1.4", "Bảng đặc tả Use Case UC-01: Đặt lịch hẹn và phân công kỹ thuật viên", "Chương 1"),
        ("Bảng 1.5", "Bảng đặc tả Use Case UC-02: Tư vấn dịch vụ qua công cụ AI", "Chương 1"),
        ("Bảng 1.6", "Bảng đặc tả Use Case UC-03: Tóm tắt bệnh sử và lưu ý làm đẹp của khách hàng", "Chương 1"),
        ("Bảng 3.1", "Đặc tả chi tiết các bảng trong cơ sở dữ liệu PostgreSQL 15 (13 bảng)", "Chương 3"),
        ("Bảng 3.2", "Ma trận chuẩn hóa dữ liệu 3NF cho từng thực thể", "Chương 3"),
        ("Bảng 4.1", "So sánh đặc tính kỹ thuật giữa Google Gemini Flash và OpenAI GPT-4o-mini", "Chương 4"),
        ("Bảng 4.2", "Đặc tả các quy tắc che giấu thông tin cá nhân (PII Masking)", "Chương 4"),
        ("Bảng 4.3", "Quy tắc kiểm duyệt nội dung đầu vào và từ khóa cấm y tế", "Chương 4"),
        ("Bảng 6.1", "Ma trận các trường hợp kiểm thử chức năng nghiệp vụ cốt lõi (TC-01 đến TC-05)", "Chương 6"),
        ("Bảng 6.2", "Ma trận các trường hợp kiểm thử phân quyền RBAC (TC-06 đến TC-07)", "Chương 6"),
        ("Bảng 6.3", "Ma trận các trường hợp kiểm thử phân hệ AI chuyên sâu (TC-08 đến TC-11)", "Chương 6"),
        ("Bảng 6.4", "Ma trận các trường hợp kiểm thử bảo mật AI & Fallback (TC-12 đến TC-15)", "Chương 6"),
        ("Bảng 6.5", "Bảng tổng hợp đánh giá chỉ số chất lượng và hiệu năng hệ thống", "Chương 6")
    ]
    add_styled_table(doc, "Bảng 0.3. Danh mục các bảng biểu kỹ thuật trong báo cáo", tbl_headers, tbl_list, [Inches(1.1), Inches(3.8), Inches(1.4)])

    doc.add_page_break()
