from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_generator.styles import (
    add_p, add_h1, add_h2, add_h3, add_bullet, add_callout, add_image_box, add_styled_table, add_code_block
)

def build_chapter4(doc):
    add_h1(doc, "CHƯƠNG 4: PHÂN TÍCH, THIẾT KẾ VÀ BẢO MẬT PHÂN HỆ AI")

    add_h2(doc, "4.1. Tổng quan Phân hệ Trí tuệ Nhân tạo và Vai trò Gemini API")
    add_p(doc, "Phân hệ Trí tuệ Nhân tạo là thành phần cốt lõi tạo nên sự khác biệt của đề tài so với các phần mềm quản lý spa truyền thống. Thay vì chỉ đóng vai trò lưu trữ thụ động, hệ thống ứng dụng mô hình ngôn ngữ lớn (Large Language Model - LLM) để tự động hóa khâu phân tích dữ liệu phức tạp, nâng cao năng lực tư vấn của lễ tân và cá nhân hóa trải nghiệm khách hàng.")
    
    add_p(doc, "Trong đề tài này, nhóm nghiên cứu lựa chọn Google Gemini API (phiên bản `gemini-1.5-flash` và `gemini-1.5-pro`) làm nền tảng AI Engine chính bởi các lý do kỹ thuật và thực tiễn sau:")
    add_bullet(doc, "Tốc độ phản hồi cực nhanh (Ultra-low Latency): ", "Gemini 1.5 Flash được tối ưu hóa đặc biệt cho các tác vụ xử lý tần suất cao với thời gian sinh văn bản trung bình chỉ từ 1.2 - 1.8 giây, đáp ứng xuất sắc yêu cầu phi chức năng NFR-01 (< 3.0 giây).")
    add_bullet(doc, "Khả năng xử lý ngữ cảnh tiếng Việt xuất sắc: ", "Mô hình được huấn luyện đa ngữ sâu rộng, thấu hiểu rất tốt các thuật ngữ chuyên ngành thẩm mỹ da liễu tại Việt Nam (như: mụn ẩn, mụn viêm, da dầu thiếu nước, nám chân sâu, triệt lông diode laser, điện di meso) và sinh ra văn phong tư vấn lịch sự, tự nhiên, gần gũi.")
    add_bullet(doc, "Cửa sổ ngữ cảnh (Context Window) khổng lồ: ", "Với khả năng tiếp nhận lên tới 1 triệu tokens, Gemini dễ dàng tiếp nhận toàn bộ lịch sử 50 - 100 lần điều trị cũ của khách hàng mà không lo bị cắt xén dữ liệu như các mô hình cũ.")
    add_bullet(doc, "Hiệu quả chi phí và Hỗ trợ định dạng JSON có cấu trúc (Structured Outputs): ", "Tính năng `response_mime_type=\"application/json\"` của Gemini SDK đảm bảo kết quả trả về tuân thủ 100% lược đồ JSON do Backend chỉ định, loại bỏ tình trạng sinh text tự do gây lỗi giao diện người dùng.")

    ai_comp_headers = ["Tiêu chí đánh giá", "Google Gemini 1.5 Flash", "OpenAI GPT-4o-mini", "Đánh giá lựa chọn cho hệ thống Spa"]
    ai_comp_rows = [
        ("Thời gian phản hồi (Latency)", "1.2 – 1.8 giây", "1.5 – 2.2 giây", "Gemini Flash nhanh hơn ~25%, phù hợp tương tác quầy lễ tân"),
        ("Xử lý văn phong tiếng Việt", "Rất tự nhiên, chuẩn ngữ cảnh", "Khá tốt nhưng đôi khi dịch máy", "Gemini diễn đạt câu từ chăm sóc khách hàng mượt mà hơn"),
        ("Structured JSON Output", "Hỗ trợ Schema bản địa cực mạnh", "Hỗ trợ Function Calling/JSON", "Cả hai đều đáp ứng tốt, Gemini cấu hình nhẹ hơn"),
        ("Chi phí sử dụng (API Cost)", "Rất thấp (Miễn phí mức cơ sở)", "Thấp", "Gemini tối ưu hóa chi phí vận hành cho Spa vừa và nhỏ"),
        ("Context Window", "1,000,000 tokens", "128,000 tokens", "Gemini vượt trội khi cần tóm tắt hồ sơ khách hàng nhiều năm")
    ]
    add_styled_table(doc, "Bảng 4.1. So sánh đặc tính kỹ thuật giữa Google Gemini Flash và OpenAI GPT-4o-mini", ai_comp_headers, ai_comp_rows, [Inches(1.8), Inches(1.5), Inches(1.5), Inches(1.5)])

    add_callout(doc, "GIỚI HẠN CỦA MÔ HÌNH VÀ NGUY CƠ ẢO GIÁC (HALLUCINATION)", 
                "Cần khẳng định rõ ràng về mặt khoa học: Các mô hình LLM bản chất là mô hình sinh xác suất, KHÔNG THỂ bảo đảm độ chính xác 100% trong mọi tình huống. Mô hình có thể xuất hiện hiện tượng 'ảo giác' (tự bịa ra tên dịch vụ không có trong spa hoặc đưa ra phỏng đoán vượt phạm vi) nếu câu lệnh Prompt không được ràng buộc chặt chẽ. Do đó, hệ thống thiết kế cơ chế 'Human-in-the-loop' (Nhân viên là người kiểm duyệt cuối cùng) và bắt buộc áp dụng AI Guardrails đa lớp.")

    add_h2(doc, "4.2. Phân tích và Thiết kế Chi tiết 3 Chức năng AI Cốt lõi")

    add_h3(doc, "4.2.1. Chức năng 1: AI Đề xuất Dịch vụ / Liệu trình Phù hợp (FR-08)")
    add_p(doc, "Chức năng giúp nhân viên lễ tân tư vấn nhanh và chính xác cho khách hàng, tăng tỷ lệ chuyển đổi dịch vụ:")
    add_bullet(doc, "Mục đích sử dụng: ", "Phân tích lịch sử làm dịch vụ trước đây kết hợp nhu cầu phát sinh hiện tại để đưa ra 2 gợi ý dịch vụ tối ưu có trong bảng giá của Spa kèm theo luận điểm thuyết phục và câu thoại mẫu.")
    add_bullet(doc, "Người dùng được phép sử dụng: ", "Lễ tân (Receptionist) và Quản lý (Manager).")
    add_bullet(doc, "Dữ liệu đầu vào: ", "Lịch sử 5 ca dịch vụ gần nhất của khách (tên dịch vụ, thời gian, ghi chú) trích xuất từ bảng `appointments` và `appointment_details`; Nhu cầu hiện tại của khách do lễ tân nhập tay tại giao diện; Danh mục các dịch vụ hiện có của Spa.")
    add_bullet(doc, "Tiền xử lý dữ liệu: ", "Thực hiện PII Masking (ẩn tên thật và SĐT của khách); kiểm tra độ dài input (< 500 ký tự); lọc bỏ các từ khóa độc hại.")
    add_bullet(doc, "Prompt Template chuẩn hóa: ", "Cấu hình ở Backend FastAPI (System Prompt cố định + Dữ liệu động):")

    add_code_block(doc, """SYSTEM_PROMPT_RECOMMENDATION = \"\"\"
Bạn là Trợ lý AI chuyên nghiệp của một cơ sở Spa & Thẩm mỹ cao cấp.
Nhiệm vụ của bạn là phân tích lịch sử làm đẹp của khách hàng và nhu cầu hiện tại để gợi ý ĐÚNG 2 dịch vụ/liệu trình phù hợp nhất có trong danh mục của cơ sở.

QUY TẮC BẮT BUỘC:
1. Chỉ được gợi ý các dịch vụ có trong DANH MỤC DỊCH VỤ được cung cấp dưới đây. Tuyệt đối không tự bịa dịch vụ.
2. Nêu rõ lý do gợi ý dựa trên lịch sử cơ địa và nhu cầu mới của khách.
3. Sinh sẵn một đoạn văn thoại ngắn, lịch sự để lễ tân có thể đọc hoặc copy gửi khách.
4. TUYỆT ĐỐI KHÔNG đưa ra chẩn đoán bệnh lý y khoa hoặc kê đơn thuốc uống.
5. Luôn trả về kết quả dưới định dạng JSON đúng chuẩn sau:
{
  "recommendations": [
    {"service_name": "Tên dịch vụ 1", "reason": "Lý do gợi ý", "expected_duration": 60, "price_estimate": 350000},
    {"service_name": "Tên dịch vụ 2", "reason": "Lý do gợi ý", "expected_duration": 90, "price_estimate": 500000}
  ],
  "suggested_message": "Câu chào tư vấn mẫu để lễ tân copy gửi khách...",
  "disclaimer": "AI chỉ hỗ trợ tư vấn tham khảo, không thay thế chẩn đoán y khoa."
}
\"\"\"""", "Prompt Template chức năng AI Đề xuất dịch vụ / liệu trình (FR-08)")

    add_bullet(doc, "Xử lý kết quả trả về: ", "FastAPI parse JSON trả về bằng Pydantic Schema `AIRecommendationResponse`. Nếu JSON không hợp lệ, hệ thống tự động retry 1 lần hoặc chuyển sang Fallback.")
    add_bullet(doc, "Hiển thị giao diện: ", "Kết quả hiển thị dạng Card trực quan trên màn hình AI Tool gồm 2 dịch vụ, mức giá, thời lượng và nút 'Sao chép tin nhắn tư vấn' để gửi qua Zalo cho khách.")

    add_image_box(doc, "spa_slide_images/slide_12.png", "Hình 4.1. Ví dụ thực tế kết quả AI gợi ý dịch vụ và câu chào tư vấn trên hệ thống")

    add_h3(doc, "4.2.2. Chức năng 2: AI Sinh Tin nhắn Nhắc lịch & Chăm sóc Khách hàng (FR-09)")
    add_p(doc, "Cá nhân hóa thông điệp là yếu tố sống còn để giữ chân khách hàng và giảm tỷ lệ quên lịch (No-show):")
    add_bullet(doc, "Mục đích sử dụng: ", "Tự động sinh các mẫu tin nhắn nhắc lịch trước 24h, tin nhắn cảm ơn sau ca làm hoặc tin thăm hỏi tình trạng da sau liệu trình nặn mụn/laser.")
    add_bullet(doc, "Người dùng được phép sử dụng: ", "Lễ tân (Receptionist) và Quản lý (Manager).")
    add_bullet(doc, "Dữ liệu đầu vào: ", "Tên xưng hô của khách (chị Lan, anh Tuấn); Dịch vụ vừa thực hiện; Ngày giờ hẹn kế tiếp; Lưu ý sau điều trị của KTV (ví dụ: kiêng nắng 3 ngày, uống đủ 2 lít nước).")
    add_bullet(doc, "Cơ chế Human-in-the-loop: ", "Hệ thống KHÔNG tự động bắn tin nhắn trực tiếp ra ngoài mà luôn hiển thị bản nháp lên giao diện. Lễ tân có toàn quyền đọc lại, chỉnh sửa câu chữ cho phù hợp trước khi bấm nút sao chép gửi qua Zalo hoặc SMS Brandname.")

    add_image_box(doc, "spa_slide_images/slide_13.png", "Hình 4.2. Giao diện chức năng AI sinh tin nhắn nhắc lịch và chăm sóc cá nhân hóa")

    add_h3(doc, "4.2.3. Chức năng 3: AI Tóm tắt Hồ sơ Khách hàng (FR-10)")
    add_p(doc, "Giải quyết bài toán đứt gãy thông tin khi khách hàng có lịch sử phục vụ kéo dài nhiều tháng, nhiều năm:")
    add_bullet(doc, "Mục đích sử dụng: ", "Rút trích các thông tin cốt lõi nhất từ hàng chục bản ghi điều trị cũ thành 3 - 5 ý chính nổi bật, giúp kỹ thuật viên chỉ mất 5 giây đọc là hiểu ngay tình trạng khách trước khi bắt đầu phục vụ.")
    add_bullet(doc, "Người dùng được phép sử dụng: ", "Kỹ thuật viên (Therapist), Lễ tân (Receptionist), Quản lý (Manager).")
    add_bullet(doc, "Dữ liệu đầu vào: ", "Toàn bộ chuỗi lịch sử trong bảng `appointments` và `appointment_details` kèm theo các trường `notes` phản hồi của các KTV trước đây.")
    add_bullet(doc, "Ví dụ thực tế: ", "Khách hàng có lịch sử 20 lần đến spa trong 6 tháng. Thay vì KTV phải cuộn xem 20 trang ghi chú, AI rút gọn thành: (1) Da hỗn hợp thiên dầu, nhạy cảm vùng cánh mũi; (2) Có tiền sử châm chích khi dùng serum Vitamin C; (3) Thích lực massage vừa phải, dị ứng mùi tinh dầu sả chanh; (4) Đang ở buổi thứ 4 của liệu trình trị thâm lưng.")

    add_image_box(doc, "spa_slide_images/slide_14.png", "Hình 4.3. Minh họa quy trình AI quét dữ liệu lịch sử dài và cô đọng thành 5 giây tóm tắt")

    add_h2(doc, "4.3. Kiến trúc Bảo mật AI và Luồng AI Guardrails 8 bước")
    add_p(doc, "Bảo mật trong ứng dụng AI không thể chỉ dựa vào một vài câu lệnh Prompt đơn giản. Hệ thống xây dựng quy trình AI Guardrails nghiêm ngặt gồm 8 bước khép kín bảo vệ toàn diện dữ liệu và vận hành:")

    add_image_box(doc, "spa_slide_images/slide_15.png", "Hình 4.4. Kỹ thuật ghép nối 3 thành phần trong Prompt và Cơ chế Fallback dự phòng")

    add_p(doc, "Chi tiết quy trình bảo vệ dữ liệu qua 8 bước kiểm soát:")
    add_bullet(doc, "Bước 1 - Xác thực người dùng (Authentication): ", "Mọi yêu cầu gọi chức năng AI đều phải mang theo Token JWT hợp lệ tại Header `Authorization: Bearer <token>`.")
    add_bullet(doc, "Bước 2 - Phân quyền RBAC (Authorization): ", "Middleware kiểm tra quyền hạn. Ví dụ: Kỹ thuật viên bị chặn không được gọi API gợi ý dịch vụ kinh doanh (403 Forbidden).")
    add_bullet(doc, "Bước 3 - Kiểm tra quyền truy cập dữ liệu (Data Isolation): ", "Kỹ thuật viên chỉ được tóm tắt hồ sơ của khách hàng có trong ca hẹn mà mình được phân công trong ngày.")
    add_bullet(doc, "Bước 4 - Che giấu Thông tin Cá nhân (PII Masking): ", "Trước khi gửi dữ liệu sang Google Gemini, hàm `mask_pii()` tại Backend sẽ tự động phát hiện và thay thế các thông tin nhạy cảm:")
    add_bullet(doc, "• ", "Họ tên khách hàng 'Nguyễn Thị Thùy Linh' -> '[KHACH_HANG_01]'")
    add_bullet(doc, "• ", "Số điện thoại '0987654321' -> '[SO_DIEN_THOAI_AN]'")
    add_bullet(doc, "• ", "Địa chỉ nhà riêng, số CCCD được lọc bỏ hoàn toàn khỏi ngữ cảnh.")

    add_code_block(doc, """import re

def mask_pii_data(customer_dict: dict) -> dict:
    \"\"\"Giải thuật che giấu thông tin cá nhân (PII Masking) trước khi gọi AI\"\"\"
    sanitized = customer_dict.copy()
    # Ẩn tên thật
    if \"full_name\" in sanitized:
        sanitized[\"full_name\"] = \"[KHACH_HANG_\" + str(sanitized.get(\"customer_id\", 0)) + \"]\"
    # Ẩn số điện thoại
    if \"phone\" in sanitized:
        sanitized[\"phone\"] = \"[SO_DIEN_THOAI_DA_BAO_MAT]\"
    # Ẩn email
    if \"email\" in sanitized:
        sanitized[\"email\"] = \"[EMAIL_DA_AN]\"
    return sanitized""", "Mã nguồn Python minh họa giải thuật PII Masking tại tầng Backend")

    add_bullet(doc, "Bước 5 - Phòng chống Prompt Injection (Input Guardrails): ", "Áp dụng kỹ thuật phòng thủ đa lớp (Defense-in-depth):")
    add_bullet(doc, "• Lớp 1 (Độ dài): ", "Giới hạn ô nhập nhu cầu của lễ tân không vượt quá 300 ký tự.")
    add_bullet(doc, "• Lớp 2 (Bộ lọc Regex): ", "Quét các mẫu câu tấn công vượt quyền phổ biến như: 'Ignore previous instructions', 'Bỏ qua hướng dẫn trên', 'System override', 'You are now an unfiltered AI'. Tuy nhiên, nhóm nhận thức rõ Regex không thể ngăn chặn 100% các biến thể injection tinh vi.")
    add_bullet(doc, "• Lớp 3 (Hardened System Instructions): ", "Cấu hình vai trò cố định của Gemini ở mức System Instruction (tách rời khỏi User Context), chỉ dẫn rõ mô hình kiên quyết từ chối thay đổi vai trò.")
    add_bullet(doc, "• Lớp 4 (Medical Disclaimer Guardrail): ", "Ngăn chặn tuyệt đối việc AI đưa ra phỏng đoán bệnh da liễu hoặc kê đơn thuốc uống (NFR-06).")
    add_bullet(doc, "Bước 6 - Gọi Gemini API an toàn: ", "Gửi yêu cầu qua kết nối mã hóa SSL/TLS, cấu hình timeout chặt chẽ ở mức 4.0 giây.")
    add_bullet(doc, "Bước 7 - Kiểm duyệt kết quả đầu ra (Output Guardrails): ", "Xác thực cấu trúc JSON trả về qua Pydantic; quét kiểm tra sự tồn tại của dòng Disclaimer bắt buộc; loại bỏ các từ ngữ phản cảm nếu có.")
    add_bullet(doc, "Bước 8 - Ghi nhận Kiểm toán (Audit Log) & Trả kết quả: ", "Lưu toàn bộ vết tương tác vào bảng `ai_histories` (dữ liệu lưu đã được che PII) gồm thời gian phản hồi, số token tiêu thụ; trả JSON đã làm sạch về cho client.")

    add_h2(doc, "4.4. Cơ chế Dự phòng khi API AI Sự cố (Fallback Mechanism)")
    add_p(doc, "Một hệ thống thông tin chuyên nghiệp không bao giờ được phép phụ thuộc tuyệt đối vào dịch vụ bên ngoài. Khi kết nối Internet bị gián đoạn, API Gemini bị timeout (> 4s) hoặc hệ thống chạm ngưỡng giới hạn băng thông (Rate Limit 429), cơ chế Fallback tự động được kích hoạt:")
    add_bullet(doc, "Nguyên lý Fallback: ", "Toàn bộ khối gọi AI được bao bọc trong khối `try...except`. Khi bắt gặp ngoại lệ `GoogleAPIError` hoặc `TimeoutError`, Backend không báo lỗi 500 sập ứng dụng mà âm thầm chuyển sang truy vấn trực tiếp cơ sở dữ liệu PostgreSQL:")
    add_bullet(doc, "Thuật toán Fallback: ", "Hệ thống truy vấn Top 2 dịch vụ có số lượt đặt lịch cao nhất trong 30 ngày gần đây thuộc danh mục phù hợp. Trả về cho lễ tân với thông điệp: '[CHẾ ĐỘ DỰ PHÒNG]: Kết nối AI đang bận. Dưới đây là 2 dịch vụ thịnh hành nhất tại Spa để tham khảo'. Điều này bảo đảm nghiệp vụ phục vụ khách tại quầy không bao giờ bị đình trệ.")

    doc.add_page_break()
