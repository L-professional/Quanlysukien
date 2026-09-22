from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.inquiries import router as inquiries_router
from app.api.v1.registrations import router as registrations_router
from app.api.v1.events import router as events_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.public_chat import router as public_chat_router
from app.api.v1.admin_users import router as admin_users_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.pr_studio import router as pr_studio_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.checkin import router as checkin_router
from app.api.v1.speaker import router as speaker_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.ai_analytics import router as ai_analytics_router
from app.api.v1.users import router as users_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(inquiries_router)
api_v1_router.include_router(registrations_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(audit_logs_router)
api_v1_router.include_router(public_chat_router)
api_v1_router.include_router(admin_users_router)
api_v1_router.include_router(knowledge_router)
api_v1_router.include_router(pr_studio_router, prefix="/ai")
api_v1_router.include_router(pr_studio_router, prefix="/pr-studio")
api_v1_router.include_router(ai_analytics_router, prefix="/ai")
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(sessions_router)
api_v1_router.include_router(checkin_router)
api_v1_router.include_router(speaker_router)
api_v1_router.include_router(feedback_router)



