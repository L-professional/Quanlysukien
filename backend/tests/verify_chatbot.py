import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import AsyncSessionLocal, init_db
from app.services.ai_copilot_service import ai_copilot_service

async def verify_chatbot():
    await init_db()
    async with AsyncSessionLocal() as session:
        test_cases = [
            ("sự kiện hôm nay có gì không?", "ATTENDEE"),
            ("sự kiện hôm nay", "ATTENDEE"),
            ("hôm nay có sự kiện gì đang diễn ra?", "ATTENDEE"),
            ("hệ thống có những hạng vé nào?", "ATTENDEE"),
            ("hệ thống có những sự kiện nào?", "ATTENDEE"),
            ("lịch trình của diễn đàn ASEAN", "ATTENDEE"),
            ("địa điểm tổ chức diễn đàn ASEAN ở đâu?", "ATTENDEE"),
            ("thông tin wifi của sự kiện", "ATTENDEE"),
            ("báo cáo tỷ lệ check-in hiện tại bao nhiêu?", "ADMIN"),
            ("có sự kiện Triển lãm Công Nghệ Không Gian 2099 không?", "ATTENDEE"),
        ]
        
        for q, role in test_cases:
            print(f"\n=======================================================")
            print(f"👉 CÂU HỎI: {q} (Role: {role})")
            print(f"-------------------------------------------------------")
            res = await ai_copilot_service.execute_copilot(
                db=session,
                question=q,
                user_role=role
            )
            print(f"🤖 TRẢ LỜI:\n{res['answer']}")
            if res.get("action_links"):
                print("🔗 LINKS:")
                for link in res["action_links"]:
                    print(f"   • {link['label']}: {link['url']}")

if __name__ == "__main__":
    asyncio.run(verify_chatbot())
