from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_generator.styles import (
    add_p, add_h1, add_h2, add_bullet, add_callout, add_image_box
)

def build_chapter7(doc):
    add_h1(doc, "CHƯƠNG 7: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN")

    add_h2(doc, "7.1. Kết quả Đạt được của Đề tài")
    add_p(doc, "Trải qua 9 tuần nghiên cứu, thiết kế và phát triển thực nghiệm, nhóm sinh viên đã hoàn thành toàn diện các mục tiêu đề ra cho đề tài \"Hệ thống Quản lý Spa và Chăm sóc Sắc đẹp Tích hợp Trí tuệ Nhân tạo (AI)\". Đề tài đã mang lại những giá trị thiết thực cả về mặt học thuật công nghệ lẫn giá trị vận hành thực tiễn:")

    add_image_box(doc, "spa_slide_images/slide_28.png", "Hình 7.1. Hệ sinh thái giá trị thực tiễn mang lại cho Quản lý, Lễ tân, Kỹ thuật viên và Khách hàng")

    add_bullet(doc, "1. Số hóa thành công toàn diện nghiệp vụ Spa: ", "Xóa bỏ hoàn toàn phương thức quản lý bằng sổ tay và file Excel rời rạc. Toàn bộ hồ sơ khách hàng, danh mục dịch vụ, liệu trình, gói combo ưu đãi và sản phẩm mỹ phẩm được quản lý tập trung trên cơ sở dữ liệu quan hệ PostgreSQL 15 chuẩn hóa 3NF.")
    add_bullet(doc, "2. Giải quyết triệt để bài toán xung đột lịch Kỹ thuật viên: ", "Xây dựng và kiểm chứng thành công thuật toán `check_availability()` theo thời gian thực. Hệ thống tự động tính toán chính xác giờ kết thúc ca làm dựa trên tổng thời lượng dịch vụ và ngăn chặn 100% tình trạng gán trùng lịch cho cùng một kỹ thuật viên trong một khung giờ.")
    add_bullet(doc, "3. Ứng dụng Trí tuệ Nhân tạo thực chất và an toàn: ", "Hiện thực hóa thành công 3 chức năng AI then chốt bằng Google Gemini API: (1) AI gợi ý dịch vụ cá nhân hóa theo cơ địa; (2) AI sinh tin nhắn chăm sóc cá nhân hóa với cơ chế Human-in-the-loop; (3) AI tóm tắt hồ sơ điều trị dài hạn giúp kỹ thuật viên nắm bắt bệnh sử trong 5 giây.")
    add_bullet(doc, "4. Thiết lập hệ thống phòng vệ AI Guardrails chuẩn mực: ", "Hệ thống bảo vệ toàn diện dữ liệu nhạy cảm thông qua giải thuật che giấu thông tin cá nhân (PII Masking), phòng chống Prompt Injection đa lớp, tuân thủ nghiêm ngặt cảnh báo y tế (NFR-06), ghi nhận lịch sử kiểm toán đầy đủ vào bảng `AIHistory` và duy trì hoạt động liên tục nhờ cơ chế dự phòng Fallback khi mất mạng.")

    add_image_box(doc, "spa_slide_images/slide_30.png", "Hình 7.2. Tổng kết các kết quả đạt được và định hướng phát triển tương lai của hệ thống")

    add_h2(doc, "7.2. Những Hạn chế Còn Tồn tại")
    add_p(doc, "Bên cạnh những kết quả nổi bật đã đạt được, nhóm nghiên cứu cũng thẳng thắn nhìn nhận những mặt hạn chế cần tiếp tục hoàn thiện trong các giai đoạn tiếp theo:")
    add_bullet(doc, "Hạn chế về quy mô chi nhánh: ", "Hệ thống hiện tại được thiết kế tối ưu cho mô hình Spa đơn chi nhánh. Khi mở rộng sang mô hình chuỗi Spa đa chi nhánh với hàng chục cơ sở, cơ chế điều phối nhân sự chéo và luân chuyển kho hàng giữa các chi nhánh sẽ cần được tái cấu trúc chuyên sâu hơn.")
    add_bullet(doc, "Hạn chế về cổng kết nối viễn thông tự động: ", "Chức năng sinh tin nhắn chăm sóc của AI hiện tại mới dừng ở mức hiển thị bản nháp có định dạng trên màn hình để nhân viên lễ tân duyệt và sao chép gửi thủ công qua Zalo. Hệ thống chưa tích hợp trực tiếp API Zalo ZNS hoặc SMS Brandname tự động kết nối qua cổng nhà mạng viễn thông.")
    add_bullet(doc, "Giới hạn phương thức thanh toán: ", "Hệ thống mới hỗ trợ ghi nhận thanh toán tiền mặt và chuyển khoản ngân hàng thủ công, chưa tích hợp cổng thanh toán trực tuyến (Payment Gateway như VNPay, MoMo, ZaloPay) để khách hàng có thể quét mã QR tự động xác nhận đặt cọc từ xa.")
    add_bullet(doc, "Đặc tính phụ thuộc vào mô hình AI đám mây: ", "Phân hệ AI phụ thuộc vào kết nối Internet quốc tế và chính sách hạn mức Quota của Google AI Studio. Dù đã có cơ chế Fallback từ CSDL, nhưng khi mất mạng kéo dài, năng lực sinh nội dung thông minh tạm thời không thể hoạt động.")

    add_h2(doc, "7.3. Hướng Phát triển trong Tương lai")
    add_p(doc, "Nhằm nâng tầm hệ thống thành một giải pháp phần mềm thương mại hoàn chỉnh (SaaS - Software as a Service) phục vụ toàn diện cho ngành công nghiệp làm đẹp, nhóm đề xuất 4 hướng phát triển trọng tâm sau:")
    add_bullet(doc, "1. Tích hợp Cổng gửi tin tự động Zalo ZNS và SMS Brandname: ", "Đăng ký kết nối chính thức với Zalo Cloud API để hệ thống tự động bắn tin nhắn xác nhận lịch hẹn kèm mã vé điện tử ngay khi lễ tân bấm lưu, đồng thời tự động kích hoạt tiến trình Cron Job gửi tin nhắn thăm hỏi tình trạng da sau đúng 24 giờ kể từ khi ca điều trị kết thúc.")
    add_bullet(doc, "2. Tích hợp Cổng thanh toán trực tuyến VNPay / MoMo: ", "Mở rộng phân hệ thanh toán cho phép sinh mã VietQR động theo từng hóa đơn, tự động đối soát giao dịch ngân hàng (Webhook) để cập nhật trạng thái thanh toán ngay khi khách hàng chuyển khoản thành công.")
    add_bullet(doc, "3. Ứng dụng Thị giác Máy tính (Computer Vision) kết hợp Multimodal AI: ", "Tích hợp mô hình nhận diện ảnh da mặt đa chiều. Khách hàng chụp ảnh khuôn mặt tại quầy soi da, AI thị giác sẽ phân tích mật độ sắc tố melanin, lỗ chân lông, độ đàn hồi và tự động trích xuất các chỉ số da liễu đưa vào ngữ cảnh Prompt cho Gemini phân tích chuyên sâu.")
    add_bullet(doc, "4. Xây dựng Kiến trúc RAG (Retrieval-Augmented Generation) với Vector Database: ", "Tích hợp cơ sở dữ liệu véc-tơ (ChromaDB hoặc phần mở rộng pgvector trực tiếp trong PostgreSQL 15) để lưu trữ và truy xuất toàn bộ cẩm nang phác đồ điều trị, tài liệu thành phần dược mỹ phẩm của thương hiệu Spa. Khi đó, AI sẽ tư vấn cực kỳ chính xác dựa trên đúng quy chuẩn chuyên môn riêng của từng viện thẩm mỹ.")

    doc.add_page_break()
