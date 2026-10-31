from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_generator.styles import (
    add_p, add_h1, add_h2, add_h3, add_bullet, add_callout, add_image_box, add_styled_table
)

def build_chapter1(doc):
    add_h1(doc, "CHƯƠNG 1: KHẢO SÁT NGHIỆP VỤ VÀ PHÂN TÍCH YÊU CẦU HỆ THỐNG")

    add_h2(doc, "1.1. Khảo sát hiện trạng và quy trình vận hành Spa thực tế")
    add_p(doc, "Để thiết kế một hệ thống thông tin quản lý sát với thực tế vận hành và giải quyết triệt để các vướng mắc của người dùng, nhóm nghiên cứu đã tiến hành khảo sát quy trình tại các cơ sở làm đẹp vừa và nhỏ. Kết quả khảo sát cho thấy một chu trình phục vụ khách hàng tiêu chuẩn tại Spa thường trải qua 4 giai đoạn nối tiếp:")
    add_bullet(doc, "Giai đoạn 1 - Tiếp nhận và Đặt lịch hẹn: ", "Khách hàng liên hệ qua điện thoại, tin nhắn Zalo/Fanpage hoặc đến trực tiếp. Lễ tân hỏi nhu cầu, kiểm tra lịch trống của kỹ thuật viên và giường dịch vụ, sau đó ghi thông tin vào sổ hẹn (bao gồm: Tên khách, SĐT, Dịch vụ muốn làm, Giờ hẹn, Kỹ thuật viên phụ trách).")
    add_bullet(doc, "Giai đoạn 2 - Đón tiếp và Tư vấn chuyên sâu: ", "Khi khách đến cơ sở, lễ tân đối chiếu lịch hẹn, mời nước và tìm lại hồ sơ giấy cũ (nếu là khách quen) để xem khách đã từng làm liệu trình gì, da có bị kích ứng không. Nếu khách có nhu cầu mới (ví dụ: muốn trị nám hoặc triệt lông), lễ tân sẽ dựa trên cảm quan cá nhân để tư vấn các gói dịch vụ phù hợp.")
    add_bullet(doc, "Giai đoạn 3 - Thực hiện dịch vụ tại phòng kỹ thuật: ", "Kỹ thuật viên tiếp nhận khách, thực hiện các bước trong quy trình điều trị (ví dụ liệu trình nặn mụn gồm: tẩy trang, xông hơi, hút bã nhờn, nặn mụn, đắp mặt nạ, chiếu đèn sinh học). Sau khi kết thúc, kỹ thuật viên ghi chú tay vào phiếu theo dõi (ví dụ: da đỏ nhiều, cần kiêng nước 12h, hẹn tái khám sau 7 ngày).")
    add_bullet(doc, "Giai đoạn 4 - Thanh toán và Chăm sóc hậu dịch vụ: ", "Khách quay lại quầy lễ tân để thanh toán hóa đơn. Lễ tân tính tiền dịch vụ, trừ tiền nếu khách có mua gói trả trước, xuất hóa đơn giấy và nhắc lịch tái khám. Trong vòng 24 - 48 giờ sau đó, nhân viên phải chủ động nhớ để nhắn tin hỏi thăm tình trạng da của khách.")

    add_p(doc, "Thực tế cho thấy, ở những thời điểm cao điểm (cuối tuần hoặc các khung giờ từ 17h - 20h), việc quản lý hoàn toàn thủ công khiến lễ tân liên tục gặp phải các sự cố: xếp trùng lịch cho 1 kỹ thuật viên có tay nghề cao, quên dặn dò kỹ thuật viên về tình trạng da nhạy cảm của khách, hoặc tính toán sai sót số buổi còn lại trong thẻ liệu trình của khách hàng. Đây chính là lý do việc số hóa và tự động hóa quy trình nghiệp vụ trở thành nhu cầu sống còn.")

    add_h2(doc, "1.2. Phân tích các Tác nhân Hệ thống (Actors)")
    add_p(doc, "Hệ thống Quản lý Spa tích hợp AI phân định rõ ràng các tác nhân tương tác với hệ thống, đặc biệt tách bạch giữa vai trò Quản trị viên kỹ thuật và Quản lý vận hành kinh doanh nhằm bảo đảm an toàn thông tin và phân định trách nhiệm:")
    
    actor_headers = ["STT", "Tác nhân (Actor)", "Loại tác nhân", "Phạm vi quyền hạn & Trách nhiệm chính"]
    actor_rows = [
        ("1", "Quản trị viên (Admin)", "Tác nhân con người (Hệ thống)", "Quản trị kỹ thuật toàn bộ hệ thống; cấp phát và khóa tài khoản người dùng; phân quyền vai trò; cấu hình tham số hệ thống; cấu hình API Key của mô hình AI; sao lưu và phục hồi dữ liệu; xem toàn bộ Audit Logs."),
        ("2", "Quản lý (Manager)", "Tác nhân con người (Kinh doanh)", "Quản lý toàn diện hoạt động vận hành spa; quản lý hồ sơ nhân viên; thiết lập danh mục dịch vụ, liệu trình, gói combo và giá bán; xem toàn bộ báo cáo doanh thu, công nợ, hiệu suất nhân sự."),
        ("3", "Lễ tân (Receptionist)", "Tác nhân con người (Vận hành)", "Tiếp nhận khách hàng; tạo mới và tra cứu hồ sơ khách; tạo/sửa/hủy lịch hẹn; kích hoạt thuật toán kiểm tra xung đột KTV; thực hiện thanh toán, xuất hóa đơn; sử dụng AI Tool để tư vấn dịch vụ và sinh tin nhắn chăm sóc."),
        ("4", "Kỹ thuật viên (Therapist)", "Tác nhân con người (Vận hành)", "Chỉ được xem lịch làm việc được phân công gắn với định danh của chính mình (Data Isolation); xem tóm tắt hồ sơ khách hàng bằng AI (lưu ý loại da, dị ứng); ghi chú kết quả chăm sóc sau ca làm."),
        ("5", "Khách hàng (Customer)", "Tác nhân bên ngoài (Thụ hưởng)", "Đối tượng thụ hưởng dịch vụ; nhận thông báo xác nhận lịch hẹn và tin nhắn chăm sóc cá nhân hóa; gửi đánh giá phản hồi về chất lượng dịch vụ."),
        ("6", "AI Engine (Gemini API)", "Tác nhân phụ trợ (Secondary Actor)", "Hệ thống trí tuệ nhân tạo bên ngoài, đóng vai trò xử lý ngôn ngữ tự nhiên (NLU), tiếp nhận prompt và dữ liệu đã làm sạch từ Backend để sinh nội dung gợi ý, tin nhắn và tóm tắt hồ sơ.")
    ]
    add_styled_table(doc, "Bảng 1.1. Ma trận phân tích các tác nhân và phạm vi quyền hạn trong hệ thống", actor_headers, actor_rows, [Inches(0.6), Inches(1.8), Inches(1.6), Inches(2.3)])

    add_image_box(doc, "spa_slide_images/slide_05.png", "Hình 1.4. Phân định vai trò và phạm vi nghiệp vụ của 3 nhóm tác nhân nhân sự nội bộ")

    add_h2(doc, "1.3. Danh mục Yêu cầu Chức năng (Functional Requirements - FR)")
    add_p(doc, "Toàn bộ các yêu cầu chức năng của hệ thống được mã hóa thống nhất theo định dạng FR-xx, phân thành 3 nhóm năng lực rõ rệt: Quản lý cơ sở dữ liệu nền tảng, Vận hành nghiệp vụ Spa hằng ngày, và Tích hợp Trí tuệ nhân tạo kết hợp Báo cáo phân tích:")

    fr_headers = ["Mã FR", "Tên yêu cầu chức năng", "Nhóm phân hệ", "Mô tả chi tiết chức năng"]
    fr_rows = [
        ("FR-01", "Quản lý khách hàng", "Cơ sở dữ liệu", "Thực hiện CRUD hồ sơ khách hàng (Họ tên, SĐT, Email, Giới tính, Ngày sinh, Loại da cơ địa, Tiền sử dị ứng, Điểm tích lũy loyalty). Tra cứu nhanh theo SĐT hoặc mã định danh."),
        ("FR-02", "Quản lý danh mục Catalog", "Cơ sở dữ liệu", "Quản lý danh mục Dịch vụ đơn lẻ (Service), Liệu trình nhiều bước (Treatment kèm TreatmentDetail) và Gói ưu đãi combo (Package). Thiết lập giá tiền, thời lượng (duration) và mô tả kỹ thuật."),
        ("FR-03", "Quản lý đặt lịch hẹn", "Vận hành nghiệp vụ", "Khởi tạo lịch hẹn mới (Appointment và ApptDetail), thay đổi thời gian, chuyển trạng thái (Chờ duyệt, Đã xác nhận, Đang phục vụ, Hoàn thành, Hủy ca). Tự động kích hoạt thuật toán chống trùng giờ KTV."),
        ("FR-04", "Phân công kỹ thuật viên", "Vận hành nghiệp vụ", "Gán kỹ thuật viên cụ thể (therapist_id) cho từng dịch vụ con trong lịch hẹn. Hệ thống kiểm tra ca trực và thời gian biểu của kỹ thuật viên."),
        ("FR-05", "Quản lý thanh toán & Hóa đơn", "Vận hành nghiệp vụ", "Lập hóa đơn (Invoice) từ lịch hẹn hoàn thành hoặc bán sản phẩm lẻ. Tính toán tự động tổng tiền, giảm giá theo Package. Hỗ trợ thanh toán toàn phần hoặc nhiều lần (Payment), quản lý công nợ."),
        ("FR-06", "Quản lý sản phẩm & Kho", "Cơ sở dữ liệu", "Quản lý danh mục mỹ phẩm, sản phẩm chăm sóc da bán kèm hoặc tiêu hao tại phòng dịch vụ. Theo dõi số lượng tồn kho (stock), cảnh báo khi sắp hết hàng."),
        ("FR-07", "Tìm kiếm nâng cao đa tiêu chí", "Vận hành nghiệp vụ", "Tìm kiếm khách hàng, lịch hẹn, dịch vụ theo nhiều bộ lọc kết hợp: khoảng thời gian, kỹ thuật viên phụ trách, trạng thái thanh toán, mức độ chi tiêu."),
        ("FR-08", "AI Gợi ý dịch vụ / liệu trình", "Trí tuệ nhân tạo", "Phân hệ AI phân tích lịch sử điều trị cũ của khách hàng kết hợp nhu cầu mới gõ tay của lễ tân để đề xuất 2 dịch vụ khớp nhất trong cơ sở dữ liệu kèm lý do giải thích và câu thoại mẫu."),
        ("FR-09", "AI Sinh tin nhắn chăm sóc", "Trí tuệ nhân tạo", "Sinh tự động các bản tin cá nhân hóa (Nhắc lịch hẹn trước 24h, cảm ơn sau dịch vụ, hỏi thăm tình trạng da sau nặn mụn/laser) có cơ chế nhân viên xem xét trước khi gửi (Human-in-the-loop)."),
        ("FR-10", "AI Tóm tắt hồ sơ khách hàng", "Trí tuệ nhân tạo", "Quét toàn bộ dữ liệu lịch sử thăm khám dài (hàng chục lần điều trị cũ) và trích xuất thành 3 - 5 ý chính cô đọng về đặc điểm da và sở thích giúp kỹ thuật viên nắm bắt trong 5 giây."),
        ("FR-11", "Thống kê và Báo cáo doanh thu", "Báo cáo phân tích", "Tổng hợp doanh thu theo ngày, tuần, tháng; thống kê số lượng lịch hẹn; tỷ lệ hủy lịch; xếp hạng các dịch vụ phổ biến nhất và đo lường doanh số theo từng kỹ thuật viên.")
    ]
    add_styled_table(doc, "Bảng 1.2. Danh mục 11 yêu cầu chức năng cốt lõi của hệ thống (FR-01 đến FR-11)", fr_headers, fr_rows, [Inches(0.9), Inches(1.8), Inches(1.4), Inches(2.2)])

    add_image_box(doc, "spa_slide_images/slide_06.png", "Hình 1.5. Cấu trúc 11 yêu cầu chức năng phân chia theo 3 nhóm phân hệ kỹ thuật")

    add_h2(doc, "1.4. Danh mục Yêu cầu Phi chức năng (Non-Functional Requirements - NFR)")
    add_p(doc, "Yêu cầu phi chức năng đặt ra các tiêu chuẩn định lượng về hiệu năng, an toàn dữ liệu, tính sẵn sàng và các quy chuẩn đạo đức bắt buộc khi ứng dụng Trí tuệ nhân tạo trong lĩnh vực thẩm mỹ:")

    nfr_headers = ["Mã NFR", "Tiêu chuẩn kỹ thuật", "Chỉ số mục tiêu (Target Metric)", "Giải pháp kỹ thuật đáp ứng"]
    nfr_rows = [
        ("NFR-01", "Hiệu năng hệ thống (Performance)", "Tải trang < 2.0s\nAPI nghiệp vụ < 500ms\nAPI AI < 3.0s", "Tối ưu hóa câu truy vấn PostgreSQL với chỉ mục Index; sử dụng Redis để lưu bộ đệm các danh mục catalog tĩnh; xử lý bất đồng bộ Async trên FastAPI."),
        ("NFR-02", "Bảo mật & Phân quyền (Security)", "100% API bảo vệ bởi JWT\nTuân thủ chuẩn RBAC", "Mã hóa mật khẩu 1 chiều bằng thuật toán BCrypt (salt rounds = 12); phân quyền nghiêm ngặt tại Middleware; cô lập dữ liệu (Data Isolation) KTV chỉ xem ca làm của chính mình."),
        ("NFR-03", "Tính khả dụng & Dự phòng (Availability)", "Uptime đạt 99.5%\nFallback khi AI lỗi 100%", "Bắt trọn vẹn Exception khi gọi Gemini API (Timeout, Quota Exceeded); kích hoạt cơ chế Fallback tự động trả về dịch vụ thịnh hành từ CSDL PostgreSQL mà không làm sập ứng dụng."),
        ("NFR-04", "Khả năng mở rộng (Extensibility)", "Độc lập mô hình AI\nSẵn sàng đa chi nhánh", "Kiến trúc Service Provider trừu tượng hóa khối AI; cho phép dễ dàng chuyển đổi hoặc tích hợp song song các mô hình khác (Gemini Flash, GPT-4o-mini, Claude 3.5 Sonnet)."),
        ("NFR-05", "Tính di động (Portability/UX)", "Chuẩn Responsive Design\nĐa trình duyệt", "Frontend ReactJS tương thích hoàn hảo trên các trình duyệt hiện đại (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari) và các thiết bị tablet/laptop quầy lễ tân."),
        ("NFR-06", "Tuân thủ y tế AI (AI Compliance)", "100% phản hồi có cảnh báo\nKhông chẩn đoán bệnh", "Prompt hệ thống bắt buộc cấu hình chặn tư vấn y khoa; mọi kết quả AI hiển thị trên màn hình đều đính kèm dòng thông điệp pháp lý: 'AI chỉ hỗ trợ tư vấn và tham khảo, không thay thế chẩn đoán y khoa chuyên sâu'.")
    ]
    add_styled_table(doc, "Bảng 1.3. Danh mục các yêu cầu phi chức năng (NFR-01 đến NFR-06)", nfr_headers, nfr_rows, [Inches(1.0), Inches(1.8), Inches(1.6), Inches(1.9)])

    add_image_box(doc, "spa_slide_images/slide_07.png", "Hình 1.6. Sáu yêu cầu phi chức năng bảo đảm tính chuẩn mực kỹ thuật và an toàn hệ thống")

    add_h2(doc, "1.5. Sơ đồ Use Case Tổng quát và Phân quyền RBAC")
    add_p(doc, "Sơ đồ Use Case tổng quát phản ánh mối quan hệ tương tác giữa 4 tác nhân con người (Admin, Manager, Receptionist, Technician) và 1 tác nhân phụ trợ (AI Engine) đối với các nhóm chức năng của hệ thống. Trong đó, AI Engine đóng vai trò như một thành phần hậu thuẫn thông minh, chỉ nhận các yêu cầu đã được làm sạch và xác thực từ phía nhân viên thông qua tầng Backend trung gian:")

    add_image_box(doc, "spa_slide_images/slide_08.png", "Hình 1.7. Sơ đồ Use Case tổng quát Hệ thống Quản lý Spa tích hợp AI")

    add_p(doc, "Để bảo vệ dữ liệu nhạy cảm (đặc biệt là thông tin doanh thu, lợi nhuận và hồ sơ bệnh án da liễu của khách hàng), hệ thống áp dụng mô hình phân quyền dựa trên vai trò (Role-Based Access Control - RBAC) theo hình tháp phân cấp quyền hạn giảm dần:")
    add_bullet(doc, "Cấp độ 1 - Manager (Quản lý cấp cao): ", "Nắm giữ toàn quyền quản trị vận hành kinh doanh, có quyền xem mọi báo cáo tài chính, quản lý danh sách nhân sự, thiết lập bảng giá dịch vụ và cấu hình các chương trình ưu đãi.")
    add_bullet(doc, "Cấp độ 2 - Receptionist (Lễ tân vận hành): ", "Có quyền thao tác với hồ sơ khách hàng, đặt lịch hẹn, thu ngân thanh toán và trực tiếp sử dụng công cụ AI Tool để tư vấn. Lễ tân bị chặn hoàn toàn quyền xem báo cáo lợi nhuận năm hoặc danh sách bảng lương nhân sự.")
    add_bullet(doc, "Cấp độ 3 - Technician (Kỹ thuật viên): ", "Quyền hạn được thu hẹp tối đa: chỉ được phép truy xuất lịch làm việc có gắn mã định danh `therapist_id` của chính mình, xem tóm tắt hồ sơ khách trong ca làm và cập nhật ghi chú sau dịch vụ. Không có quyền xem hóa đơn, doanh thu hoặc lịch làm của kỹ thuật viên khác.")

    add_image_box(doc, "spa_slide_images/slide_09.png", "Hình 1.8. Mô hình phân quyền kiểm soát truy cập dựa trên vai trò hình tháp (RBAC)")

    add_h2(doc, "1.6. Đặc tả Use Case chi tiết các ca sử dụng then chốt")
    add_p(doc, "Dưới đây là bảng đặc tả chi tiết cho 3 ca sử dụng cốt lõi của hệ thống, thể hiện rõ luồng sự kiện chính, luồng ngoại lệ và sự tham gia của mô hình Trí tuệ nhân tạo:")

    uc1_headers = ["Thuộc tính Use Case", "Nội dung đặc tả chi tiết"]
    uc1_rows = [
        ("Tên Use Case", "UC-01: Đặt lịch hẹn và phân công kỹ thuật viên (Check Availability)"),
        ("Mã Use Case", "UC-01 (Hiện thực hóa FR-03, FR-04, NFR-01)"),
        ("Tác nhân chính", "Lễ tân (Receptionist)"),
        ("Tác nhân phụ", "Kỹ thuật viên (Therapist), Khách hàng (Customer)"),
        ("Tiền điều kiện", "Lễ tân đã đăng nhập hệ thống thành công; khách hàng và dịch vụ đã tồn tại trong CSDL."),
        ("Hậu điều kiện", "Lịch hẹn mới được lưu vào CSDL với trạng thái 'Confirmed'; thời gian của KTV được khóa lại."),
        ("Luồng sự kiện chính", "1. Lễ tân chọn khách hàng và chọn các dịch vụ/liệu trình khách muốn sử dụng.\n2. Lễ tân chọn ngày hẹn, giờ bắt đầu (start_time) và kỹ thuật viên phụ trách (therapist_id).\n3. Hệ thống tự động tính toán tổng thời lượng dịch vụ và xác định giờ kết thúc (end_time = start_time + total_duration).\n4. Hệ thống kích hoạt phương thức check_availability(therapist_id, start_time, end_time).\n5. Hệ thống xác nhận kỹ thuật viên không bị trùng lịch ca làm việc trong khoảng thời gian này.\n6. Lễ tân bấm 'Lưu lịch hẹn'. Hệ thống lưu Appointment và các ApptDetail, hiển thị thông báo thành công."),
        ("Luồng ngoại lệ", "4a. Phát hiện KTV đã có lịch hẹn khác giao thoa trong khoảng [start_time, end_time]: Hệ thống tô đỏ cảnh báo xung đột, hiển thị chi tiết ca trùng và không cho phép lưu CSDL; gợi ý đổi KTV hoặc dời giờ hẹn.")
    ]
    add_styled_table(doc, "Bảng 1.4. Đặc tả Use Case UC-01: Đặt lịch hẹn và kiểm tra xung đột KTV thời gian thực", uc1_headers, uc1_rows, [Inches(1.8), Inches(4.5)])

    uc2_headers = ["Thuộc tính Use Case", "Nội dung đặc tả chi tiết"]
    uc2_rows = [
        ("Tên Use Case", "UC-02: Tư vấn dịch vụ bằng Trí tuệ Nhân tạo (AI Recommendation)"),
        ("Mã Use Case", "UC-02 (Hiện thực hóa FR-08, NFR-02, NFR-06)"),
        ("Tác nhân chính", "Lễ tân (Receptionist)"),
        ("Tác nhân phụ", "AI Engine (Google Gemini API)"),
        ("Tiền điều kiện", "Lễ tân đang mở giao diện AI Tool trên trình duyệt; hệ thống Backend có kết nối Internet."),
        ("Hậu điều kiện", "Kết quả gợi ý dịch vụ hiển thị lên giao diện; lịch sử tư vấn được ghi nhận vào bảng AIHistory."),
        ("Luồng sự kiện chính", "1. Lễ tân chọn khách hàng đang cần tư vấn và nhập nhu cầu hiện tại vào ô văn bản.\n2. Lễ tân nhấn nút 'Gửi yêu cầu AI'.\n3. Backend FastAPI truy vấn CSDL lấy lịch sử 5 dịch vụ gần nhất của khách hàng.\n4. Backend thực hiện che giấu PII (ẩn họ tên, SĐT) và kiểm tra Input Guardrails chống injection.\n5. Backend nhúng dữ liệu vào Prompt Template định sẵn và gọi API Google Gemini.\n6. Gemini AI phân tích và trả về cấu trúc Structured JSON gồm: 2 dịch vụ đề xuất, lý do và câu thoại tư vấn.\n7. Backend xác thực Output Guardrails, ghi log vào bảng AIHistory và trả JSON về Frontend ReactJS.\n8. Màn hình hiển thị kết quả trực quan kèm nút 'Sao chép văn bản' và dòng cảnh báo y khoa bắt buộc."),
        ("Luồng ngoại lệ", "5a. API Gemini gặp sự cố (Timeout > 3s hoặc hết hạn mức Quota): Backend tự động bắt lỗi và kích hoạt Fallback, trả về 2 dịch vụ thịnh hành nhất từ CSDL PostgreSQL kèm thông báo 'Dịch vụ phổ biến'.")
    ]
    add_styled_table(doc, "Bảng 1.5. Đặc tả Use Case UC-02: Tư vấn dịch vụ qua công cụ AI Tool", uc2_headers, uc2_rows, [Inches(1.8), Inches(4.5)])

    uc3_headers = ["Thuộc tính Use Case", "Nội dung đặc tả chi tiết"]
    uc3_rows = [
        ("Tên Use Case", "UC-03: Tóm tắt hồ sơ khách hàng bằng AI (AI Profile Summary)"),
        ("Mã Use Case", "UC-03 (Hiện thực hóa FR-10, NFR-01, NFR-06)"),
        ("Tác nhân chính", "Kỹ thuật viên (Therapist) hoặc Lễ tân (Receptionist)"),
        ("Tác nhân phụ", "AI Engine (Google Gemini API)"),
        ("Tiền điều kiện", "Khách hàng có lịch sử sử dụng dịch vụ trên hệ thống; người dùng có quyền truy cập ca làm việc."),
        ("Hậu điều kiện", "Đoạn tóm tắt cô đọng 3 - 5 ý chính hiển thị trực quan cho KTV nắm bắt trước khi phục vụ."),
        ("Luồng sự kiện chính", "1. Kỹ thuật viên mở chi tiết lịch hẹn được phân công của mình.\n2. Kỹ thuật viên nhấn nút 'Xem tóm tắt hồ sơ bằng AI'.\n3. Backend trích xuất toàn bộ các bản ghi nhật ký điều trị cũ và ghi chú phản ứng của khách.\n4. Thực hiện PII Masking và gửi prompt yêu cầu tóm tắt ngắn gọn dưới 100 từ.\n5. Gemini AI trích xuất các ý chính: (1) Loại da & cơ địa, (2) Tiền sử dị ứng/nhạy cảm, (3) Liệu trình gần nhất và kết quả phản hồi.\n6. Kết quả trả về hiển thị dạng thẻ ghi nhớ (bullet points) nổi bật trên giao diện di động của KTV."),
        ("Luồng ngoại lệ", "3a. Khách hàng mới chưa từng có lịch sử: Hệ thống thông báo rõ: 'Khách hàng mới - Chưa có lịch sử điều trị trước đây. Đề nghị KTV thực hiện soi da trực tiếp'.")
    ]
    add_styled_table(doc, "Bảng 1.6. Đặc tả Use Case UC-03: Tóm tắt hồ sơ khách hàng bằng AI", uc3_headers, uc3_rows, [Inches(1.8), Inches(4.5)])

    doc.add_page_break()
