import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.models.event import Event, EventSchedule
from app.models.registration import Registration
from app.models.feedback import Feedback
from app.models.session_interaction import SessionQuestion, SessionFeedback
from app.models.ai_log import AILog
from app.models.notification import Notification
from app.models.report import Report, ScheduledReport
from app.models.user import User

JOB_TITLES = [
    "AI Research Engineer", "Senior Software Engineer", "Chief Technology Officer (CTO)",
    "Solution Architect", "Data Scientist", "Product Manager", "DevOps Specialist",
    "Security Analyst", "Marketing Director", "Founder & CEO", "Sinh viên CNTT",
    "Head of Digital Transformation", "Fullstack Developer", "AI Consultant"
]

COMPANIES = [
    "FPT Software", "Viettel Group", "VNG Corporation", "VinAI", "Techcombank",
    "VNPT Technology", "Shopee Vietnam", "MoMo", "MISA", "Zalo AI Lab",
    "BKAV Corporation", "One Mount Group", "Đại học Bách Khoa", "FPT Telecom"
]

TICKET_TYPES = [
    ("Standard Pass", 500000, 0.50),
    ("VIP Access Pass", 1500000, 0.20),
    ("Early Bird Pass", 350000, 0.20),
    ("Student Pass", 150000, 0.10)
]

SPEAKERS = [
    ("TS. Lê Hoài Nam", "Giám đốc Viện Nghiên cứu Trí tuệ Nhân tạo"),
    ("PGS.TS Trần Minh Tuấn", "Chuyên gia Cấp cao An ninh Mạng & Bảo mật"),
    ("Bà Vũ Mai Phương", "Giám đốc Công nghệ FinTech & Open Banking"),
    ("Ông Nguyễn Thành Long", "Trưởng Ban Chuyển đổi số Doanh nghiệp"),
    ("TS. Hoàng Anh Khoa", "Kiến trúc sư Trưởng Điện toán Đám mây & DevOps"),
    ("Bà Đỗ Thu Hà", "Chuyên gia Thiết kế Trải nghiệm UI/UX Cấp cao"),
    ("Ông Phạm Quốc Huy", "Chuyên gia Bán dẫn & Vi mạch Bán dẫn"),
    ("TS. Nguyễn Bích Ngọc", "Viện trưởng Viện Đổi mới Sáng tạo & Web3")
]

FEEDBACK_COMMENTS_POS = [
    "Sự kiện tổ chức rất chuyên nghiệp, diễn giả trình bày cực kỳ sâu sắc và sát thực tế.",
    "Khâu check-in bằng mã QR cực nhanh chỉ mất chưa tới 2 giây, không hề bị ùn ứ tại cửa.",
    "Nội dung AI Agent và thực hành LangGraph rất giá trị, áp dụng được ngay vào dự án doanh nghiệp.",
    "Hệ thống Chatbot AI Concierge hỗ trợ giải đáp câu hỏi và chỉ đường rất thông minh!",
    "Diễn giả nhiệt huyết, phần Q&A tương tác sôi nổi với nhiều góc nhìn mới mẻ.",
    "Tài liệu hội thảo phong phú, đường truyền WiFi hội trường ổn định suốt cả ngày.",
    "Rất ấn tượng với phần demo công nghệ thực tế và không gian triển lãm công nghệ cao.",
    "Quy mô hoành tráng, networking được với nhiều đối tác tiềm năng trong ngành."
]

FEEDBACK_COMMENTS_NEU = [
    "Nội dung tốt nhưng thời gian thảo luận bàn tròn hơi ngắn, mong lần sau kéo dài thêm 30 phút.",
    "Hội trường hơi lạnh vào buổi sáng, buổi chiều thì nhiệt độ vừa phải hơn.",
    "Bãi đỗ xe buổi sáng hơi đông, may nhờ có bảo vệ hướng dẫn xuống tầng hầm B2 kịp giờ."
]

FEEDBACK_COMMENTS_NEG = [
    "Một số slide thuyết trình cỡ chữ hơi nhỏ khi ngồi ở các hàng ghế cuối cùng.",
    "Khu vực teabreak giờ giải lao hơi đông người chen lấn, cần bố trí thêm quầy tiếp nước."
]

QUESTIONS_DATA = [
    ("Làm sao để tối ưu chi phí Token khi triển khai mô hình RAG quy mô lớn cho doanh nghiệp?", True, "Nên áp dụng kỹ thuật Reranking, Semantic Cache trên Redis và chunking tài liệu theo cấu trúc ngữ nghĩa."),
    ("Mô hình AI Agent có đảm bảo an toàn dữ liệu và tuân thủ GDPR/Nghị định 13 không?", True, "EventHub AI sử dụng PII Masker tự động che giấu thông tin nhạy cảm trước khi truyền tới LLM."),
    ("Tỷ lệ quét QR vé tại cổng kiểm soát có hoạt động ổn định khi mất kết nối Internet không?", True, "Hệ thống hỗ trợ offline caching QR tokens với HMAC signature xác thực tại biên."),
    ("Lộ trình chuyển đổi số cho doanh nghiệp sản xuất nên bắt đầu từ phân hệ nào?", True, "Bắt đầu từ số hóa dữ liệu vận hành thời gian thực và tự động hóa quy trình quản lý kho vận."),
    ("Diễn giả có thể chia sẻ slide bài thuyết trình lên mục Tài liệu của EventHub không?", True, "Toàn bộ tài liệu PDF bài giảng đã được ban tổ chức upload lên tab Tài liệu của sự kiện."),
    ("Công nghệ Blockchain có giải quyết được bài toán vé chợ đen (Scalping) không?", True, "Mã QR động thay đổi theo chu kỳ TOTP 30 giây giúp triệt hạ hoàn toàn nạn chụp màn hình bán lại vé."),
    ("Thời gian phản hồi trung bình của trợ lý AI Concierge hiện tại là bao nhiêu mili-giây?", True, "Hiện tại hệ thống đạt độ trễ trung bình 650ms nhờ kiến trúc streaming và pgvector index."),
    ("Sắp tới ban tổ chức có dự định mở thêm workshop thực hành Hands-on lab không?", False, None),
    ("Hạng vé VIP có bao gồm quyền tham gia tiệc Networking tối cùng các diễn giả không?", True, "Có, toàn bộ khách mời VIP được tặng thiệp mời dự tiệc Gala Dinner lúc 18h30."),
    ("Doanh nghiệp có thể tích hợp API của EventHub vào hệ thống ERP nội bộ được không?", True, "EventHub cung cấp đầy đủ Webhook và REST API theo chuẩn OpenAPI 3.0.")
]

async def seed_data():
    async with AsyncSessionLocal() as db:
        print("🌱 Seeding realistic PostgreSQL data for Reports...")
        
        # 1. Fetch Events & Users
        events = (await db.execute(select(Event))).scalars().all()
        users = (await db.execute(select(User))).scalars().all()
        
        if not events:
            print("❌ No events found. Please run seed.py first.")
            return

        user_ids = [u.id for u in users] if users else [1]
        
        # 2. Check if registrations already seeded
        reg_count = (await db.execute(text("SELECT count(*) FROM registrations;"))).scalar()
        if reg_count == 0:
            print(f"Creating realistic registrations for {len(events)} events...")
            now = datetime.now(timezone.utc)
            
            for ev in events:
                # Target registered count from event
                target_reg = ev.registered_count or 120
                # Generate sample of registrations
                sample_count = min(target_reg, 45) # Keep 35-45 rich records per event, sufficient for granular DB aggregation
                
                checkin_ratio = 0.85 if ev.status in ("COMPLETED", "ONGOING") else 0.40
                
                for i in range(sample_count):
                    # Ticket tier selection
                    r_rand = random.random()
                    if r_rand < 0.20:
                        tier_name, tier_price = "VIP Access Pass", 1500000
                    elif r_rand < 0.40:
                        tier_name, tier_price = "Early Bird Pass", 350000
                    elif r_rand < 0.50:
                        tier_name, tier_price = "Student Pass", 150000
                    else:
                        tier_name, tier_price = "Standard Pass", 500000

                    is_checked = (random.random() < checkin_ratio)
                    
                    # Peak hours simulation for check-in time
                    # 70% in 07:30 - 09:30, 20% in 13:00 - 14:00, 10% other
                    hour_pick = random.choices([7, 8, 9, 10, 13, 14, 15], weights=[15, 45, 25, 5, 5, 3, 2])[0]
                    minute_pick = random.randint(0, 59)
                    
                    event_date_base = ev.start_time if ev.start_time else now
                    checkin_time = datetime(
                        event_date_base.year, event_date_base.month, event_date_base.day,
                        hour_pick, minute_pick, random.randint(0, 59),
                        tzinfo=timezone.utc
                    ) if is_checked else None

                    created_time = event_date_base - timedelta(days=random.randint(1, 20), hours=random.randint(1, 12))
                    
                    uid = random.choice(user_ids)
                    first_names = ["Nguyễn Văn", "Trần Thị", "Lê Hoàng", "Phạm Quốc", "Đặng Minh", "Vũ Mai", "Bùi Thanh", "Đỗ Quang", "Hoàng Kim"]
                    last_names = ["An", "Bình", "Cường", "Dũng", "Em", "Hương", "Hải", "Khánh", "Long", "Minh", "Nam", "Phong", "Quân", "Tuấn"]
                    p_name = f"{random.choice(first_names)} {random.choice(last_names)}"
                    clean_email = f"attendee_{ev.id}_{i}_{uuid.uuid4().hex[:4]}@example.com"
                    
                    reg = Registration(
                        event_id=ev.id,
                        participant_id=uid,
                        full_name=p_name,
                        email=clean_email,
                        phone=f"09{random.randint(10000000, 99999999)}",
                        company=random.choice(COMPANIES),
                        organization=random.choice(COMPANIES),
                        job_title=random.choice(JOB_TITLES),
                        ticket_type=tier_name,
                        price=tier_price,
                        qr_code_token=f"QR-{ev.id}-{uuid.uuid4().hex[:8].upper()}",
                        is_checked_in=is_checked,
                        checked_in_at=checkin_time,
                        created_at=created_time
                    )
                    db.add(reg)
            
            await db.commit()
            print("✅ Created realistic registrations.")

        # 3. Seed Event Schedules & Speakers
        sched_count = (await db.execute(text("SELECT count(*) FROM event_schedules;"))).scalar()
        if sched_count == 0:
            print("Creating event schedules and speakers...")
            for ev in events:
                for idx, (sp_name, sp_role) in enumerate(SPEAKERS[:3]):
                    start_h = 8 + idx * 2
                    end_h = start_h + 1
                    s = EventSchedule(
                        event_id=ev.id,
                        title=f"Phiên {idx+1}: {ev.title} - Chuyên đề {idx+1}",
                        description=f"Phiên thảo luận chuyên sâu về các ứng dụng và thực tiễn trong ngành.",
                        speaker_name=sp_name,
                        speaker_role=sp_role,
                        start_time=f"{start_h:02d}:00",
                        end_time=f"{end_h:02d}:30",
                        room_location=f"Hội trường Grand Hall {chr(65+idx)}",
                        day_number=1,
                        date_label="Ngày 1",
                        track="Chính",
                        capacity=ev.capacity // 3,
                        registered_count=ev.registered_count // 3
                    )
                    db.add(s)
            await db.commit()
            print("✅ Created event schedules.")

        # 4. Seed Session Questions (Q&A)
        q_count = (await db.execute(text("SELECT count(*) FROM session_questions;"))).scalar()
        schedules = (await db.execute(select(EventSchedule))).scalars().all()
        if q_count == 0 and schedules:
            print("Creating session questions (Q&A)...")
            for sched in schedules[:20]: # across top 20 sessions
                for q_text, is_ans, ans_text in random.sample(QUESTIONS_DATA, k=random.randint(2, 4)):
                    q = SessionQuestion(
                        session_id=sched.id,
                        user_id=random.choice(user_ids),
                        asker_name=f"Đại biểu {random.choice(['Nguyễn', 'Trần', 'Lê', 'Phạm'])}",
                        asker_email="attendee@example.com",
                        question=q_text,
                        question_text=q_text,
                        status="APPROVED" if is_ans else "PENDING",
                        upvotes=random.randint(3, 48),
                        is_answered=is_ans,
                        answer=ans_text
                    )
                    db.add(q)
            await db.commit()
            print("✅ Created session questions.")

        # 5. Seed Feedbacks & Session Feedbacks
        fb_count = (await db.execute(text("SELECT count(*) FROM feedbacks;"))).scalar()
        if fb_count == 0:
            print("Creating feedbacks and CSAT ratings...")
            for ev in events:
                # Add 5-10 feedbacks per event
                num_fb = random.randint(5, 12)
                for _ in range(num_fb):
                    r_val = random.random()
                    if r_val < 0.70:
                        rating = 5
                        comment = random.choice(FEEDBACK_COMMENTS_POS)
                        sentiment = "positive"
                    elif r_val < 0.90:
                        rating = 4
                        comment = random.choice(FEEDBACK_COMMENTS_POS)
                        sentiment = "positive"
                    elif r_val < 0.96:
                        rating = 3
                        comment = random.choice(FEEDBACK_COMMENTS_NEU)
                        sentiment = "neutral"
                    else:
                        rating = 2
                        comment = random.choice(FEEDBACK_COMMENTS_NEG)
                        sentiment = "negative"

                    fb = Feedback(
                        user_id=random.choice(user_ids),
                        event_id=ev.id,
                        rating=rating,
                        comment=comment,
                        sentiment=sentiment
                    )
                    db.add(fb)

            # Session feedbacks
            for sched in schedules[:30]:
                for _ in range(random.randint(3, 8)):
                    sf = SessionFeedback(
                        session_id=sched.id,
                        user_id=random.choice(user_ids),
                        participant_name=f"Khách tham dự #{random.randint(100, 999)}",
                        rating=random.choices([5, 4, 3], weights=[70, 25, 5])[0],
                        content_quality=random.choices([5, 4, 3], weights=[75, 20, 5])[0],
                        speaker_rating=random.choices([5, 4, 3], weights=[80, 18, 2])[0],
                        comment=random.choice(FEEDBACK_COMMENTS_POS[:4])
                    )
                    db.add(sf)

            await db.commit()
            print("✅ Created feedbacks and CSAT ratings.")

        # 6. Seed Saved Reports and Scheduled Reports
        rep_count = (await db.execute(text("SELECT count(*) FROM reports;"))).scalar()
        if rep_count == 0:
            print("Creating sample saved reports and scheduled reports...")
            sample_reports = [
                Report(
                    name="Báo cáo Tổng kết Hiệu suất Sự kiện Quý 3/2026",
                    report_type="Tổng quan",
                    format="PDF",
                    status="Hoàn thành",
                    file_url="/exports/report_q3_2026.pdf",
                    shared_with=["board@eventhub.ai", "director@eventhub.ai"],
                    creator_id=random.choice(user_ids)
                ),
                Report(
                    name="Phân tích Nhân khẩu học & Mật độ Check-in AI Summit",
                    report_type="Người tham dự",
                    format="EXCEL",
                    status="Hoàn thành",
                    file_url="/exports/attendee_analytics_ai_summit.xlsx",
                    shared_with=["operations@eventhub.ai"],
                    creator_id=random.choice(user_ids)
                ),
                Report(
                    name="Đánh giá CSAT Diễn giả & Thống kê Tương tác Q&A",
                    report_type="Diễn giả",
                    format="PDF",
                    status="Hoàn thành",
                    file_url="/exports/speaker_csat_eval.pdf",
                    shared_with=["speaker-relations@eventhub.ai"],
                    creator_id=random.choice(user_ids)
                ),
                Report(
                    name="Kiểm toán Tốc độ Phản hồi AI Concierge & Tỷ lệ RAG Hit",
                    report_type="AI",
                    format="PDF",
                    status="Hoàn thành",
                    file_url="/exports/ai_audit_q3.pdf",
                    shared_with=["ai-team@eventhub.ai"],
                    creator_id=random.choice(user_ids)
                )
            ]
            for r in sample_reports:
                db.add(r)

            sample_schedules = [
                ScheduledReport(
                    name="Báo cáo Tổng kết Hoạt động Hàng tuần",
                    report_type="Tổng quan",
                    frequency="Hàng tuần",
                    recipients=["admin@eventhub.ai", "manager@eventhub.ai"],
                    format="PDF",
                    is_active=True,
                    creator_id=random.choice(user_ids)
                ),
                ScheduledReport(
                    name="Thống kê Tỷ lệ Soát vé & Tình trạng Vé Hàng ngày",
                    report_type="Vé & QR",
                    frequency="Hàng ngày",
                    recipients=["checkin-lead@eventhub.ai"],
                    format="EXCEL",
                    is_active=True,
                    creator_id=random.choice(user_ids)
                ),
                ScheduledReport(
                    name="Bản tin Điều hành & Phân tích Executive Insights Hàng tháng",
                    report_type="Hiệu quả sự kiện",
                    frequency="Hàng tháng",
                    recipients=["executive-board@eventhub.ai"],
                    format="PDF",
                    is_active=True,
                    creator_id=random.choice(user_ids)
                )
            ]
            for s in sample_schedules:
                db.add(s)

            await db.commit()
            print("✅ Created sample reports and schedules.")

        print("🎉 Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
