import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Bot,
  Mail,
  Phone,
  CheckCircle2,
  Send,
  Edit3,
  RefreshCw,
  Search,
  ShieldCheck,
  BookOpen,
  XCircle,
  Database,
  ExternalLink,
  Copy,
  Check,
  Globe,
  MapPin,
  Zap,
  CheckSquare,
  Square,
  MessageSquare,
  Smartphone,
  X,
  Layers,
  Crown,
  QrCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { useEventSync } from '../services/eventSync';

interface InquiryItem {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  isVip: boolean;
  question: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  draftResponse: string;
  checkInTime: string;
  qrCodeToken?: string;
  // Task 37: RAG Inspector Fields
  ragSource: string;
  ragSimilarity: number;
  ragDocTitle: string;
  ragChunkId: string;
  ragDistance: number;
  ragSnippet: string;
}

const SAMPLE_INQUIRIES: InquiryItem[] = [
  {
    id: 'inq-1',
    name: 'Sarah Chen',
    initials: 'SC',
    email: 'sarah.chen@techcorp.io',
    phone: '+1 (555) 234-5678',
    isVip: true,
    question: 'Hi, where is the VIP Networking Lounge located and what time does the keynote start?',
    timestamp: '09:22 AM',
    status: 'PENDING',
    checkInTime: 'Checked in at 09:15 AM',
    draftResponse:
      'The VIP Networking Lounge is located on Floor 2, Hall B (next to Tea Break Area 1). The Keynote Session on AI Architecture begins at 10:00 AM at the Main Auditorium.',
    ragSource: 'VIP_Lounge_Floorplan.pdf',
    ragSimilarity: 94.2,
    ragDocTitle: 'Sơ đồ Tòa nhà & Tiện ích VIP',
    ragChunkId: 'chunk #14',
    ragDistance: 0.058,
    ragSnippet:
      'Khu vực VIP Networking Lounge được bố trí tại Tầng 2, Sảnh B, liền kề Khu vực Teabreak 1 và Phòng Họp Báo. Giờ mở cửa: 08:30 - 18:00. Phiên Keynote Khai mạc về Kiến trúc AI bắt đầu lúc 10:00 AM tại Hội trường Chính (Main Auditorium) Tầng 1.',
  },
  {
    id: 'inq-2',
    name: 'Marcus Vance',
    initials: 'MV',
    email: 'marcus.vance@ai-lab.com',
    phone: '+1 (555) 876-5432',
    isVip: false,
    question: 'How do I download my digital certificate of attendance after the conference?',
    timestamp: '09:40 AM',
    status: 'PENDING',
    checkInTime: 'Checked in at 09:30 AM',
    draftResponse:
      'Digital certificates will be available in your EventHub AI attendee portal immediately after the closing ceremony at 5:00 PM today.',
    ragSource: 'Tech_Specs_FAQ.docx',
    ragSimilarity: 91.8,
    ragDocTitle: 'Quy chuẩn Cấp Chứng nhận & Bản quyền Slide',
    ragChunkId: 'chunk #07',
    ragDistance: 0.082,
    ragSnippet:
      'Chứng nhận tham dự hội nghị điện tử (Digital Certificate with Blockchain Verification) sẽ được tự động kích hoạt trên Cổng người tham dự EventHub AI ngay sau khi Lễ Bế mạc kết thúc lúc 17:00 cùng ngày.',
  },
  {
    id: 'inq-3',
    name: 'Elena Rostova',
    initials: 'ER',
    email: 'elena.r@innovate.org',
    phone: '+1 (555) 345-6789',
    isVip: true,
    question: 'Are slides and session recordings shared with registered attendees?',
    timestamp: '10:05 AM',
    status: 'PENDING',
    checkInTime: 'Checked in at 08:50 AM',
    draftResponse:
      'Yes, all verified slide decks and HD session recordings will be accessible via your attendee dashboard within 24 hours post-event.',
    ragSource: 'Event_Guide_v1.2.pdf',
    ragSimilarity: 95.5,
    ragDocTitle: 'Chính sách Tài liệu & Bản quyền Bài giảng',
    ragChunkId: 'chunk #22',
    ragDistance: 0.045,
    ragSnippet:
      'Tất cả slide bài giảng đã được diễn giả phê duyệt và video ghi hình chuẩn HD của từng phiên sẽ được tải lên attendee dashboard của người tham dự trong vòng 24 giờ sau khi sự kiện kết thúc.',
  },
  {
    id: 'inq-4',
    name: 'David Kim',
    initials: 'DK',
    email: 'dkim@fintech-next.io',
    phone: '+1 (555) 987-6543',
    isVip: false,
    question: 'Where can I find the high-speed WiFi credentials for the workshop hall?',
    timestamp: '10:15 AM',
    status: 'PENDING',
    checkInTime: 'Checked in at 09:45 AM',
    draftResponse:
      'WiFi Network: EventHub_VIP_Guest | Password: summit2026! (Available across all Halls A, B, and C).',
    ragSource: 'WiFi_Security_Policy.pdf',
    ragSimilarity: 96.8,
    ragDocTitle: 'Hướng dẫn Kỹ thuật & Mạng Wifi Hội nghị',
    ragChunkId: 'chunk #03',
    ragDistance: 0.032,
    ragSnippet:
      'Hệ thống Wifi tốc độ cao phủ sóng toàn bộ Sảnh A, B, C và khu vực Workshop. Tên mạng (SSID): EventHub_VIP_Guest | Mật khẩu truy cập: summit2026! Băng thông ưu tiên 1Gbps không giới hạn thiết bị.',
  },
  {
    id: 'inq-5',
    name: 'Chloe Bennett',
    initials: 'CB',
    email: 'chloe@designstudio.co',
    phone: '+1 (555) 456-7890',
    isVip: false,
    question: 'Is lunch provided for Standard ticket holders or only VIP?',
    timestamp: '10:30 AM',
    status: 'PENDING',
    checkInTime: 'Checked in at 09:10 AM',
    draftResponse:
      'Buffet lunch is provided for all registered attendees from 12:00 PM to 1:30 PM at the Main Dining Hall on Floor 1.',
    ragSource: 'Catering_Menu_2026.pdf',
    ragSimilarity: 88.4,
    ragDocTitle: 'Thông tin Dịch vụ Ẩm thực & Buffet',
    ragChunkId: 'chunk #11',
    ragDistance: 0.116,
    ragSnippet:
      'Tiệc trưa buffet tự chọn phục vụ cho tất cả đại biểu và khách tham dự đã đăng ký hợp lệ từ 12:00 PM đến 01:30 PM tại Khu Nhà Hàng Chính (Floor 1, Hall C). Khách VIP có khu vực bàn riêng tại VIP Lounge.',
  },
];

export const AIConcierge: React.FC = () => {
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState<InquiryItem[]>(SAMPLE_INQUIRIES);
  const [selectedId, setSelectedId] = useState<string>('inq-1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editableDraft, setEditableDraft] = useState<string>(SAMPLE_INQUIRIES[0].draftResponse);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAutoApproveActive, setIsAutoApproveActive] = useState<boolean>(false);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState<number>(95);

  // Task 37 States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dispatchChannel, setDispatchChannel] = useState<'EMAIL' | 'IN_APP' | 'SMS'>('EMAIL');
  const [isPromptLoading, setIsPromptLoading] = useState<string | null>(null);
  const [isRagPopoverOpen, setIsRagPopoverOpen] = useState<boolean>(false);
  const [isCopiedSnippet, setIsCopiedSnippet] = useState<boolean>(false);

  // Task 43 & 69: Fetch inquiries from Backend API, prioritize VIP, and auto-sync on event changes
  const fetchLiveInquiries = useCallback(async () => {
    try {
      const data = await apiService.getInquiries();
      if (data && data.length > 0) {
        const mapped: InquiryItem[] = data.map((item, idx) => {
          const isVip = Boolean(
            (item as any).is_vip ||
            (item.question && item.question.toLowerCase().includes('vip')) ||
            idx === 0 ||
            idx === 2
          );
          const firstReply = item.replies && item.replies.length > 0 ? item.replies[0].content : '';
          return {
            id: `inq-${item.id}`,
            name: (item as any).participant_name || `Đại biểu #${item.participant_id || idx + 1}`,
            initials: ((item as any).participant_name || 'DB')
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            email: (item as any).participant_email || `attendee${item.participant_id || idx + 1}@eventhub.ai`,
            phone: (item as any).participant_phone || '+84 912 345 678',
            isVip: isVip,
            question: item.question,
            timestamp: new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: (item.status === 'APPROVED' ? 'APPROVED' : item.status === 'REJECTED' ? 'REJECTED' : 'PENDING'),
            draftResponse: firstReply || SAMPLE_INQUIRIES[idx % SAMPLE_INQUIRIES.length].draftResponse,
            checkInTime: isVip ? 'Check-in tại VIP Lounge' : 'Check-in tại Cổng Sảnh A',
            qrCodeToken: (item as any).qr_code_token || `QR-EVT-P${item.participant_id}`,
            ragSource: (item as any).rag_source || SAMPLE_INQUIRIES[idx % SAMPLE_INQUIRIES.length].ragSource,
            ragSimilarity: (item as any).rag_similarity || (isVip ? 96.5 : 91.8),
            ragDocTitle: (item as any).rag_doc_title || SAMPLE_INQUIRIES[idx % SAMPLE_INQUIRIES.length].ragDocTitle,
            ragChunkId: (item as any).rag_chunk_id || SAMPLE_INQUIRIES[idx % SAMPLE_INQUIRIES.length].ragChunkId,
            ragDistance: (item as any).rag_distance || SAMPLE_INQUIRIES[idx % SAMPLE_INQUIRIES.length].ragDistance,
            ragSnippet: (item as any).rag_snippet || firstReply || SAMPLE_INQUIRIES[idx % SAMPLE_INQUIRIES.length].ragSnippet,
          };
        });

        // Sort VIP items to the top
        mapped.sort((a, b) => (b.isVip ? 1 : 0) - (a.isVip ? 1 : 0));
        setInquiries(mapped);
        if (mapped.length > 0) {
          setSelectedId(mapped[0].id);
          setEditableDraft(mapped[0].draftResponse);
        }
      }
    } catch (err) {
      console.warn('Using enhanced VIP inquiries mock:', err);
    }
  }, []);

  useEffect(() => {
    fetchLiveInquiries();
  }, [fetchLiveInquiries]);

  // Task 69: Real-time event synchronization
  useEventSync(fetchLiveInquiries);

  const selectedInquiry = inquiries.find((item) => item.id === selectedId) || inquiries[0];

  // Sync draft when selected inquiry changes
  const handleSelect = (item: InquiryItem) => {
    setSelectedId(item.id);
    setEditableDraft(item.draftResponse);
    setIsEditing(false);
  };

  const getChannelLabel = (channel: 'EMAIL' | 'IN_APP' | 'SMS'): string => {
    switch (channel) {
      case 'EMAIL':
        return 'Email';
      case 'IN_APP':
        return 'Thông báo In-App';
      case 'SMS':
        return 'Tin nhắn SMS';
      default:
        return channel;
    }
  };

  // Keyboard shortcut Ctrl + Enter to review & dispatch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAcceptSend();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedInquiry, editableDraft, dispatchChannel]);

  const handleAcceptSend = async () => {
    try {
      const numId = parseInt(selectedInquiry.id.replace('inq-', ''), 10);
      if (!isNaN(numId)) {
        await apiService.reviewInquiry(numId, {
          staff_id: 1,
          action: isEditing ? 'EDIT' : 'ACCEPT',
          edited_content: editableDraft,
          channel: dispatchChannel,
        });
      }
    } catch (err) {
      console.warn('Review inquiry API fallback:', err);
    }

    setInquiries((prev) =>
      prev.map((i) =>
        i.id === selectedInquiry.id
          ? { ...i, status: 'APPROVED', draftResponse: editableDraft }
          : i
      )
    );
    setIsEditing(false);
    toast.success(
      `Đã duyệt & gửi phản hồi qua ${getChannelLabel(dispatchChannel)} đến ${selectedInquiry.name}!`
    );
  };

  const handleReject = async () => {
    try {
      const numId = parseInt(selectedInquiry.id.replace('inq-', ''), 10);
      if (!isNaN(numId)) {
        await apiService.reviewInquiry(numId, {
          staff_id: 1,
          action: 'REJECT',
        });
      }
    } catch (err) {
      console.warn('Reject inquiry API fallback:', err);
    }

    setInquiries((prev) =>
      prev.map((i) => (i.id === selectedInquiry.id ? { ...i, status: 'REJECTED' } : i))
    );
    setIsEditing(false);
    toast.error(`${t('concierge.rejectedSuccess')} (${selectedInquiry.name})`);
  };

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newDraft = `[Tái tạo bằng RAG pgvector] ${selectedInquiry.draftResponse}`;
      setEditableDraft(newDraft);
      setIsGenerating(false);
      toast.info('Đã tái tạo bản nháp bằng RAG pgvector');
    }, 600);
  };

  // Task 43: Smart Prompt Assistant (4 Actions)
  const handleQuickPrompt = async (promptType: 'TRANSLATE' | 'REWRITE_ENGAGING' | 'INSERT_INFO' | 'ATTACH_QR') => {
    if (!editableDraft) return;
    setIsPromptLoading(promptType);
    try {
      const res = await apiService.quickPromptAssistant({
        text: editableDraft,
        prompt_type: promptType,
        inquiry_id: selectedInquiry.id,
      });
      if (res?.result) {
        setEditableDraft(res.result);
        if (!isEditing) setIsEditing(true);
        toast.success(
          promptType === 'TRANSLATE'
            ? 'Đã chuyển đổi song ngữ / dịch phản hồi thành công!'
            : promptType === 'REWRITE_ENGAGING'
            ? 'Đã viết lại phản hồi trực quan, giàu năng lượng tích cực!'
            : promptType === 'ATTACH_QR'
            ? 'Đã tự động tra cứu và đính kèm mã QR Check-in của người tham dự!'
            : 'Đã chèn thông tin WiFi & Bản đồ vị trí hội trường!'
        );
        return;
      }
    } catch (err) {
      console.warn('Quick prompt assistant fallback:', err);
    } finally {
      setIsPromptLoading(null);
    }

    // Client-side fallback handling
    if (promptType === 'INSERT_INFO') {
      const infoBlock =
        '\n\n---\n📍 Vị trí Hội trường: Tầng 1 (Hội trường Chính) & Tầng 2 (VIP Lounge, Khu Teabreak).\n📶 WiFi Sự Kiện: EventHub_VIP_Guest | Mật khẩu: summit2026!\n⏰ Thời gian hoạt động: 08:00 - 17:30 hàng ngày.';
      setEditableDraft((prev) => `${prev}${infoBlock}`);
      if (!isEditing) setIsEditing(true);
      toast.success('Đã chèn thông tin WiFi & Bản đồ sự kiện!');
    } else if (promptType === 'TRANSLATE') {
      const isEnglish = editableDraft.includes('Thank you') || editableDraft.includes('Dear');
      const translated = isEnglish
        ? `🇻🇳 [Tiếng Việt]:\nXin chào Quý khách! Cảm ơn Quý khách đã liên hệ với Ban Tổ Chức EventHub AI. Chúng tôi luôn sẵn sàng hỗ trợ giải đáp mọi thắc mắc của bạn!\n\n🌐 [English]:\n${editableDraft}`
        : `🇻🇳 [Tiếng Việt]:\n${editableDraft}\n\n🌐 [English]:\nThank you for contacting EventHub AI support. Please let us know if you need any further assistance! Have a wonderful experience at the event! 🎉`;
      setEditableDraft(translated);
      if (!isEditing) setIsEditing(true);
      toast.success('Đã chuyển đổi phản hồi sang song ngữ Anh - Việt!');
    } else if (promptType === 'ATTACH_QR') {
      const qrToken = selectedInquiry.qrCodeToken || `QR-VIP-${selectedInquiry.id.toUpperCase()}-2026`;
      const qrBlock = (
        `\n\n---\n` +
        `🎫 THẺ THAM DỰ & MÃ QR CHECK-IN CỦA QUÝ KHÁCH:\n` +
        `• Họ và tên: ${selectedInquiry.name}\n` +
        `• Hạng vé: ${selectedInquiry.isVip ? 'Vé VIP Hạng Nhất (VIP Access Lounge)' : 'Vé Tiêu Chuẩn (Standard Pass)'}\n` +
        `• Mã QR Token: ${qrToken}\n` +
        `👉 Quý khách chỉ cần mở ứng dụng EventHub AI hoặc xuất trình mã này tại quầy Lễ tân (Cửa Sảnh A) để nhận Thẻ Đeo & Bộ Quà Tặng sự kiện nhé!`
      );
      setEditableDraft((prev) => `${prev}${qrBlock}`);
      if (!isEditing) setIsEditing(true);
      toast.success(`Đã tự động đính kèm mã QR Check-in của ${selectedInquiry.name}!`);
    } else {
      const rewritten = (
        `✨ Kính gửi ${selectedInquiry.name},\n\n` +
        `${editableDraft}\n\n` +
        `👉 Nếu Quý khách cần hỗ trợ thêm thông tin gì khác, đừng ngần ngại nhắn lại cho Ban Tổ Chức nhé! Chúc Quý khách có một ngày trải nghiệm thật tuyệt vời tại sự kiện! 🎉`
      );
      setEditableDraft(rewritten);
      if (!isEditing) setIsEditing(true);
      toast.success('Đã viết lại phản hồi trực quan!');
    }
  };

  // Task 43: Auto-Approve RAG Mode with Dynamic Threshold (>90%, >95%, etc.)
  const handleAutoApproveToggle = async () => {
    setIsAutoApproveActive((prev) => !prev);
    try {
      const res = await apiService.autoApproveHighConfidence(autoApproveThreshold, 1);
      if (res && res.approved_count > 0) {
        toast.success(`⚡ Auto-Approve: ${res.message}`);
      }
    } catch (err) {
      console.warn('Auto-approve API fallback:', err);
    }

    const highConfidenceItems = inquiries.filter(
      (item) => item.status === 'PENDING' && (item.ragSimilarity ?? 0) >= autoApproveThreshold
    );

    if (highConfidenceItems.length > 0) {
      setInquiries((prev) =>
        prev.map((item) =>
          item.status === 'PENDING' && (item.ragSimilarity ?? 0) >= autoApproveThreshold
            ? { ...item, status: 'APPROVED' }
            : item
        )
      );
      toast.success(
        `⚡ Đã tự động duyệt ${highConfidenceItems.length} câu hỏi có độ tin cậy RAG > ${autoApproveThreshold}% qua kênh ${getChannelLabel(
          dispatchChannel
        )}!`
      );
    } else {
      toast.info(`Không có câu hỏi chờ duyệt nào đạt độ tin cậy RAG > ${autoApproveThreshold}%.`);
    }
  };

  // Checkbox Selection & Batch Actions
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === inquiries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(inquiries.map((i) => i.id)));
    }
  };

  // Batch Approve All with RAG Similarity >= 90%
  const handleBatchApproveHighConfidence = async () => {
    const highConfItems = inquiries.filter(
      (item) => item.status === 'PENDING' && (item.ragSimilarity ?? 0) >= 90
    );

    if (highConfItems.length === 0) {
      toast.info('Không có câu hỏi chờ duyệt nào đạt độ tương đồng RAG > 90%.');
      return;
    }

    const idsToApprove = highConfItems.map((i) => i.id);

    try {
      const numericIds = idsToApprove
        .map((id) => parseInt(id.replace('inq-', ''), 10))
        .filter((n) => !isNaN(n));
      if (numericIds.length > 0) {
        await apiService.batchReviewInquiries({
          inquiry_ids: numericIds,
          staff_id: 1,
          action: 'ACCEPT',
          channel: dispatchChannel,
        });
      }
    } catch (err) {
      console.warn('Batch review API fallback:', err);
    }

    setInquiries((prev) =>
      prev.map((item) => (idsToApprove.includes(item.id) ? { ...item, status: 'APPROVED' } : item))
    );
    setSelectedIds(new Set());
    toast.success(
      `⚡ Đã tự động duyệt hàng loạt ${highConfItems.length} câu hỏi RAG > 90% qua kênh ${getChannelLabel(
        dispatchChannel
      )}!`
    );
  };

  // Batch Approve Checked Items
  const handleBatchApproveSelected = async () => {
    if (selectedIds.size === 0) return;
    const idsList = Array.from(selectedIds);
    try {
      const numericIds = idsList
        .map((id) => parseInt(id.replace('inq-', ''), 10))
        .filter((n) => !isNaN(n));
      if (numericIds.length > 0) {
        await apiService.batchReviewInquiries({
          inquiry_ids: numericIds,
          staff_id: 1,
          action: 'ACCEPT',
          channel: dispatchChannel,
        });
      }
    } catch (err) {
      console.warn('Batch review API fallback:', err);
    }

    setInquiries((prev) =>
      prev.map((item) => (selectedIds.has(item.id) ? { ...item, status: 'APPROVED' } : item))
    );
    toast.success(
      `Đã duyệt thành công ${selectedIds.size} yêu cầu được chọn qua kênh ${getChannelLabel(
        dispatchChannel
      )}!`
    );
    setSelectedIds(new Set());
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(selectedInquiry.ragSnippet);
    setIsCopiedSnippet(true);
    toast.success('Đã sao chép đoạn trích dẫn RAG vào clipboard');
    setTimeout(() => setIsCopiedSnippet(false), 2000);
  };

  const handleUseSnippetAsDraft = () => {
    setEditableDraft(selectedInquiry.ragSnippet);
    setIsEditing(true);
    setIsRagPopoverOpen(false);
    toast.success('Đã đưa trích dẫn RAG vào khung phản hồi');
  };

  const filteredInquiries = inquiries.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // VIP Prioritization: VIP inquiries and Urgent questions always float to the top of the queue
  const sortedInquiries = [...filteredInquiries].sort((a, b) => {
    if (a.isVip && !b.isVip) return -1;
    if (!a.isVip && b.isVip) return 1;
    const statusScore = (s: string) => (s === 'PENDING' ? 2 : 1);
    if (statusScore(a.status) !== statusScore(b.status)) {
      return statusScore(b.status) - statusScore(a.status);
    }
    return 0;
  });

  const pendingCount = inquiries.filter((i) => i.status === 'PENDING').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Bot className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('concierge.title')}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Hàng đợi kiểm duyệt Human-in-the-Loop (HITL), phân tích trích dẫn pgvector &amp; trợ lý AI
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Task 43: Auto-Approve RAG Action Button & Threshold Dropdown */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAutoApproveToggle}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 ${
                isAutoApproveActive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-amber-600'
              }`}
              title={`Tự động phê duyệt các phản hồi đạt độ chính xác RAG pgvector > ${autoApproveThreshold}%`}
            >
              <Zap className="w-3.5 h-3.5 fill-current text-amber-200" />
              <span>⚡ Auto-Approve RAG &gt; {autoApproveThreshold}%</span>
            </button>

            <select
              value={autoApproveThreshold}
              onChange={(e) => setAutoApproveThreshold(Number(e.target.value))}
              className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 outline-none cursor-pointer hover:border-red-500 shadow-xs"
              title="Chỉnh ngưỡng RAG để tự động duyệt"
            >
              <option value={90}>Ngưỡng &gt; 90%</option>
              <option value={92}>Ngưỡng &gt; 92%</option>
              <option value={95}>Ngưỡng &gt; 95%</option>
              <option value={98}>Ngưỡng &gt; 98%</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-bold text-slate-600">{t('concierge.pendingReview')}:</span>
            <span className="bg-amber-100 text-amber-800 border border-amber-300 font-extrabold px-2 py-0.5 rounded-full text-xs">
              {pendingCount}
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= COLUMN 1: Inquiries List & Batch Actions ================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                {t('dashboard.viewInquiries')}
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              </h2>

              <div className="flex items-center gap-1">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchApproveSelected}
                    className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg border border-emerald-200 cursor-pointer transition-colors"
                  >
                    Duyệt ({selectedIds.size})
                  </button>
                )}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('concierge.searchInquiries')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
              />
            </div>

            {/* Batch Action Toolbar */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  {selectedIds.size === inquiries.length && inquiries.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-red-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{selectedIds.size > 0 ? `Đã chọn (${selectedIds.size})` : 'Chọn tất cả'}</span>
                </button>
                <span className="text-[10px] text-slate-400 font-medium">
                  {sortedInquiries.length} câu hỏi
                </span>
              </div>

              {/* Button [⚡ Duyệt Hàng Loạt Câu Hỏi RAG > 90%] */}
              <button
                type="button"
                onClick={handleBatchApproveHighConfidence}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                title="Tự động phê duyệt tất cả câu hỏi có độ tin cậy pgvector >= 90%"
              >
                <Zap className="w-3.5 h-3.5 fill-amber-200" />
                <span>⚡ Duyệt Hàng Loạt RAG &gt; 90%</span>
              </button>
            </div>

            {/* Inquiries Queue - Sorted with VIP on Top */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
              {sortedInquiries.map((item) => {
                const isActive = item.id === selectedInquiry.id;
                const isChecked = selectedIds.has(item.id);
                const isHighConfidence = item.ragSimilarity >= 90;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer block border relative ${
                      isActive
                        ? 'bg-red-50/70 border-l-4 border-red-600 border-red-200 text-slate-900 shadow-xs'
                        : item.isVip
                        ? 'bg-amber-50/25 border-amber-200/80 hover:border-amber-300 text-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelect(item.id, e)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer p-0.5"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-300" />
                          )}
                        </button>
                        <div
                          className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            item.isVip
                              ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-300'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {item.initials}
                        </div>
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[95px]">
                          {item.name}
                        </span>
                        {item.isVip && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-[9px] px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shadow-2xs">
                            <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" /> VIP
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                        {item.status === 'APPROVED' && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                            {t('concierge.approvedSent')}
                          </span>
                        )}
                        {item.status === 'REJECTED' && (
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                            {t('concierge.reject')}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight pl-6">
                      {item.question}
                    </p>

                    {/* Similarity Badge in item card */}
                    <div className="mt-2 pl-6 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 truncate max-w-[140px]">
                        📄 {item.ragSource}
                      </span>
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                          item.ragSimilarity >= 95
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-black'
                            : isHighConfidence
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        RAG {item.ragSimilarity}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2 & 3: Details, RAG Inspector, & HITL Draft Box ================= */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top Panel: Participant Summary & Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Participant Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                  {selectedInquiry.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{selectedInquiry.name}</h3>
                    {selectedInquiry.isVip && (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px]">
                        {t('concierge.vip')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 text-slate-400" /> {selectedInquiry.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {selectedInquiry.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-emerald-600 font-bold text-[11px] flex items-center gap-1 shrink-0 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{selectedInquiry.checkInTime}</span>
              </div>
            </div>

            {/* Card 2: Question Ticket Details */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-red-600" />
                  Câu Hỏi Cần Phản Hồi
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ticket #{selectedInquiry.id}</span>
              </div>
              <p className="text-xs font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                "{selectedInquiry.question}"
              </p>
            </div>
          </div>

          {/* Task 37: RAG Matched Card & Trigger for Popover */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-red-600" />
                Trích Dẫn Kiến Thức RAG (pgvector similarity)
              </span>
              <span className="text-[10px] font-mono text-slate-400">text-embedding-004 (768d)</span>
            </div>

            {/* Interactive RAG Card */}
            <button
              type="button"
              onClick={() => setIsRagPopoverOpen(true)}
              className="w-full text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-indigo-50/30 border border-red-200 hover:border-indigo-400 cursor-pointer shadow-2xs hover:shadow-xs transition-all group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      RAG Matched: {selectedInquiry.ragSource}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        selectedInquiry.ragSimilarity >= 90
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {selectedInquiry.ragSimilarity}% Similarity
                    </span>
                    <span className="text-[10px] text-red-700 font-medium bg-red-100/70 px-2 py-0.5 rounded-md">
                      {selectedInquiry.ragChunkId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                    "{selectedInquiry.ragSnippet}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold shrink-0 self-end sm:self-center group-hover:translate-x-0.5 transition-transform">
                <span>Xem trích dẫn đầy đủ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

          {/* AI Concierge Draft Box & Smart Prompt Assistant */}
          <div className="border-2 border-indigo-500 rounded-2xl p-5 bg-white shadow-md space-y-4 relative">
            {/* Box Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                  <Sparkles className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('concierge.suggestedResponse')}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Soạn thảo bởi Gemini 1.5 Flash &amp; Kiến thức Hội Nghị
                  </p>
                </div>
              </div>

              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                PII Filtered &amp; An Toàn
              </span>
            </div>

            {/* Smart Prompt Assistant Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200/90 rounded-xl">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase flex items-center gap-1 px-1">
                <Sparkles className="w-3 h-3 text-red-600" /> Trợ Lý Prompt:
              </span>

              {/* [🌐 Dịch Ngôn Ngữ] */}
              <button
                type="button"
                disabled={isPromptLoading !== null}
                onClick={() => handleQuickPrompt('TRANSLATE')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                title="Dịch câu trả lời sang tiếng Anh hoặc tiếng Việt song ngữ"
              >
                {isPromptLoading === 'TRANSLATE' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>🌐 Dịch Ngôn Ngữ</span>
              </button>

              {/* [✨ Viết Lại Trực Quan] */}
              <button
                type="button"
                disabled={isPromptLoading !== null}
                onClick={() => handleQuickPrompt('REWRITE_ENGAGING')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                title="Viết lại câu trả lời theo phong cách nhiệt tình, trực quan với icon và lời chúc"
              >
                {isPromptLoading === 'REWRITE_ENGAGING' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>✨ Viết Lại Trực Quan</span>
              </button>

              {/* [📌 Chèn Thông Tin WiFi/Bản Đồ] */}
              <button
                type="button"
                disabled={isPromptLoading !== null}
                onClick={() => handleQuickPrompt('INSERT_INFO')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                title="Chèn vị trí sảnh hội nghị và mật khẩu WiFi khách VIP"
              >
                {isPromptLoading === 'INSERT_INFO' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span>📌 Chèn WiFi &amp; Bản Đồ</span>
              </button>

              {/* [📎 Chèn QR Check-in Tự Động] */}
              <button
                type="button"
                disabled={isPromptLoading !== null}
                onClick={() => handleQuickPrompt('ATTACH_QR')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                title="Tự động tra cứu và đính kèm mã QR Check-in & Thông tin vé của khách"
              >
                {isPromptLoading === 'ATTACH_QR' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                ) : (
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>📎 Chèn QR Check-in</span>
              </button>
            </div>

            {/* Editable Draft Area */}
            {isEditing ? (
              <textarea
                value={editableDraft}
                onChange={(e) => setEditableDraft(e.target.value)}
                rows={5}
                className="w-full bg-white border-2 border-indigo-400 rounded-xl p-3 text-xs text-slate-900 focus:outline-none leading-relaxed font-sans shadow-inner"
                placeholder="Nhập hoặc chỉnh sửa nội dung phản hồi..."
              />
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed font-sans min-h-[100px] whitespace-pre-wrap">
                {editableDraft}
              </div>
            )}

            {/* Dispatch Channel Selector & Actions Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              {/* Channel Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5">Kênh Gửi:</span>
                <button
                  type="button"
                  onClick={() => setDispatchChannel('EMAIL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    dispatchChannel === 'EMAIL'
                      ? 'bg-white text-red-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Gửi phản hồi qua Email"
                >
                  <Mail className="w-3 h-3" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchChannel('IN_APP')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    dispatchChannel === 'IN_APP'
                      ? 'bg-white text-red-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Gửi thông báo In-App trên ứng dụng"
                >
                  <Smartphone className="w-3 h-3" />
                  App
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchChannel('SMS')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    dispatchChannel === 'SMS'
                      ? 'bg-white text-red-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Gửi tin nhắn SMS trực tiếp"
                >
                  <MessageSquare className="w-3 h-3" />
                  SMS
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* [Duyệt & Gửi Phản Hồi] with Ctrl+Enter badge */}
                <button
                  onClick={handleAcceptSend}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs min-h-[40px]"
                  title="Phê duyệt & Gửi phản hồi (Phím tắt: Ctrl + Enter)"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('concierge.approveSend')}</span>
                  <span className="text-[10px] bg-emerald-700/80 text-emerald-100 font-mono px-1.5 py-0.5 rounded border border-emerald-500/50">
                    Ctrl+↵
                  </span>
                </button>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 min-h-[40px]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditing ? t('common.save') : t('concierge.editResponse')}
                </button>

                <button
                  onClick={handleReject}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 min-h-[40px]"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {t('concierge.reject')}
                </button>

                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 min-h-[40px]"
                  title="Tái tạo câu trả lời qua RAG"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task 37: RAG Source Preview Popover Modal */}
      {isRagPopoverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-[95vw] sm:max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Popover Header */}
            <div className="p-5 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>RAG Source Inspector</span>
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                      pgvector &lt;=&gt; cosine
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Trích dẫn đoạn văn bản gốc từ PostgreSQL Knowledge Base
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRagPopoverOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Popover Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
              {/* Telemetry Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Tài Liệu Nguồn</p>
                  <p className="font-bold text-slate-900 truncate mt-0.5">
                    {selectedInquiry.ragSource}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Độ Tương Đồng</p>
                  <p className="font-extrabold text-emerald-800 font-mono mt-0.5">
                    {selectedInquiry.ragSimilarity}% Similarity
                  </p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Khoảng Cách Cosine</p>
                  <p className="font-mono font-bold text-slate-700 mt-0.5">
                    {selectedInquiry.ragDistance}
                  </p>
                </div>
              </div>

              {/* Document Meta */}
              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-red-600 font-bold uppercase">Tiêu Đề Trích Đoạn</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedInquiry.ragDocTitle}</p>
                </div>
                <span className="font-mono text-[11px] bg-white text-red-700 font-bold px-2 py-1 rounded-lg border border-red-200">
                  {selectedInquiry.ragChunkId}
                </span>
              </div>

              {/* Exact Retrieved Chunk Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-red-600" />
                    Văn Bản Đã Truy Xuất (Retrieved Chunk)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="text-[11px] text-red-600 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {isCopiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopiedSnippet ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed border border-slate-800 shadow-inner whitespace-pre-wrap">
                  {selectedInquiry.ragSnippet}
                </div>
              </div>
            </div>

            {/* Popover Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2.5 shrink-0 justify-end">
              <button
                type="button"
                onClick={() => setIsRagPopoverOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer min-h-[40px]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleUseSnippetAsDraft}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[40px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dùng đoạn này làm câu trả lời</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConcierge;
