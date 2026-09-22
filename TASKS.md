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

## HOÀN THIỆN MODULE AI PR & TRUYỀN THÔNG STUDIO (Task 38)

- [x] **Task 38: Hoàn Thiện Module AI PR & Truyền Thông Studio (Gemini SDK & Form State Binding)**
  - **1. Backend System Prompt & Endpoint Linh Hoạt (Unrestricted AI Prompt):**
    - Tạo endpoint `POST /api/v1/ai/generate-pr` (kèm alias `POST /api/v1/pr-studio/generate`) tích hợp Gemini SDK với model `gemini-2.5-flash`.
    - Cấu hình System Prompt đa nhiệm linh hoạt: vừa tự nhiên giải đáp, chào hỏi, tư vấn cởi mở về sự kiện, vừa xử lý sinh bài PR chuẩn xác bám sát payload (`event_name`, `event_category`, `event_time`, `event_location`, `target_audience`, `main_topic`, `tone_of_voice`, `keywords`).
    - Hỗ trợ trích xuất cấu trúc đa kênh cho 3 ấn phẩm: Email (Subject, Body, CTA), Social (Hook, Body, Hashtags), Reminder (SMS/Push Notification).
  - **2. Binding Form Data & Bộ Chọn Tông Giọng (Interactive Tone Selector):**
    - Binding 100% hai chiều state tại route `/content-studio` cho tất cả các trường: Tên sự kiện, Danh mục sự kiện (kèm gợi ý chip nhanh), Thời gian, Người dùng / Khán giả mục tiêu, Hội trường / Địa điểm, Chủ đề chính, Từ khóa.
    - Bộ chọn Tông giọng dạng nút bấm tương tác linh hoạt: *Chuyên nghiệp (Professional)*, *Thu hút / Hào hứng (Engaging)*, *Thân mật / Gần gũi (Casual)* tự động lưu và highlight trực quan.
  - **3. Render Đa Tab & Hiệu Ứng Chờ (Multi-Tab Output & Skeleton Loading):**
    - Xử lý gửi request khi bấm nút `[✨ Tạo Nội Dung Bằng AI]`.
    - Hiệu ứng Skeleton Loading hiện đại ở khung kết quả bên phải trong suốt thời gian chờ Gemini phản hồi.
    - Hiển thị kết quả linh hoạt theo 3 tab chuyên biệt:
      - *Bản tin Email*: Có Tiêu đề (Subject) kèm nút sao chép nhanh, Thân bài và Lời kêu gọi hành động (CTA).
      - *Bài đăng Mạng xã hội*: Có Hook mở đầu bắt trend, Thân bài và Bộ Hashtags tag cloud tương tác.
      - *Tin nhắc sự kiện*: Khung mô phỏng Push Notification / SMS trên smartphone kèm mốc giờ, địa điểm và nhắc nhở QR code.
  - **4. Thanh Công Cụ Thao Tác Nhanh (Quick Content Actions):**
    - `[📋 Sao Chép Nội Dung]`: Sao chép nhanh nội dung ấn phẩm của tab hiện tại kèm Sonner toast.
    - `[🔄 Tạo Lại Bản Khác]`: Kích hoạt tạo phiên bản mới với cùng thông số form đầu vào.
    - `[📤 Xuất Khung Văn Bản]`: Xuất và tải ngay file văn bản Markdown (`.md`) chứa trọn bộ ấn phẩm truyền thông và siêu dữ liệu sự kiện về máy.

## HOÀN THIỆN MODULE PHÂN TÍCH, ĐÁNH GIÁ & ĐỀ XUẤT GIẢI PHÁP BẰNG AI (AI FEEDBACK & ANALYTICS ENGINE) (Task 39)

- [x] **Task 39: Hoàn thiện Module Phân Tích, Đánh Giá & Đề Xuất Giải Pháp Bằng AI (AI Feedback & Analytics Engine) trên giao diện /feedback-summary và /dashboard**
  - **1. Backend AI Analytics Engine & API Endpoints (FastAPI & Gemini RAG):**
    - Tạo API endpoint `POST /api/v1/ai/analyze-feedback`:
      - Truy vấn và tổng hợp phản hồi thực tế từ bảng `feedbacks` trong PostgreSQL.
      - Phân tích cảm xúc đa chiều (*Positive / Neutral / Negative*) và tính toán chỉ số hài lòng *Satisfaction Score* (thang điểm 100 & điểm trung bình 5.0 ⭐).
      - Tự động phát hiện điểm nghẽn vận hành (Operational Bottlenecks): dồn ứ tại cổng check-in giờ cao điểm (Check-in Congestion), tỷ lệ tham dự thấp tại các phiên chuyên đề (Low Attendance Rate), và phản ánh kỹ thuật/hậu cần.
      - Tích hợp Gemini RAG/Prompting để sinh Kế Hoạch Khắc Phục (*Action Plan*) tức thì phân bổ rõ ràng theo từng phòng ban, mức độ ưu tiên (*CRITICAL, HIGH, MEDIUM, LOW*), thời gian thực thi và dự báo tác động định lượng.
    - Tạo API endpoint `POST /api/v1/ai/apply-action-plan`: Tiếp nhận danh sách giải pháp được duyệt và ghi nhận vào hệ thống nhật ký kiểm toán (*AILog*).
  - **2. Binding Dữ Liệu Lên Giao Diện React Tại `/feedback-summary`:**
    - Cập nhật định tuyến route alias `/feedback-summary` và `/feedback`.
    - Hiển thị 4 thẻ thông số điều hành: *Satisfaction Score*, *Phân Bổ Cảm Xúc*, *Điểm Nghẽn Phát Hiện*, *Tiến Độ Kế Hoạch Khắc Phục*.
    - Khung *AI Executive Summary* giao diện tối màu sang trọng kèm Live RAG status và nút sao chép nhanh.
    - Khung *Top Điểm Nghẽn Vận Hành*: Cảnh báo dồn ứ cửa soát vé giờ cao điểm, tỷ lệ tham dự phòng workshop và vấn đề âm thanh/tea-break.
    - Khung *Kế Hoạch Khắc Phục Tự Động Thời Gian Thực (AI Action Plan)*: Danh sách thẻ giải pháp có gắn nhãn ưu tiên, phòng ban phụ trách, dự báo tác động và nút chuyển đổi trạng thái *Đã Áp Dụng*.
  - **3. Binding Dữ Liệu Lên Giao Diện React Tại `/dashboard`:**
    - Bổ sung khối module *AI Feedback & Analytics Engine* ngay trên trang tổng quan.
    - Hiển thị thẻ *Sentiment Score*, *Satisfaction Score*, danh sách điểm nghẽn và khung đề xuất giải pháp trực tiếp trên màn hình quản trị.
    - Điều hướng mượt mà tới `/feedback-summary` chỉ với 1 click.
  - **4. Thanh Công Cụ Thao Tác Nhanh (Quick Action Toolbar):**
    - `[📥 Xuất Báo Cáo Executive Summary (PDF/Word)]`: Cho phép tải báo cáo quản trị đầy đủ định dạng Word (`.doc`) hoặc in/lưu PDF chuyên nghiệp.
    - `[⚡ Phân Tích Real-Time]`: Kích hoạt gọi AI Engine tái phân tích toàn bộ dữ liệu phản hồi và vận hành theo thời gian thực.
    - `[✅ Áp Dụng Kế Hoạch Khắc Phục]`: Chuyển đổi trạng thái và áp dụng toàn bộ giải pháp do AI đề xuất vào hệ thống điều phối.

## HOTFIX AI FEEDBACK & ANALYTICS ENGINE (Task 40)

- [x] **Task 40: Hotfix - Khắc Phục Lỗi Kích Hoạt AI Feedback & Analytics Engine (/feedback & /dashboard)**
  - **1. Backend Graceful Fallback & Exception Handling (FastAPI):**
    - Đảm bảo route `POST /api/v1/ai/analyze-feedback` tại [`backend/app/api/v1/ai_analytics.py`](file:///d:/TL_2026-2027/eventhub-ai/backend/app/api/v1/ai_analytics.py) được bao bọc hoàn toàn trong khối `try-except`.
    - Giới hạn timeout gọi Gemini API tối đa 3.0 giây để tránh nghẽn tiến trình mạng.
    - Trong mọi trường hợp mất kết nối, thiếu `GEMINI_API_KEY`, DNS lookup thất bại hoặc API quá tải, tự động trả về cấu trúc dữ liệu phân tích mẫu đầy đủ (*satisfaction_score*, *sentiment_breakdown*, *top_bottlenecks*, *action_plan*, *executive_summary*) với HTTP Status 200 OK thay vì lỗi 500.
  - **2. Frontend State Recovery & Fallback (React):**
    - Tại [`frontend/src/services/api.ts`](file:///d:/TL_2026-2027/eventhub-ai/frontend/src/services/api.ts) và [`frontend/src/pages/FeedbackSummary.tsx`](file:///d:/TL_2026-2027/eventhub-ai/frontend/src/pages/FeedbackSummary.tsx), bổ sung try-catch bọc quanh lệnh gọi API.
    - Tự động nạp bộ dữ liệu Fallback nội bộ nếu fetch bị hủy hoặc lỗi mạng.
    - Luôn đảm bảo `setLoading(false)` và `setAiLoading(false)` để giao diện lập tức hiển thị báo cáo hoàn chỉnh, không bao giờ rơi vào trạng thái treo hoặc báo Toast lỗi.
    - Cập nhật tương tự cho hàm phân tích real-time tại [`frontend/src/pages/Dashboard.tsx`](file:///d:/TL_2026-2027/eventhub-ai/frontend/src/pages/Dashboard.tsx).
  - **3. Đăng Ký Router & CORS Checking:**
    - Xác nhận endpoint `/api/v1/ai/analyze-feedback` và `/api/v1/ai/apply-action-plan` đã được `include_router` chính xác vào main FastAPI app qua `api_v1_router`.
    - CORS middleware đã được cấu hình mở (`allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`) không gây cản trở các request từ frontend.

## HOTFIX ĐỘC LẬP TRẠNG THÁI NÚT BẤM & FIX LỖI XÓA SỰ KIỆN (Task 41)

- [x] **Task 41: Hotfix - Độc Lập Trạng Thái Nút Bấm Theo Tài Khoản & Fix Lỗi Xóa Sự Kiện Không Lưu DB**
  - **1. Phân Lập Trạng Thái Button Theo `user_id` (User-Specific Button State):**
    - **Backend:** Cập nhật các API truy vấn danh sách sự kiện (`GET /api/v1/events/`) để trả về các cờ trạng thái (`is_registered`, `is_checked_in`, `has_reviewed`) được tính toán ĐỘC LẬP dựa theo `current_user.id` từ JWT token.
    - **Frontend:** Tại trang Danh mục sự kiện (`/events`), kiểm tra tất cả các nút hành động (*Đăng ký, Check-in, Đánh giá/Feedback*). Đảm bảo giao diện chỉ hiển thị trạng thái "Đã đánh giá" hoặc "Đã đăng ký" NẾU chính tài khoản đang đăng nhập đã thực hiện hành động đó.
  - **2. Khắc Phục Triệt Để Lỗi Xóa Sự Kiện (Persistent Event Deletion):**
    - **Backend:** Kiểm tra endpoint `DELETE /api/v1/events/{event_id}` trong FastAPI. Đảm bảo có xử lý xóa/cascade các bản ghi liên quan trong PostgreSQL và gọi `db.commit()`.
    - **Frontend:** Cập nhật hàm xử lý nút **Xóa sự kiện**: Bắt buộc dùng `await` gọi API `DELETE /api/v1/events/{id}` thành công, sau đó mới cập nhật lại React state hoặc re-fetch danh sách sự kiện từ server.
  - [x] **Task 42: Nâng Cấp Engine AI Feedback & Summary - Phân Tích Phản Hồi Tiêu Cực & Đề Xuất Chuyên Sâu**
  - **1. Backend Aspect-Based Sentiment Analysis & Severity Matrix (FastAPI + Gemini):**
    - Cập nhật API `POST /api/v1/ai/analyze-feedback` hỗ trợ phân loại phản hồi tiêu cực theo 3 nhóm khía cạnh: *Hạ tầng/Kỹ thuật, Nội dung/Diễn giả, Hậu cần/Trải nghiệm*.
    - Gán mức độ nghiêm trọng (Critical / Moderate / Minor) cho các điểm nghẽn để thiết lập thứ tự ưu tiên xử lý.
  - **2. AI Qualitative Insights & Trích Xuất Dẫn Chứng:**
    - Lập trình AI tự động tổng hợp đoạn văn nhận định định tính (Qualitative Text), bóc tách nguyên nhân cốt lõi kèm trích dẫn nguyên văn phản hồi tiêu cực tiêu biểu từ người tham dự.
  - **3. Động Cơ Sinh Email Xin Lỗi & Đền Bù Tự Động (Auto Recovery Draft):**
    - Xây dựng API `POST /api/v1/ai/generate-apology` tự động sinh bản thảo Email xin lỗi cá nhân hóa kèm voucher/ưu đãi dành cho người tham dự đánh giá 1-2 sao.
  - **4. Giao Diện Báo Cáo Chuyên Sâu & RAG Benchmarking (React `/feedback-summary`):**
    - Render khối **"Nhận Định Chi Tiết Từ AI"** hiển thị nguyên nhân & trích dẫn người dùng.
    - Render widget **"Email Xin Lỗi Tự Động"** cho phép Admin xem trước và gửi nhanh.
    - Tích hợp đối chiếu chỉ số phản hồi so với các sự kiện trước đó qua CSDL Vector (`pgvector`).
- [x] **Task 43: Nâng Cấp Toàn Diện AI Concierge Queue (HITL) - Tiếng Việt, Prompt Assistant & AI Advanced Automation**
  - **1. Ưu Tiên Tiếng Việt & Phản Hồi Song Ngữ (Bilingual Auto-Response):**
    - Cập nhật backend `POST /api/v1/ai/generate-concierge-response`: Ép AI sinh câu trả lời mặc định bằng **Tiếng Việt** chuẩn xác.
    - Hỗ trợ chế độ sinh phản hồi song ngữ Anh - Việt cho khách quốc tế.
  - **2. Bộ Công Cụ Trợ Lý AI (Prompt Assistant Actions):**
    - `[🌐 Dịch Ngôn Ngữ]`: Chuyển đổi linh hoạt nội dung gợi ý sang Tiếng Việt/Anh.
    - `[✨ Viết Lại Trực Quan]`: Định dạng lại text ngắn gọn, bổ sung icon và bullet point.
    - `[📍 Chèn WiFi & Bản Đồ]`: Tự động đính kèm thông tin WiFi và sơ đồ hội trường.
  - **3. Xem Trích Dẫn RAG & Đính Kèm Thông Tin Tự Động (Smart Attachment & RAG Popover):**
    - Hiển thị Popover/Modal chi tiết chunk văn bản từ PostgreSQL (pgvector) khi bấm `[Xem trích dẫn đầy đủ]`.
    - Bổ sung nút `[📎 Chèn QR Check-in]`: Tự động tra cứu mã QR/Thẻ tham dự của user trong CSDL và chèn vào phản hồi.
  - **4. Phân Luồng VIP & Chế Độ Tự Động Duyệt (VIP Escalation & Auto-Pilot):**
    - Tự động đẩy các câu hỏi từ khách có badge `VIP` hoặc chứa từ khóa khẩn cấp lên đầu hàng đợi.
    - Thêm công tắc `[⚡ Auto-Approve RAG > 95%]`: Tự động duyệt và gửi câu trả lời nếu độ chính xác RAG đạt trên 95%.
- [x] **Task 44: Thiết Kế Giao Diện UI/UX Toàn Diện Chuẩn Template & Tích Hợp Phân Hệ AI**

  - **1. Landing Page Công Khai (Public Portal `/`):**
    - **Hero Section:** Banner xanh ngọc/xanh đậm hiện đại, tiêu đề "Nền tảng quản lý sự kiện thông minh với AI", thẻ floating "AI Assistant" và "Sự kiện chuyên nghiệp".
    - **Stats Counter Bar:** 4 thẻ chỉ số: *1,000+ Sự kiện*, *500+ Doanh nghiệp*, *50,000+ Người tham dự*, *99.9% Độ ổn định*.
    - **Feature Showcase:** Grid hiển thị giải pháp toàn diện (Quản lý sự kiện, Soát vé QR, AI PR Studio, Feedback Engine, RAG Concierge) kèm mockup thiết bị.
    - **Sự Kiện Nổi Bật:** Grid danh sách sự kiện kèm bộ lọc danh mục, ngày tổ chức và nút `[Đăng ký ngay]`.
    - **Testimonials & Footer:** Thẻ đánh giá khách hàng (5 sao) và Footer đa cột chuẩn SEO.

  - **2. Phân Quyền 4 Giao Diện Dashboard (Role-Based Dashboards):**
    - **Role 1: Giao Diện Người Tham Dự (Attendee):**
      - Widget chào hỏi cá nhân hóa, khung "Trợ lý AI Chat ngay".
      - Danh sách "Sự kiện sắp diễn ra" và "Sự kiện đã đăng ký" kèm thẻ vé QR cá nhân.
    - **Role 2: Giao Diện Nhân Viên Sự Kiện (Staff / Check-in):**
      - Thẻ tổng quan soát vé (*Tổng vé, Đã check-in, Còn lại, Tỷ lệ %*).
      - Bảng log "Danh sách check-in gần đây" real-time + Thanh tác vụ nhanh (*Quét mã QR, Tìm khách, Soát vé thủ công*).
    - **Role 3: Giao Diện Quản Lý Sự Kiện (Organizer):**
      - Thẻ tổng quan hệ thống, biểu đồ đường (Registrations over time), biểu đồ tròn phân bổ doanh thu/vé.
      - Bảng điều khiển tích hợp lối vào nhanh cho **AI PR Studio** và **AI Feedback & Summary**.
    - **Role 4: Giao Diện Quản Trị Viên (Admin):**
      - Metrics tổng quan hệ thống (Users, Events, Revenue, Server Uptime 99.9%).
      - Biểu đồ phân bổ vai trò người dùng + Cài đặt hệ thống & Nhật ký bảo mật.

  - **3. Tích Hợp Các Module AI Nâng Cao Vào Menu Sidebar:**
    - **AI Concierge Queue (`/inquiries`):** Tích hợp giao diện kiểm duyệt HITL, bộ công cụ Prompt Assistant (Dịch, Viết lại, Chèn WiFi/Bản đồ, QR Check-in), Popover RAG Snippet và phân luồng ưu tiên khách VIP.
    - **AI PR Studio (`/content-studio`):** Tích hợp form binding parameters, bộ chọn Tông giọng linh hoạt, hiệu ứng Skeleton Loading và xem trước đa tab (Email, Social, SMS).
    - **AI Feedback & Summary (`/feedback-summary`):** Tích hợp Sentiment Score, phân tích khía cạnh (Hạ tầng, Nội dung, Hậu cần), AI Qualitative Insights và đống cơ sinh Email xin lỗi tự động.

  - **4. Quy Chuẩn UI/UX & Styling:**
    - Sử dụng Tailwind CSS với tông màu chủ đạo: Deep Blue (`#0F172A`), Primary Accent Blue (`#2563EB`), Glassmorphism nhẹ và Lucide Icons.
    - Đảm bảo Responsive 100% trên Desktop, Tablet và Mobile.
- [x] **Task 45: Refactor UI/UX Khớp Visual Mockup (Landing Page & 4 Role Dashboards)**

  - **1. Quy Chuẩn Bảng Màu & Theme (Tailwind CSS):**
    - Màu nền Hero/Sidebar: Dark Navy (`#0B132B` / `bg-slate-900`).
    - Màu nhấn Brand: Primary Blue (`#2563EB` / `bg-blue-600`), hiệu ứng Gradient (`bg-gradient-to-r from-blue-600 to-indigo-600`).
    - Nền trang Dashboard: Light Gray (`bg-slate-50`), Card container: White (`bg-white`) bo góc `rounded-xl`, shadow nhẹ `shadow-sm border border-slate-100`.

  - **2. Tái Cấu Trúc Landing Page Công Khai (`/`):**
    - **Header:** Sticky Navbar với Logo "EventAI", menu điều hướng, nút [Đăng nhập] và [Đăng ký] xanh gradient.
    - **Hero Section:** Tiêu đề lớn "Tạo nên những sự kiện đáng nhớ với EventAI", bên phải là hình ảnh/mockup sân khấu sự kiện hoành tráng kèm các thẻ floating badge ("AI hỗ trợ tổ chức", "Sự kiện chuyên nghiệp").
    - **Stats Bar:** 4 thẻ chỉ số vuông vắn căn giữa (*500+ Sự kiện*, *50,000+ Người tham dự*, *200+ Doanh nghiệp*, *99.9% Độ ổn định*).
    - **Feature Grid:** Khối 2 cột "Vì sao chọn EventAI?" kèm hình ảnh Laptop/Tablet hiển thị màn hình ứng dụng.
    - **Event Cards:** Grid 4 cột hiển thị danh sách sự kiện nổi bật có thumbnail, ngày tháng, địa điểm và nút `[Đăng ký ngay]` xanh lam.
    - **CTA Banner & Testimonials:** Sân khấu hoành tráng, 3 thẻ đánh giá khách hàng (5 sao) và Footer đa cột chuẩn SEO.

  - **3. Chuẩn Hóa 4 Bố Cục Dashboard Theo Vai Trò (Role Dashboards):**
    - **Giao diện Người tham dự:** Header chào "Xin chào, [Tên]", Widget Trợ lý AI bên phải, Grid "Sự kiện sắp diễn ra" và danh sách "Sự kiện đã đăng ký" kèm modal vé QR.
    - **Giao diện Nhân viên (Staff):** Top bar chứa 4 thẻ chỉ số check-in, bảng "Danh sách check-in gần đây" góc trái + Cột "Thao tác nhanh" (*Quét QR, Tìm khách, Tạo sự kiện mới, Gửi thông báo*) viền xanh bên phải.
    - **Giao diện Quản lý sự kiện (Organizer):** 4 Stat Cards top head + Biểu đồ đường (Line chart) xu hướng đăng ký + Biểu đồ tròn (Donut chart) phân bổ doanh thu 856M và Sự kiện sắp tới.
    - **Giao diện Quản trị viên (Admin):** Màn hình Quản lý hệ thống với 4 thẻ tổng quan (1,268 người dùng, 48 sự kiện, 856,230,000đ, 99.9%), Biểu đồ tròn phân bổ vai trò người dùng và danh sách Hoạt động hệ thống real-time.
- [x] **Task 46: Cấu Hình Trang Chủ Công Khai (Public Landing Page `/`) & Tích Hợp Nút Thao Tác Sự Kiện**

  - **1. Route Mặc Định & Navigation Bar Công Khai:**
    - Cấu hình route `/` thành Public Landing Page độc lập (không bắt buộc đăng nhập để xem).
    - **Header Sticky:** Logo **EventAI**, các menu (*Trang chủ, Sự kiện, Tính năng, Giải pháp, Bảng giá, Tin tức, Liên hệ*), thanh tìm kiếm nhanh tương tác thời gian thực, cùng 2 nút hành động `[Đăng nhập]` và `[Đăng ký]` kèm hỗ trợ tham số query `redirect`.

  - **2. Hero Section & Khối Chỉ Số (Stats Counter Bar):**
    - **Hero Banner:** Tiêu đề lớn *"Tạo nên những sự kiện đáng nhớ với EventAI"*, đoạn mô tả ngắn, kèm 2 nút CTA `[Khám phá sự kiện ->]` (scroll tự động xuống danh sách sự kiện) và `[Tìm hiểu thêm]` (scroll xuống phần tính năng).
    - **Thẻ Floating Badges:** Hiển thị thẻ *"AI hỗ trợ tổ chức"* và *"Sự kiện chuyên nghiệp"* phía trên banner bên phải.
    - **Stats Bar:** 4 thẻ chỉ số nổi bật: *500+ Sự kiện đã tổ chức*, *50.000+ Người tham dự*, *200+ Doanh nghiệp tin tưởng*, *99.9% Độ ổn định*.

  - **3. Khối Giới Thiệu & Mô Phỏng Giao Diện (Device Mockups):**
    - **Section "Vì sao chọn EventAI?":** Danh sách ưu điểm bên trái + Mockup thiết bị (Laptop & Smartphone hiển thị ứng dụng) bên phải kèm các thẻ tính năng floating (*Tối ưu trải nghiệm, Báo cáo real-time*).

  - **4. Grid Sự Kiện Nổi Bật & Xử Lý Nút Đăng Ký (Featured Events):**
    - **Section "Sự kiện nổi bật":** Render Grid 4 cột các thẻ sự kiện thực tế lấy từ Database (hoặc Mock Data chuẩn mẫu) gồm: Ảnh thumbnail, Ngày tháng, Tiêu đề, Mô tả ngắn, Địa điểm.
    - **Nút `[Đăng ký ngay ->]` trên từng thẻ:** 
      - Nếu người dùng đã đăng nhập: Mở Modal xác nhận đăng ký sự kiện ngay lập tức, chọn vé Tiêu chuẩn/VIP, hiển thị mã vé và QR Code tham dự.
      - Nếu chưa đăng nhập: Tự động điều hướng sang trang Đăng nhập / Đăng ký kèm tham số `redirect`.

  - **5. Khối Kêu Gọi Hành Động, Đánh Giá & Footer:**
    - **Banner "Tổ chức sự kiện chuyên nghiệp":** Nút `[Đăng ký ngay]` và `[Liên hệ tư vấn]` (Modal gửi thông tin tư vấn nhanh).
    - **Khách hàng nói về chúng tôi:** 3 card đánh giá (5 sao) cá nhân hóa.
    - **Footer:** Đầy đủ thông tin liên hệ, hotline 1900 1234, email, liên kết nhanh và bản quyền hệ thống.
- [x] **Task 47: Bỏ Bắt Buộc Đăng Nhập Mặc Định - Hiển Thị Public Landing Page Tại Route Root (`/`)**

  - **1. Cấu Hình Lại React Router (`App.jsx` / `routes.jsx`):**
    - Gỡ bỏ `AuthGuard` / `ProtectedRoute` đang bao bọc đường dẫn root `/`.
    - Gán component **Public Landing Page** làm element mặc định cho path `/`.
    - Chuyển màn hình Đăng nhập về đúng path độc lập `/login`.

  - **2. Xử Lý Tự Động Điều Hướng (Navigation & Auth Flow):**
    - Kiểm tra và hủy bỏ tất cả logic `navigate('/login')` tự động kích hoạt khi mở trang chính.
    - Nếu người dùng chưa đăng nhập: Mở `localhost:3000` sẽ thấy ngay Landing Page sự kiện. Khi bấm `[Đăng nhập]` trên Header mới chuyển hướng đến `/login`.
    - Nếu người dùng đã đăng nhập: Mở `localhost:3000` vẫn thấy Landing Page, trên Header hiển thị nút `[Vào Dashboard ->]`.

  - **3. Kiểm Thử Tab Ẩn Danh (Incognito Check):**
    - Mở tab ẩn danh truy cập `localhost:3000` để đảm bảo hệ thống không bắt đăng nhập và tải thẳng giao diện Trang chủ công khai.
- [x] **Task 48: Xóa "Trang Chủ Portal" Khỏi Sidebar & Thiết Lập Public Landing Page Làm Route Root (`/`)**

  - **1. Xóa Nút "Trang Chủ Portal" Trong Sidebar:**
    - Mở component Sidebar (`frontend/src/components/Sidebar.tsx`).
    - Đã xóa hoàn toàn phần tử "Trang Chủ Portal" và icon `Globe` khỏi mảng menu.
    - Giữ lại đầy đủ các mục: Dashboard Báo Cáo, Danh Mục Sự Kiện, Cổng Diễn Giả, Soát Vé QR, AI Concierge, AI PR Studio, Kho Tri Thức RAG, AI Feedback & Summary, Quản Trị Tài Khoản, Nhật Ký Bảo Mật.

  - **2. Đưa Public Landing Page Thành Trang Mặc Định (`/`):**
    - File cấu hình đường dẫn `App.tsx`: Route `/` và `/landing` render trực tiếp component Public Landing Page độc lập cấp cao nhất.
    - Tuyệt đối không dùng `AuthGuard` / `ProtectedRoute` trên root `/`. Không tự động chuyển hướng khi mở `localhost:3000`.

  - **3. Tách Độc Lập Route Auth & Dashboard:**
    - Giao diện Đăng nhập / Đăng ký đặt tại route riêng `/login`.
    - Giao diện Báo cáo / Quản trị đặt tại route `/dashboard`.
    - Trên Header của Public Landing Page, khi bấm nút `[Đăng nhập]` mới điều hướng sang `/login`. Khi đã đăng nhập, hiển thị nút `[Vào Dashboard ->]`.
- [x] **Task 52: Hiển Thị Landing Page Công Khai Làm Trang Mặc Định Ngay Khi Mở Website & Chuẩn Hóa Routing/Sidebar**

  - **1. Hiển Thị Trang Chủ Công Khai Ngay Khi Truy Cập Link (`/`):**
    - Đặt component **Public Landing Page** làm route mặc định tại `/`. Ngay khi người dùng mở URL website (`localhost:3000`), màn hình **Trang Chủ Công Khai** được tải và hiển thị ĐẦU TIÊN.
    - Hủy bỏ hoàn toàn các logic `AuthGuard`, `ProtectedRoute` hoặc tự động `navigate('/login')` / `navigate('/dashboard')` ép người dùng phải đăng nhập khi vừa truy cập trang web.

  - **2. Thiết Kế Giao Diện Trang Chủ Chuẩn 100% Theo Visual Mockup:**
    - **Header Sticky:** Logo **EventAI**, menu điều hướng (*Trang chủ, Sự kiện, Tính năng, Giải pháp, Bảng giá, Tin tức, Liên hệ*), thanh tìm kiếm và 2 nút `[Đăng nhập]`, `[Đăng ký]`.
    - **Hero Section:** Tiêu đề *"Tạo nên những sự kiện đáng nhớ với EventAI"*, mô tả ngắn, nút `[Khám phá sự kiện ->]`, `[Tìm hiểu thêm]` và các thẻ floating badge ("AI hỗ trợ tổ chức", "Sự kiện chuyên nghiệp").
    - **Thẻ Chỉ Số (Stats Counter Bar):** 4 thẻ nổi bật: *500+ Sự kiện*, *50,000+ Người tham dự*, *200+ Doanh nghiệp*, *99.9% Độ ổn định*.
    - **Section "Vì sao chọn EventAI?":** Danh sách ưu điểm + Mockup thiết bị (Laptop & Smartphone) hiển thị ứng dụng.
    - **Grid "Sự kiện nổi bật":** Render 4 cột thẻ sự kiện với ảnh thumbnail, thông tin chi tiết và nút `[Đăng ký ngay ->]`.
    - **Footer & Đánh Giá:** Khách hàng đánh giá 5 sao + Footer thông tin đầy đủ.

  - **3. Loại Bỏ "Trang Chủ Portal" Khỏi Sidebar Bên Trong:**
    - Đã xóa hoàn toàn mục menu **"Trang Chủ Portal"** khỏi Sidebar.
    - Giữ nguyên các mục: Dashboard Báo Cáo, Danh Mục Sự Kiện, Cổng Diễn Giả, Soát Vé QR, AI Concierge, AI PR Studio, Kho Tri Thức RAG, AI Feedback & Summary, Quản Trị Tài Khoản, Nhật Ký Bảo Mật.

  - **4. Điều Hướng & Phân Quyền (Auth & Dashboard Flow):**
    - Màn hình Đăng nhập nằm ở route độc lập `/login`, chỉ xuất hiện khi click nút `[Đăng nhập]` trên Header.
    - Màn hình Dashboard Báo Cáo nằm ở route độc lập `/dashboard`. Khi người dùng đã đăng nhập, trên Header trang chủ hiển thị nút `[Vào Dashboard ->]`.

  - **5. Hotfix Trạng Thái Nút Bấm & Xóa Sự Kiện Persistence:**
    - Trạng thái các nút (Đánh giá, Đăng ký, Check-in) trong danh mục sự kiện được tính toán độc lập theo `user_id` của tài khoản hiện tại thông qua API `/events` và `/events/{id}/schedule`.
    - Nút Xóa sự kiện gọi API `DELETE /api/v1/events/{id}` và thực thi `db.commit()` để xóa vĩnh viễn dữ liệu trong PostgreSQL.
- [x] **Task 54: Chuẩn Hóa Điều Hướng Sau Đăng Nhập Về Màn Hình Dashboard Quản Trị (`/dashboard`)**

  - **1. Luồng Chuyển Trang Chi Tiết:**
    - **Chưa đăng nhập (Khách vãng lai):** Mở `localhost:3000` -> Hiển thị **Trang Chủ Công Khai (Landing Page)** làm mặc định.
    - **Click [Đăng nhập]:** Điều hướng sang trang `/login`.
    - **Sau khi Đăng nhập thành công:** Tự động chuyển hướng ngay sang giao diện **Dashboard Quản Trị (`/dashboard`)** (màn hình hiển thị Quản lý hệ thống, các Stat Cards, Biểu đồ người dùng theo vai trò và Hoạt động hệ thống).

  - **2. Đảm Bảo Cấu Trúc Sidebar Trong Dashboard:**
    - Trong giao diện `/dashboard`, giữ nguyên Sidebar tối màu gồm các mục: Dashboard Báo Cáo, Danh Mục Sự Kiện, Cổng Diễn Giả, Soát Vé QR, AI Concierge, AI PR Studio, Kho Tri Thức RAG, AI Feedback & Summary, Quản Trị Tài Khoản, Nhật Ký Bảo Mật.
    - Tuyệt đối **không hiển thị** mục menu "Trang Chủ Portal" trong Sidebar này.

  - **3. Cập Nhật State/Context (Auth Context):**
    - Đảm bảo hàm `handleRedirectAfterAuth` / `handleLoginSuccess` gọi `navigate('/dashboard')` để đưa người dùng tới thẳng trang Dashboard báo cáo ngay sau khi xác thực thành công.
- [x] **Task 55: Complete Interactive Navbar & Dynamic Auth Header Component**

  - **1. Điều Hướng & Cuộn Trang Mượt (Anchor Links & Smooth Scrolling):**
    - **Logo EventAI**: Click vào logo tự động cuộn mượt lên đầu trang (`#hero` / `top: 0`).
    - **Menu điều hướng (`Trang chủ`, `Sự kiện`, `Tính năng`, `Giải pháp`, `Bảng giá`, `Tin tức`, `Liên hệ`)**: Gắn ID chuẩn xác cho các khối (`#hero`, `#events`, `#features`, `#solutions`, `#pricing`, `#news`, `#footer`). Khi click menu item, tự động kích hoạt `scrollToSection(id)` với `element.scrollIntoView({ behavior: 'smooth' })`.
    - Tích hợp scroll listener tự động theo dõi vị trí màn hình và highlight gạch chân/màu xanh cho menu item tương ứng.

  - **2. Ô Tìm Kiếm Sự Kiện Real-time (`🔍 Tìm sự kiện, địa điểm...`):**
    - Kết nối input tìm kiếm với `searchQuery` state.
    - Khi người dùng gõ từ khóa, tự động lọc danh sách sự kiện trong khối "Sự kiện nổi bật" bên dưới theo tiêu đề, địa điểm, mô tả, danh mục.
    - Hiển thị số lượng sự kiện tìm thấy, nút xóa từ khóa `(X)`, và phím `Enter` tự động cuộn xuống khối sự kiện.

  - **3. Cấu Hình Trạng Thái User Đã Đăng Nhập (Dynamic Auth State):**
    - Kiểm tra `user` từ AuthContext / LocalStorage.
    - **Khi ĐÃ đăng nhập**: Hiển thị lời chào `Hi, [Tên_User]` (ví dụ: `Hi, Nguyễn Văn Quản Trị`) kèm nút bấm xanh `[Vào Dashboard ->]` (điều hướng sang `/dashboard`).
    - **Khi CHƯA đăng nhập**: Hiển thị 2 nút `[Đăng nhập]` (chuyển sang `/login`) và `[Đăng ký]` (chuyển sang `/login?mode=register` hoặc `/register`).

  - **4. Hiệu Ứng Sticky Header:**
    - Cấu hình Navbar luôn ghim ở mép trên màn hình khi cuộn trang (`sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs transition-all duration-200`).
    - Tích hợp Mobile Drawer Menu đầy đủ tính năng cho màn hình di động/tablet.
- [x] **Task 56: Fix Logic Countdown Độc Lập, Chặn Tạo Sự Kiện Quá Khứ & Chuẩn Hóa Bộ Lọc Ngày**

  - **1. Chặn Tạo/Sửa Sự Kiện Thời Gian Trong Quá Khứ (Form Validation):**
    - Trong Form/Modal Tạo và Chỉnh sửa sự kiện (`CreateEventModal`, `EventForm`, `EventSchedule`):
    - Thêm validation thời gian: Kiểm tra `start_time` và `start_date`. Nếu thời gian bắt đầu nhỏ hơn `Date.now()`, chặn gửi form và hiển thị thông báo lỗi: *"Thời gian bắt đầu sự kiện không được nằm trong quá khứ"*.
    - Đặt thuộc tính `min` cho input date/datetime bằng ngày hiện tại (`todayStr`) để ngăn người dùng chọn ngày đã qua.

  - **2. Đếm Ngược Thời Gian Độc Lập Cho Từng Sự Kiện (Dynamic Countdown):**
    - Đã cập nhật component `SessionCountdownProgress`, `EventCatalogCard`, đồng thời tạo `CountdownTimer` và `EventCard` độc lập.
    - Loại bỏ hoàn toàn target date dùng chung (`item.day_number === 2 ? ... : ...`).
    - Tính toán đếm ngược độc lập cho từng thẻ dựa theo `start_time` và `start_date` của từng sự kiện/phiên:
      + `distance = new Date(event.start_time).getTime() - new Date().getTime()`.
      + Nếu `distance > 0`: Tính toán và hiển thị chính xác **[NGÀY] [GIỜ] [PHÚT] [GIÂY]** thời gian thực còn lại đến khi sự kiện diễn ra.
      + Nếu `distance <= 0`: Thay cụm đếm ngược bằng nhãn badge *"Sự kiện đang diễn ra"* với hiệu ứng pulse.

  - **3. Chuẩn Hóa Thanh Bộ Lọc Ngày (Date Filter UI):**
    - Trong giao diện Danh Mục Sự Kiện: Xóa bỏ các tab cứng dạng "Ngày 1 - ...", "Ngày 2 - ...".
    - Thay bằng bộ lọc ngày thông minh:
      + Nút **"Tất cả các ngày"**: Hiển thị toàn bộ sự kiện (`Tất cả các ngày (schedules.length)`).
      + Các tab ngày thực tế được trích xuất động từ danh sách sự kiện hiện có (ví dụ: `15/10/2026`, `16/10/2026`, `24/10/2026`...).
      + Khi click vào ngày nào, hệ thống lọc và chỉ hiển thị đúng các sự kiện diễn ra trong ngày đó.
- [x] **Task 57: Tích Hợp Dropdown Chọn Sự Kiện Đã Tạo & Auto-fill Dữ Liệu Vào AI PR Studio**

  - **1. Gọi API Lấy Danh Sách Sự Kiện Đã Tạo:**
    - Trong `AIPRStudio.tsx`: Gọi `apiService.getEvents()` kết hợp fallback `EventContext` để lấy toàn bộ danh sách sự kiện hiện có từ Backend database.

  - **2. Bổ Sung Bộ Chọn Sự Kiện (Event Selector UI):**
    - Thêm ô Dropdown / Select hiện đại phía trên cùng của Form nhập liệu (trước ô "TÊN SỰ KIỆN").
    - Tùy chọn 1 (Mặc định): *"✍️ Nhập thủ công (Tạo quảng bá sự kiện mới)"*.
    - Các tùy chọn tiếp theo: Danh sách các sự kiện đã tạo trong database hiển thị dạng `📅 [Tên sự kiện] - [Ngày tổ chức]`.

  - **3. Lập Trình Logic Auto-Fill Dữ Liệu:**
    - Khi chọn một sự kiện cụ thể từ Dropdown:
      + **Tên sự kiện** -> Điền vào `eventName`.
      + **Danh mục sự kiện** -> Trích xuất và điền vào `eventCategory`.
      + **Thời gian tổ chức** -> Định dạng thông minh và điền vào `eventTime` (ví dụ: `15/10 - 16/10/2026 • 08:30 - 17:30`).
      + **Hội trường / Địa điểm** -> Điền địa chỉ chi tiết vào `eventLocation`.
      + **Chủ đề / Thông điệp chính** -> Tự động trích xuất từ `description` sự kiện vào `mainTopic`.
      + **Từ khóa chính (Keywords)** -> Tự động trích xuất các tag công nghệ và danh mục vào `keywords`.
    - Khi chuyển lại chọn *"✍️ Nhập thủ công"*: Tự động xóa trống toàn bộ các ô input để người dùng nhập mới từ đầu.

  - **4. Linh Hoạt Chỉnh Sửa & Sinh Nội Dung AI:**
    - Toàn bộ dữ liệu sau khi auto-fill vẫn hoàn toàn tương tác và cho phép chỉnh sửa tự do trước khi bấm nút sinh bài viết bằng AI Gemini.
- [x] **Task 58: Làm Sạch Tên Hiển Thị Sự Kiện & Chặn Trùng Lịch / Địa Điểm Sự Kiện**

  - **1. Làm Sạch Tên Hiển Thị Trong Dropdown Auto-fill (AI PR Studio):**
    - Đã cập nhật `frontend/src/pages/AIPRStudio.tsx` với hàm `cleanEventTitle` loại bỏ hoàn toàn các chuỗi mã hash/UUID ngẫu nhiên (ví dụ `db3f53`, `a4a703`, `9a5d2a`, v.v.).
    - Chuẩn hóa định dạng hiển thị cho mỗi option trong Dropdown: `${event.title} - ${formattedDate}` (Ví dụ: *"AI Summit Vietnam 2026 - 16/09/2026"*).
    - Tự động điền tên sạch vào trường Tên Sự Kiện và Chủ Đề khi người dùng chọn sự kiện từ dropdown.

  - **2. Logic Chặn Trùng Lịch & Địa Điểm Khi Tạo/Sửa Sự Kiện (Backend Validation):**
    - Mở API tạo/cập nhật sự kiện trong `backend/app/api/v1/events.py` và schemas `backend/app/schemas/event.py`.
    - Thêm hàm `to_comparable_utc` và `check_event_time_location_overlap` chuẩn hóa múi giờ và kiểm tra giao thoa thời gian trước khi commit sự kiện mới hoặc sửa sự kiện:
      + Điều kiện trùng: `(event.location == payload.location)` VÀ `(payload.start_time < existing_event.end_time)` VÀ `(payload.end_time > existing_event.start_time)` (đối với cập nhật, loại trừ chính sự kiện đang sửa).
      + Trả về HTTP Status `400 Bad Request` kèm thông báo chi tiết: *"Địa điểm '[Tên địa điểm]' đã có sự kiện '[Tên sự kiện trùng]' đăng ký trong khoảng thời gian này. Vui lòng chọn địa điểm hoặc thời gian khác."*

  - **3. Cập Nhật Thông Báo Lỗi Trên Form (Frontend Validation):**
    - Trong `frontend/src/services/api.ts`: Cập nhật `createEvent` và `updateEvent` không nuốt lỗi 400/422 mà ném lỗi trả về từ Backend API kèm nội dung `detail`.
    - Trong `frontend/src/components/CreateEventModal.tsx`: Thêm trạng thái `formError` và hiển thị Banner Alert cảnh báo lỗi nổi bật màu đỏ (`⚠️ Không thể lưu sự kiện (Trùng lịch / Lỗi dữ liệu)`) cùng Toast thông báo chi tiết khi bị từ chối tạo hoặc sửa sự kiện.
    - Đã kiểm thử tự động toàn diện với bộ test suite `backend/tests/test_task58_overlap.py` đạt 100% Passed.

- [x] **Task 59: Rà Soát & Chuẩn Hóa Logic Toàn Hệ Thống (Single Source of Truth & Data Integrity Audit)**

  - **1. Đồng Bộ Dữ Liệu AI Concierge & Kho Tri Thức RAG (pgvector):**
    - Chuẩn hóa hàm `sync_event_knowledge(db, event, action="UPSERT"|"DELETE")` trong `backend/app/services/rag_engine.py`.
    - Tự động kích hoạt Vector Embedding qua Gemini API và cập nhật dữ liệu vào bảng `knowledge_base` (pgvector) mỗi khi có thao tác tạo mới (`POST`), cập nhật (`PUT`) hoặc xóa (`DELETE /api/v1/events/{id}`).
    - Đảm bảo AI Concierge khi truy vấn thông tin trả lời khách hàng luôn lấy dữ liệu sự kiện theo thời gian thực (Real-time DB context), không sử dụng cache cũ hay thông tin đã bị chỉnh sửa.

  - **2. Thắt Chặt Logic Soát Vé QR Code & Check-in Tại Cổng:**
    - Cấu trúc dữ liệu mã QR thành đối tượng JSON chuẩn hóa: `{"ticket_id": "...", "event_id": "...", "user_id": "..."}`.
    - Tại màn hình Quét vé QR (`QRScanner.tsx` & `CheckInScanner.tsx`), bổ sung bộ chọn sự kiện cổng quét và truyền `event_id` xuống Backend API.
    - Backend API `POST /api/v1/registrations/check-in` đối soát chéo `event_id`. Nếu vé không thuộc sự kiện cổng quét hiện tại, từ chối với trạng thái `INVALID_EVENT` cùng thông báo: `"Vé không hợp lệ cho sự kiện này"`.
    - Nếu vé hợp lệ nhưng đã quét trước đó, trả về trạng thái `ALREADY_USED` kèm mốc thời gian chính xác: `"Vé đã được quét vào lúc [HH:mm:ss DD/MM/YYYY]"`.
    - Khi check-in thành công, tự động ghi nhận vào `AILog` phục vụ audit log và đối soát.

  - **3. Ràng Buộc Khung Giờ Speaker Studio & Timeline Sự Kiện:**
    - Trong `backend/app/api/v1/events.py`, bổ sung hàm kiểm tra `check_session_within_event_bounds(event, date_label, start_time, end_time)`.
    - Khi tạo mới hoặc chỉnh sửa phiên diễn giả (`POST`, `PUT /api/v1/events/{id}/schedule`), hệ thống kiểm tra và từ chối (HTTP 400) nếu khung giờ của phiên diễn giả nằm ngoài thời gian bắt đầu và kết thúc của sự kiện chính.
    - Đồng bộ thời gian và thông tin phiên ngay lập tức lên thẻ sự kiện mà không cần tải lại trang.

  - **4. Động Hóa Toàn Diện Dữ Liệu Dashboard (Loại Bỏ Mock Data):**
    - Tạo mới Endpoint `GET /api/v1/ai/dashboard-stats` tổng hợp trực tiếp từ PostgreSQL: tổng số tài khoản (`COUNT(users)`), sự kiện đang diễn ra (`COUNT(events)`), khách check-in thực tế (`COUNT(registrations)`), doanh thu thực tế (`SUM(price)`), cơ cấu vai trò người dùng và nhật ký hoạt động gần đây.
    - Cập nhật `frontend/src/pages/Dashboard.tsx` kết nối trực tiếp với API, loại bỏ toàn bộ các số liệu fix cứng (`1,268`, `48`, `856,230,000đ`, v.v.).

  - **5. Bổ Sung Ngữ Cảnh Vòng Đời Sự Kiện Vào AI PR Studio (Lifecycle Context):**
    - Trong `backend/app/api/v1/pr_studio.py` và `frontend/src/pages/AIPRStudio.tsx`, bổ sung trường `lifecycle` (`UPCOMING` vs `CONCLUDED`).
    - Khi người dùng chọn sự kiện từ dropdown:
      + Nếu `start_time > now` (hoặc `status != COMPLETED`): Tự động kích hoạt chế độ *"🚀 Mời đăng ký / Quảng bá truyền thông"* (Email thư mời, Social hook lan tỏa, SMS nhắc lịch & vé QR).
      + Nếu `end_time < now` (hoặc `status == COMPLETED`): Tự động kích hoạt chế độ *"🏁 Tổng kết / Cảm ơn khách tham dự & Tri ân Diễn giả"* (Email tri ân & mời tải slide/khảo sát ý kiến, Social bài recap thành công, SMS tri ân).
    - Cung cấp badge hiển thị trực quan và bộ nút chuyển đổi linh hoạt chế độ vòng đời ngay dưới bộ chọn sự kiện.

  - **6. Rà Soát Ràng Buộc Khóa Ngoại & Xóa Phân Cấp (Cascade Delete Audit):**
    - Bổ sung quy trình xóa phân cấp triệt để trong `DELETE /api/v1/events/{id}`: Tự động dọn dẹp toàn bộ dữ liệu phụ thuộc gồm các phiên trình bày (`event_schedules`), câu hỏi & tài liệu phiên (`session_questions`, `session_resources`, `session_materials`, `session_feedbacks`), vé & đăng ký (`registrations`), đánh giá (`feedbacks`), nhắc nhở (`user_reminders`), hỏi đáp (`event_inquiries`, `inquiry_replies`), và tri thức vector trong PostgreSQL `knowledge_base` qua `sync_event_knowledge(action="DELETE")`.
    - Đảm bảo an toàn cơ sở dữ liệu, loại bỏ hoàn toàn các bản ghi mồ côi (Orphaned records).
    - Bộ test kiểm thử tự động toàn diện `backend/tests/test_task59_audit.py` đạt 100% Passed.

- [x] **Task 60: Hotfix Lỗi Màn Hình Đen `/dashboard` (React Crash & Safe Data Guard)**

  - **1. Xử Lý Triệt Để Nguyên Nhân Gốc Gây Crash (Root Cause Fix):**
    - Phát hiện nguyên nhân chính gây lỗi `TypeError: .map is not a function`: Trong `backend/app/api/v1/ai_analytics.py`, trường `user_roles` được trả về dưới dạng Dictionary (`{'ADMIN': 1, ...}`) thay vì Array.
    - Cập nhật Backend API `GET /api/v1/ai/dashboard-stats` trả về `user_roles` chuẩn hóa dạng danh sách các đối tượng vai trò (`[{name, pct, color, count}]`) kèm tỷ lệ phần trăm chính xác theo cơ sở người dùng thực tế. Bổ sung `user_roles_map` để lưu giữ cấu trúc map tra cứu khi cần.

  - **2. Bổ Sung Null-Check & Array Guard Toàn Diện (Frontend):**
    - Trong `frontend/src/pages/Dashboard.tsx`: Khởi tạo các mảng bảo vệ an toàn `userRolesList`, `recentActivitiesList`, `revenueByTierList` với logic kiểm tra `Array.isArray()`, xử lý linh hoạt cả trường hợp đối tượng (Object.entries) và cung cấp fallback data mặc định.
    - Trong `frontend/src/components/Sidebar.tsx`: Thêm Optional Chaining (`?.`) và giá trị mặc định cho toàn bộ các thuộc tính của `activeEvent` (`activeEvent?.start_date`, `activeEvent?.end_date`, `activeEvent?.title`).

  - **3. Tích Hợp React Error Boundary & Trạng Thái Tải Dữ Liệu (Loading State):**
    - Xây dựng component `DashboardErrorBoundary` bọc toàn bộ trang `Dashboard`: Nếu có bất kỳ lỗi dựng giao diện nào xảy ra ở các component con, hệ thống hiển thị màn hình thông báo thân thiện kèm nút *"🔄 Tải lại trang"* và *"Thử lại"* thay vì bị văng màn hình đen.
    - Bổ sung thanh loading skeleton mượt mà ở đầu trang Dashboard trong lúc chờ API phản hồi.

- [x] **Task 61: Lập Trình Phân Quyền Động (Dynamic RBAC) Theo 4 Role Mockup Trên Dashboard**

  - **1. Cấu Hình Bộ Lọc Sidebar Động (Dynamic Sidebar Filtering):**
    - Kết nối State toàn cục `selectedRole` từ `AuthContext.tsx` với menu Sidebar:
      + **Role 1 (Người tham dự - Attendee):**
        * Chỉ hiển thị: Vé QR của tôi (`dashboard`), Sự kiện đã đăng ký (`schedule`), AI Concierge (HITL) (`inquiries`), AI Feedback & Summary (`feedback`).
        * Ẩn hoàn toàn: Dashboard Báo Cáo hệ thống, Cổng Diễn Giả, AI PR Studio, Kho Tri Thức RAG, Quản Trị Tài Khoản, Nhật Ký Bảo Mật.
      + **Role 2 (Nhân viên sự kiện - Staff):**
        * Chỉ hiển thị: Soát Vé QR Code (`scanner`), Danh Sách Check-in (`dashboard`), AI Concierge (`inquiries`).
        * Ẩn các tính năng tạo/xóa sự kiện, báo cáo doanh thu và quản trị hệ thống.
      + **Role 3 (Quản lý sự kiện - Event Manager):**
        * Hiển thị: Dashboard Báo Cáo Sự Kiện, Danh Mục Sự Kiện (Toàn quyền Thêm/Sửa), Cổng Diễn Giả, Soát Vé QR, AI PR Studio, Kho Tri Thức RAG, AI Feedback.
        * Ẩn các menu cấp hệ thống: Quản Trị Tài Khoản, Nhật Ký Bảo Mật.
      + **Role 4 (Quản trị viên - Admin):**
        * Hiển thị đầy đủ 100% tất cả 10 mục menu trong Sidebar.

  - **2. Tùy Biến Giao Diện Nội Dung Dashboard Theo Vai Trò (Dynamic Dashboard Content):**
    - Khi chuyển đổi qua lại giữa 4 nút Role Mockup:
      + **Người tham dự:** Hiển thị 3 thẻ chỉ số cá nhân (Số vé đã mua: 3 vé điện tử, Sự kiện sắp tham gia: 2 sự kiện, Lịch trình hôm nay: 1 phiên họp lúc 09:00), danh sách sự kiện sắp diễn ra & đã đăng ký và Popup xem mã QR vé điện tử. Ẩn toàn bộ báo cáo doanh thu/người dùng toàn hệ thống.
      + **Nhân viên sự kiện:** Màn hình tập trung vào tiến độ Check-in thời gian thực (Số người đã check-in: 1,892 / 2,458 khách kèm thanh tiến độ 77%, Tốc độ soát vé trung bình 0.28s / vé, 3/3 Cổng Scanner trực tuyến, Hàng đợi AI Concierge). Loại bỏ nút tạo sự kiện trong Thao tác nhanh.
      + **Quản lý sự kiện:** Báo cáo hiệu suất sự kiện (Tổng sự kiện, Tổng khách, Doanh thu, Tỷ lệ hài lòng), Biểu đồ so sánh đăng ký vs thực tế, Sự kiện sắp tới + Công cụ AI PR Studio & AI Feedback.
      + **Quản trị viên:** Giữ nguyên toàn bộ Biểu đồ tổng quan hệ thống (Tổng người dùng, Doanh thu, Tỷ lệ hoạt động 99.9%, Nhật ký hệ thống, Cài đặt bảo mật RBAC).

  - **3. Chặn Thao Tác Nút Bấm Từng Component (Permission Guard):**
    - Kiểm tra điều kiện `selectedRole` trên các nút bấm thao tác:
      + Nút `[Tạo sự kiện]`, `[Chỉnh sửa]`, `[Xóa sự kiện]`: Đã cấu hình Permission Guard tại `EventSchedule.tsx` và `Dashboard.tsx` chỉ cho phép hiển thị và thao tác khi Role là **Quản lý sự kiện** (`ORGANIZER`) hoặc **Quản trị viên** (`ADMIN`). Ẩn hoàn toàn đối với **Người tham dự** và **Nhân viên sự kiện**.
      + Nút `[Duyệt bài AI]`, `[Đồng bộ RAG]`: Tại `AIPRStudio.tsx`, nút `[✓ Duyệt Bài AI & Phát Hành]` ẩn đối với Người tham dự và Nhân viên sự kiện. Tại `KnowledgeBase.tsx`, nút `[⚡ Đồng bộ RAG (pgvector)]`, nút `[+ Tải tài liệu]` và các thao tác Re-index/Xóa được ẩn hoàn toàn đối với Người tham dự và Nhân viên sự kiện.

  - **4. Kiểm Thử & Xác Nhận:**
    - Lệnh biên dịch Frontend `npm run build` (`tsc && vite build`) hoàn thành thành công 100% với 0 lỗi.

- [x] **Task 62: Remove "Role Mockup Switcher" Banner from Dashboard UI**

  - **1. Xóa Bỏ Thanh Chế Độ Xem Trong JSX:**
    - Mở file `Dashboard.tsx` (`frontend/src/pages/Dashboard.tsx`).
    - Tìm và xóa bỏ hoàn toàn khối JSX thanh switcher *"Chế độ xem Dashboard (4 Role Mockup)"* cùng 4 nút bấm chọn vai trò (`1. Người tham dự`, `2. Nhân viên sự kiện`, `3. Quản lý sự kiện`, `4. Quản trị viên (Admin)`).
    - Xóa bỏ import biểu tượng `Eye` không còn sử dụng.

  - **2. Dọn Dẹp Code & State Dư Thừa:**
    - Loại bỏ state/mockup switcher khỏi component `Dashboard.tsx`, chuyển sang tự động xác định vai trò (`activeRoleView`) thông qua `userRole` của tài khoản đăng nhập thực tế.
    - Cập nhật `Sidebar.tsx` để hiển thị menu phân quyền dựa trên `userRole` trực tiếp, gỡ bỏ tag mockup badge ở footer Sidebar.
    - Bố cục Dashboard tự động căn chỉnh lại khoảng cách padding/margin gọn gàng, hiển thị trực tiếp giao diện báo cáo "Quản lý hệ thống" chính cho Quản trị viên (hoặc các màn hình báo cáo tương ứng theo vai trò thực).


- [x] **Task 63 (Đã sửa đổi): Điều Chỉnh Phân Quyền Staff/Attendee & Chuẩn Hóa Đa Ngôn Ngữ (EN/VI)**

  - **1. Điều Chỉnh Chính Xác Phân Quyền RBAC:**
    - **Staff (Nhân viên sự kiện):** Cấu hình quyền và hiển thị menu Sidebar **BẰNG HOÀN TOÀN** với quyền của Manager (Quản lý sự kiện). Staff có đầy đủ 8 module: Dashboard Báo Cáo, Danh Mục Sự Kiện (Thêm/Sửa/Xóa), Cổng Diễn Giả, Soát Vé QR Code, AI PR Studio (Duyệt bài AI), Kho Tri Thức RAG (Đồng bộ pgvector), AI Concierge (HITL), AI Feedback. Backend API (`speaker.py`, `events.py`, `registrations.py`, `knowledge.py`, `checkin.py`) đã mở quyền hoàn toàn cho `STAFF`.
    - **Người tham dự (Attendee):** **ẨN HOÀN TOÀN** 2 mục `AI Concierge (HITL)` và `AI Feedback & Summary` khỏi Sidebar. Sidebar chỉ hiển thị duy nhất 2 mục: `Vé QR của tôi` và `Sự kiện đã đăng ký`.
    - **Manager (Quản lý sự kiện):** Giữ nguyên toàn quyền điều hành sự kiện và toàn bộ mô-đun AI.
    - **Admin (Quản trị viên):** Giữ nguyên toàn quyền 100% hệ thống (gồm cả Quản Trị Tài Khoản & Nhật Ký Bảo Mật).

  - **2. Đồng Bộ Chức Năng Đa Ngôn Ngữ (i18n Translation EN/VI):**
    - Kết nối nút toggle ngôn ngữ `[VN | EN]` trên Header, Login và Landing Page Navbar với thư viện `react-i18next`.
    - Bổ sung bộ từ điển dịch thuật song ngữ hoàn chỉnh trong `frontend/src/locales/vi.json` và `frontend/src/locales/en.json` cho toàn bộ các module: Navigation, Dashboard, Events, Statuses, User Management, v.v.
    - **100% Văn bản giao diện (Static UI):** Menu Sidebar, Navbar, Tiêu đề trang, Nút bấm, Thẻ báo cáo Dashboard, Form Modal lập tức chuyển đổi mượt mà khi bấm chuyển `VI` / `EN`.
    - **Trạng thái & Nhãn dữ liệu (Dynamic Labels):** Trạng thái hoạt động (*Live / Trực tiếp*, *Upcoming / Sắp diễn ra*, *Ended / Đã kết thúc*, *Approved / Đã duyệt*, *Valid / Hợp lệ*, *Used / Đã sử dụng*...) hiển thị chuẩn xác theo ngôn ngữ đang chọn.

  - **3. Kiểm Thử & Xác Nhận:**
    - Biên dịch Frontend: `npm run build` (`tsc && vite build`) hoàn thành thành công 100% với 0 lỗi cú pháp hoặc TypeScript.
    - Kiểm thử Backend: `pytest` vượt qua 100% các bài kiểm thử xác thực và kiểm soát dữ liệu.

- [x] **Task 64: Ẩn Chức Năng AI PR Studio & Kho Tri Thức RAG Khỏi Sidebar Dành Cho Vai Trò Staff**

  - **1. Cập Nhật Điều Kiện Hiển Thị Sidebar (`Sidebar.tsx`):**
    - Cập nhật nhánh role `STAFF` trong `visibleMenuItems` của `Sidebar.tsx`:
      + **Ẩn hoàn toàn 2 mục:** `AI PR Studio` và `Kho Tri Thức RAG` khỏi thanh điều hướng Sidebar khi tài khoản đăng nhập là `STAFF`.
      + **Giữ nguyên 6 menu khả dụng cho Staff:** *Dashboard Báo Cáo*, *Danh Mục Sự Kiện*, *Cổng Diễn Giả*, *Soát Vé QR Code*, *AI Concierge (HITL)*, *AI Feedback & Summary*.

  - **2. Đồng Bộ Phân Quyền & Chống Lỗi 403:**
    - `EVENT_MANAGER` (Quản lý sự kiện) và `ADMIN` (Quản trị viên): Tiếp tục hiển thị đầy đủ và có toàn quyền thao tác trên `AI PR Studio` và `Kho Tri Thức RAG`.
    - `AIPRStudio.tsx` và `KnowledgeBase.tsx`: Điều chỉnh Permission Guard `canApproveAIPost` và `canSyncRAG` chỉ cấp quyền cho `ORGANIZER` và `ADMIN`.
    - Đảm bảo Staff chỉ truy cập những tính năng được ủy quyền, triệt tiêu hoàn toàn trường hợp bị báo lỗi 403 Access Denied.

  - **3. Kiểm Thử & Xác Nhận:**
    - Chạy kiểm tra biên dịch `npm run build` (`tsc && vite build`) hoàn thành thành công 100% với 0 lỗi cú pháp hay TypeScript.

- [x] **Task 65: Khởi Tạo Trang Cài Đặt - Nhóm 1: Hồ Sơ Cá Nhân & Bảo Mật (Account & Security)**

  - **1. Thiết Lập Route & Giao Diện Khung Trang Cài Đặt (Settings UI Framework):**
    - Tạo trang/component mới `Settings.tsx` tại đường dẫn `/settings` với bố cục phân vùng 3 Tabs: *Hồ Sơ Cá Nhân (Profile Info)* (mặc định), *Tùy Chọn & Giao Diện (Preferences)*, *Bảo Mật & Phiên Đăng Nhập (Security & Sessions)*.
    - Bổ sung mục "Cài Đặt" (Settings) vào danh sách Sidebar (`Sidebar.tsx`) cho tất cả 4 vai trò đăng nhập (`ATTENDEE`, `STAFF`, `ORGANIZER`, `ADMIN`).
    - Bổ sung nút "Cài Đặt Tài Khoản" vào Menu Avatar ở Header (`Header.tsx`) và danh sách tìm kiếm nhanh Command-K.
    - Cập nhật ánh xạ route và tab trong `MainLayout.tsx` và `App.tsx` với bộ bảo vệ `ProtectedRoute`.

  - **2. Chức Năng Cập Nhật Thông Tin Cá Nhân (Profile Info):**
    - Form nhập liệu tự động load thông tin tài khoản từ `AuthContext` và API `GET /api/v1/users/me`.
    - Các trường nhập liệu: Tên hiển thị (Display Name), Bộ chọn ảnh & xem trước Avatar (Upload file base64 / chọn ảnh mẫu có sẵn / xóa ảnh), Chức danh (Job Title), Số điện thoại (Phone Number có regex kiểm tra định dạng Việt Nam / Quốc tế), Email liên hệ (Badge đã xác thực).
    - Nút **[Lưu thay đổi]**: Gọi API `PUT /api/v1/users/me`, cập nhật state `user` toàn hệ thống và lưu `localStorage`, hiển thị Toast thông báo thành công.

  - **3. Cài Đặt Tùy Chỉnh Ngôn Ngữ & Giao Diện (Preferences):**
    - **Ngôn ngữ ưu tiên:** Lựa chọn `Tiếng Việt (VI)` hoặc `English (EN)` -> tự động đồng bộ ngay với hệ thống dịch thuật `react-i18next`.
    - **Chế độ giao diện:** Lựa chọn `Dark Mode` hoặc `Light Mode` -> tự động thêm/bỏ class `dark` trên `documentElement`.
    - Nút **[Lưu tùy chọn]**: Lưu lựa chọn vào `localStorage` và cập nhật trường `preferences` JSON trong DB người dùng.

  - **4. Bảo Mật Tài Khoản (Security, 2FA & Active Sessions):**
    - **Đổi mật khẩu (Change Password):** Form gồm Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới. Tích hợp thanh đo độ mạnh mật khẩu trực quan (Yếu / Trung bình / Mạnh), kiểm tra trùng khớp phía client và gửi request tới `POST /api/v1/auth/change-password`.
    - **Xác thực 2 yếu tố (2FA - Two-Factor Authentication):**
      + Switch Bật/Tắt 2FA. Khi bấm Bật, mở Modal hiển thị mã QR (tạo từ thư viện `qrcode` + `pyotp`), khóa bí mật thủ công và ô nhập mã 6 số xác nhận -> gọi `POST /api/v1/auth/2fa/verify`. Khi bấm Tắt, hiển thị xác nhận và gọi `POST /api/v1/auth/2fa/disable`.
    - **Quản lý thiết bị đăng nhập (Active Sessions):**
      + Hiển thị danh sách thiết bị/trình duyệt đang đăng nhập (Tên thiết bị, Địa chỉ IP, Vị trí, Thời gian hoạt động gần nhất, Cờ đánh dấu *"Thiết bị hiện tại"*).
      + Bổ sung nút **[Đăng xuất khỏi các thiết bị khác]** gọi API `POST /api/v1/auth/sessions/revoke-others` để hủy token session từ xa.

  - **5. Backend API & Schema Support:**
    - Bổ sung các cột `job_title`, `is_2fa_enabled`, `two_factor_secret`, `preferences` vào model `User` và tạo bảng `user_sessions` với tự động migration trong `init_db()`.
    - Tạo router mới `app/api/v1/users.py` (`GET /me`, `PUT /me`) và tích hợp vào `router.py`.
    - Thêm các endpoint bảo mật trong `app/api/v1/auth.py`: `/change-password`, `/2fa/generate`, `/2fa/verify`, `/2fa/disable`, `/sessions`, `/sessions/revoke-others`.
    - Thêm bài test toàn diện `tests/test_settings_and_security.py`, chạy `pytest` vượt qua 100% (15/15 tests pass).
    - Biên dịch `npm run build` thành công 100% không có lỗi TypeScript hay cú pháp.
