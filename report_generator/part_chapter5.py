from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_generator.styles import (
    add_p, add_h1, add_h2, add_h3, add_bullet, add_callout, add_image_box, add_code_block
)

def build_chapter5(doc):
    add_h1(doc, "CHƯƠNG 5: TRIỂN KHAI HỆ THỐNG VÀ THỰC NGHIỆM GIAO DIỆN")

    add_h2(doc, "5.1. Môi trường Triển khai và Cấu trúc Thư mục Dự án")
    add_p(doc, "Hệ thống Quản lý Spa tích hợp AI được đóng gói và triển khai theo mô hình Container hóa (Docker & Docker Compose), giúp môi trường phát triển và môi trường vận hành thực tế luôn đồng nhất:")
    add_bullet(doc, "Môi trường máy chủ: ", "Hệ điều hành Ubuntu 22.04 LTS / Windows 11; Python 3.10; Node.js v18 LTS; PostgreSQL 15; Redis 7.0.")
    add_bullet(doc, "Cấu trúc thư mục mã nguồn Backend (FastAPI): ", "Được tổ chức chuẩn mực theo mô hình phân tầng Modular Architecture:")

    add_code_block(doc, """spa-management-backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py          # API đăng nhập & cấp token JWT
│   │   │   │   ├── customers.py     # API quản lý hồ sơ khách hàng
│   │   │   │   ├── appointments.py  # API đặt lịch & kiểm tra xung đột KTV
│   │   │   │   ├── services.py      # API catalog dịch vụ & liệu trình
│   │   │   │   ├── billing.py       # API hóa đơn, thanh toán & công nợ
│   │   │   │   └── ai_tools.py      # API 3 chức năng AI (Gemini integration)
│   │   │   └── router.py            # Tổng hợp các router v1
│   ├── core/
│   │   ├── config.py                # Cấu hình biến môi trường (.env)
│   │   ├── security.py              # Xử lý băm mật khẩu & giải mã JWT
│   │   └── guardrails.py            # Bộ lọc PII Masking & chống Prompt Injection
│   ├── db/
│   │   ├── session.py               # Kết nối PostgreSQL (SQLAlchemy async)
│   │   └── base.py                  # Khai báo Base Model
│   ├── models/                      # Các thực thể CSDL (User, Appointment,...)
│   ├── schemas/                     # Các lớp Pydantic xác thực request/response
│   └── services/                    # Tầng nghiệp vụ (AppointmentService, AIService)
├── main.py                          # Khởi tạo ứng dụng FastAPI & Middleware
├── requirements.txt                 # Danh mục thư viện phụ thuộc
└── Dockerfile                       # Đóng gói ứng dụng Backend""", "Cấu trúc tổ chức thư mục mã nguồn Backend FastAPI")

    add_h2(doc, "5.2. Hiện thực hóa các Module Backend và API Cốt lõi")
    add_p(doc, "Dưới đây là đoạn mã nguồn then chốt hiện thực hóa thuật toán kiểm tra tính khả dụng của Kỹ thuật viên (Availability Checker) và logic gọi Gemini AI có bảo vệ Guardrails:")

    add_code_block(doc, """# File: app/services/appointment_service.py
from datetime import date, time
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.appointment import Appointment, AppointmentDetail

class AppointmentService:
    @staticmethod
    def check_therapist_availability(
        db: Session, 
        therapist_id: int, 
        appt_date: date, 
        start_time: time, 
        end_time: time,
        exclude_appt_id: int = None
    ) -> bool:
        \"\"\"
        Thuật toán kiểm tra xung đột lịch làm việc của Kỹ thuật viên.
        Trả về True nếu KTV rảnh rỗi, False nếu có lịch trùng lặp.
        \"\"\"
        query = db.query(Appointment).join(AppointmentDetail).filter(
            AppointmentDetail.therapist_id == therapist_id,
            Appointment.appointment_date == appt_date,
            Appointment.status.in_(['Confirmed', 'In_Progress']),
            # Điều kiện giao thoa khoảng thời gian [start_time, end_time]
            and_(
                Appointment.start_time < end_time,
                Appointment.end_time > start_time
            )
        )
        if exclude_appt_id:
            query = query.filter(Appointment.appt_id != exclude_appt_id)
            
        conflicts = query.count()
        return conflicts == 0""", "Mã nguồn Python thực thi thuật toán kiểm tra xung đột lịch hẹn")

    add_p(doc, "Hiện thực hóa tầng Service gọi Google Gemini API với đầy đủ cơ chế che giấu PII, bắt lỗi timeout và kích hoạt Fallback:")

    add_code_block(doc, """# File: app/services/ai_service.py
import json, time
import google.generativeai as genai
from app.core.config import settings
from app.core.guardrails import mask_pii_data, validate_input_safety
from app.schemas.ai_schema import AIRecommendationResponse

genai.configure(api_key=settings.GEMINI_API_KEY)

class AIService:
    @staticmethod
    async def get_service_recommendation(db, customer_info: dict, current_need: str) -> dict:
        start_time_req = time.time()
        # 1. Input Guardrails
        validate_input_safety(current_need)
        sanitized_customer = mask_pii_data(customer_info)

        # 2. Xây dựng Prompt
        prompt = f\"\"\"
        Thông tin khách hàng: {json.dumps(sanitized_customer, ensure_ascii=False)}
        Nhu cầu hiện tại: {current_need}
        Hãy gợi ý 2 dịch vụ phù hợp nhất theo chuẩn JSON đã quy định.
        \"\"\"

        # 3. Gọi Gemini API kèm Fallback
        try:
            model = genai.GenerativeModel(
                model_name=\"gemini-1.5-flash\",
                system_instruction=\"Bạn là chuyên gia tư vấn Spa cao cấp. Trả về JSON đúng chuẩn.\"
            )
            response = await model.generate_content_async(
                prompt,
                generation_config={\"response_mime_type\": \"application/json\", \"temperature\": 0.3}
            )
            result = json.loads(response.text)
            latency = int((time.time() - start_time_req) * 1000)
            result[\"latency_ms\"] = latency
            result[\"is_fallback\"] = False
            return result
        except Exception as e:
            # Kích hoạt Fallback khi lỗi API
            fallback_services = [
                {\"service_name\": \"Massage Body Đá Nóng\", \"reason\": \"Dịch vụ thư giãn thịnh hành nhất\", \"expected_duration\": 60, \"price_estimate\": 350000},
                {\"service_name\": \"Chăm Sóc Da Cấp Ẩm Chuyên Sâu\", \"reason\": \"Phù hợp mọi loại da\", \"expected_duration\": 75, \"price_estimate\": 450000}
            ]
            return {
                \"recommendations\": fallback_services,
                \"suggested_message\": \"Dạ em chào chị ạ, hiện tại Spa bên em đang có 2 dịch vụ thư giãn được yêu thích nhất...\",
                \"disclaimer\": \"AI chỉ hỗ trợ tư vấn tham khảo (Chế độ Fallback từ CSDL).\",
                \"latency_ms\": int((time.time() - start_time_req) * 1000),
                \"is_fallback\": True
            }""", "Mã nguồn Service tích hợp Google Gemini API có xử lý Exception và Fallback")

    add_h2(doc, "5.3. Hiện thực hóa Giao diện Người dùng (ReactJS)")
    add_p(doc, "Giao diện hệ thống được thiết kế theo phong cách hiện đại, tối giản (Clean UI) với tông màu xanh trang nhã phù hợp môi trường làm đẹp. Luồng điều hướng được bố trí dạng Menu Sidebar cố định bên trái, giúp người dùng dễ dàng chuyển đổi qua lại giữa các màn hình mà không bị gián đoạn công việc:")

    add_image_box(doc, "spa_slide_images/slide_22.png", "Hình 5.1. Sơ đồ luồng điều hướng màn hình người dùng (Screen Flow)")

    add_h3(doc, "5.3.1. Màn hình Dashboard Quản lý Vận hành")
    add_p(doc, "Màn hình Dashboard cung cấp cái nhìn toàn cảnh về tình hình kinh doanh trong ngày theo thời gian thực (Real-time):")
    add_bullet(doc, "Thẻ chỉ số tổng quan (KPI Cards): ", "Doanh thu hôm nay (12,500k VNĐ), Tổng số ca hẹn trong ngày (28 ca), Số khách hàng mới (5 khách), Dịch vụ phổ biến nhất (Massage Body).")
    add_bullet(doc, "Khung thông báo lịch hẹn sắp diễn ra: ", "Cập nhật liên tục danh sách ca làm sắp tới (14:00 - Nguyễn Văn A - Trị mụn; 15:30 - Trần Thị B - Triệt lông), giúp lễ tân chủ động đón tiếp chu đáo.")
    add_bullet(doc, "Biểu đồ phân tích doanh thu: ", "Sử dụng thư viện Chart.js hiển thị biểu đồ đường theo dõi biến động doanh thu theo các ngày trong tuần.")

    add_image_box(doc, "spa_slide_images/slide_23.png", "Hình 5.2. Màn hình Dashboard Quản lý Vận hành và Doanh thu thời gian thực")

    add_h3(doc, "5.3.2. Màn hình AI Tool - Tư vấn & Chăm sóc Khách hàng")
    add_p(doc, "Đây là màn hình ứng dụng nổi bật nhất của hệ thống, nơi lễ tân tương tác trực tiếp với mô hình Trí tuệ Nhân tạo:")
    add_bullet(doc, "Khu vực nhập liệu bên trái: ", "Cho phép chọn nhanh khách hàng từ danh sách tìm kiếm, hiển thị mờ lịch sử 3 lần làm đẹp gần nhất của khách để nhân viên có bối cảnh; ô văn bản để nhập nhu cầu phát sinh hiện tại.")
    add_bullet(doc, "Khu vực kết quả AI bên phải: ", "Hiển thị 2 thẻ dịch vụ gợi ý kèm giải thích lý do cụ thể; khung văn bản chứa câu thoại tư vấn mẫu; các nút thao tác nhanh: 'Sao chép văn bản' và 'Gửi qua Zalo'.")
    add_bullet(doc, "Dòng cảnh báo pháp lý y tế (NFR-06): ", "Luôn hiển thị màu đỏ nổi bật ở đầu khung kết quả: 'AI chỉ hỗ trợ tham khảo, không thay thế chẩn đoán y khoa chuyên sâu'.")

    add_image_box(doc, "spa_slide_images/slide_24.png", "Hình 5.3. Màn hình công cụ AI Tool: Tư vấn dịch vụ và sinh nội dung cá nhân hóa")

    add_h2(doc, "5.4. Kịch bản Thực nghiệm Hệ thống (Live Demo Script)")
    add_p(doc, "Để chứng minh tính khả thi và mức độ hoàn thiện của hệ thống trước Hội đồng đánh giá, nhóm nghiên cứu đã xây dựng kịch bản thực nghiệm end-to-end qua 4 bước nối tiếp:")

    add_image_box(doc, "spa_slide_images/slide_29.png", "Hình 5.4. Kịch bản 4 bước thực nghiệm hệ thống từ Đặt lịch đến Báo cáo doanh thu")

    add_bullet(doc, "Bước 1 - Đăng nhập & Chọn khách hàng: ", "Đăng nhập bằng tài khoản Lễ tân (`receptionist01`), tìm kiếm khách hàng 'Nguyễn Thị A' trong thanh công cụ tìm kiếm nhanh.")
    add_bullet(doc, "Bước 2 - Lập lịch hẹn & Kiểm nghiệm thuật toán chống trùng: ", "Tạo lịch hẹn mới lúc 14:00 cho kỹ thuật viên Bích Ngọc. Cố tình mở tab thứ 2 tạo tiếp một lịch hẹn khác lúc 14:30 cũng gán cho kỹ thuật viên Bích Ngọc. Hệ thống lập tức phát hiện xung đột thời gian, hiển thị cảnh báo đỏ và khóa nút lưu, chứng minh thuật toán `check_availability()` hoạt động chính xác 100%.")
    add_bullet(doc, "Bước 3 - Tư vấn bằng AI Tool & Sinh tin nhắn: ", "Mở tab AI Tool, chọn khách hàng 'Nguyễn Thị A' và nhập nhu cầu: 'Khách dạo này mỏi vai gáy và muốn giảm mỡ bụng'. Bấm gửi AI. Sau 1.4 giây, hệ thống trả về kết quả gợi ý: Gói Trị liệu thắt lưng kết hợp Máy RF giảm mỡ và sinh sẵn tin nhắn tư vấn tự nhiên. Lễ tân bấm 'Sao chép văn bản'.")
    add_bullet(doc, "Bước 4 - Thanh toán & Đối soát Dashboard: ", "Chuyển trạng thái lịch hẹn sang 'Completed', xuất hóa đơn thanh toán 1,200,000 VNĐ. Đăng xuất và đăng nhập tài khoản Quản lý (`manager01`), mở màn hình Dashboard thấy chỉ số doanh thu trong ngày lập tức nảy số cộng thêm 1,200,000 VNĐ theo thời gian thực.")

    doc.add_page_break()
