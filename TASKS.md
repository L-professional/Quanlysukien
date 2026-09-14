## Bổ sung Fix Bug & Google OAuth chuẩn lớn (Gemini/Google Standard)

- [x] **Task 3.1: Fix Bug Form Đăng ký & Thông báo chi tiết**
  - Trong Backend API `/api/v1/auth/register`: Thiết lập mặc định `role = "PARTICIPANT"` ngay ở Schema/Model (SQLAlchemy/Pydantic) để tránh lỗi NULL.
  - Bắt lỗi trùng Email (400 Bad Request) và trả về thông điệp rõ ràng: `"Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc Đăng nhập"`.
  - Hiển thị Toast thông báo lỗi chi tiết từ Backend lên giao diện thay vì báo chung chung.

- [x] **Task 4.1: Chuẩn hóa Google OAuth 2.0 Popup & One-Tap (Google Identity)**
  - Cài đặt `@react-oauth/google` ở Frontend.
  - Thêm `VITE_GOOGLE_CLIENT_ID` trong `.env` và bọc `GoogleOAuthProvider` tại `main.tsx`/`App.tsx`.
  - Khi click "Đăng ký/Đăng nhập bằng Google", hiển thị Cửa sổ Popup chuẩn của Google để người dùng chọn tài khoản.
  - Backend sử dụng `google-auth-library` (Node) hoặc `google-auth` (Python) để verify id_token từ Google gửi lên, tự động sync Avatar, Email thực và tạo user `PARTICIPANT` nếu là tài khoản mới

- [x] **Task 6: Chuẩn hóa Luồng Đăng ký Vé Công khai (Public Event Catalog)**
  - Tạo/Chuẩn hóa route công khai `/events` hoặc `/` dành cho Khách tham dự (`PARTICIPANT`).
  - Khi người dùng bấm "Đăng ký vé" tại một sự kiện:
    - Nếu chưa đăng nhập: Bật Popup yêu cầu Đăng nhập bằng Google / Email.
    - Nếu đã đăng nhập: Gọi API `POST /api/v1/registrations`, sinh mã QR duy nhất và hiển thị Modal "Vé của bạn" kèm QR Code.
  - Tự động gửi Email xác nhận đăng ký chứa ảnh QR Code đến email người dùng.

- [x] **Task 7: Tích hợp Đa ngôn ngữ chung cho toàn bộ Website (i18n)**
  - Cài đặt và cấu hình `react-i18next` và `i18next`.
  - Tạo các file từ điển `src/locales/vi.json` (Tiếng Việt) và `src/locales/en.json` (Tiếng Anh) đầy đủ danh mục menu, header, xác thực, sự kiện, dashboard.
  - Chuẩn hóa giao diện (Sidebar, Header, Dashboard, Form, Buttons, Thông báo) sử dụng translation hook `useTranslation()` và translation keys.
  - Thêm nút chọn ngôn ngữ (Language Switcher) toggle `🇻🇳 VI | 🇺🇸 EN` trên thanh Header góc trên bên phải.
  - Tự động lưu lựa chọn ngôn ngữ vào `localStorage` (`eventhub_lang`) để duy trì trạng thái khi reload/chuyển trang.

## Bổ sung Ngày tháng năm & Google Maps cho Sự kiện

- [x] **Task 8: Tích hợp Ngày/Tháng/Năm & Google Maps cho Sự kiện**
  - **Cập nhật Database & Backend Schema (`events` table):**
    - Bổ sung trường thời gian chuẩn `start_date`, `end_date` (định dạng DD/MM/YYYY HH:mm).
    - Bổ sung các trường địa điểm: `location_address` (Địa chỉ chi tiết) và `google_maps_url` (Link/Iframe Google Maps Embed).
  - **Cập nhật Form Tạo/Sửa Sự kiện (New Event / Edit Event Modal):**
    - Bổ sung bộ chọn ngày giờ (DatePicker) đầy đủ Ngày / Tháng / Năm và Giờ.
    - Bổ sung ô nhập địa chỉ & link nhúng Google Maps (hoặc ô nhập tọa độ/link địa điểm từ Google Maps).
  - **Cập nhật Giao diện Danh mục Sự kiện (Events Catalog):**
    - Hiển thị rõ ràng Ngày/Tháng/Năm trên từng thẻ sự kiện (VD: *15/10/2026* hoặc *15 Thg 10, 2026*).
    - Tích hợp khung bản đồ Google Maps nhỏ (Iframe) hoặc nút bấm `"Mở Google Maps"` trực tiếp dưới mỗi thẻ/chi tiết sự kiện để người dùng xem vị trí chỉ đường ngay lập tức.

- [x] **Task 9: Nâng cấp Modal "Thêm Phiên Mới" (Google Maps Preview & AI Description)**
  - **Live Preview Google Maps:**
    - Trong Modal "Thêm Ca Diễn Thuyết / Session Mới" (`isAddModalOpen`), khi người dùng gõ `Địa chỉ chi tiết` hoặc `Link Google Maps`, tự động hiển thị khung xem trước Google Maps Embed Iframe trực tiếp phía dưới.
    - Cung cấp nút toggle `Ẩn/Hiện xem trước bản đồ` và nút `⚡ Tự động tạo link từ địa chỉ` tiện lợi.
  - **AI Tự động viết Mô tả Chi tiết (AI Auto-Generate Description):**
    - Thêm nút `[✨ AI Sinh Mô Tả]` ngay bên cạnh nhãn "Mô Tả Chi Tiết".
    - Khi bấm, hệ thống đọc `Tiêu Đề Phiên`, `Chủ Đề (Track)`, `Tên Diễn Giả`, `Chức Danh` đã nhập và tự động gọi API `/api/v1/events/generate-description` (tích hợp Gemini AI với văn phong chuyên gia công nghệ, có fallback thông minh).
    - Tự động điền 1-2 đoạn văn mô tả chuyên nghiệp, hấp dẫn vào ô Textarea kèm trạng thái Spinner Loading và thông báo Toast.

## Fix Lỗi Tràn Màn Hình & Bổ Sung Cuộn Trang Cho Các Modal Dialog

- [x] **Task 10: Fix Lỗi Overflow & Bật Cuộn Trang (Scrollable Modals) Cho Toàn Bộ Modals**
  - **Khắc phục lỗi Modal bị tràn dọc màn hình:**
    - Cấu hình lại chiều cao tối đa cho Modal Wrapper: Thêm class Tailwind `max-h-[85vh]` hoặc `max-h-[90vh]`.
    - Bổ sung `overflow-y-auto` vào phần thân Modal (`ModalBody` / `DialogContent`) để cho phép cuộn mượt mà khi nội dung dài.
  - **Gắn cố định Thanh tiêu đề & Nút bấm (Fixed Header & Footer):**
    - Tiêu đề Modal (Header) và Nút bấm hành động `[Hủy]` - `[Lưu]` (Footer) phải được cố định (`sticky top-0` / `sticky bottom-0` hoặc tách khỏi khung scroll body).
    - Đảm bảo người dùng luôn nhìn thấy nút "Lưu" và nút "Đóng [X]" mà không cần cuộn hết xuống đáy.
  - **Áp dụng đồng bộ cho:** Modal "Thêm/Sửa Phiên Mới", Modal "Tạo Sự Kiện Mới", Modal "Đặt Lại Mật Khẩu", Modal "Phân Quyền User" và tất cả các popup khác trên website.

  ## Bổ sung Dropdown Thao Tác Sự Kiện (Chỉnh Sửa & Xóa Sự Kiện)

- [x] **Task 11: Tích hợp Dropdown Menu Quản trị Sự kiện (Event Action Menu)**
  - **Tối ưu thanh Header Sự Kiện:**
    - Giữ nguyên nút nổi bật **`[+ Thêm Phiên Mới]`** làm Primary Button.
    - Tạo **01 Nút Dropdown "⚙️ Thao Tác Sự Kiện"** (hoặc nút Icon `⋮`) nằm kế bên, khi click rủ xuống các lựa chọn:
      - ✏️ **Chỉnh sửa sự kiện:** Mở Modal cập nhật Tên sự kiện, Mô tả, Ngày bắt đầu/kết thúc, Diễn giả chính.
      - 🗺️ **Cấu hình & Bản đồ:** Mở Modal chỉnh sửa Địa chỉ, Link Google Maps & WiFi.
      - 🗑️ **Xóa sự kiện (Chữ đỏ):** Yêu cầu bật Modal "Xác nhận xóa" (Xóa vĩnh viễn hoặc Soft Delete).
  - **Xử lý Backend API:**
    - Hoàn thiện API `PUT /api/v1/events/{event_id}` để cập nhật sự kiện.
    - Hoàn thiện API `DELETE /api/v1/events/{event_id}` để xóa sự kiện và tự động redirect người dùng về danh sách sự kiện sau khi xóa thành công.

    ## Bổ sung Bộ Chọn & Quản Lý Nhiều Sự Kiện Động

- ## Bổ sung Thao tác Chỉnh Sửa & Xóa Trực Tiếp Trên Từng Thẻ Sự Kiện (Card Actions)

- [x] **Task 12: Tích hợp Nút Thao tác (Sửa / Xóa) Trực tiếp trên từng Card**
  - **Thêm Menu Thao tác trên từng Thẻ (Card Level Action Menu):**
    - Bổ sung icon nút **`⋮` (Three dots menu)** ở góc trên bên phải của **MỖI THẺ CARD** trong danh sách.
    - Khi click vào nút `⋮` của thẻ bất kỳ, hiển thị menu rủ xuống:
      - ✏️ **Chỉnh sửa phiên này:** Mở Modal "Chỉnh sửa Ca diễn thuyết", tự động điền sẵn dữ liệu hiện tại của đúng thẻ đó để Admin/Staff sửa.
      - 🗑️ **Xóa phiên này (Chữ đỏ):** Bật Modal xác nhận "Bạn có chắc muốn xóa phiên [Tên phiên]?", gọi API `DELETE` và xóa đúng thẻ đó khỏi danh sách.
  - **Phân quyền nút Quản trị (RBAC):**
    - Chỉ hiển thị nút `⋮` (Sửa/Xóa) khi tài khoản đăng nhập có vai trò `ADMIN`, `MANAGER` hoặc `STAFF`.

    ## Nâng Cấp Khả Năng AI Sinh Mô Tả Sự Kiện (Dynamic AI Description Engine)

- [x] **Task 13: Nâng cấp AI Sinh Mô Tả Đa Văn Phong & Tri Thức Chuyên Sâu**
  - **1. Backend Prompt Matrix (Xử lý tại Backend / LLM Prompt):**
    - Thiết kế hệ thống Prompt động tùy chỉnh theo thuộc tính `Chủ đề (Track / Category)` của phiên/sự kiện:
      - **Công nghệ & AI:** Văn phong hiện đại, truyền cảm hứng, dùng thuật ngữ công nghệ chính xác và liên hệ tới các xu hướng mới nhất.
      - **Văn hóa / Nghệ thuật / Gala:** Văn phong giàu tính văn học, hình ảnh so sánh trau chuốt, giàu cảm xúc và bay bổng.
      - **Kinh doanh / Lãnh đạo:** Văn phong chiến lược, súc tích, chuyên nghiệp, đánh trúng giá trị mang lại.
      - **Học thuật / Nghiên cứu:** Văn phong nghiêm túc, chỉn chu, có độ sâu tri thức.
    - Yêu cầu AI tự động khai thác tri thức ngầm về tiêu đề (tra cứu/liên tưởng bối cảnh thực tế) để đoạn mô tả có tính thời sự và chiều sâu, tránh viết chung chung.
  - **2. Tối ưu Giao diện UI/UX tại Modal Thêm/Sửa Phiên & Sự Kiện:**
    - Bổ sung menu nhỏ chọn phong cách ngay cạnh nút `[✨ AI Sinh Mô Tả]`: *(Tự động / Chuyên nghiệp / Bay bổng - Văn học / Truyền cảm hứng)*.
    - Thêm hiệu ứng Loading/Spinner chuyên nghiệp trong lúc AI đang tạo văn bản và tự động điền kết quả vào ô "Mô tả chi tiết".
    - Bổ sung Rule kiểm soát Ngữ cảnh (Context Negative Rules) trong Prompt Matrix:
  - NẾU Chủ đề/Tiêu đề thuộc các lĩnh vực: Y tế, Sức khỏe, Tâm lý, Giáo dục, Nghệ thuật, Đời sống.
  - TUYỆT ĐỐI CẤM sử dụng các thuật ngữ công nghệ/IT như: "kiến trúc", "triển khai quy mô lớn", "làn sóng công nghệ", "hệ sinh thái kỹ thuật số", "mã nguồn".
  - BẮT BUỘC dùng tập từ vựng thuộc đúng chuyên ngành: "hành trang tâm lý", "kiến thức khoa học", "chăm sóc bản thân", "kết nối cởi mở", "chuyên gia tư vấn".

  ## Nâng Cấp AI Assistant (Chatbot RAG) & Chuẩn Hóa Múi Giờ Việt Nam

- [x] **Task 14: Nâng cấp AI Chatbot Thông Minh & Đồng Bộ Múi Giờ Real-time (UTC+7)**
  - **1. Chuẩn hóa Múi giờ Việt Nam (Asia/Ho_Chi_Minh - Real-time VN Time):**
    - **Trên UI Website:** Sửa triệt để các chuỗi mốc thời gian ISO thô (VD: `2026-09-12T16:13:31...`) thành định dạng Việt Nam mượt mà: `DD/MM/YYYY HH:mm`.
    - **Trong AI Prompt:** Tự động truyền mốc thời gian thực hiện tại theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) vào System Context của Chatbot. Khi người dùng hỏi *"Hôm nay ngày mấy?"*, *"Chiều nay/Hôm nay có sự kiện gì?"*, AI sẽ tính toán thời gian thực chính xác để lọc sự kiện trong ngày.
  - **2. Chuẩn hóa Văn phong Giao tiếp Tự nhiên:**
    - Loại bỏ hoàn toàn lối trả lời rập khuôn, lặp lại nguyên văn câu hỏi người dùng (như *"Dạ Anh/Chị thân mến, về thắc mắc '...' tại sự kiện..."*).
    - Định hình AI đóng vai Lễ tân / Trợ lý sự kiện chuyên nghiệp: Trả lời đi thẳng vào vấn đề, tự nhiên, thân thiện và cô đọng.
  - **3. Phản hồi Địa điểm kèm Link Google Maps Kích hoạt được:**
    - Khi người dùng hỏi về địa chỉ, phòng họp hay cách đi lại: AI trích xuất địa chỉ chi tiết trong CSDL và tự động đính kèm đường dẫn bấm được dạng `[📍 Xem chỉ đường Google Maps](url_link)`.
  - **4. Tích hợp Tri thức Mở / Tra cứu Internet cho Chủ đề Sự kiện:**
    - Kết hợp dữ liệu sự kiện nội bộ (Phòng, Giờ, WiFi, Diễn giả) với tri thức chuyên môn từ LLM/Internet để giải thích ngắn gọn các khái niệm/chủ đề được đề cập trong phiên nếu người dùng hỏi sâu hơn.

    ## Fix Lỗi Chatbot RAG Fallback & Cập Nhật Thời Gian Động Thanh Sidebar

- [x] **Task 15: Khắc phục triệt để Lỗi Chatbot & Cập nhật Múi giờ Động trên Sidebar**
  - **1. Fix Lỗi AI Chatbot Phản Hồi Mẫu (Chatbot RAG Context Fix):**
    - Sửa Backend API (`/api/v1/chat` / RAG Engine): Khi người dùng hỏi tên bất kỳ Ca diễn thuyết/Phiên nào (VD: *"Tổng Kết & Trao Giải EventHub Innovation Award 2026"*), hệ thống phải truy vấn trực tiếp bảng `sessions` và `events` trong CSDL.
    - CẤM AI tự động trả lời câu mẫu *"Tôi đã ghi nhận câu hỏi và chuyển tới Ban Tổ Chức..."* khi dữ liệu phiên đó ĐÃ CÓ trong CSDL.
    - Ép AI phải xuất ra đầy đủ: **Tên phiên, Diễn giả, Giờ diễn ra, Phòng họp, Mô tả chi tiết** và **Link chỉ đường Google Maps**.
  - **2. Cập nhật Thời gian & Trạng thái Động trên Thanh Sidebar:**
    - Cập nhật Widget góc trên bên trái Sidebar (khu vực bên dưới logo):
    - Tự động hiển thị theo sự kiện đang chọn: `[Tên Sự Kiện]` • `[Ngày/Tháng/Năm]` • `[Trạng thái: 🟢 Live / 🔵 Sắp diễn ra / ⚪ Đã kết thúc]`.
    - Trạng thái *(Live/Sắp diễn ra/Đã kết thúc)* phải được tính toán tự động bằng cách so sánh ngày giờ sự kiện với **Thời gian thực múi giờ Việt Nam (Asia/Ho_Chi_Minh)**.

    ## Nâng Cấp AI Assistant Toàn Diện (Hỏi Đáp Sự Kiện & Hướng Dẫn Chức Năng Web)

- [x] **Task 16: Nâng cấp RAG Chatbot Đa Tri Thức & Điều Hướng Hệ Thống**
  - **1. Xóa bỏ hoàn toàn Căn bệnh Fallback / Trả lời câu mẫu:**
    - Cấu hình lại RAG Pipeline: Kết hợp Vector Search (pgvector) + Direct SQL Query vào bảng `events`, `sessions`, `speakers`.
    - NẾU dữ liệu tồn tại trong CSDL, AI BẮT BỘC phải trích xuất và phản hồi chính xác thông tin (Tên phiên, Giờ, Diễn giả, Phòng, Nội dung).
  - **2. Tích hợp Hệ thống Hướng dẫn Chức năng Web (System Feature Knowledge):**
    - Nhúng tài liệu hướng dẫn sử dụng các tính năng của EventHub AI vào Context của Chatbot: Soát vé QR, AI PR Studio, Đổi ngôn ngữ, Quản trị tài khoản, Thêm/Sửa/Xóa sự kiện.
    - Khi người dùng hỏi về thao tác website, AI hướng dẫn ngắn gọn các bước + đính kèm link chuyển hướng nhanh (Deep link) tới đúng trang chức năng đó.
  - **3. Chuẩn hóa Văn phong Chuyên nghiệp & Trực diện:**
    - Đi thẳng vào câu trả lời, loại bỏ câu từ thừa thải, lặp từ hoặc câu xin lỗi/chờ đợi rập khuôn.
    - Cung cấp sẵn các lối tắt (Action Links) như Link Google Maps, Link tới trang chức năng tương ứng.

    ## FIX KHẨN CẤP: Sửa Tận Gốc Code Backend Chatbot RAG (Xóa Chuỗi Text Hardcode)

- [x] **Task 17: Sửa Triệt Để Logic Backend RAG & Xóa Căn Bệnh Fallback Text**
  - **1. Xóa bỏ chuỗi câu trả lời cứng ở Backend:**
    - Tìm kiếm toàn bộ file trong project Python/FastAPI (ví dụ: `services/chat.py`, `rag/engine.py`, `prompts.py`) có chứa đoạn text:
      `"Tôi đã ghi nhận câu hỏi của bạn và chuyển tới Ban Tổ Chức..."`
    - **XÓA HOÀN TOÀN** đoạn text này. Tuyệt đối không trả về chuỗi câu mẫu này trong bất kỳ trường hợp nào.
  - **2. Bổ sung Cơ chế SQL Fallback (Keyword Matching):**
    - Trong hàm xử lý chat, trước khi gọi RAG vector: Thực hiện query SQL `ILIKE` tìm kiếm trực tiếp theo tiêu đề phiên (`sessions.title`), tên diễn giả (`sessions.speaker_name`), hoặc tên sự kiện (`events.title`).
    - Khi người dùng gõ tên phiên như *"Workshop: Xây Dựng Trợ Lý AI RAG Tích Hợp pgvector"*, query SQL phải tìm thấy ngay bản ghi này trong DB và nạp trực tiếp toàn bộ thông tin phiên vào Prompt Context của LLM Gemini.
  - **3. Tự động Tạo Embedding khi Thêm/Sửa Phiên:**
    - Đảm bảo khi Admin bấm "Thêm phiên mới" hoặc "Sửa phiên", hệ thống tự động tạo lại Vector Embedding và lưu vào `pgvector` ngay lập tức để Chatbot truy xuất được ngay.
    ## FIX TRIỆT ĐỂ: Debug Chatbot Fallback & Restart Backend Server

- [x] **Task 18: Kiểm tra vị trí ẩn của Chuỗi Hardcode & Restart Backend**
  - **1. Truy tìm triệt để chuỗi câu thoại cứng:**
    - Chạy lệnh tìm kiếm trên TOÀN BỘ PROJECT (Cả `backend/` lẫn `frontend/`):
      `grep -rn "Tôi đã ghi nhận câu hỏi" .` (hoặc dùng VS Code Search).
    - Xóa TẤT CẢ các file chứa chuỗi câu thoại này (kể cả trong file mock data của frontend hay file prompt backup).
  - **2. Bổ sung Log Terminal để Debug:**
    - Trong hàm `generate_rag_response`, thêm lệnh `print("[DEBUG RAG] Câu hỏi:", query)` và `print("[DEBUG SQL MATCH]:", sql_results)` để kiểm tra terminal xem SQL query có thực sự chạy khi user nhắn tin hay không.
  - **3. Restart Server:**
    - Khởi động lại Uvicorn/FastAPI server (hoặc Docker container) để đảm bảo mã nguồn Python mới được nạp hoàn toàn vào RAM.

    ## Triển Khai Luồng Đăng Ký Vé Sự Kiện, Form Thu Thập Thông Tin & Cập Nhật Số Lượng Real-time

- [x] **Task 19: Hoàn thiện Quy trình Đăng ký Vé, Xem QR Code & Kiểm soát Quy mô**
  - **1. Xây dựng Form Đăng Ký (Modal Form Input):**
    - Khi click nút **`[🎫 Đăng Ký Vé]`**, mở Modal cho phép điền thông tin tham dự:
      - *Bắt buộc:* Họ và tên, Email (tự động điền nếu đã đăng nhập), Số điện thoại.
      - *Bổ trợ (Không bắt buộc):* Đơn vị / Công ty / Trường học, Chức danh / Vai trò, Ghi chú / Câu hỏi cho diễn giả.
  - **2. Quản lý Trạng thái Đăng ký (Card & Modal UX States):**
    - **Chưa đăng ký:** Hiển thị nút **`[🎫 Đăng Ký Vé]`**. Nếu hết vé (`registered >= max`), tự động vô hiệu hóa và hiện **`[🚫 Đã Hết Vé]`**.
    - **Đã đăng ký thành công:** Nút chuyển thành **`[✅ Đã Đăng Ký / Xem Vé QR]`**.
    - **Xem Vé & Soát Vé:** Khi click nút đã đăng ký, mở Modal hiển thị thông tin vé + **Mã QR Code** cá nhân để phục vụ check-in.
    - **Hủy Đăng Ký:** Thêm nút nhỏ **`[🗑️ Hủy Đăng Ký Vé]`** trong Modal vé. Bật confirmation dialog trước khi hủy.
  - **3. Đồng bộ Dữ liệu Real-time & Chống Quá Tải (Backend & DB Lock):**
    - Khi Đăng ký thành công: Tăng số lượng `registered_count` (+1), thanh phần trăm tự động tính lại ngay trên UI.
    - Khi Hủy đăng ký: Giảm `registered_count` (-1), trả nút về trạng thái **`[🎫 Đăng Ký Vé]`**.
    - **Backend Validation:** Ràng buộc mỗi tài khoản/email chỉ đăng ký 1 lần per session. Dùng Database Transaction Lock (`with_for_update()`) để ngăn tình trạng vượt quá `max_capacity` khi nhiều người bấm cùng lúc.

    ## Sửa Triệt Để Lỗi Network Error Khi Bấm Xác Nhận Đăng Ký Vé

- [x] **Task 20: Sửa Lỗi API Endpoint Đăng Ký Vé & Kết Nối Backend - Frontend**
  - **1. Triệt tiêu Lỗi Network Error & Chuẩn hóa CORS:**
    - Cấu hình tường minh các nguồn `allow_origins` (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`, etc.) trong `CORSMiddleware` với `allow_credentials=True` thay vì `*`, ngăn chặn trình duyệt chặn request và báo lỗi ảo "Network Error".
    - Bắt lỗi Axios chi tiết tại frontend modal để hiển thị thông báo lỗi thân thiện từ server (`error.response?.data?.detail`).
  - **2. Xây dựng API Endpoint Đăng ký Vé Phiên (`POST /api/v1/sessions/{session_id}/register`):**
    - Tiếp nhận payload đăng ký vé: `full_name`, `email`, `phone`, `company`, `job_title`, `notes`.
    - Kiểm tra sức chứa (`capacity`): Trả về `400 Bad Request` ("Phiên đã hết vé") nếu `registered_count >= capacity`.
    - Kiểm tra đăng ký trùng lặp: Trả về `400 Bad Request` ("Email này đã đăng ký phiên này rồi!") nếu người dùng/email đã có vé cho phiên này.
    - Dùng Database Row Lock (`with_for_update()`) để đảm bảo tính nhất quán và chống xung đột đặt chỗ đồng thời.
    - Sinh mã vé QR token độc bản theo định dạng: `QR_SESS_{session_id}_USER_{user_id}` và render ảnh QR Code Base64.
    - Tăng số lượng `registered_count` (+1) trong cùng database transaction.
    - Cập nhật cơ chế auto-migrate các cột còn thiếu (`capacity`, `registered_count`, `schedule_id`, `notes`, v.v.) trong `init_db`.
  - **3. Kiểm tra Kết Nối Thực Tế End-to-End:**
    - Đã xác thực tạo dữ liệu vé thành công với HTTP 201 Created và hiển thị mã QR kèm thông tin chi tiết.
    - Đã xác thực chặn đăng ký trùng lặp với HTTP 400 Bad Request.
    - Đã kiểm tra build TypeScript Frontend chạy trơn tru không có lỗi.
    ## FIX TRIỆT ĐỂ KHẨN CẤP: Sửa Lỗi Network Error Khi Bấm Đăng Ký Vé (Task 21)

- [x] **Task 21: Kiểm tra Router API, Khai báo Bảng Registrations & Fix CORS**
  - **1. Kiểm tra & Khởi tạo Bảng Database (`registrations`):**
    - Đảm bảo trong CSDL PostgreSQL có bảng `registrations` với các trường: `id`, `session_id`, `full_name`, `email`, `phone`, `company`, `job_title`, `notes`, `qr_code`, `created_at`. Nếu chưa có, tự động chạy script `CREATE TABLE IF NOT EXISTS`.
  - **2. Đồng bộ Endpoint API Frontend & Backend:**
    - Kiểm tra chính xác đường dẫn API đăng ký vé tại Backend (ví dụ: `@router.post("/api/v1/sessions/{session_id}/register")` hoặc `@router.post("/api/v1/registrations")`).
    - Sửa file React Frontend (Modal Đăng ký vé) để Axios gọi **đúng 100% URL endpoint** này.
  - **3. Cấu hình CORS Middleware công khai trên FastAPI (`main.py`):**
    ```python
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    ```
  - **4. Bắt Lỗi Try-Except tại Backend:**
    - Bọc logic đăng ký vé trong khối `try...except`. NẾU có lỗi DB/Logic, trả về `HTTPException(status_code=400, detail="Mô tả lỗi cụ thể")` để Frontend hiển thị toast rõ ràng thay vì văng lỗi Network Error.
    ## FIX TRIỆT ĐỂ: Sửa Constraint CSDL & Xử Lý Đăng Ký Trùng Phiên (Task 22)

- [x] **Task 22: Điều chỉnh Unique Constraint DB & Bắt Lỗi IntegrityError tại Backend**
  - **1. Sửa Constraint Bảng `registrations` trong PostgreSQL:**
    - Gỡ bỏ constraint cũ `uq_event_participant` trên cặp `(event_id, participant_id)`.
    - Tạo constraint mới `uq_session_participant` trên cặp `(session_id, participant_id)` (hoặc `(session_id, email)`).
    - *Mục đích:* Cho phép 1 người dùng có thể đăng ký nhiều phiên (session) khác nhau trong cùng 1 sự kiện (event), nhưng không được đăng ký trùng 1 phiên 2 lần.
  - **2. Bổ sung Logic Kiểm Tra & Bắt Lỗi ở Backend (`POST /register`):**
    - Trước khi `INSERT`, thực hiện SQL Query kiểm tra: NẾU `(session_id, email/participant_id)` đã tồn tại trong bảng `registrations`:
      - Trả về HTTP 200 kèm dữ liệu vé đã đăng ký cũ (hoặc HTTP 400 với detail: `"Bạn đã đăng ký tham dự phiên này trước đó rồi!"`).
    - Bọc khối `db.commit()` trong `try...except IntegrityError:` để bắt mọi xung đột dữ liệu và trả về lỗi JSON chuẩn thay vì văng SQL stack trace thô.
  - **3. Chuẩn hóa Thông Báo Lỗi trên UI (Frontend):**
    - Catch response error từ API và hiển thị Toast thông báo ngắn gọn (VD: *"Bạn đã sở hữu vé cho phiên này rồi!"*), không hiển thị chuỗi câu lệnh SQL thô lên màn hình.
    ## FIX UI/UX: Cố Định Layout Modal Vé & Khai Báo Inline Cancellation (Task 23)

- [x] **Task 23: Fix Cố Định Layout Modal "Vé Của Bạn" Khi Bấm Hủy Đăng Ký**
  - **1. Chuẩn hóa Khung Modal Cố Định (Fixed Centered Modal):**
    - Cấu hình lại container Modal "Vé Của Bạn" trong React (Tailwind CSS):
      - Đảm bảo Modal luôn nằm cố định giữa màn hình: `fixed inset-0 z-50 flex items-center justify-center p-4`.
      - Khai báo chiều cao tối đa `max-h-[90vh]` và cấu trúc Flexbox: `flex flex-col`.
      - Ghim cố định Header và Footer chứa nút bấm (`flex-shrink-0`), chỉ cho phép phần thân giữa cuộn tròn (`overflow-y-auto flex-1`).
  - **2. Ổn định Khung Xác Nhận Hủy (Cancellation Box):**
    - Khi bấm nút "Hủy đăng ký", khung màu đỏ *"Xác nhận hủy đăng ký vé?"* phải hiển thị mượt mà mà KHÔNG làm thay đổi kích thước tổng thể của Modal hay đẩy các nút *"Tải Ảnh Vé QR"*, *"Đóng"* ra khỏi tầm nhìn màn hình.
    ## FIX TRIỆT ĐỂ: Dialog Xác Nhận Hủy Bắt Buộc & API Hủy Đăng Ký Vé (Task 24)

- [x] **Task 24: Chuẩn Hóa Dialog Xác Nhận Hủy Vé & Fix Lỗi API Network Error**
  - **1. Xây dựng Dialog Xác Nhận Hủy Bắt Buộc (Blocking Confirmation Dialog):**
    - Khi người dùng bấm "Hủy vé" trong Modal "Vé Của Bạn", bật một **Popup/Dialog Xác Nhận Chuyên Biệt** nằm đè lên trên với lớp nền khóa tương tác (`backdrop-blur-sm bg-black/70`).
    - Khóa toàn bộ các thao tác bên ngoài. Người dùng BẮT BUỘC phải chọn 1 trong 2 nút:
      - **`[Quay Lại / Giữ Vé]`**: Đóng Dialog xác nhận, giữ nguyên thông tin vé.
      - **`[🔥 Xác Nhận Hủy Vé]`**: Gọi API hủy vé và đóng Modal.
  - **2. Khắc phục Backend API Hủy Vé (`DELETE /api/v1/sessions/{session_id}/cancel`):**
    - Kiểm tra và khớp chính exact 100% đường dẫn API hủy vé giữa Frontend và Backend.
    - Logic Backend:
      - Xóa bản ghi vé tương ứng trong bảng `registrations`.
      - Tự động giảm số lượng người tham dự của phiên: `registered_count = MAX(0, registered_count - 1)`.
      - Trả về response JSON `{"success": true, "message": "Hủy vé thành công"}`.
  - **3. Cập nhật Real-time State trên UI Frontend:**
    - Ngay khi hủy thành công: Đóng toàn bộ Modal, tự động đổi nút trên Card sự kiện từ **`[✅ Đã Đăng Ký]`** về lại **`[🎫 Đăng Ký Vé]`**.
    - Cập nhật số người tham dự (`registered_count`) và thanh phần trăm ngay trên giao diện mà không cần F5 reload trang.
    ## FIX LỖI BACKEND: Khắc Phục Lỗi Async SQLAlchemy (greenlet_spawn) Khi Hủy Vé (Task 25)

- [x] **Task 25: Fix Lỗi Bất Đồng Bộ Async DB & Cập Nhật Logic API Hủy Vé**
  - **1. Sửa Logic API Hủy Vé tại Backend (`DELETE /api/v1/...`):**
    - Khắc phục triệt để lỗi `greenlet_spawn / await_only()` bằng cách sử dụng câu lệnh `delete()` trực tiếp từ SQLAlchemy async hoặc nạp trước relationship với `selectinload`:
      ```python
      # Ví dụ refactor truy vấn xóa async chuẩn:
      stmt = delete(Registration).where(
          Registration.session_id == session_id,
          Registration.participant_id == current_user.id # hoặc email
      )
      await db.execute(stmt)
      
      # Cập nhật số lượng registered_count của session:
      await db.execute(
          update(EventSession)
          .where(EventSession.id == session_id)
          .values(registered_count=func.greatest(0, EventSession.registered_count - 1))
      )
      await db.commit()
      ```
    - Tuyệt đối KHÔNG trả về ORM Object vừa bị xóa (tránh trigger lazy-loading). Trả về response JSON đơn giản: `{"success": true, "message": "Hủy vé thành công"}`.
  - **2. Hoàn Thiện Luồng UI Sau Khi Hủy Thành Công:**
    - Ngay khi API trả về HTTP 200 thành công:
      - Đóng tự động cả Popup Xác Nhận Hủy lẫn Modal "Vé Của Bạn".
      - Đổi ngay lập tức nút trên thẻ Sự kiện/Phiên từ **`[✅ Đã Đăng Ký]`** về **`[🎫 Đăng Ký Vé]`**.
      - Giảm số lượng chỗ đã đăng ký trên giao diện mà không cần load lại trang.
      ## TÍNH NĂNG QUẢN TRỊ: Xem Danh Sách Người Đăng Ký, Check-in Thủ Công & Xuất Excel (Task 26)

- [x] **Task 26: Tích hợp Modal Danh sách Người tham dự từ Menu Card & Thao tác Nhanh**
  - **1. Frontend UI (Modal Xem Danh Sách & Tìm Kiếm):**
    - Bổ sung menu item **"👥 Danh sách người đăng ký"** vào Menu 3 chấm (`⋮`) góc trên bên phải của từng thẻ Card sự kiện/phiên.
    - Khi click, bật Modal kích thước lớn (Wide Modal) hiển thị Bảng Dữ Liệu (Data Table):
      - *Các cột dữ liệu:* STT, Họ & Tên, Email, Số điện thoại, Công ty/Chức danh, Mã QR Token, Trạng thái (`🟢 Đã check-in` / `⚪ Chưa check-in`), Thao tác.
    - **Thanh công cụ Toolbar trên Modal:**
      - Ô tìm kiếm thời gian thực (Search theo Tên, Email, SĐT, QR Code).
      - Bộ lọc Dropdown: *Tất cả*, *Đã check-in*, *Chưa check-in*.
      - Nút **`[📊 Xuất file Excel/CSV]`** cho phép tải xuống danh sách người tham dự.
    - **Thao tác nhanh trên từng dòng:**
      - Nút toggle **`[Đánh dấu Check-in]`** / **`[Bỏ Check-in]`** cho phép Staff soát vé bằng tay ngay trên danh sách.
  - **2. Backend API (`FastAPI`):**
    - `GET /api/v1/sessions/{session_id}/registrations`: Truy vấn danh sách người tham dự của phiên từ bảng `registrations` (hỗ trợ search keyword và status filter).
    - `POST /api/v1/registrations/{registration_id}/toggle-checkin`: API cập nhật trạng thái `is_checked_in` và gán timestamp `checked_in_at` múi giờ UTC+7.
    - `GET /api/v1/sessions/{session_id}/export-excel`: API xuất danh sách ra file CSV/XLSX.
  - **3. Phân Quyền Bảo Mật (RBAC Check):**
    - Yêu cầu xác thực Token người dùng: Chỉ tài khoản có vai trò `Admin` hoặc `Staff` mới có quyền truy cập API lấy danh sách này.
    ## NÂNG CAP UX: Tự Động Quét Mã QR Liên Tục (Auto-Scan), Phát Âm Thanh & Chống Quét Trùng (Task 27)

- [x] **Task 27: Nâng Cấp Luồng Auto-Scan Continuous Check-in & Audio Feedback**
  - **1. Cấu hình Chế độ Quét Liên Tục (Continuous Auto-Scan):**
    - Cấu hình thư viện QR Scanner (như `html5-qrcode` / `jsQR`) duy trì luồng Video Stream hoạt động liên tục sau khi bấm nút **"Kích hoạt Camera"**. 
    - Tuyệt đối **KHÔNG** tắt camera hay đóng modal sau khi vừa quét xong 1 vé.
  - **2. Logic Chống Quét Trùng (Debounce / Cooldown Lock):**
    - Tạo state `scannedCooldownMap` lưu các token đã quét trong 3 giây gần nhất.
    - NẾU phát hiện cùng 1 `qr_code_token` vừa quét thành công trong vòng 3 giây: Bỏ qua không gửi request API tới Backend để tránh spam network.
  - **3. Phản Hồi Âm Thanh Real-time (Web Audio API / Sound Feedback):**
    - Tạo hiệu ứng âm thanh phát trực tiếp từ trình duyệt khi quét:
      - **Thành công (Hợp lệ):** Âm thanh tiếng *Beep* cao pitch nhẹ (800Hz, 150ms).
      - **Thất bại / Đã dùng / Sai mã:** Âm thanh tiếng *Buzzer* trầm (300Hz, 400ms).
  - **4. Tự Động Cập Nhật Trạng Thái & Lịch Sử:**
    - Ngay khi có kết quả API từ Backend:
      - Đổi màu Card kết quả (🟢 Xanh lá: Hợp lệ / 🟡 Vàng: Đã sử dụng / 🔴 Đỏ: Không tồn tại).
      - Đưa dữ liệu lượt check-in mới nhất lên **đầu danh sách "Lịch sử quét gần đây"**.
      - Tự động sẵn sàng tiếp nhận mã QR tiếp theo sau 1.5 giây mà nhân viên không cần chạm vào màn hình.
      ## FIX LỖI KỸ THUẬT: Sửa Lỗi Màn Hình Đen Khi Bật Camera Quét QR (Task 28)

- [x] **Task 28: Khắc Phục Lỗi Camera Black Screen & Quản Lý Luồng Media Stream**
  - **1. Xử Lý Cleanup Stream Chuẩn (Life-cycle Management):**
    - Khi bấm "Tắt Camera" hoặc Re-render component: Bắt buộc thực hiện `await html5Qrcode.stop()`, hủy hoàn toàn instance và giải phóng thiết bị:
      ```javascript
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
      ```
  - **2. Bắt Lỗi Quyền Truy Cập Camera (Browser Permission & Constraints):**
    - Đảm bảo gọi camera với cấu hình fallback: Ưu tiên `facingMode: "environment"` (camera sau), nếu không có thì tự động fallback về camera trước `facingMode: "user"`.
    - Bọc logic bật camera trong `try...catch`: Nếu gặp lỗi `NotAllowedError` (bị từ chối quyền) hoặc `NotReadableError` (camera bị ứng dụng khác chiếm giữ), hiển thị ngay Toast thông báo rõ ràng cho người dùng thay vì giữ màn hình đen.
  - **3. Đảm Bảo DOM Container Ready:**
    - Chỉ kích hoạt `scanner.start()` khi thẻ `div` chứa video scanner đã hoàn toàn được mount vào DOM tree.
    ## PHÂN QUYỀN HỆ THỐNG: Cấp Quyền Soát Vé QR Code Cho Nhân Viên & Quản Lý Sự Kiện (Task 29)

- [x] **Task 29: Cấu Hình RBAC Cho Phép Nhân Viên (Staff / Event Manager) Quét Mã Check-in**
  - **1. Phân Quyền Backend API (`FastAPI Dependencies`):**
    - Cập nhật dependency kiểm tra quyền (ví dụ: `require_roles(["admin", "staff", "event_manager"])`) trên các endpoint liên quan đến soát vé:
      - `POST /api/v1/checkin` (Thực hiện check-in mã QR)
      - `GET /api/v1/checkin/history` (Lấy lịch sử quét gần đây)
      - `POST /api/v1/checkin/manual` (Check-in thủ công)
    - Đảm bảo tài khoản có vai trò `staff` hoặc `event_manager` không bị trả về lỗi `403 Forbidden`.
  - **2. Phân Quyền Frontend Navigation & Route Guard (`React Router`):**
    - Cập nhật Sidebar Menu: Hiển thị mục **"Soát Vé QR Code"** cho các tài khoản có role `admin`, `staff` hoặc `event_manager`.
    - Bảo vệ tuyến đường `/check-in` (Route Guard): Cho phép người dùng mang role `staff` / `event_manager` truy cập trang quét camera thay vì bị redirect về trang chủ.

## PHÂN QUYỀN GIAO DIỆN & TƯƠNG TÁC LỊCH TRÌNH KHÁCH THAM DỰ (Task 30)

- [x] **Task 30: Thu Hồi Nút Quản Trị Khỏi Role Khách Tham Dự & Kích Hoạt Tính Năng Lịch Trình Cá Nhân**
  - **1. Phân Quyền RBAC Giao Diện Lịch Trình (`EventSchedule.tsx`):**
    - Thu hồi ngay 2 nút **`[+ Thêm Phiên Mới]`** và **`[⚙️ Thao Tác Sự Kiện]`** khỏi giao diện tài khoản `Khách Tham Dự` (role `ATTENDEE` / `PARTICIPANT` hoặc Guest chưa đăng nhập).
    - Chỉ hiển thị 2 nút quản trị này khi người dùng có vai trò `ADMIN` hoặc `EVENT_MANAGER` (`canManageEvent = hasRole(['ADMIN', 'EVENT_MANAGER'])`).
  - **2. Kích Hoạt Tương Tác Lịch Trình Cá Nhân (Personal Agenda / Bookmarks):**
    - Nhấn **`[🔖 Đặt Lịch]`** / **`[✅ Đã Đặt Lịch]`** tự động lưu và đồng bộ danh sách session IDs vào `localStorage('eventhub_my_agenda')`.
    - Bổ sung nút chuyển đổi & tab **`[⭐ Lịch Của Tôi ({count})]`** trên thanh công cụ lọc lịch trình giúp khách tham dự lọc xem riêng các phiên đã chọn trong 1 cú click.
    - Hiển thị banner thông báo nổi bật khi đang ở chế độ xem lịch trình cá nhân cùng tùy chọn hoàn tác hoặc xuất lịch.
  - **3. Xuất Google Calendar & Tải File iCalendar (.ics):**
    - Tích hợp nút **`[Google Calendar]`** (1-click link mở `https://calendar.google.com/calendar/render?action=TEMPLATE...`) tự động điền tiêu đề, thời gian bắt đầu/kết thúc chuẩn RFC, diễn giả, phòng họp và địa chỉ sự kiện.
    - Tích hợp nút **`[Tải Lịch .ics]`** tạo file `.ics` (RFC 5545) tải trực tiếp về thiết bị cho từng phiên riêng lẻ hoặc toàn bộ lịch cá nhân.
  - **4. Tính Năng Gửi Câu Hỏi Cho Diễn Giả (Ask Speaker Modal):**
    - Tích hợp nút **`[💬 Hỏi Diễn Giả]`** trên thẻ Card và Modal chi tiết phiên diễn thuyết.
    - Modal popup cho phép khách tham dự nhập câu hỏi, tự động điền thông tin người hỏi và gửi qua API `/inquiries` để diễn giả/ban tổ chức chuẩn bị cho phiên Q&A.

## HOÀN THIỆN TƯƠNG TÁC 2 CHIỀU: Q&A, Tài Liệu Session & Feedback Đánh Giá (Task 31)

- [x] **Task 31: Xây Dựng Luồng Tương Tác 2 Chiều Cho Q&A, Document Management & Session Feedback**
  - **1. Q&A Diễn Giả (Live / Pre-session Q&A):**
    - *Attendee UI:* Khung gửi câu hỏi tại Modal chi tiết phiên.
    - *Admin/Speaker UI:* Tab **"Quản lý Q&A"** trong chi tiết phiên để duyệt, ẩn hoặc đánh dấu câu hỏi đã trả lời.
  - **2. Quản Lý Tài Liệu & Slide (Session Resources):**
    - *Admin UI:* Trường Upload/Dán URL tài liệu (PDF/Slide) khi Tạo/Chỉnh sửa Phiên.
    - *Attendee UI:* Nút **`[📥 Tải Slide / Tài liệu]`** xuất hiện tại trang chi tiết phiên (chỉ mở cho người đã đăng ký/check-in).
  - **3. Đánh Giá & Phản Hồi (Feedback & Rating 1-5 Star):**
    - *Attendee UI:* Widget đánh giá sao + ô nhận xét xuất hiện sau khi phiên kết thúc.
    - *Admin UI:* Tích hợp biểu đồ thống kê mức độ hài lòng và danh sách phản hồi vào trang **"Dashboard Báo Cáo"**.
  - **4. Backend APIs & Database:**
    - Khởi tạo các bảng `session_questions`, `session_materials`, `session_feedbacks` trong PostgreSQL kèm API CRUD tương ứng.
## THIẾT KẾ & PHÁT TRIỂN HỆ THỐNG DÀNH RIÊNG CHO DIỄN GIẢ (SPEAKER PORTAL & CONTROL CENTER) (Task 32)

- [ ] **Task 32: Triển Khai Phân Quyền Diễn Giả, Cổng Thống Kê & Màn Hình Điều Khiển Sân Khấu (Speaker Control Center)**
  - **1. Cơ sở dữ liệu & Cấu trúc Phân quyền (Database & RBAC):**
    - Cập nhật Enum Role trong CSDL: Thêm vai trò `speaker` (Diễn giả).
    - Cập nhật bảng `sessions`: Thêm trường `speaker_id` (Khóa ngoại trỏ tới `users.id`) để liên kết diễn giả với phiên tương ứng.
    - Khởi tạo bảng `session_questions`:
      - `id`, `session_id`, `user_id` (người đặt), `question_text`, `upvotes` (số lượt thả tim/vote), `status` (`pending` / `answering` / `answered` / `pinned`), `created_at`.
    - Tạo bảng `session_resources`: Lưu URL file Slide/PDF do diễn giả hoặc Admin tải lên.

  - **2. Backend API (`FastAPI`):**
    - `GET /api/v1/speaker/my-sessions`: Lấy danh sách các phiên thuyết trình được gán cho Diễn giả đang đăng nhập.
    - `GET /api/v1/speaker/sessions/{session_id}/qa`: Lấy danh sách câu hỏi theo thời gian thực (hỗ trợ sắp xếp theo `upvotes` giảm dần hoặc `created_at`).
    - `PATCH /api/v1/speaker/questions/{question_id}/status`: API cập nhật trạng thái câu hỏi (`answering` - Đang trả lời, `answered` - Đã xong, `pinned` - Ghim).
    - `POST /api/v1/speaker/sessions/{session_id}/upload-slide`: API tiếp nhận file PDF/Slide bài diễn thuyết từ diễn giả.
    - **Security:** Áp dụng `require_roles(["speaker", "admin"])` để bảo vệ tất cả endpoint trên.

  - **3. Frontend UI (React + Tailwind):**
    - **Màn hình Danh sách Phiên của Diễn giả (`/speaker/dashboard`):**
      - Hiển thị danh sách các phiên diễn thuyết mà tài khoản `speaker` được phân công.
      - Trạng thái từng phiên (*Sắp diễn ra*, *Đang LIVE*, *Đã kết thúc*) và nút **`[🚀 Vào Studio Control Center]`**.
    - **Màn hình Điều khiển Sân khấu (`/speaker/session/{session_id}`):**
      - *Giao diện Studio Dark Mode:* Font chữ lớn, tương phản cao, tối ưu hiển thị trên iPad/Tablet/Laptop sân khấu.
      - *Thanh thông số đỉnh trang (Top Bar):* Đồng hồ đếm ngược thời lượng phiên (Countdown Timer) + Tổng số lượng khán giả đã check-in thực tế.
      - *Cột Q&A Real-time Stream (Bên trái/Chính):*
        - Hiển thị danh sách câu hỏi khán giả gửi lên, xếp thứ tự theo số lượng **Upvotes**.
        - Nút bấm thao tác nhanh cho từng câu hỏi: **`[▶️ Đang trả lời]`** (Nổi bật màu xanh lá), **`[✅ Đã xong]`**, **`[📌 Ghim]`**.
      - *Cột Quản lý Slide & Tài liệu (Bên phải):*
        - Khung kéo thả Upload file Slide (PDF).
        - Trình xem trước (Preview) slide bài giảng.

  - **4. Bảo vệ Tuyến đường Frontend (Route Guard):**
    - Chặn các tài khoản vai trò `attendee` (Khách) không được phép vào `/speaker/*`.
    - Cho phép tài khoản `admin` có đầy đủ quyền truy cập vào Speaker Control Center để hỗ trợ diễn giả khi cần.
## TÍNH NĂNG ĐÁNH GIÁ & TỔNG HỢP PHẢN HỒI BẰNG AI (FEEDBACK & AI SUMMARY) (Task 33)

- [x] **Task 33: Thu Nhập Đánh Giá Từ Khách Tham Dự & Phân Tích Tổng Hợp Phản Hồi Bằng AI**
  - **1. Cơ Sở Dữ Liệu & API Thu Nhập Phản Hồi (Backend FastAPI):**
    - Tạo bảng `feedbacks` trong CSDL: `id`, `user_id`, `event_id`, `session_id` (optional), `rating` (1-5 sao), `comment` (nội dung), `created_at`.
    - `POST /api/v1/feedback`: Gửi nhận xét & đánh giá sao từ phía Khách tham dự (Kiểm tra người dùng đã check-in mới cho phép gửi).
    - `GET /api/v1/feedback/stats`: Trả về điểm trung bình, phân bổ số sao (1-5 star distribution) và danh sách nhận xét.
    - `POST /api/v1/feedback/ai-summary`: Tích hợp LLM/RAG pipeline gom toàn bộ comment, tự động phân tích và trả về:
      - *Chỉ số Sentiment:* Tỷ lệ Tích cực / Trung tính / Tiêu cực.
      - *Ưu điểm chính:* 3 điểm khách hàng hài lòng nhất.
      - *Điểm cần cải thiện:* 3 vấn đề logistics/nội dung khách phàn nàn nhiều nhất.
      - *Tóm tắt điều hành (Executive Summary):* Đoạn văn tóm lược ngắn gọn cho Ban tổ chức.

  - **2. Giao Diện Khách Tham Dự (Attendee UI):**
    - Hiển thị Widget / Modal **"Đánh Giá Trải Nghiệm"** (Chấm 1–5 sao + Ô nhập lời nhắn) tại trang Chi tiết Phiên hoặc Chi tiết Sự kiện sau khi phiên/sự kiện kết thúc.
    - Thông báo cảm ơn sau khi gửi thành công và ẩn form để tránh gửi lặp.

  - **3. Giao Diện Quản Trị & Báo Cáo AI (Admin UI - Feedback & Summary Page):**
    - Hoàn thiện trang **"Feedback & Summary"** trên Sidebar Admin:
      - **Khung tổng quan:** Điểm đánh giá trung bình (VD: 4.8/5 ⭐) & Biểu đồ phân bổ sao.
      - **Khung AI Concierge Analytics:** Nút **`[✨ Phân Tích Phản Hồi Bằng AI]`** để tạo báo cáo tổng hợp thông minh tức thì.
      - **Bảng danh sách nhận xét:** Hiển thị chi tiết từng feedback kèm bộ lọc theo số sao / phiên.
      ## TỐI ƯU UX FEEDBACK, CHỈNH SỬA ĐÁNH GIÁ & EMAIL NHẮC LỊCH CHÍNH XÁC (Task 34)

- [x] **Task 34: Hoàn Thiện Luồng Đánh Giá Chuẩn, Clean Modal UI & Automated Email Scheduler**
  - **1. Rào Chắn Đánh Giá Thật & API Chỉnh Sửa Feedback (Backend FastAPI):**
    - `POST /api/v1/feedback`: Thêm kiểm tra middleware/DB -> Chỉ tài khoản có `is_registered == True` (hoặc đã check-in) mới được phép tạo đánh giá. Nêu chưa đăng ký, trả về HTTP 403.
    - `PUT /api/v1/feedback/{feedback_id}`: Thêm API cho phép người dùng cập nhật lại số sao và lời nhắn của bản ghi đánh giá cũ.
  - **2. Tối Ưu Giao Diện Modal (Clean UI Footer):**
    - Trong Modal chi tiết/đánh giá (`image_8b3c23.jpg`): Ẩn toàn bộ cụm button điều hướng không liên quan ở footer (`Hỏi Diễn Giả`, `Google Calendar`, `Đăng Ký Vé`, `Đặt Lịch`).
    - Khi người dùng đã đánh giá: Bổ sung nút **`[✏️ Chỉnh sửa đánh giá]`** ngay bên cạnh thông báo "Bạn đã gửi đánh giá...". Bấm vào sẽ bật form cho phép sửa lại.
  - **3. Hệ Thống Email Nhắc Lịch Tự Động (Scheduled Email Notifications):**
    - Khi người dùng bấm **`[🔖 Đặt Lịch]`**: Lưu thông tin vào bảng `user_reminders` (`user_id`, `session_id`, `event_id`, `start_time`, `notified_24h=False`, `notified_1h=False`).
    - **Background Scheduler (APScheduler / Celery):**
      - Chạy job định kỳ kiểm tra thời gian sự kiện (Múi giờ `Asia/Ho_Chi_Minh` UTC+7).
      - **Tự động gửi Email 1 (Trước 24h):** Gửi email nhắc nhở trước 1 ngày cho đúng user đã Đặt lịch. Đánh dấu `notified_24h = True`.
      - **Tự động gửi Email 2 (Trước 1h):** Gửi email nhắc nhở khẩn trước 60 phút cho đúng user đã Đặt lịch. Đánh dấu `notified_1h = True`.
      ## BẢO MẬT & VALIDATION: Khóa Quyền Đánh Giá Cho Tài Khoản Chưa Đăng Ký (Task 35)

- [x] **Task 35: Triển Khai Rào Chắn Kiểm Tra Quyền Đánh Giá (Strict Feedback Security)**
  - **1. Kiểm tra ở Backend API (`FastAPI`):**
    - Trong endpoint `POST /api/v1/feedback` và `PUT /api/v1/feedback/{id}`:
      - Thực hiện query kiểm tra CSDL bảng `registrations` theo cặp `(user_id, event_id)` hoặc `(user_id, session_id)`.
      - Nếu người dùng chưa có bản ghi đăng ký hợp lệ: Chặn truy cập, lập tức trả về `HTTP 403 Forbidden` kèm thông báo: *"Chỉ người đã đăng ký tham gia sự kiện mới được phép gửi hoặc chỉnh sửa đánh giá."*
  - **2. Khóa Giao Diện ở Frontend (`React`):**
    - Tại thẻ sự kiện / phiên và trong Modal chi tiết:
      - Kiểm tra cờ trạng thái `is_registered` của tài khoản hiện tại.
      - Nếu chưa đăng ký: Vô hiệu hóa (disable) hoặc ẩn nút **`[⭐ Đánh Giá]`**.
      - Nếu cố tình truy cập/bấm nút: Hiển thị ngay Toast cảnh báo màu vàng: *"Bạn cần đăng ký sự kiện này trước khi đánh giá."*
      ## THIẾT KẾ RESPONSIVE: TỐI ƯU GIAO DIỆN DI ĐỘNG & TABLET (Task 36)

- [x] **Task 36: Rà Soát & Tối Ưu Toàn Bộ Giao Diện Chuẩn Responsive Mobile (Mobile & Tablet UX)**
  - **1. Responsive Navigation Bar (Sidebar Mobile Drawer):**
    - Sử dụng Tailwind Breakpoints (`lg:`):
    - Màn hình desktop (`≥ 1024px`): Giữ nguyên Sidebar bên trái.
    - Màn hình di động (`< 1024px`): Thu gọn Sidebar, hiển thị nút **Menu Hamburger (☰)** góc trên cùng bên trái để trượt mở Drawer menu.
  - **2. Layout Trực Quan Cho Màn Hình Soát Vé Camera QR (`/check-in`):**
    - Chuyển `grid-cols-2` thành `grid-cols-1 lg:grid-cols-2`.
    - Trên mobile: Khung video quét camera chiếm full chiều rộng màn hình phía trên, khung kết quả check-in & danh sách lịch sử nằm ngay bên dưới.
  - **3. Danh Sách Card Sự Kiện & Thao Tác Chạm (Touch-friendly UX):**
    - Chuyển lưới danh sách phiên/sự kiện về 1 cột (`grid-cols-1`) trên màn hình nhỏ.
    - Đảm bảo các button (*Đăng Ký Vé*, *Đặt Lịch*, *Hỏi Diễn Giả*, *Đánh Giá*) có chiều cao tối thiểu `44px` và khoảng cách hợp lý để tránh bấm nhầm trên màn hình cảm ứng.
  - **4. Tối Ưu Tất Cả Dialog / Modal Trên Di Động:**
    - Đặt width modal là `w-[95vw] sm:max-w-lg` để không bị vỡ giao diện trên iPhone/Android.
    - Cấu hình `max-h-[85vh] overflow-y-auto` để cuộn mượt nội dung dài.
    ## NÂNG CẤP MÔ-ĐUN AI CONCIERGE (HITL): RAG INSPECTOR & BỘ CÔNG CỤ DUYỆT CÂU TRẢ LỜI (Task 37)

- [x] **Task 37: Hoàn Thiện Luồng Kiểm Duyệt AI Concierge & Tương Tác RAG**
  - **1. Trình Xem Trích Dẫn RAG (RAG Source Preview Popover):**
    - Khi click vào thẻ `RAG Matched: {file_name}`, hiển thị Popover chứa nội dung snippet/chunk văn bản đã retrieve từ PostgreSQL (pgvector).
  - **2. Bộ Công Cụ Chỉnh Sửa Nhanh (Smart Prompt Assistant):**
    - Khi bấm `[Chỉnh Sửa Phản Hồi]`: Mở khung Rich Text Editor kèm các nút trợ lý AI:
      - `[🌐 Dịch Ngôn Ngữ]`, `[✨ Viết Lại Trực Quan]`, `[📌 Chèn Thông Tin WiFi/Bản Đồ]`.
  - **3. Phê Duyệt Hàng Loạt & Tích Hợp Phím Tắt (Hotkeys & Batch Actions):**
    - Bổ sung Checkbox tại danh sách yêu cầu phía bên trái + Nút **`[⚡ Duyệt Hàng Loạt Câu Hỏi RAG > 90%]`**.
    - Gán phím tắt `Ctrl + Enter` để trigger action Duyệt & Gửi Phản Hồi nhanh.
  - **4. Chọn Kênh Gửi (Dispatch Channel Selector):**
    - Cho phép chọn kênh gửi (Email / In-App Notify / SMS) trước khi bấm `[Duyệt & Gửi Phản Hồi]`.