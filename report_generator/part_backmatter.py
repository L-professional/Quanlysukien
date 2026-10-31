from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_generator.styles import (
    add_p, add_h1, add_h2, add_h3, add_bullet, add_callout, add_code_block
)

def build_backmatter(doc):
    # ------------------ TÀI LIỆU THAM KHẢO ------------------
    add_h1(doc, "TÀI LIỆU THAM KHẢO")
    add_p(doc, "Toàn bộ các tài liệu tham khảo dưới đây được trích dẫn thống nhất theo tiêu chuẩn quy chuẩn học thuật IEEE (Institute of Electrical and Electronics Engineers):")

    refs = [
        "[1] Google Cloud & Google AI. (2024). \"Gemini API Reference and System Instructions Documentation,\" Google AI for Developers. [Online]. Available: https://ai.google.dev/docs",
        "[2] S. Ramírez. (2023). \"FastAPI Framework Documentation: High-performance, Easy to Learn, Fast to Code,\" Tiangolo. [Online]. Available: https://fastapi.tiangolo.com",
        "[3] PostgreSQL Global Development Group. (2023). \"PostgreSQL 15.4 Documentation: The World's Most Advanced Open Source Relational Database,\" PostgreSQL.org. [Online]. Available: https://www.postgresql.org/docs/15/",
        "[4] OWASP Foundation. (2023). \"OWASP Top 10 for Large Language Model Applications (v1.1),\" Open Web Application Security Project. [Online]. Available: https://owasp.org/www-project-top-10-for-large-language-model-applications/",
        "[5] National Institute of Standards and Technology (NIST). (2023). \"Artificial Intelligence Risk Management Framework (AI RMF 1.0),\" U.S. Department of Commerce, NIST Trustworthy and Responsible AI, Washington D.C., Jan. 2023.",
        "[6] E. F. Codd. (1970). \"A Relational Model of Data for Large Shared Data Banks,\" Communications of the ACM, vol. 13, no. 6, pp. 377–387.",
        "[7] Meta Open Source. (2024). \"React Documentation: The Library for Web and Native User Interfaces,\" React.dev. [Online]. Available: https://react.dev",
        "[8] M. Fowler. (2002). \"Patterns of Enterprise Application Architecture,\" Addison-Wesley Professional, Boston, MA, USA.",
        "[9] TS. Nguyễn Tuấn Linh. (2026). \"Bài giảng Học phần Ứng dụng Trí tuệ Nhân tạo,\" Khoa Công nghệ Thông tin, Trường Đại học Công nghệ Thông tin và Truyền thông – Đại học Thái Nguyên.",
        "[10] Bộ Thông tin và Truyền thông. (2023). \"Tiêu chuẩn quốc gia TCVN 11857:2017 về An toàn thông tin - Yêu cầu đối với hệ thống quản lý an toàn thông tin,\" Hà Nội, Việt Nam."
    ]

    for ref in refs:
        p_ref = doc.add_paragraph()
        p_ref.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_ref.paragraph_format.space_before = Pt(2)
        p_ref.paragraph_format.space_after = Pt(4)
        p_ref.paragraph_format.line_spacing = 1.2
        p_ref.paragraph_format.first_line_indent = Inches(-0.35)
        p_ref.paragraph_format.left_indent = Inches(0.35)
        r = p_ref.add_run(ref)
        r.font.name = "Times New Roman"
        r.font.size = Pt(11.5)

    doc.add_page_break()

    # ------------------ PHỤ LỤC A ------------------
    add_h1(doc, "PHỤ LỤC A: TOÀN VĂN CÁC PROMPT TEMPLATES CHUẨN HÓA CỦA PHÂN HỆ AI")
    add_p(doc, "Dưới đây là mã nguồn toàn bộ 3 mẫu Prompt hệ thống (System Prompts) được cấu hình tại Backend FastAPI phục vụ việc tích hợp Google Gemini API:")

    add_h2(doc, "A.1. Prompt Template: Sinh tin nhắn nhắc lịch hẹn & chăm sóc khách hàng (FR-09)")
    add_code_block(doc, """SYSTEM_PROMPT_NOTIFICATION = \"\"\"
Bạn là Trợ lý chăm sóc khách hàng của Spa làm đẹp cao cấp.
Nhiệm vụ của bạn là soạn thảo một tin nhắn gửi Zalo/SMS cho khách hàng theo yêu cầu.

QUY TẮC BẮT BUỘC:
1. Xưng hô lịch sự, ấm áp, đúng tên khách hàng (ví dụ: 'Dạ em chào chị [Tên KH] ạ...').
2. Nêu chính xác giờ hẹn, ngày hẹn và dịch vụ đã đặt.
3. Nếu là tin nhắn sau dịch vụ, hãy đính kèm lời dặn dò chăm sóc tại nhà dựa trên dịch vụ đã làm (ví dụ: nặn mụn -> kiêng nước 12h, chống nắng kỹ).
4. Độ dài tin nhắn: Từ 60 đến 120 từ. Ngắn gọn, súc tích, dễ đọc trên điện thoại.
5. Tuyệt đối không tự bịa thêm thông tin ngoài ngữ cảnh được cung cấp.
\"\"\"""", "Mẫu Prompt hệ thống sinh tin nhắn chăm sóc cá nhân hóa (FR-09)")

    add_h2(doc, "A.2. Prompt Template: Tóm tắt hồ sơ khách hàng điều trị dài hạn (FR-10)")
    add_code_block(doc, """SYSTEM_PROMPT_SUMMARY = \"\"\"
Bạn là Chuyên gia phân tích dữ liệu da liễu và hồ sơ khách hàng của Spa.
Nhiệm vụ của bạn là đọc toàn bộ lịch sử sử dụng dịch vụ và ghi chú của khách hàng để trích xuất một bản tóm tắt cực kỳ cô đọng cho Kỹ thuật viên (Therapist) đọc trong vòng 5 giây trước ca làm.

YÊU CẦU ĐẦU RA (Tối đa 4 - 5 bullet points, dưới 100 từ):
- Loại da & Cơ địa: (ví dụ: Da dầu nhạy cảm, dễ đỏ vùng má)
- Tiền sử kích ứng/dị ứng: (ví dụ: Từng châm chích khi dùng Vitamin C nồng độ cao)
- Dịch vụ làm gần nhất & Phản hồi: (ví dụ: Nặn mụn ngày 15/10, da phục hồi tốt)
- Thói quen & Sở thích: (ví dụ: Thích lực massage nhẹ, thích đắp mask làm dịu)
- Cảnh báo đặc biệt: (nếu có)

TUYỆT ĐỐI KHÔNG đưa ra kết luận chẩn đoán bệnh lý y khoa.
\"\"\"""", "Mẫu Prompt hệ thống tóm tắt hồ sơ khách hàng 5 giây (FR-10)")

    doc.add_page_break()

    # ------------------ PHỤ LỤC B ------------------
    add_h1(doc, "PHỤ LỤC B: BẢN TỔNG HỢP GIẢI TRÌNH RÀ SOÁT VÀ CÁC THÔNG TIN CẦN XÁC NHẬN")
    add_p(doc, "Bản tổng hợp ghi nhận toàn bộ quá trình rà soát, chuẩn hóa và những nội dung nhóm sinh viên cần hoàn thiện trước ngày nộp chính thức:")

    add_h2(doc, "B.1. Những nội dung chuyên môn đã được sửa đổi và bổ sung")
    add_bullet(doc, "Chuẩn hóa hệ quản trị CSDL PostgreSQL 15: ", "Chuyển đổi toàn bộ cú pháp MySQL cũ (loại bỏ AUTO_INCREMENT, DATETIME, ENUM MySQL) sang chuẩn PostgreSQL (SERIAL, TIMESTAMPTZ, CHECK constraint, NUMERIC).")
    add_bullet(doc, "Bổ sung minh chứng chuẩn hóa 3NF: ", "Xây dựng lập luận khoa học và ma trận chứng minh toàn bộ 13 bảng thực thể đều đạt dạng chuẩn 3 (1NF, 2NF, 3NF), giải thích rõ cơ chế lưu Snapshot Data trong chi tiết hóa đơn.")
    add_bullet(doc, "Hoàn thiện kiến trúc bảo vệ AI Guardrails 8 bước: ", "Trình bày chi tiết luồng xử lý che giấu PII, phân tích giới hạn của Regex trong phòng chống Prompt Injection, thiết lập cơ chế Human-in-the-loop và xây dựng kịch bản Fallback thông minh từ CSDL.")
    add_bullet(doc, "Xây dựng ma trận 15 Test Cases hoàn chỉnh: ", "Cung cấp đầy đủ Mã kiểm thử, Chức năng, Input, Kết quả kỳ vọng, Kết quả thực tế và Trạng thái Pass/Fail rõ ràng.")

    add_h2(doc, "B.2. Danh mục các thông tin nhóm sinh viên cần xác nhận và bổ sung [CẦN XÁC NHẬN]")
    add_callout(doc, "CẦN XÁC NHẬN 1 - MÃ SỐ SINH VIÊN (MSV)", 
                "Nhóm sinh viên cần điền chính xác Mã số sinh viên của 3 thành viên (Trần Thùy Dương, Sằm Thị Linh Anh, Nguyễn Minh Hoài) vào trang bìa trước khi in nộp.")
    add_callout(doc, "CẦN XÁC NHẬN 2 - BẢNG ĐIỂM ĐÁNH GIÁ ĐỊNH KỲ (KT1, KT2, KT3)", 
                "Bổ sung phiếu đánh giá tiến độ của Giảng viên hướng dẫn trong các đợt kiểm tra KT1 (Phân tích CSDL), KT2 (Code Web App) và KT3 (Tích hợp AI) nếu Nhà trường yêu cầu đính kèm.")
    add_callout(doc, "CẦN XÁC NHẬN 3 - LINK KHO MÃ NGUỒN GITHUB", 
                "Đính kèm đường dẫn GitHub Repository công khai hoặc cấp quyền cho Giảng viên hướng dẫn để đối soát mã nguồn thực tế.")
