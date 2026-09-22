import enum
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ReviewActionEnum(str, enum.Enum):
    ACCEPT = "ACCEPT"
    EDIT = "EDIT"
    REJECT = "REJECT"


class InquiryCreate(BaseModel):
    event_id: int = Field(..., description="ID của sự kiện")
    participant_id: int = Field(..., description="ID của người tham dự đặt câu hỏi")
    question: str = Field(..., min_length=3, max_length=2000, description="Nội dung câu hỏi thắc mắc")


class InquiryReplyBase(BaseModel):
    content: str
    is_ai_generated: bool = False
    edited_by_staff: bool = False


class InquiryReplyResponse(InquiryReplyBase):
    id: int
    inquiry_id: int
    sender_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InquiryResponse(BaseModel):
    id: int
    event_id: int
    participant_id: int
    assigned_staff_id: Optional[int] = None
    question: str
    ai_category: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    replies: List[InquiryReplyResponse] = []

    # Task 43: VIP, Urgency, RAG Telemetry & User QR Attachment
    is_vip: bool = False
    priority: str = "NORMAL"  # VIP | URGENT | NORMAL
    participant_name: Optional[str] = None
    participant_email: Optional[str] = None
    participant_phone: Optional[str] = None
    rag_source: Optional[str] = None
    rag_similarity: Optional[float] = None
    rag_doc_title: Optional[str] = None
    rag_chunk_id: Optional[str] = None
    rag_distance: Optional[float] = None
    rag_snippet: Optional[str] = None
    qr_code_token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InquiryReviewRequest(BaseModel):
    staff_id: int = Field(..., description="ID của nhân viên Staff thực hiện duyệt")
    action: ReviewActionEnum = Field(..., description="Hành động: ACCEPT, EDIT, hoặc REJECT")
    edited_content: Optional[str] = Field(None, description="Nội dung câu trả lời sau khi Staff chỉnh sửa (bắt buộc khi action là EDIT)")
    note: Optional[str] = Field(None, description="Ghi chú thêm của Staff")
    channel: Optional[str] = Field("EMAIL", description="Kênh gửi phản hồi: EMAIL, IN_APP, hoặc SMS")


class InquiryReviewResponse(BaseModel):
    message: str
    inquiry_id: int
    status: str
    staff_action: str
    dispatch_channel: Optional[str] = "EMAIL"
    final_reply: Optional[InquiryReplyResponse] = None


class QuickPromptRequest(BaseModel):
    text: str = Field(..., description="Nội dung phản hồi cần xử lý")
    prompt_type: str = Field(..., description="TRANSLATE | REWRITE_ENGAGING | INSERT_INFO | ATTACH_QR")
    target_language: Optional[str] = Field("en", description="Ngôn ngữ đích nếu là dịch thuật (en hoặc vi)")
    inquiry_id: Optional[int] = Field(None, description="ID của inquiry để tra cứu thông tin liên quan nếu cần")
    participant_id: Optional[int] = Field(None, description="ID người tham gia nếu có")
    event_id: Optional[int] = Field(None, description="ID sự kiện nếu có")


class QuickPromptResponse(BaseModel):
    result: str
    prompt_type: str


class BatchReviewRequest(BaseModel):
    inquiry_ids: List[int] = Field(..., description="Danh sách ID yêu cầu cần duyệt hàng loạt")
    staff_id: int = Field(..., description="ID nhân viên thực hiện duyệt")
    action: ReviewActionEnum = Field(ReviewActionEnum.ACCEPT, description="Hành động duyệt")
    channel: Optional[str] = Field("EMAIL", description="Kênh gửi phản hồi: EMAIL, IN_APP, hoặc SMS")


class BatchReviewResponse(BaseModel):
    approved_count: int
    rejected_count: int
    message: str


class GenerateConciergeRequest(BaseModel):
    event_id: int = Field(..., description="ID sự kiện cần tra cứu")
    question: str = Field(..., min_length=2, description="Câu hỏi của khách tham dự")
    participant_id: Optional[int] = Field(None, description="ID của khách tham dự nếu đã đăng nhập")
    bilingual: Optional[bool] = Field(False, description="Bật chế độ phản hồi song ngữ Anh - Việt")
    target_language: Optional[str] = Field("vi", description="Ngôn ngữ ưu tiên ('vi', 'en', 'bilingual')")


class GenerateConciergeResponse(BaseModel):
    draft_reply: str
    ai_category: str
    is_bilingual: bool
    language: str
    rag_similarity: float
    rag_source: Optional[str] = None
    rag_doc_title: Optional[str] = None
    rag_chunk_id: Optional[str] = None
    rag_distance: Optional[float] = None
    rag_snippet: Optional[str] = None
    contexts: List[dict] = []
    is_fallback: bool = False


class UserQRResponse(BaseModel):
    inquiry_id: Optional[int] = None
    participant_id: int
    event_id: int
    full_name: str
    ticket_type: str
    qr_code_token: str
    is_vip: bool
    formatted_snippet: str


class AutoApproveResponse(BaseModel):
    approved_count: int
    threshold: float
    approved_ids: List[int]
    message: str


