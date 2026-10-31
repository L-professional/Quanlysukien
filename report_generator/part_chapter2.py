from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_generator.styles import (
    add_p, add_h1, add_h2, add_h3, add_bullet, add_callout, add_image_box, add_code_block
)

def build_chapter2(doc):
    add_h1(doc, "CHƯƠNG 2: THIẾT KẾ KIẾN TRÚC VÀ HỆ THỐNG PHẦN MỀM")

    add_h2(doc, "2.1. Kiến trúc tổng thể hệ thống (System Architecture)")
    add_p(doc, "Hệ thống Quản lý Spa tích hợp AI được thiết kế theo mô hình kiến trúc phân tầng 3 lớp (3-Tier Layered Architecture), đảm bảo tính phân tách độc lập giữa giao diện người dùng, logic xử lý nghiệp vụ và tầng lưu trữ dữ liệu. Kiến trúc này mang lại khả năng mở rộng linh hoạt, dễ dàng bảo trì và tối ưu hóa hiệu năng:")

    add_bullet(doc, "Tầng Giao diện Người dùng (Presentation Layer - Frontend): ", "Được xây dựng dưới dạng ứng dụng web đơn trang (Single Page Application - SPA) sử dụng thư viện ReactJS kết hợp Vite. Tầng này chịu trách nhiệm hiển thị giao diện, điều hướng màn hình tức thì, bắt lỗi form nhập liệu tại client và giao tiếp với Backend thông qua các lệnh gọi API RESTful (JSON). Tích hợp thư viện Chart.js để biểu diễn trực quan các biểu đồ phân tích kinh doanh.")
    add_bullet(doc, "Tầng Xử lý Nghiệp vụ (Business Logic Layer - Backend): ", "Hiện thực hóa bằng Framework FastAPI (Python) với cơ chế xử lý bất đồng bộ Asynchronous. Tầng này chịu trách nhiệm: (1) Xác thực và phân quyền RBAC qua Middleware JWT; (2) Thực thi các thuật toán nghiệp vụ lõi như kiểm tra xung đột lịch làm việc; (3) Thực hiện tiền xử lý dữ liệu và kích hoạt các bộ lọc bảo mật AI Guardrails (PII Masking, chống Prompt Injection); (4) Giao tiếp với Google Gemini API qua giao thức HTTPS bảo mật.")
    add_bullet(doc, "Tầng Dữ liệu và Dịch vụ Phụ trợ (Data & External Services Layer): ", "Bao gồm Hệ quản trị cơ sở dữ liệu quan hệ PostgreSQL 15 đóng vai trò lưu trữ bền vững (Persistent Storage), bộ nhớ đệm Redis lưu trữ cache session và catalog tra cứu nhanh, cùng Dịch vụ đám mây Google Gemini AI cung cấp năng lực trí tuệ nhân tạo.")

    add_image_box(doc, "spa_slide_images/slide_25.png", "Hình 2.1. Kiến trúc tổng thể hệ thống 3 phân tầng tích hợp AI và cơ sở dữ liệu")

    add_h2(doc, "2.2. Sơ đồ Phân rã Chức năng (Functional Decomposition Diagram - FDD)")
    add_p(doc, "Cấu trúc chức năng của hệ thống được phân rã thành 5 phân hệ lớn có tính gắn kết nội tại cao và ghép nối lỏng lẻo (High Cohesion, Loose Coupling):")
    add_bullet(doc, "Phân hệ 1 - Quản lý Danh mục & Kho: ", "Bao gồm các chức năng định nghĩa dịch vụ đơn lẻ (Service), tổ hợp liệu trình chuyên sâu (Treatment), các gói dịch vụ thẻ thành viên (Package) và quản lý mỹ phẩm bán kèm (Product).")
    add_bullet(doc, "Phân hệ 2 - Quản lý Khách hàng & Hồ sơ làm đẹp: ", "Bao gồm tiếp nhận hồ sơ khách mới, quản lý lịch sử điều trị, theo dõi phản ứng da, tích điểm loyalty và tra cứu đa tiêu chí.")
    add_bullet(doc, "Phân hệ 3 - Điều hành Lịch hẹn & Chống xung đột: ", "Trái tim vận hành của hệ thống, xử lý tạo lịch hẹn, tự động tính tổng thời gian phục vụ, phân công kỹ thuật viên và kiểm tra xung đột tài nguyên nhân sự theo thời gian thực.")
    add_bullet(doc, "Phân hệ 4 - Kế toán, Thu ngân & Hóa đơn: ", "Xử lý lập hóa đơn thanh toán, trừ tiền theo gói, áp dụng voucher giảm giá, ghi nhận thanh toán nhiều lần và quản lý công nợ khách hàng.")
    add_bullet(doc, "Phân hệ 5 - Trợ lý Trí tuệ Nhân tạo (AI Assistant): ", "Chuyên trách 3 tác vụ AI: Gợi ý phác đồ điều trị, Sinh thông điệp chăm sóc cá nhân hóa (Human-in-the-loop), và Tóm tắt hồ sơ điều trị dài hạn cho kỹ thuật viên.")

    add_h2(doc, "2.3. Sơ đồ Hoạt động (Activity Diagrams)")
    add_p(doc, "Sơ đồ hoạt động mô tả chi tiết luồng điều khiển nghiệp vụ giữa các tác nhân và các thành phần của hệ thống. Dưới đây là phân tích luồng nghiệp vụ quan trọng nhất: Quy trình Đặt lịch hẹn và Kiểm tra xung đột kỹ thuật viên:")

    add_image_box(doc, "spa_slide_images/slide_10.png", "Hình 2.2. Sơ đồ hoạt động (Flowchart): Quy trình đặt lịch và kiểm tra xung đột thời gian thực")

    add_p(doc, "Giải thích chi tiết luồng xử lý chống trùng lịch (Conflict Checking Flow):")
    add_bullet(doc, "Bước 1: ", "Lễ tân chọn khách hàng, chọn một hoặc nhiều dịch vụ/liệu trình khách muốn thực hiện trong ca hẹn.")
    add_bullet(doc, "Bước 2: ", "Lễ tân thiết lập ngày hẹn, giờ bắt đầu (`start_time`) và chọn kỹ thuật viên phụ trách (`therapist_id`).")
    add_bullet(doc, "Bước 3 - Tính toán thời gian tự động: ", "Hệ thống truy xuất thuộc tính `duration` của từng dịch vụ được chọn và cộng dồn: `total_duration = sum(service.duration)`. Giờ kết thúc ca hẹn được tính toán tự động: `end_time = start_time + total_duration` mà không cho phép người dùng can thiệp sửa đổi thủ công nhằm tránh sai sót nghiệp vụ.")
    add_bullet(doc, "Bước 4 - Kích hoạt thuật toán kiểm tra xung đột: ", "Hệ thống gửi câu truy vấn xuống CSDL PostgreSQL để tìm xem kỹ thuật viên này đã có lịch hẹn nào khác đang ở trạng thái hiệu lực (`status IN ('Confirmed', 'In_Progress')`) có khung giờ giao thoa với khoảng `[start_time, end_time]` hay không. Điều kiện giao thoa toán học được định nghĩa:")
    
    add_code_block(doc, """-- Điều kiện xác định xung đột lịch làm việc của Kỹ thuật viên
SELECT COUNT(*) 
FROM appointments a
JOIN appointment_details ad ON a.appt_id = ad.appt_id
WHERE ad.therapist_id = :target_therapist_id
  AND a.appointment_date = :target_date
  AND a.status IN ('Confirmed', 'In_Progress')
  AND (a.start_time < :new_end_time AND a.end_time > :new_start_time);""", "Đoạn mã SQL kiểm tra giao thoa thời gian biểu của Kỹ thuật viên")

    add_bullet(doc, "Bước 5 - Rẽ nhánh xử lý: ", "Nếu số lượng bản ghi trùng lặp > 0, hệ thống lập tức chặn luồng lưu dữ liệu, đổi màu đỏ khung giờ bị trùng và thông báo rõ: 'Kỹ thuật viên [Tên KTV] đã có lịch bận từ [Giờ bắt đầu cũ] đến [Giờ kết thúc cũ]. Vui lòng chọn kỹ thuật viên khác hoặc đổi khung giờ!'. Ngược lại, nếu kết quả trả về = 0, hệ thống chuyển sang bước ghi nhận dữ liệu vào CSDL và phát sinh thông báo thành công.")

    add_h2(doc, "2.4. Sơ đồ Tuần tự (Sequence Diagrams)")
    add_p(doc, "Sơ đồ tuần tự làm rõ sự tương tác theo dòng thời gian giữa đối tượng giao diện người dùng, bộ điều khiển Backend, tầng bảo vệ an toàn AI Guardrails, mô hình Google Gemini API và cơ sở dữ liệu PostgreSQL:")

    add_image_box(doc, "spa_slide_images/slide_11.png", "Hình 2.3. Sơ đồ tuần tự (Sequence Diagram): Luồng xử lý tư vấn AI có bảo vệ PII Guardrails")

    add_p(doc, "Các giai đoạn tuần tự trong quy trình gọi Trí tuệ Nhân tạo:")
    add_bullet(doc, "1. Yêu cầu từ Client: ", "Lễ tân nhập nhu cầu của khách tại màn hình AI Tool và bấm 'Tư vấn'. ReactJS gửi request POST /api/v1/ai/recommend kèm theo `customer_id` và `customer_need` cùng Bearer Token JWT.")
    add_bullet(doc, "2. Xác thực & Trích xuất dữ liệu: ", "FastAPI Middleware kiểm tra tính hợp lệ của Token JWT và phân quyền vai trò Lễ tân/Quản lý. Backend truy vấn PostgreSQL lấy lịch sử 5 dịch vụ gần nhất của khách hàng.")
    add_bullet(doc, "3. Kích hoạt Input Guardrails: ", "Bộ lọc PII Masking thay thế họ tên thật thành [KHACH_HANG] và số điện thoại thành [SO_DIEN_THOAI]. Bộ lọc Regex quét nội dung nhu cầu để loại bỏ các từ khóa tấn công Prompt Injection.")
    add_bullet(doc, "4. Gọi Gemini API: ", "Backend ghép nối Prompt Template (chứa System Rule, History đã che PII, Nhu cầu mới) và gọi hàm `generate_content` của Google Gemini API với cấu hình tham số `temperature = 0.3` để giảm thiểu tối đa hiện tượng ảo giác (Hallucination).")
    add_bullet(doc, "5. Xử lý kết quả & Ghi vết: ", "Nhận phản hồi JSON từ Gemini, bộ parser kiểm tra tính đúng đắn của dữ liệu (Structured Output Validation). Ghi vết toàn diện vào bảng `AIHistory` gồm: prompt, kết quả, thời gian phản hồi (latency), số token tiêu thụ. Trả kết quả đã định dạng đẹp về cho Frontend hiển thị.")

    add_h2(doc, "2.5. Mô hình Lớp Hướng đối tượng (Class Diagram)")
    add_p(doc, "Mô hình lớp phản ánh cấu trúc hướng đối tượng của hệ thống, thể hiện các lớp thực thể, thuộc tính, phương thức và quan hệ kết tập, kết hợp giữa các đối tượng trong miền nghiệp vụ Spa:")

    add_image_box(doc, "spa_slide_images/slide_16.png", "Hình 2.4. Mô hình lớp (Class Diagram) tổng quan của hệ thống")

    add_p(doc, "Điểm nổi bật trong thiết kế hướng đối tượng của hệ thống là sự phân tách mạch lạc giữa cấu trúc Dịch vụ đơn lẻ (Service) và Liệu trình nhiều bước (Treatment). Trong thực tế ngành làm đẹp, một liệu trình 'Trị mụn chuyên sâu' kéo dài 90 phút sẽ gồm nhiều bước tuần tự (Rửa mặt -> Tẩy da chết -> Xông hơi hút nhờn -> Nặn mụn -> Điện di serum -> Đắp mask làm dịu). Việc mô hình hóa lớp `Treatment` liên kết 1-N với lớp `TreatmentDetail` cho phép hệ thống quản lý chi tiết thứ tự thực hiện (`step_order`) và thời lượng riêng biệt của từng bước.")

    add_h3(doc, "2.5.1. Phân tích chuyên sâu Lớp nghiệp vụ cốt lõi: Appointment")
    add_p(doc, "Lớp `Appointment` là trái tim điều hành toàn bộ lịch làm việc và phục vụ tại spa. Cấu trúc thuộc tính và các phương thức quan trọng của lớp được mô tả chi tiết như sau:")

    add_image_box(doc, "spa_slide_images/slide_17.png", "Hình 2.5. Cấu trúc chi tiết và phương thức của Lớp Appointment")

    add_bullet(doc, "Các thuộc tính của lớp Appointment: ", "`appt_id` (int, PK), `customer_id` (int, FK), `appointment_date` (date), `start_time` (time), `end_time` (time), `total_duration` (int, phút), `total_amount` (decimal), `status` (enum: Pending, Confirmed, In_Progress, Completed, Cancelled), `created_at` (timestamp).")
    add_bullet(doc, "Phương thức calculate_end_time(): ", "Chịu trách nhiệm duyệt qua danh sách các đối tượng `ApptDetail` liên kết, cộng dồn tổng thời gian dịch vụ và gán giá trị tự động cho `end_time`. Nguyên tắc thiết kế: Tuyệt đối không cho phép người dùng nhập tay `end_time` để đảm bảo tính toàn vẹn toán học.")
    add_bullet(doc, "Phương thức check_availability(): ", "Phương thức tiền điều kiện bắt buộc thực thi trước mọi thao tác lưu lịch hẹn. Nó thực hiện kiểm tra tính sẵn sàng của phòng làm việc và kỹ thuật viên phụ trách, ngăn chặn triệt để tình trạng xung đột tài nguyên nhân sự.")

    add_h2(doc, "2.6. Sơ đồ Luồng Dữ liệu (Data Flow Diagram - DFD)")
    add_p(doc, "Sơ đồ luồng dữ liệu mô tả sự vận động của thông tin qua các tiến trình xử lý trong hệ thống:")
    add_bullet(doc, "DFD Mức ngữ cảnh (Context Diagram - Level 0): ", "Hệ thống nằm ở trung tâm tiếp nhận thông tin yêu cầu đặt lịch, hồ sơ khách hàng từ Lễ tân; nhận yêu cầu tra cứu lịch làm từ Kỹ thuật viên; nhận chỉ thị cấu hình từ Quản lý; gửi dữ liệu đã làm sạch sang AI Engine và nhận lại kết quả sinh văn bản; xuất hóa đơn cho Khách hàng và báo cáo tài chính cho Quản lý.")
    add_bullet(doc, "DFD Mức 1 (Level 1 DFD): ", "Phân rã thành 5 tiến trình nghiệp vụ chính: (1.0) Tiếp nhận & Quản lý thông tin khách hàng; (2.0) Điều phối & Kiểm tra xung đột lịch hẹn; (3.0) Thực hiện dịch vụ & Ghi nhận kết quả; (4.0) Xử lý thanh toán & Hóa đơn; (5.0) Xử lý Trí tuệ Nhân tạo & Kiểm toán AIHistory.")

    doc.add_page_break()
