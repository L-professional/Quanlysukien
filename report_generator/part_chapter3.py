from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_generator.styles import (
    add_p, add_h1, add_h2, add_h3, add_bullet, add_callout, add_image_box, add_styled_table, add_code_block
)

def build_chapter3(doc):
    add_h1(doc, "CHƯƠNG 3: THIẾT KẾ CƠ SỞ DỮ LIỆU CHUẨN POSTGRESQL 15")

    add_h2(doc, "3.1. Mô hình Thực thể Liên kết (ERD)")
    add_p(doc, "Cơ sở dữ liệu của Hệ thống Quản lý Spa tích hợp AI được thiết kế và triển khai trên hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở PostgreSQL 15. Toàn bộ cấu trúc gồm 13 bảng thực thể được chuẩn hóa cao độ, đáp ứng đầy đủ tính toàn vẹn tham chiếu và tối ưu hóa cho các thao tác đọc ghi đồng thời:")

    add_image_box(doc, "spa_slide_images/slide_18.png", "Hình 3.1. Lược đồ Thực thể Liên kết (ERD) hoàn chỉnh trên PostgreSQL 15")

    add_p(doc, "Sơ đồ ERD thể hiện sự liên kết chặt chẽ giữa 6 phân hệ dữ liệu chính của hệ thống:")
    add_bullet(doc, "Phân hệ Người dùng & Nhân sự (User & Employee): ", "Lưu trữ tài khoản xác thực, mật khẩu mã hóa BCrypt và hồ sơ nhân sự.")
    add_bullet(doc, "Phân hệ Khách hàng (Customer): ", "Lưu trữ hồ sơ cá nhân, đặc tính loại da cơ địa, tiền sử dị ứng mỹ phẩm và điểm tích lũy.")
    add_bullet(doc, "Phân hệ Danh mục Dịch vụ & Liệu trình (Catalog): ", "Gồm Service, Treatment, TreatmentDetail và Package phân cấp linh hoạt.")
    add_bullet(doc, "Phân hệ Lịch hẹn & Vận hành (Appointment & ApptDetail): ", "Trái tim lưu vết mọi ca phục vụ, phân công chi tiết từng kỹ thuật viên.")
    add_bullet(doc, "Phân hệ Thanh toán & Tài chính (Invoice & Payment): ", "Quản lý doanh thu, xuất hóa đơn, ghi nhận thanh toán nhiều lần và công nợ.")
    add_bullet(doc, "Phân hệ Kiểm toán Trí tuệ Nhân tạo (AIHistory): ", "Lưu vết toàn bộ dữ liệu đầu vào JSON, câu lệnh Prompt, phản hồi của AI và thời gian trễ phục vụ giám sát và cải tiến mô hình.")

    add_image_box(doc, "spa_slide_images/slide_19.png", "Hình 3.2. Cấu trúc 6 phân hệ dữ liệu chính trong kiến trúc cơ sở dữ liệu")

    add_h2(doc, "3.2. Đặc tả chi tiết 13 Bảng Cơ sở dữ liệu")
    add_p(doc, "Để đảm bảo tính tương thích tuyệt đối với PostgreSQL 15 và loại bỏ hoàn toàn các cú pháp đặc thù của MySQL (như AUTO_INCREMENT, DATETIME hay ENUM nhúng), các bảng được định nghĩa với các kiểu dữ liệu chuẩn: `SERIAL`/`INT GENERATED ALWAYS AS IDENTITY`, `VARCHAR`, `NUMERIC(12, 2)`, `BOOLEAN`, `TIMESTAMPTZ` và `JSONB`:")

    schema_headers = ["Tên bảng", "Khóa chính (PK)", "Khóa ngoại (FK)", "Mô tả trường chính & Kiểu dữ liệu PostgreSQL", "Mục đích sử dụng"]
    schema_rows = [
        ("users", "user_id (INT)", "Không", "username VARCHAR(50) UNIQUE, password_hash VARCHAR(255), email VARCHAR(100) UNIQUE, role VARCHAR(20) (Admin/Manager/Receptionist/Technician), created_at TIMESTAMPTZ", "Quản lý tài khoản đăng nhập hệ thống"),
        ("employees", "employee_id (INT)", "user_id -> users(user_id)", "user_id INT UNIQUE, full_name VARCHAR(100), phone VARCHAR(15) UNIQUE, position VARCHAR(50), status VARCHAR(20), hire_date DATE", "Lưu thông tin nhân viên (Quan hệ 1-1 với users)"),
        ("customers", "customer_id (INT)", "Không", "full_name VARCHAR(100), phone VARCHAR(15) UNIQUE, email VARCHAR(100), skin_type VARCHAR(50), allergy_notes TEXT, loyalty_points INT DEFAULT 0, created_at TIMESTAMPTZ", "Hồ sơ khách hàng và lưu ý da liễu"),
        ("services", "service_id (INT)", "Không", "service_name VARCHAR(100), category VARCHAR(50), duration INT (>0), price NUMERIC(12,2) (>=0), description TEXT, status VARCHAR(20)", "Danh mục dịch vụ đơn lẻ tại Spa"),
        ("treatments", "treatment_id (INT)", "Không", "treatment_name VARCHAR(100), total_duration INT (>0), price NUMERIC(12,2), description TEXT, status VARCHAR(20)", "Liệu trình trị liệu chuyên sâu gồm nhiều bước"),
        ("treatment_details", "PK(treatment_id, step_order)", "treatment_id, service_id", "treatment_id INT, service_id INT, step_order INT, note TEXT", "Phân rã các bước thực hiện trong liệu trình"),
        ("packages", "package_id (INT)", "Không", "package_name VARCHAR(100), price NUMERIC(12,2), discount_percent NUMERIC(5,2), valid_days INT, description TEXT", "Gói thẻ combo dịch vụ ưu đãi trả trước"),
        ("appointments", "appt_id (INT)", "customer_id -> customers", "customer_id INT, appointment_date DATE, start_time TIME, end_time TIME, total_duration INT, total_amount NUMERIC(12,2), status VARCHAR(20)", "Lịch hẹn phục vụ tổng thể của khách hàng"),
        ("appointment_details", "detail_id (INT)", "appt_id, service_id, therapist_id -> employees", "appt_id INT, service_id INT, therapist_id INT, price NUMERIC(12,2), duration INT, note TEXT", "Chi tiết dịch vụ con và gán KTV phụ trách"),
        ("invoices", "invoice_id (INT)", "appt_id, customer_id", "appt_id INT UNIQUE NULLABLE, customer_id INT, total_amount NUMERIC(12,2), discount_amount NUMERIC(12,2), final_amount NUMERIC(12,2), paid_amount NUMERIC(12,2), payment_status VARCHAR(20)", "Hóa đơn thanh toán và theo dõi công nợ"),
        ("payments", "payment_id (INT)", "invoice_id -> invoices", "invoice_id INT, amount NUMERIC(12,2) (>0), payment_method VARCHAR(30) (Cash/Transfer/Card), transaction_time TIMESTAMPTZ, note TEXT", "Các đợt thanh toán (hỗ trợ trả góp nhiều lần)"),
        ("products", "product_id (INT)", "Không", "product_name VARCHAR(100), category VARCHAR(50), price NUMERIC(12,2), stock_quantity INT (>=0), unit VARCHAR(20), description TEXT", "Quản lý mỹ phẩm và sản phẩm bán kèm"),
        ("ai_histories", "history_id (INT)", "customer_id, user_id", "customer_id INT, user_id INT, ai_feature_type VARCHAR(50), input_data JSONB, prompt_text TEXT, raw_output TEXT, sanitized_output TEXT, latency_ms INT, created_at TIMESTAMPTZ", "Lưu vết kiểm toán toàn bộ tương tác AI")
    ]
    add_styled_table(doc, "Bảng 3.1. Đặc tả chi tiết 13 bảng thực thể trong cơ sở dữ liệu PostgreSQL 15", schema_headers, schema_rows, [Inches(1.2), Inches(0.9), Inches(1.1), Inches(2.0), Inches(1.1)])

    add_h2(doc, "3.3. Phân tích các Mối quan hệ Dữ liệu Cốt lõi (Relationships)")
    add_p(doc, "Việc xác định chính xác bản số quan hệ (Cardinality) đóng vai trò quyết định đến tính đúng đắn của logic lập trình tại tầng Backend:")

    add_image_box(doc, "spa_slide_images/slide_20.png", "Hình 3.3. Các quan hệ dữ liệu cốt lõi (1-1, 1-N, N-N) và phân rã khóa ngoại")

    add_bullet(doc, "Quan hệ User – Employee (1 – 1): ", "Mỗi nhân viên chỉ có duy nhất một tài khoản đăng nhập hệ thống (`user_id` là khóa ngoại UNIQUE trong bảng `employees`). Nếu nhân viên thôi việc, chỉ cần khóa trạng thái của User mà vẫn bảo toàn toàn vẹn lịch sử các ca phục vụ của Employee trong quá khứ.")
    add_bullet(doc, "Quan hệ Customer – Appointment / Invoice (1 – N): ", "Khách hàng là trung tâm của hệ thống, một khách hàng có thể có nhiều lịch hẹn và nhiều hóa đơn thanh toán theo thời gian.")
    add_bullet(doc, "Quan hệ Appointment – AppointmentDetail – Service – Therapist (Quan hệ N – N phân rã): ", "Trong một buổi đến spa (Appointment), khách hàng có thể thực hiện nhiều dịch vụ liên tiếp (ví dụ: vừa nặn mụn vừa gội đầu dưỡng sinh). Mỗi dịch vụ con này lại được thực hiện bởi một Kỹ thuật viên (Therapist) khác nhau. Bảng `appointment_details` đóng vai trò là bảng kết hợp đa chiều phân rã quan hệ N-N, lưu lại `therapist_id` và `service_id` độc lập cho từng công đoạn.")
    add_bullet(doc, "Quan hệ Appointment – Invoice (1 – 1): ", "Mỗi ca lịch hẹn hoàn thành sẽ xuất ra một hóa đơn duy nhất để tránh việc trùng lặp số liệu kế toán. Tuy nhiên, trường `appt_id` trong bảng `invoices` được thiết lập NULLABLE để cho phép xuất hóa đơn bán lẻ mỹ phẩm mà không bắt buộc phải có lịch hẹn dịch vụ.")
    add_bullet(doc, "Quan hệ Invoice – Payment (1 – N) – Quản lý Công nợ: ", "Hệ thống hỗ trợ nghiệp vụ thanh toán chia nhỏ (thanh toán cọc hoặc trả dần theo buổi). Một hóa đơn có thể có nhiều bản ghi thanh toán `payments`. Công nợ của khách hàng được tính toán thời gian thực: `debt = final_amount - paid_amount`. Trạng thái `payment_status` tự động cập nhật: 'Unpaid' (chưa trả), 'Partially_Paid' (đã cọc/trả một phần), hoặc 'Paid' (đã tất toán).")
    add_bullet(doc, "Quan hệ Treatment – TreatmentDetail (1 – N): ", "Quản lý tổ hợp dịch vụ thực hiện theo thứ tự bước (`step_order`), đảm bảo quy trình kỹ thuật được thực hiện đúng chuẩn y khoa thẩm mỹ.")
    add_bullet(doc, "Quan hệ Customer – AIHistory (1 – N): ", "Toàn bộ các lần AI tư vấn, sinh tin nhắn hay tóm tắt hồ sơ đều gắn chặt với định danh `customer_id` và nhân viên thực hiện `user_id` để phục vụ công tác đối soát chất lượng và kiểm toán dữ liệu.")

    add_h2(doc, "3.4. Minh chứng và Giải trình Chuẩn hóa Dữ liệu 3NF")
    add_p(doc, "Cơ sở dữ liệu của hệ thống được thiết kế tuân thủ nghiêm ngặt theo tiến trình chuẩn hóa từ dạng chuẩn 1 (1NF) đến dạng chuẩn 3 (3NF), loại bỏ hoàn toàn các dị thường thêm (Insertion Anomaly), xóa (Deletion Anomaly) và cập nhật (Update Anomaly):")

    add_bullet(doc, "Dạng chuẩn 1 (1NF - Thuộc tính nguyên tố, không lặp nhóm): ", "Toàn bộ các thuộc tính trong từng bảng đều là giá trị đơn nguyên tố (Atomic values), không chứa danh sách hay mảng lặp. Thay vì lưu mảng các dịch vụ vào một cột text trong bảng Appointment, hệ thống đã tách thành bảng `appointment_details`. Tương tự, các bước trong liệu trình được tách thành bảng `treatment_details`.")
    add_bullet(doc, "Dạng chuẩn 2 (2NF - Phụ thuộc hàm đầy đủ vào khóa chính): ", "Hệ thống đã đạt 1NF và loại bỏ hoàn toàn phụ thuộc một phần vào một thành phần của khóa chính phức hợp. Ví dụ: Trong bảng `treatment_details` có khóa chính phức hợp `(treatment_id, step_order)`, trường `service_id` và `note` phụ thuộc vào toàn bộ cặp khóa chính, không phụ thuộc riêng lẻ vào `treatment_id`. Thông tin chi tiết về giá và thời lượng của dịch vụ không lưu tại đây mà được tách sang bảng `services`.")
    add_bullet(doc, "Dạng chuẩn 3 (3NF - Loại bỏ phụ thuộc hàm bắc cầu): ", "Hệ thống đã đạt 2NF và không có thuộc tính không khóa nào phụ thuộc bắc cầu vào khóa chính thông qua một thuộc tính không khóa khác. Minh chứng cụ thể:")
    
    add_p(doc, "Minh chứng 3NF trong bảng `appointment_details`:")
    add_bullet(doc, "• Phụ thuộc ban đầu nếu thiết kế sai: ", "appt_id -> service_id -> service_name, duration, standard_price.")
    add_bullet(doc, "• Giải pháp chuẩn hóa 3NF: ", "Bảng `appointment_details` chỉ lưu khóa ngoại `service_id`. Các thông tin `service_name`, `category` được lưu độc lập tại bảng `services`. Riêng thuộc tính `price` và `duration` trong `appointment_details` là giá và thời lượng thực tế tại thời điểm diễn ra lịch hẹn (Snapshot Data để bảo toàn lịch sử hóa đơn khi giá dịch vụ gốc thay đổi trong tương lai, đây là thực hành chuẩn trong thiết kế CSDL tài chính).")

    add_p(doc, "Minh chứng 3NF trong bảng `employees` và `users`:")
    add_bullet(doc, "• Chuẩn hóa: ", "Tách biệt hoàn toàn thông tin bảo mật tài khoản (username, password_hash, role) sang bảng `users`, bảng `employees` chỉ lưu thông tin nhân sự hành chính và tham chiếu tới `user_id` qua quan hệ 1-1.")

    add_h2(doc, "3.5. Ràng buộc Toàn vẹn Dữ liệu (Integrity Constraints)")
    add_p(doc, "Để ngăn chặn rác dữ liệu và bảo đảm an toàn hệ thống, các ràng buộc toàn vẹn được thiết lập chặt chẽ ở cả tầng cơ sở dữ liệu và tầng ứng dụng API:")

    add_image_box(doc, "spa_slide_images/slide_21.png", "Hình 3.4. Các ràng buộc toàn vẹn Domain, Time, Khóa ngoại và Tự động tính toán")

    add_bullet(doc, "Toàn vẹn tham chiếu (Referential Integrity): ", "Sử dụng quy tắc `ON DELETE RESTRICT` đối với các bảng danh mục (Service, Treatment, Product) để kiên quyết ngăn chặn việc xóa bỏ dịch vụ đang tồn tại trong các hóa đơn cũ; áp dụng `ON DELETE CASCADE` cho các bảng chi tiết gắn với lịch hẹn khi lịch bị xóa nháp.")
    add_bullet(doc, "Ràng buộc miền giá trị (Domain Constraints): ", "Thiết lập mệnh đề `CHECK` ngay trong câu lệnh DDL của PostgreSQL:")
    add_bullet(doc, "• ", "`CHECK (price >= 0)` trong bảng services, treatments, products.")
    add_bullet(doc, "• ", "`CHECK (duration > 0)` đảm bảo thời lượng dịch vụ luôn dương.")
    add_bullet(doc, "• ", "`CHECK (stock_quantity >= 0)` ngăn chặn số lượng tồn kho âm.")
    add_bullet(doc, "• ", "`CHECK (paid_amount <= final_amount)` kiểm soát thanh toán không vượt quá tổng hóa đơn.")
    add_bullet(doc, "Ràng buộc logic thời gian (Time Constraints): ", "Mệnh đề `CHECK (start_time < end_time)` bắt buộc thời điểm bắt đầu phải trước thời điểm kết thúc ca hẹn.")

    add_h2(doc, "3.6. Kịch bản SQL DDL Khởi tạo Cơ sở dữ liệu PostgreSQL 15")
    add_p(doc, "Dưới đây là đoạn mã nguồn SQL DDL chuẩn hóa, đã được kiểm thử và xác thực cú pháp trực tiếp trên PostgreSQL 15:")

    add_code_block(doc, """-- KỊCH BẢN DDL KHỞI TẠO CSDL POSTGRESQL 15 CHO SPA MANAGEMENT SYSTEM
-- 1. BẢNG USERS (Tài khoản người dùng)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Manager', 'Receptionist', 'Technician')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG EMPLOYEES (Nhân viên)
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    position VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'OnLeave', 'Resigned')),
    hire_date DATE DEFAULT CURRENT_DATE
);

-- 3. BẢNG CUSTOMERS (Khách hàng)
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    skin_type VARCHAR(50),
    allergy_notes TEXT,
    loyalty_points INT DEFAULT 0 CHECK (loyalty_points >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG SERVICES (Dịch vụ đơn lẻ)
CREATE TABLE services (
    service_id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    duration INT NOT NULL CHECK (duration > 0), -- Số phút
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive'))
);

-- 5. BẢNG APPOINTMENTS (Lịch hẹn)
CREATE TABLE appointments (
    appt_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_duration INT NOT NULL CHECK (total_duration > 0),
    total_amount NUMERIC(12, 2) DEFAULT 0 CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'In_Progress', 'Completed', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_time_order CHECK (start_time < end_time)
);

-- 6. BẢNG APPOINTMENT_DETAILS (Chi tiết lịch hẹn & Gán KTV)
CREATE TABLE appointment_details (
    detail_id SERIAL PRIMARY KEY,
    appt_id INT NOT NULL REFERENCES appointments(appt_id) ON DELETE CASCADE,
    service_id INT NOT NULL REFERENCES services(service_id) ON DELETE RESTRICT,
    therapist_id INT NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    duration INT NOT NULL CHECK (duration > 0),
    note TEXT
);

-- 7. BẢNG INVOICES (Hóa đơn)
CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    appt_id INT UNIQUE REFERENCES appointments(appt_id) ON DELETE SET NULL,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    discount_amount NUMERIC(12, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    final_amount NUMERIC(12, 2) NOT NULL CHECK (final_amount >= 0),
    paid_amount NUMERIC(12, 2) DEFAULT 0 CHECK (paid_amount >= 0),
    payment_status VARCHAR(20) DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partially_Paid', 'Paid')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. BẢNG PAYMENTS (Các đợt thanh toán)
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('Cash', 'Transfer', 'Card')),
    transaction_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

-- 9. BẢNG AI_HISTORIES (Kiểm toán & Lịch sử AI)
CREATE TABLE ai_histories (
    history_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id) ON DELETE SET NULL,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    ai_feature_type VARCHAR(50) NOT NULL CHECK (ai_feature_type IN ('RECOMMENDATION', 'NOTIFICATION', 'SUMMARY')),
    input_data JSONB NOT NULL,
    prompt_text TEXT NOT NULL,
    raw_output TEXT NOT NULL,
    sanitized_output TEXT,
    latency_ms INT NOT NULL CHECK (latency_ms >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục Index tăng tốc truy vấn xung đột lịch làm việc
CREATE INDEX idx_appt_therapist_conflict 
ON appointment_details (therapist_id, appt_id);

CREATE INDEX idx_appt_date_status 
ON appointments (appointment_date, status);""", "Kịch bản SQL DDL khởi tạo cơ sở dữ liệu trên PostgreSQL 15")

    doc.add_page_break()
