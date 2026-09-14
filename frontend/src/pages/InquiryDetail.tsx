import React, { useState, useEffect } from 'react';
import {
  Bot,
  User,
  Mail,
  Phone,
  Ticket,
  Calendar,
  CheckCircle2,
  Edit3,
  XCircle,
  ShieldCheck,
  Send,
  BookOpen,
  ArrowLeft,
  RefreshCw,
  Search,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { apiService } from '../services/api';
import { formatVietnameseDateTime } from '../utils/formatters';
import { Inquiry, InquiryReply } from '../types';
import { toast } from 'sonner';

interface InquiryDetailProps {
  initialInquiryId?: number;
  onBack?: () => void;
}

export const InquiryDetail: React.FC<InquiryDetailProps> = ({ initialInquiryId = 101, onBack }) => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [activeInquiryId, setActiveInquiryId] = useState<number>(initialInquiryId);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editableContent, setEditableContent] = useState<string>('');
  const [customReply, setCustomReply] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Load inquiries
  const loadInquiries = async () => {
    try {
      const data = await apiService.getInquiries();
      setInquiries(data);
      if (data.length > 0) {
        const found = data.find((i) => i.id === activeInquiryId) || data[0];
        setSelectedInquiry(found);
        setActiveInquiryId(found.id);
        const draft = found.replies.find((r) => r.is_ai_generated)?.content || '';
        setEditableContent(draft);
      }
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const handleSelectInquiry = (inquiry: Inquiry) => {
    setActiveInquiryId(inquiry.id);
    setSelectedInquiry(inquiry);
    setIsEditing(false);
    const draft = inquiry.replies.find((r) => r.is_ai_generated)?.content || '';
    setEditableContent(draft);
    setNotification(null);
  };

  // Staff Review Actions
  const handleReviewAction = async (action: 'ACCEPT' | 'EDIT' | 'REJECT') => {
    if (!selectedInquiry) return;
    setSubmitting(true);
    setNotification(null);

    try {
      let contentToSend = editableContent;
      if (action === 'ACCEPT') {
        const draft = selectedInquiry.replies.find((r) => r.is_ai_generated)?.content || editableContent;
        contentToSend = draft;
      }

      await apiService.reviewInquiry(selectedInquiry.id, {
        staff_id: 1,
        action: action,
        edited_content: action === 'EDIT' ? contentToSend : undefined,
        note: `Staff review action: ${action}`,
      });

      const updatedStatus = action === 'REJECT' ? 'REJECTED' : 'APPROVED';
      const updatedReply: InquiryReply = {
        id: Date.now(),
        inquiry_id: selectedInquiry.id,
        sender_id: 1,
        sender_name: 'Staff Duyệt Viên',
        content: action === 'REJECT' ? 'Yêu cầu đã bị từ chối bởi nhân viên hỗ trợ.' : contentToSend,
        is_ai_generated: action === 'ACCEPT',
        edited_by_staff: action === 'EDIT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSelectedInquiry((prev) =>
        prev
          ? {
              ...prev,
              status: updatedStatus,
              replies: [updatedReply, ...prev.replies.filter((r) => !r.is_ai_generated)],
            }
          : null
      );

      setInquiries((prev) =>
        prev.map((item) =>
          item.id === selectedInquiry.id
            ? { ...item, status: updatedStatus, replies: [updatedReply] }
            : item
        )
      );

      setIsEditing(false);
      const msg =
        action === 'ACCEPT'
          ? 'Đã duyệt và phát hành câu trả lời AI thành công!'
          : action === 'EDIT'
          ? 'Đã cập nhật câu trả lời đã chỉnh sửa cho khách tham dự!'
          : 'Đã từ chối câu trả lời gợi ý của AI.';
      setNotification({
        type: 'success',
        message: msg,
      });
      if (action === 'ACCEPT') toast.success(msg);
      else if (action === 'EDIT') toast.success(msg);
      else toast.info(msg);
    } catch {
      const errMsg = 'Lỗi khi gửi kết quả duyệt lên máy chủ!';
      setNotification({
        type: 'error',
        message: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCustomReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customReply.trim() || !selectedInquiry) return;

    const newReply: InquiryReply = {
      id: Date.now(),
      inquiry_id: selectedInquiry.id,
      sender_id: 1,
      sender_name: 'Staff Duyệt Viên',
      content: customReply.trim(),
      is_ai_generated: false,
      edited_by_staff: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSelectedInquiry((prev) =>
      prev
        ? {
            ...prev,
            status: 'APPROVED',
            replies: [...prev.replies, newReply],
          }
        : null
    );

    setCustomReply('');
  };

  const filteredInquiries = inquiries.filter(
    (i) =>
      i.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.participant_name && i.participant_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const aiDraftReply = selectedInquiry?.replies.find((r) => r.is_ai_generated);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Trung Tâm Xử Lý Thắc Mắc (HITL Inbox)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                Split-View Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Nhân viên kiểm duyệt và tinh chỉnh các câu trả lời do AI Concierge gợi ý từ RAG
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc câu hỏi..."
            className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
      )}

      {/* Main Split-View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= COLUMN 1: Left Panel - Participant Queue & Context (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Inquiry Queue Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>HÀNG ĐỢI CHỜ DUYỆT ({inquiries.filter((i) => i.status === 'AI_SUGGESTED').length})</span>
              <button onClick={loadInquiries} className="text-slate-400 hover:text-slate-700 transition-colors" title="Làm mới">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredInquiries.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectInquiry(item)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs space-y-1.5 cursor-pointer ${
                    item.id === activeInquiryId
                      ? 'bg-indigo-50 border-indigo-300 text-slate-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="font-semibold text-slate-900">{item.participant_name || 'Khách tham dự'}</strong>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        item.status === 'AI_SUGGESTED'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : item.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {item.status === 'AI_SUGGESTED' ? 'Cần duyệt' : item.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-slate-600 text-[11px] leading-snug">{item.question}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Participant Profile Card */}
          {selectedInquiry && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                  {selectedInquiry.participant_name ? selectedInquiry.participant_name.charAt(0) : 'U'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedInquiry.participant_name || 'Khách Tham Dự'}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Đã xác thực PII
                  </span>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email:
                  </span>
                  <span className="font-mono text-slate-900 font-medium">{selectedInquiry.participant_email || 'an***@gmail.com'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" /> Số điện thoại:
                  </span>
                  <span className="font-mono text-slate-900 font-medium">{selectedInquiry.participant_phone || '098****321'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Ticket className="w-3.5 h-3.5 text-indigo-600" /> Loại vé:
                  </span>
                  <span className="text-indigo-700 font-bold">VIP All-Access Pass</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Sự kiện:
                  </span>
                  <span className="text-slate-900 font-medium">EventHub AI Summit</span>
                </div>
              </div>

              {/* RAG Context Snippet Reference */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  Tài liệu Cẩm nang khớp từ pgvector:
                </h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <p className="font-bold text-indigo-700">Cẩm nang #1: Hướng dẫn Đỗ xe & Di chuyển</p>
                  <p className="text-slate-600 line-clamp-3 leading-relaxed">
                    &quot;Bãi đỗ xe ô tô nằm tại hầm B2-B3. Miễn phí cho khách có vé VIP và Speaker. Khách đi xe máy gửi tại sảnh sau.&quot;
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= COLUMN 2: Right Panel - HITL Chat & AI Suggestion Box (8 cols) ================= */}
        <div className="lg:col-span-8 space-y-4">
          {selectedInquiry ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between min-h-[580px] shadow-sm">
              {/* Chat Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900">Luồng Hỏi Đáp & Duyệt Gợi Ý AI</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 font-medium bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                    Chủ đề: <strong className="text-indigo-700">{selectedInquiry.ai_category || 'LOGISTICS'}</strong>
                  </span>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="space-y-4 py-4 flex-1 overflow-y-auto">
                {/* 1. Participant's Question Bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-tl-none p-4 max-w-xl space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-900">{selectedInquiry.participant_name || 'Khách'}</span>
                      <span className="text-[10px] text-slate-400">{formatVietnameseDateTime(selectedInquiry.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-800 font-medium">{selectedInquiry.question}</p>
                  </div>
                </div>

                {/* 2. AI Suggestion Box (The HITL Core Component) */}
                {selectedInquiry.status === 'AI_SUGGESTED' && aiDraftReply && (
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-indigo-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                            AI Suggestion Box
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                              Gemini 1.5 Flash + RAG
                            </span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">Câu trả lời nháp tự động trích xuất từ cẩm nang</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg">
                        ⏳ Chờ Staff phê duyệt
                      </span>
                    </div>

                    {/* AI Generated Text or Inline Editor */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-800">Chỉnh sửa nội dung trước khi gửi:</label>
                        <textarea
                          value={editableContent}
                          onChange={(e) => setEditableContent(e.target.value)}
                          rows={4}
                          className="w-full bg-white border border-indigo-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    ) : (
                      <div className="p-3.5 bg-white rounded-xl border border-indigo-200 text-xs text-slate-800 leading-relaxed font-medium">
                        {editableContent || aiDraftReply.content}
                      </div>
                    )}

                    {/* 3 HITL Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-indigo-200/80">
                      <button
                        onClick={() => handleReviewAction('REJECT')}
                        disabled={submitting}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-rose-600" />
                        Từ Chối
                      </button>

                      {isEditing ? (
                        <button
                          onClick={() => handleReviewAction('EDIT')}
                          disabled={submitting || !editableContent.trim()}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                          Lưu & Gửi Cho Khách
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4 text-amber-600" />
                          Chỉnh Sửa
                        </button>
                      )}

                      <button
                        onClick={() => handleReviewAction('ACCEPT')}
                        disabled={submitting}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Chấp Nhận (Gửi Ngay)
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Published Replies Stream */}
                {selectedInquiry.replies
                  .filter((r) => !r.is_ai_generated || selectedInquiry.status !== 'AI_SUGGESTED')
                  .map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3 justify-end">
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tr-none p-4 max-w-xl space-y-1.5 text-right shadow-2xs">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-slate-400">
                            {formatVietnameseDateTime(reply.created_at)}
                          </span>
                          <span className="text-xs font-bold text-indigo-900">
                            {reply.sender_name || 'Staff Duyệt Viên'}
                          </span>
                          {reply.edited_by_staff && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded font-bold">
                              Staff Edited
                            </span>
                          )}
                          {reply.is_ai_generated && !reply.edited_by_staff && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-cyan-100 text-cyan-800 border border-cyan-200 rounded font-bold">
                              AI Approved
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-800 text-left leading-relaxed">{reply.content}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Custom Chat Input Box */}
              <form onSubmit={handleSendCustomReply} className="pt-4 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={customReply}
                  onChange={(e) => setCustomReply(e.target.value)}
                  placeholder="Nhập câu trả lời bổ sung của Staff..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!customReply.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Gửi
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2 shadow-sm">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Chọn một thắc mắc từ danh sách bên trái để bắt đầu duyệt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InquiryDetail;
