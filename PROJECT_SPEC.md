# TÀI LIỆU ĐẶC TẢ DỰ ÁN: HỆ THỐNG QUẢN LÝ SỰ KIỆN TÍCH HỢP AI (EVENTHUB AI)

## 1. TỔNG QUAN HỆ THỐNG
Dự án nhằm số hóa toàn bộ vòng đời sự kiện (Khởi tạo, Vé QR, Check-in, Hỏi đáp AI Concierge, Tóm tắt Feedback).
- **Mô hình AI cốt lõi**: Human-in-the-Loop (HITL). AI chỉ sinh văn bản/câu trả lời nháp, nhân viên (Staff) bắt buộc duyệt/chỉnh sửa trước khi phát hành.
- **Bảo mật**: Tự động lọc/mã hóa PII (Mật khẩu, SĐT, Email, CCCD) trước khi gửi dữ liệu sang Cloud LLM.

## 2. CÔNG NGHỆ SỬ DỤNG (TECH STACK)
- **Frontend**: React.js 18 (Vite, TypeScript), Tailwind CSS, Shadcn/UI, Lucide Icons, Axios, TanStack Query.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy (AsyncIO).
- **Database**: PostgreSQL 15+ (kèm extension `pgvector` phục vụ tìm kiếm Vector Embedding), Redis (Cache/Session).
- **AI Integration**: Google Gemini API (`gemini-1.5-flash`), `text-embedding-004` (Embedding), Middleware PII Masking.

## 3. PHÂN QUYỀN VÀ TÁC NHÂN (RBAC)
1. **ADMIN**: Quản lý tài khoản, cấu hình kho tri thức RAG (`knowledge_base`), xem audit log AI.
2. **EVENT_MANAGER**: Khởi tạo sự kiện, sinh bài viết PR bằng AI, xem Dashboard báo cáo.
3. **STAFF**: Soát vé QR Code, duyệt/sửa/phát hành câu trả lời AI gợi ý cho khách.
4. **PARTICIPANT**: Đăng ký sự kiện, nhận vé QR, hỏi đáp với AI Concierge.

## 4. CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)
- `roles` (id, role_name)
- `users` (id, role_id, full_name, email, hashed_password, phone_number)
- `event_categories` (id, name, code)
- `events` (id, title, description, category_id, location, start_time, end_time, status)
- `registrations` (id, event_id, participant_id, qr_code_token, is_checked_in, checked_in_at)
- `event_inquiries` (id, event_id, participant_id, assigned_staff_id, question, ai_category, status)
- `inquiry_replies` (id, inquiry_id, sender_id, content, is_ai_generated, edited_by_staff)
- `knowledge_base` (id, event_id, title, content, embedding [vector(768)])[cite: 1]
- `ai_logs` (id, task_type, prompt_tokens, completion_tokens, latency_ms, staff_action)[cite: 1]

## 5. QUY TRÌNH XỬ LÝ AI CONCIERGE (RAG + HITL)
1. Participant gửi câu hỏi[cite: 1].
2. Middleware `PIIMaskingService` che các thông tin nhạy cảm[cite: 1].
3. Backend tạo embedding từ câu hỏi và truy vấn `pgvector` lấy top-3 đoạn cẩm nang phù hợp từ `knowledge_base`[cite: 1].
4. Trộn Context + Question gửi Gemini API sinh câu trả lời nháp[cite: 1].
5. Đẩy câu trả lời nháp lên Dashboard của Staff dưới dạng "AI Suggestion Box"[cite: 1].
6. Staff bấm: [Chấp nhận] / [Chỉnh sửa] / [Từ chối][cite: 1].
7. Hệ thống gửi câu trả lời chính thức đến Participant và ghi nhật ký vào `ai_logs`[cite: 1].