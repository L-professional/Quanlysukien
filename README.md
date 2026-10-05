# 🚀 EventHub AI - Nền Tảng Quản Lý Sự Kiện Thông Minh Tích Hợp AI

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-black?style=flat&logo=vercel)](https://quanlysukien.vercel.app)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/Frontend-React_18-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)

**EventHub AI** là nền tảng quản lý và điều phối sự kiện thông minh ứng dụng trí tuệ nhân tạo thế hệ mới (Google Gemini AI), hỗ trợ toàn diện vòng đời sự kiện từ khâu lập kế hoạch, truyền thông tiếp thị, check-in vé QR, tương tác diễn giả - khán giả, đến phân tích đánh giá sau sự kiện.

---

## ✨ Tính Năng Nổi Bật

### 1. 🤖 Trí Tuệ Nhân Tạo & RAG Engine
- **AI Concierge (HITL):** Trợ lý ảo trả lời tức thì câu hỏi của người tham dự dựa trên kho tri thức sự kiện (Retrieval-Augmented Generation) kết hợp điều phối viên hỗ trợ (Human-in-the-loop).
- **AI PR Studio:** Tự động tạo bài viết truyền thông đa kênh (Facebook, LinkedIn, Email Newsletter, Thông cáo báo chí) chỉ với một cú nhấp.
- **AI Feedback & Sentiment Analysis:** Phân tích cảm xúc, mức độ hài lòng (CSAT, NPS) và trích xuất gợi ý cải tiến tự động từ phản hồi của khán giả.

### 2. 🔐 Bảo Mật Đa Tầng & Phân Quyền (RBAC)
- **4 Vai trò người dùng (Dynamic RBAC):** 
  - `ATTENDEE` (Khách tham dự)
  - `STAFF` (Nhân viên điều phối)
  - `EVENT_MANAGER` (Quản lý sự kiện)
  - `ADMIN` (Quản trị viên hệ thống)
- **Bảo mật 2 lớp (2FA TOTP):** Tích hợp Google Authenticator / Authy quét mã QR động.
- **Quản lý phiên đăng nhập (Active Sessions):** Theo dõi thiết bị, địa điểm, IP và thu hồi quyền đăng nhập từ xa.

### 3. 🎫 Quản Lý Vé & Check-in QR Siêu Tốc
- Mã vé QR mã hóa chống làm giả, cập nhật trạng thái thời gian thực.
- Camera Scanner tích hợp trực tiếp trên trình duyệt, quét mã nhanh dưới 0.5s.

### 4. 🎙️ Cổng Diễn Giả (Speaker Stage Studio)
- Chế độ Studio Dark Mode chuyên dụng cho sân khấu.
- Quản lý timeline bài thuyết trình, tài liệu trình chiếu và câu hỏi Q&A trực tiếp từ khán giả.

---

## 🛠️ Công Nghệ Sử Dụng

| Thành Phần | Công Nghệ / Thư Viện |
| :--- | :--- |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy (Async), Pydantic v2, Uvicorn |
| **Database** | PostgreSQL 15 (pgvector), Redis (Cache & Session) |
| **AI Model** | Google Gemini 2.5 Flash, Text-Embedding-004 |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Internationalization** | i18next (Tiếng Việt & English) |
| **Deployment** | Vercel (Frontend), Docker Compose |

---

## 📁 Cấu Trúc Dự Án

```
├── backend/                   # FastAPI Backend Server
│   ├── app/
│   │   ├── api/v1/            # REST API Endpoints (Auth, Events, AI, Users, Logs...)
│   │   ├── core/              # Config, Security, Database connectors
│   │   ├── models/            # SQLAlchemy Database Models
│   │   ├── schemas/           # Pydantic Schemas
│   │   └── services/          # Gemini AI, RAG Engine, Email Service
│   └── tests/                 # Pytest Unit & Integration Tests
├── frontend/                  # React + Vite Frontend Client
│   ├── src/
│   │   ├── components/        # Reusable UI Components & Modals
│   │   ├── context/           # React Context (AuthContext, EventContext)
│   │   ├── locales/           # i18n Translations (VI, EN)
│   │   ├── pages/             # Pages (Dashboard, Settings, Events, Studio...)
│   │   └── services/          # Axios API Client
│   ├── .env.example           # Frontend Environment Template
│   └── vercel.json            # Vercel Deployment Configuration
├── .env.example               # Root Backend Environment Template
└── docker-compose.yml         # Container Orchestration (Postgres + Redis)
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu Cầu Tiên Quyết
- [Node.js](https://nodejs.org/) (v18 trở lên)
- [Python](https://www.python.org/) (v3.11 trở lên)
- [PostgreSQL](https://www.postgresql.org/) (có hỗ trợ extension `pgvector`)
- [Redis](https://redis.io/)

### 2. Thiết Lập Backend

```bash
cd backend
# Tạo và kích hoạt môi trường ảo
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Cài đặt thư viện
pip install -r requirements.txt

# Cấu hình file môi trường
cp ../.env.example ../.env
# Điền thông tin kết nối Database và GEMINI_API_KEY vào file .env

# Khởi chạy server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation có sẵn tại: `http://localhost:8000/docs`

### 3. Thiết Lập Frontend

```bash
cd frontend
# Cài đặt package
npm install

# Cấu hình biến môi trường
cp .env.example .env

# Chạy server phát triển
npm run dev
```
Ứng dụng sẽ khả dụng tại: `http://localhost:5173`

---

## 🛡️ Bản Quyền & Giấy Phép
Dự án được phát triển và duy trì bởi đội ngũ EventHub AI.
Mọi đóng góp và báo lỗi xin vui lòng mở Issue hoặc Pull Request trên Repository.
