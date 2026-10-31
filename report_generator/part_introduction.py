from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_generator.styles import (
    add_p, add_h1, add_h2, add_bullet, add_callout, add_image_box
)

def build_introduction(doc):
    add_h1(doc, "PHẦN MỞ ĐẦU")

    add_h2(doc, "1. Lý do chọn đề tài và bối cảnh thực tiễn")
    add_p(doc, "Trong bối cảnh nền kinh tế Việt Nam ngày càng phát triển, mức sống và thu nhập của người dân được nâng cao rõ rệt, nhu cầu chăm sóc sắc đẹp, thư giãn và phục hồi sức khỏe (Spa & Wellness) đã trở thành một phần thiết yếu trong lối sống hiện đại. Hàng ngàn cơ sở spa, thẩm mỹ viện và trung tâm trị liệu da liễu vừa và nhỏ đã ra đời nhằm đáp ứng thị trường đầy tiềm năng này.")
    add_p(doc, "Tuy nhiên, khảo sát thực tế tại các cơ sở spa quy mô vừa và nhỏ cho thấy đa số các đơn vị hiện nay vẫn đang vận hành theo phương thức truyền thống dựa trên sổ sách giấy hoặc các file bảng tính Excel rời rạc. Khi khách hàng liên hệ đặt hẹn qua điện thoại hoặc mạng xã hội (Zalo, Facebook), nhân viên lễ tân phải lật tìm sổ tay để kiểm tra thủ công lịch trống của từng phòng và từng kỹ thuật viên. Quy trình thủ công này đã bộc lộ 5 điểm nghẽn nghiệp vụ nghiêm trọng:")
    
    add_bullet(doc, "Lưu trữ thủ công và phân tán: ", "Thông tin khách hàng, số điện thoại, ghi chú tình trạng da và lịch sử sử dụng dịch vụ bị phân mảnh trên nhiều cuốn sổ hoặc thiết bị cá nhân, dẫn đến nguy cơ thất lạc dữ liệu và tốn rất nhiều thời gian mỗi khi cần tra cứu lại.")
    add_bullet(doc, "Khó kiểm soát lịch và thường xuyên xảy ra xung đột: ", "Lễ tân rất dễ vô tình xếp 2 khách hàng vào cùng một khung giờ cho một kỹ thuật viên (Therapist), dẫn đến tình trạng khách phải chờ đợi lâu, kỹ thuật viên bị quá tải và chất lượng dịch vụ sụt giảm nghiêm trọng.")
    add_bullet(doc, "Đứt gãy thông tin lịch sử chăm sóc: ", "Ngành làm đẹp có tính đặc thù cao liên quan trực tiếp đến cơ địa, loại da và tiền sử dị ứng của khách hàng. Khi nhân viên cũ nghỉ việc hoặc đổi ca làm, kỹ thuật viên mới hoàn toàn không nắm bắt được những lưu ý quan trọng (ví dụ: da nhạy cảm dễ kích ứng, không chịu được nhiệt độ cao khi triệt lông, đã từng tiêm meso), dẫn đến nguy cơ gây tổn thương cho khách.")
    add_bullet(doc, "Tư vấn mang tính cảm tính, thiếu chuẩn xác: ", "Việc gợi ý dịch vụ hoặc liệu trình tiếp theo phụ thuộc hoàn toàn vào trí nhớ và kinh nghiệm cá nhân của từng lễ tân. Nhân viên mới thường lúng túng, không biết khách hàng đang ở giai đoạn nào của phác đồ điều trị, dẫn đến tư vấn sai lệch hoặc bỏ lỡ cơ hội bán chéo (Cross-selling).")
    add_bullet(doc, "Chăm sóc khách hàng thụ động và máy móc: ", "Do số lượng khách hàng ngày càng đông, spa không đủ nhân lực để gửi tin nhắn nhắc hẹn trước 24 giờ hay thăm hỏi tình trạng da sau điều trị. Những tin nhắn mẫu (nếu có) thường khô cứng, thiếu tính cá nhân hóa, khiến tỷ lệ khách quên lịch (No-show) lên tới 15 - 20%.")

    add_image_box(doc, "spa_slide_images/slide_02.png", "Hình 1.1. Hiện trạng quy trình ghi chép thủ công và 5 điểm nghẽn nghiệp vụ tại các Spa vừa và nhỏ")

    add_p(doc, "Sự bùng nổ của Trí tuệ Nhân tạo tạo sinh (Generative AI) với các mô hình ngôn ngữ lớn (Large Language Models - LLMs) tiêu biểu như Google Gemini mở ra cơ hội đột phá để tái cấu trúc toàn diện quy trình quản lý spa. Không chỉ dừng lại ở bài toán số hóa dữ liệu CRUD (Thêm, Đọc, Sửa, Xóa) thông thường, việc nhúng AI vào hệ thống sẽ giúp cá nhân hóa sâu sắc trải nghiệm khách hàng, tự động phân tích hàng chục lịch sử điều trị cũ để tóm tắt cho kỹ thuật viên trong 5 giây, đồng thời hỗ trợ lễ tân tư vấn liệu trình chính xác như một chuyên gia da liễu giàu kinh nghiệm.")
    add_p(doc, "Xuất phát từ những đòi hỏi thực tiễn cấp bách đó, nhóm sinh viên đã quyết định lựa chọn đề tài: \"HỆ THỐNG QUẢN LÝ SPA VÀ CHĂM SÓC SẮC ĐẸP TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI)\" làm nội dung nghiên cứu và báo cáo tốt nghiệp học phần Ứng dụng Trí tuệ Nhân tạo.")

    add_h2(doc, "2. Mục tiêu nghiên cứu và xây dựng hệ thống")
    add_p(doc, "Mục tiêu tổng quát của đề tài là xây dựng một hệ thống phần mềm hoàn chỉnh, hiện đại, vận hành trên nền tảng Web, kết hợp chặt chẽ giữa phân hệ quản lý điều hành spa truyền thống với phân hệ trí tuệ nhân tạo tiên tiến nhằm tối ưu hóa hiệu suất làm việc của nhân sự và nâng cao mức độ hài lòng của khách hàng. Cụ thể, hệ thống hướng tới 4 nhóm mục tiêu cốt lõi sau:")
    
    add_bullet(doc, "Mục tiêu 1 - Quản lý cơ sở dữ liệu nền tảng: ", "Số hóa toàn bộ hồ sơ khách hàng, thông tin nhân viên, danh mục dịch vụ đơn lẻ, tổ hợp liệu trình nhiều bước (Treatment), các gói dịch vụ ưu đãi (Package) và quản lý kho sản phẩm bán kèm.")
    add_bullet(doc, "Mục tiêu 2 - Tự động hóa quy trình đặt lịch và chống xung đột: ", "Xây dựng thuật toán kiểm tra tính khả dụng (check_availability) theo thời gian thực. Hệ thống tự động tính toán thời điểm kết thúc ca dịch vụ dựa trên tổng thời lượng (duration) của các liệu trình, kiên quyết ngăn chặn việc gán trùng lịch cho cùng một kỹ thuật viên trong một khoảng thời gian.")
    add_bullet(doc, "Mục tiêu 3 - Quản lý tài chính, hóa đơn và công nợ minh bạch: ", "Hỗ trợ linh hoạt các hình thức thanh toán (tiền mặt, chuyển khoản), cho phép thanh toán toàn phần hoặc thanh toán từng đợt theo tiến trình điều trị, tự động khấu trừ ưu đãi gói và theo dõi công nợ chi tiết.")
    add_bullet(doc, "Mục tiêu 4 - Tích hợp Trí tuệ Nhân tạo (Trọng tâm đề tài): ", "Hiện thực hóa 3 module AI ứng dụng thực chất gồm: (1) AI gợi ý dịch vụ/liệu trình cá nhân hóa dựa trên lịch sử và nhu cầu hiện tại; (2) AI sinh tin nhắn nhắc lịch và chăm sóc sau dịch vụ có sự kiểm duyệt của nhân viên (Human-in-the-loop); (3) AI tóm tắt hồ sơ điều trị dài hạn giúp kỹ thuật viên nắm bắt nhanh trong 5 giây.")

    add_image_box(doc, "spa_slide_images/slide_03.png", "Hình 1.2. Bốn trụ cột mục tiêu cốt lõi của Hệ thống Quản lý Spa tích hợp AI")

    add_h2(doc, "3. Đối tượng và Phạm vi nghiên cứu")
    add_p(doc, "Đối tượng nghiên cứu của đề tài bao gồm:")
    add_bullet(doc, "Về mặt nghiệp vụ: ", "Toàn bộ quy trình tiếp nhận, đặt lịch hẹn, phân công nhân sự, chăm sóc khách hàng và thanh toán tại các cơ sở spa chăm sóc da và trị liệu sắc đẹp.")
    add_bullet(doc, "Về mặt công nghệ: ", "Kiến trúc mô hình ngôn ngữ lớn (Google Gemini API), kỹ thuật thiết kế Prompt có cấu trúc (Prompt Engineering), các cơ chế bảo mật AI (PII Masking, phòng chống Prompt Injection, AI Guardrails) và mô hình kiến trúc Web bất đồng bộ hiện đại (FastAPI kết hợp ReactJS và PostgreSQL 15).")
    
    add_p(doc, "Phạm vi nghiên cứu của đề tài được giới hạn như sau:")
    add_bullet(doc, "Phạm vi hệ thống: ", "Tập trung phục vụ mô hình kinh doanh spa đơn chi nhánh với đầy đủ các nghiệp vụ vận hành hằng ngày.")
    add_bullet(doc, "Phạm vi tác nhân: ", "Bao gồm 3 nhóm nhân sự nội bộ (Quản lý - Manager, Lễ tân - Receptionist, Kỹ thuật viên - Technician/Therapist) và 1 tác nhân phụ trợ bên ngoài (AI Engine). Khách hàng là đối tượng thụ hưởng trực tiếp các dịch vụ và thông điệp chăm sóc.")
    add_bullet(doc, "Phạm vi ứng dụng AI: ", "Tập trung khai thác năng lực hiểu ngôn ngữ tự nhiên (NLU) và sinh văn bản (Text Generation) thông qua API để hỗ trợ nghiệp vụ văn phòng và tư vấn. Hệ thống chưa triển khai mô hình thị giác máy tính (Computer Vision) phân tích ảnh da mặt hay tích hợp cổng SMS Brandname tự động trực tiếp từ nhà mạng (các nội dung này được định hướng phát triển trong tương lai).")

    add_h2(doc, "4. Phương pháp thực hiện và Kế hoạch triển khai dự án")
    add_p(doc, "Để đạt được các mục tiêu đề ra, nhóm nghiên cứu đã áp dụng các phương pháp khoa học kỹ thuật sau:")
    add_bullet(doc, "Phương pháp nghiên cứu lý thuyết: ", "Thu thập, phân tích tài liệu kỹ thuật chính thức từ Google AI Studio về Gemini API, tiêu chuẩn an toàn OWASP Top 10 for LLM Applications, tài liệu hệ quản trị cơ sở dữ liệu PostgreSQL 15 và các chuẩn thiết kế RESTful API.")
    add_bullet(doc, "Phương pháp khảo sát thực tế: ", "Phỏng vấn trực tiếp nhân viên lễ tân, kỹ thuật viên và chủ spa để thu thập các biểu mẫu sổ tay ghi chép, kịch bản tin nhắn chăm sóc khách hàng và các tình huống xung đột lịch thường gặp.")
    add_bullet(doc, "Phương pháp phân tích và mô hình hóa: ", "Sử dụng ngôn ngữ mô hình hóa thống nhất (UML) để xây dựng Sơ đồ Use Case, Sơ đồ hoạt động (Activity Diagram), Sơ đồ tuần tự (Sequence Diagram), Sơ đồ lớp (Class Diagram) và mô hình thực thể liên kết (ERD) đạt chuẩn 3NF.")
    add_bullet(doc, "Phương pháp phát triển phần mềm theo mô hình Agile: ", "Dự án được triển khai trong thời gian 9 tuần (từ ngày 27/07/2026 đến ngày 27/09/2026) trải qua 3 mốc kiểm tra đánh giá định kỳ (KT1, KT2, KT3) của giảng viên hướng dẫn.")

    add_image_box(doc, "spa_slide_images/slide_04.png", "Hình 1.3. Lộ trình kế hoạch triển khai dự án trong 9 tuần với các mốc kiểm tra định kỳ")

    add_h2(doc, "5. Công nghệ và công cụ sử dụng trong hệ thống")
    add_p(doc, "Toàn bộ hệ thống được xây dựng dựa trên ngăn xếp công nghệ (Technology Stack) hiện đại, đảm bảo tính ổn định, tốc độ phản hồi cao và khả năng bảo mật chặt chẽ:")
    add_bullet(doc, "Backend Framework (FastAPI - Python): ", "Lựa chọn FastAPI nhờ hiệu năng xử lý bất đồng bộ (Asynchronous / Async-Await) vượt trội. Điều này đặc biệt quan trọng khi hệ thống phải thực hiện các lệnh gọi API bên ngoài đến Gemini AI (vốn có thời gian trễ từ 1 - 2 giây) mà không làm tắc nghẽn (non-blocking) luồng xử lý các yêu cầu nghiệp vụ khác của lễ tân.")
    add_bullet(doc, "Hệ quản trị Cơ sở dữ liệu (PostgreSQL 15): ", "Sử dụng PostgreSQL 15 làm kho lưu trữ chính nhờ tính toàn vẹn dữ liệu (ACID) nghiêm ngặt, hỗ trợ kiểu dữ liệu JSONB mạnh mẽ để lưu trữ các tham số Prompt động và kết quả phản hồi của AI trong bảng AIHistory. Hệ thống kết hợp với Redis để lưu bộ đệm (Cache) cho các danh mục dịch vụ tra cứu thường xuyên.")
    add_bullet(doc, "Frontend Framework (ReactJS): ", "Xây dựng ứng dụng web đơn trang (Single Page Application - SPA) mang lại trải nghiệm tương tác mượt mà, chuyển trang tức thì không bị tải lại toàn trang. Tích hợp thư viện Chart.js để hiển thị trực quan các biểu đồ thống kê doanh thu và tần suất dịch vụ trên màn hình Dashboard.")
    add_bullet(doc, "AI Engine (Google Gemini API): ", "Được sử dụng làm khối xử lý trí tuệ nhân tạo trung tâm, thực hiện các tác vụ phân tích lịch sử khách hàng, trích xuất điểm cần nhớ và sinh câu văn tư vấn tự nhiên.")
    add_bullet(doc, "Bảo mật & Phân quyền: ", "Sử dụng JSON Web Token (JWT) kết hợp thuật toán mã hóa mật khẩu một chiều BCrypt để quản lý phiên làm việc không trạng thái (Stateless Authentication). Áp dụng mô hình phân quyền dựa trên vai trò (RBAC) ở tầng Middleware của Backend.")

    add_h2(doc, "6. Bố cục của Báo cáo")
    add_p(doc, "Nội dung bản báo cáo được trình bày khoa học và logic qua 7 chương chuyên môn:")
    add_bullet(doc, "Phần mở đầu: ", "Giới thiệu bối cảnh, lý do chọn đề tài, mục tiêu, đối tượng, phạm vi, phương pháp và công nghệ sử dụng.")
    add_bullet(doc, "Chương 1 - Khảo sát nghiệp vụ và Phân tích yêu cầu hệ thống: ", "Khảo sát 5 tác nhân hệ thống, đặc tả chi tiết 11 yêu cầu chức năng (FR-01 đến FR-11), 6 yêu cầu phi chức năng (NFR-01 đến NFR-06) và hệ thống sơ đồ Use Case.")
    add_bullet(doc, "Chương 2 - Thiết kế kiến trúc và Hệ thống phần mềm: ", "Trình bày kiến trúc phân tầng 3 lớp, sơ đồ phân rã chức năng, sơ đồ hoạt động, sơ đồ tuần tự và mô hình lớp hướng đối tượng.")
    add_bullet(doc, "Chương 3 - Thiết kế cơ sở dữ liệu PostgreSQL 15: ", "Mô tả chi tiết lược đồ ERD, đặc tả 13 bảng thực thể, phân tích chuẩn hóa 3NF có minh chứng và ràng buộc toàn vẹn.")
    add_bullet(doc, "Chương 4 - Phân tích, thiết kế và bảo mật phân hệ AI: ", "Nội dung trọng tâm trình bày chi tiết 3 chức năng AI, kiến trúc 8 bước AI Guardrails (PII Masking, Prompt Injection, Disclaimer y tế, Fallback, Audit Log).")
    add_bullet(doc, "Chương 5 - Triển khai hệ thống và Thực nghiệm giao diện: ", "Trình bày cấu trúc dự án, mã nguồn các module lõi Backend, giao diện ReactJS thực tế và kịch bản Demo.")
    add_bullet(doc, "Chương 6 - Kiểm thử và Đánh giá chất lượng hệ thống: ", "Thiết lập ma trận 15 Test Cases kiểm thử chức năng, phân quyền, kiểm thử AI và đánh giá hiệu năng hệ thống.")
    add_bullet(doc, "Chương 7 - Kết luận và Hướng phát triển: ", "Tổng kết những kết quả đạt được, chỉ ra những hạn chế và đề xuất phương hướng phát triển tiếp theo.")
    add_bullet(doc, "Tài liệu tham khảo và Phụ lục: ", "Danh mục tài liệu trích dẫn theo chuẩn IEEE và các phụ lục mã nguồn, prompt mẫu.")

    doc.add_page_break()
