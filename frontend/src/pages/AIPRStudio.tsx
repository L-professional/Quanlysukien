import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Bot,
  Copy,
  RefreshCw,
  Globe,
  Mail,
  Share2,
  Bell,
  Download,
  Check,
  Tag,
  Users,
  Calendar,
  MapPin,
  Layers,
  Smartphone,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiService } from '../services/api';
import { useEvent } from '../context/EventContext';
import { useAuth } from '../context/AuthContext';
import { Event } from '../types';

/** Clean random hash/UUID suffixes like "db3f53", "- a4a703", "_e8b12c", "(db3f53)" from event titles */
export function cleanEventTitle(title?: string): string {
  if (!title) return '';
  return title
    // Remove trailing full UUID with optional delimiters
    .replace(/\s*[-_#(]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[)\]]?$/i, '')
    // Remove trailing 6-8 char hex with delimiters e.g. " - db3f53", "(a4a703)", "[db3f53]", "_e8b12c"
    .replace(/\s*[-_#([][0-9a-f]{6,8}[)\]]?$/i, '')
    // Remove trailing standalone hex hash e.g. " db3f53"
    .replace(/\s+\b[0-9a-f]{6,8}\b$/i, '')
    .trim();
}

/** Format date string for dropdown label e.g. "16/09/2026" */
function formatEventDateLabel(event: Event): string {
  if (event.start_date) {
    const part = event.start_date.split(' ')[0];
    if (part.includes('/')) return part;
    if (part.includes('-')) {
      const [y, m, d] = part.split('T')[0].split('-');
      if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  if (event.start_time) {
    const match = event.start_time.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
    if (match) return match[0];
    if (event.start_time.includes('-') || event.start_time.includes('T')) {
      const d = new Date(event.start_time);
      if (!isNaN(d.getTime())) {
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
    }
  }
  return '16/09/2026';
}

/** Format event date/time for the PR form */
function formatEventTimeForPR(event: Event): string {
  if (event.start_date && event.end_date) {
    const sParts = event.start_date.split(' ');
    const eParts = event.end_date.split(' ');
    const sDate = sParts[0];
    const sTime = sParts[1] || '08:30';
    const eDate = eParts[0];
    const eTime = eParts[1] || '17:30';

    if (sDate === eDate) {
      return `${sDate} • ${sTime} - ${eTime}`;
    }
    const sDayMonth = sDate.split('/').slice(0, 2).join('/');
    return `${sDayMonth} - ${eDate} • ${sTime} - ${eTime}`;
  }
  if (event.start_date) {
    return event.start_date;
  }
  if (event.start_time) {
    return event.end_time ? `${event.start_time} - ${event.end_time}` : event.start_time;
  }
  return '15-16 Tháng 10, 2026 • 08:30 - 17:30';
}

/** Map category ID to readable Vietnamese name */
function getCategoryName(categoryId?: number): string {
  switch (categoryId) {
    case 1:
      return 'Công nghệ & AI';
    case 2:
      return 'Hội thảo Chuyên gia';
    case 3:
      return 'Kinh doanh & Đầu tư';
    case 4:
      return 'Gala & Tri ân';
    case 5:
      return 'Ra mắt Sản phẩm';
    default:
      return 'Công nghệ & Trí Tuệ Nhân Tạo';
  }
}

/** Extract keywords from event */
function extractKeywords(event: Event): string {
  const base = ['EventHub AI', 'QR Check-in'];
  if (event.category_id === 1 || (event.title && event.title.toLowerCase().includes('ai'))) {
    base.push('RAG', 'AI Concierge', 'Công nghệ số');
  } else if (event.category_id === 3) {
    base.push('Doanh nghiệp', 'Đầu tư', 'Khởi nghiệp');
  } else {
    base.push('Hội thảo', 'Networking VIP', 'Sự kiện');
  }
  return base.join(', ');
}

/** Extract main topic from event description or title */
function extractMainTopic(event: Event): string {
  if (event.description && event.description.trim()) {
    const desc = event.description.trim();
    if (desc.length <= 120) return desc;
    const firstSentence = desc.split(/[.\n]/)[0];
    return firstSentence.length > 20 ? firstSentence : desc.slice(0, 120) + '...';
  }
  return `Giới thiệu và kết nối tại sự kiện ${event.title}`;
}

export const AIPRStudio: React.FC = () => {
  const { t } = useTranslation();
  const { events } = useEvent();
  const { selectedRole } = useAuth();
  // Dynamic RBAC Permission Guard (Task 64: Chỉ Quản lý và Admin có quyền duyệt bài PR Studio)
  const canApproveAIPost = selectedRole === 'ORGANIZER' || selectedRole === 'ADMIN';

  // Event Selection & Auto-fill State (Task 57 & Task 59)
  const [eventList, setEventList] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('manual');
  const [_isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [eventLifecycle, setEventLifecycle] = useState<'UPCOMING' | 'CONCLUDED'>('UPCOMING');

  // 100% Form State Binding
  const [eventName, setEventName] = useState<string>('EventHub AI Summit 2026');
  const [eventCategory, setEventCategory] = useState<string>('Công nghệ & Trí Tuệ Nhân Tạo');
  const [eventTime, setEventTime] = useState<string>('15-16 Tháng 10, 2026 • 08:30 - 17:30');
  const [targetAudience, setTargetAudience] = useState<string>('Lãnh đạo doanh nghiệp, Kỹ sư phần mềm & Cộng đồng AI');
  const [eventLocation, setEventLocation] = useState<string>('GEM Center, TP. Hồ Chí Minh');
  const [mainTopic, setMainTopic] = useState<string>('Hệ thống AI Concierge & Tự động hóa Soát vé QR');
  const [keywords, setKeywords] = useState<string>('EventHub AI, RAG, pgvector, QR Check-in, Công nghệ số');
  const [tone, setTone] = useState<'professional' | 'engaging' | 'casual'>('engaging');

  // Generation & Tab State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'email' | 'social' | 'reminder'>('email');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [generatedResults, setGeneratedResults] = useState<{
    email: string;
    social: string;
    reminder: string;
    email_subject?: string;
    email_cta?: string;
    social_hook?: string;
    social_hashtags?: string[];
    sms_reminder?: string;
  } | null>(null);

  // 1. Fetch danh sách các sự kiện hiện có từ Backend API hoặc Context (Task 57)
  useEffect(() => {
    let isMounted = true;
    const loadEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const fetched = await apiService.getEvents();
        if (isMounted && fetched && Array.isArray(fetched) && fetched.length > 0) {
          setEventList(fetched);
          return;
        }
      } catch {
        // Fallback to events from context
      }
      if (isMounted) {
        setEventList(events || []);
      }
      setIsLoadingEvents(false);
    };
    loadEvents();
    return () => {
      isMounted = false;
    };
  }, [events]);

  // 3. Lập trình Logic Auto-Fill Dữ Liệu hoặc Xóa Trống khi chọn Nhập Thủ Công (Task 57 & Task 59)
  const handleSelectEvent = (eventIdStr: string) => {
    setSelectedEventId(eventIdStr);

    if (eventIdStr === 'manual' || !eventIdStr) {
      // Khi người dùng chuyển lại chọn "✍️ Nhập thủ công": Tự động xóa trống form
      setEventLifecycle('UPCOMING');
      setEventName('');
      setEventCategory('');
      setEventTime('');
      setEventLocation('');
      setTargetAudience('');
      setMainTopic('');
      setKeywords('');
      toast.info('Đã chuyển sang chế độ nhập thủ công (form đã được làm mới).');
      return;
    }

    const eventId = parseInt(eventIdStr, 10);
    const ev = eventList.find((e) => e.id === eventId) || events.find((e) => e.id === eventId);
    if (!ev) return;
    const cleanedTitle = cleanEventTitle(ev.title) || ev.title || '';

    // Task 59: Lifecycle Detection
    // start_time > now => UPCOMING (Mời đăng ký / Quảng bá)
    // end_time < now => CONCLUDED (Tổng kết / Cảm ơn khách & Diễn giả)
    const now = new Date();
    const endTime = ev.end_time ? new Date(ev.end_time) : null;
    const isConcluded = ev.status === 'COMPLETED' || (endTime && !isNaN(endTime.getTime()) && endTime < now);
    const lifecycleMode: 'UPCOMING' | 'CONCLUDED' = isConcluded ? 'CONCLUDED' : 'UPCOMING';
    setEventLifecycle(lifecycleMode);

    // Auto-fill dữ liệu chi tiết của sự kiện vào các trường trong Form
    setEventName(cleanedTitle);
    setEventCategory(getCategoryName(ev.category_id));
    setEventTime(formatEventTimeForPR(ev));
    setEventLocation(ev.location_address || ev.location || '');

    const eventTopic = cleanEventTitle(extractMainTopic(ev));

    if (lifecycleMode === 'CONCLUDED') {
      setTargetAudience('Toàn thể đại biểu, khách tham dự, đối tác & diễn giả đã đồng hành');
      setMainTopic(`Tổng kết sự kiện ${cleanedTitle} — Tri ân diễn giả và gửi lời cảm ơn sâu sắc tới toàn thể khách tham dự: ${eventTopic}`);
      setKeywords('Tổng kết, Tri ân diễn giả, Khảo sát ý kiến, Khoảnh khắc đáng nhớ, Slide bài giảng');
      toast.success(`Đã nhận diện: Sự kiện "${cleanedTitle}" ĐÃ KẾT THÚC. Tự động áp dụng chế độ Tổng kết & Tri ân!`);
    } else {
      setTargetAudience('Lãnh đạo doanh nghiệp, Kỹ sư phần mềm & Cộng đồng công nghệ');
      setMainTopic(`Quảng bá sự kiện & Mời đăng ký tham dự ${cleanedTitle}: ${eventTopic}`);
      setKeywords(extractKeywords(ev));
      toast.success(`Đã nhận diện: Sự kiện "${cleanedTitle}" SẮP DIỄN RA. Tự động áp dụng chế độ Mời đăng ký & Quảng bá!`);
    }
  };

  // Quick categories
  const CATEGORY_CHIPS = [
    'Công nghệ & AI',
    'Hội thảo Chuyên gia',
    'Gala & Tri ân',
    'Kinh doanh & Đầu tư',
    'Ra mắt Sản phẩm',
  ];

  // Quick keywords suggestions
  const KEYWORD_SUGGESTIONS = [
    'EventHub AI',
    'RAG',
    'QR Check-in',
    'AI Concierge',
    'Chuyển đổi số',
    'Networking VIP',
  ];

  // Quick sample topics
  const SAMPLE_TOPICS = [
    'Hệ thống AI Concierge & Tự động hóa Soát vé QR',
    'Ứng dụng Generative AI & pgvector trong vận hành sự kiện',
    'Bùng nổ kết nối và cơ hội hợp tác tại EventHub Summit 2026',
  ];

  // Interactive Tone Selector configurations
  const TONE_OPTIONS: Array<{
    value: 'professional' | 'engaging' | 'casual';
    label: string;
    icon: string;
    desc: string;
    activeBorder: string;
    activeBg: string;
    activeText: string;
  }> = [
    {
      value: 'professional',
      label: t('prStudio.professional') || 'Chuyên nghiệp',
      icon: '💼',
      desc: 'Chỉn chu, học thuật, đáng tin cậy',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      activeBg: 'bg-blue-50',
      activeText: 'text-blue-700 font-bold',
    },
    {
      value: 'engaging',
      label: t('prStudio.engaging') || 'Thu hút / Hào hứng',
      icon: '🔥',
      desc: 'Năng động, truyền cảm hứng, kích thích tham gia',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20',
      activeBg: 'bg-indigo-50',
      activeText: 'text-indigo-700 font-bold',
    },
    {
      value: 'casual',
      label: t('prStudio.casual') || 'Thân mật / Gần gũi',
      icon: '💬',
      desc: 'Thân thiện, tự nhiên, dễ kết nối',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      activeBg: 'bg-emerald-50',
      activeText: 'text-emerald-700 font-bold',
    },
  ];

  const handleGenerate = async () => {
    if (!mainTopic.trim()) {
      toast.error(t('prStudio.topicPlaceholder') || 'Vui lòng nhập chủ đề chính cần truyền thông');
      return;
    }

    setIsGenerating(true);

    try {
      const res = await apiService.generatePRContent({
        event_name: eventName.trim(),
        event_category: eventCategory.trim(),
        event_time: eventTime.trim(),
        target_audience: targetAudience.trim(),
        event_location: eventLocation.trim(),
        main_topic: mainTopic.trim(),
        keywords: keywords.trim(),
        tone_of_voice: tone,
        content_type: 'all',
        lifecycle: eventLifecycle,
      });

      setGeneratedResults(res);
      toast.success(t('common.success') || 'Tạo bộ nội dung truyền thông thành công!');
    } catch (err) {
      console.error('Error generating PR content:', err);
      toast.error(t('common.error') || 'Có lỗi xảy ra khi tạo bài PR. Vui lòng thử lại!');
    } finally {
      setIsGenerating(false);
    }
  };

  const getActiveTabRawContent = (): string => {
    if (!generatedResults) return '';
    return generatedResults[activeTab] || '';
  };

  const handleCopyContent = () => {
    const textToCopy = getActiveTabRawContent();
    if (!textToCopy) {
      toast.error('Chưa có nội dung để sao chép.');
      return;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopiedTab(activeTab);
    setTimeout(() => setCopiedTab(null), 2000);
    toast.success(t('prStudio.copied') || 'Đã sao chép nội dung vào bộ nhớ tạm!');
  };

  const handleExportDocument = () => {
    if (!generatedResults) {
      toast.error('Vui lòng tạo nội dung trước khi xuất tài liệu.');
      return;
    }

    const timestamp = new Date().toLocaleString('vi-VN');
    const docContent = `# BỘ ẤN PHẨM TRUYỀN THÔNG & PR STUDIO - EVENTHUB AI
Thời gian xuất: ${timestamp}
Sự kiện: ${eventName}
Chủ đề: ${mainTopic}
Danh mục: ${eventCategory}
Thời gian: ${eventTime}
Địa điểm: ${eventLocation}
Đối tượng: ${targetAudience}
Tông giọng: ${tone.toUpperCase()}
Từ khóa: ${keywords}

=======================================================
1. BẢN TIN EMAIL (EMAIL NEWSLETTER)
=======================================================
${generatedResults.email}

=======================================================
2. BÀI ĐĂNG MẠNG XÃ HỘI (SOCIAL MEDIA POST)
=======================================================
${generatedResults.social}

=======================================================
3. TIN NHẮC SỰ KIỆN (SMS / MOBILE PUSH NOTIFICATION)
=======================================================
${generatedResults.reminder}

-------------------------------------------------------
Được biên soạn tự động bởi EventHub AI PR & Content Studio
`;

    const blob = new Blob([docContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = eventName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    link.href = url;
    link.download = `PR_Package_${safeName || 'eventhub'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('prStudio.exportSuccess') || 'Đã xuất và tải file văn bản thành công!');
  };

  const addKeyword = (kw: string) => {
    if (!keywords.includes(kw)) {
      setKeywords((prev) => (prev ? `${prev}, ${kw}` : kw));
    }
  };

  const TABS = [
    {
      id: 'email',
      label: t('prStudio.emailTab') || 'Bản Tin Email',
      icon: Mail,
      badge: 'Subject & CTA',
    },
    {
      id: 'social',
      label: t('prStudio.socialTab') || 'Bài Đăng Mạng Xã Hội',
      icon: Share2,
      badge: 'Hook & Hashtags',
    },
    {
      id: 'reminder',
      label: t('prStudio.reminderTab') || 'Tin Nhắc Sự Kiện',
      icon: Bell,
      badge: 'SMS & Push',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {t('prStudio.title') || 'AI PR & Truyền Thông Studio'}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {t('prStudio.subtitle') || 'Tạo bài viết truyền thông, thông cáo báo chí và mạng xã hội tự động bằng mô hình AI Gemini RAG'}
          </p>
        </div>

        {generatedResults && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDocument}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              {t('prStudio.exportDoc') || 'Xuất Khung Văn Bản'}
            </button>
            <button
              onClick={handleCopyContent}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {copiedTab === activeTab ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedTab === activeTab ? 'Đã sao chép!' : (t('prStudio.copyContent') || 'Sao Chép Nội Dung')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form State Binding & Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            {/* 2. Bổ Sung Bộ Chọn Sự Kiện (Event Selector UI) - Task 57 */}
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Chọn Sự Kiện Đã Tạo (Auto-Fill)</span>
                </label>
                {selectedEventId !== 'manual' && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Đã trích xuất
                  </span>
                )}
              </div>

              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => handleSelectEvent(e.target.value)}
                  className="w-full bg-indigo-50/40 hover:bg-indigo-50/70 border border-indigo-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none transition-all cursor-pointer shadow-2xs appearance-none pr-10"
                >
                  <option value="manual">✍️ Nhập thủ công (Tạo quảng bá sự kiện mới)</option>
                  {eventList.map((ev) => {
                    const displayTitle = cleanEventTitle(ev.title) || 'Sự kiện chưa đặt tên';
                    const dateLabel = formatEventDateLabel(ev);
                    return (
                      <option key={ev.id} value={ev.id.toString()}>
                        {`${displayTitle} - ${dateLabel}`}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {selectedEventId === 'manual'
                  ? '💡 Chọn một sự kiện từ danh sách để tự động điền thông tin, hoặc nhập nội dung tùy ý bên dưới.'
                  : '✨ Thông tin đã được trích xuất tự động vào form. Bạn có thể tự do chỉnh sửa câu từ bên dưới trước khi tạo bài viết bằng AI.'}
              </p>

              {/* Lifecycle Context Indicator & Mode Selector (Task 59) */}
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${eventLifecycle === 'CONCLUDED' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="text-[11px] font-bold text-slate-700">
                    Ngữ cảnh vòng đời:
                  </span>
                </div>
                <div className="inline-flex rounded-lg bg-white p-0.5 border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEventLifecycle('UPCOMING');
                      if (eventName) {
                        setMainTopic(`Quảng bá sự kiện & Mời đăng ký tham dự ${eventName}`);
                        setTargetAudience('Lãnh đạo doanh nghiệp, Kỹ sư phần mềm & Cộng đồng công nghệ');
                      }
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      eventLifecycle === 'UPCOMING'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🚀 Mời đăng ký / Quảng bá
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEventLifecycle('CONCLUDED');
                      if (eventName) {
                        setMainTopic(`Tổng kết sự kiện ${eventName}, tri ân diễn giả và gửi lời cảm ơn sâu sắc tới toàn thể khách tham dự`);
                        setTargetAudience('Toàn thể đại biểu, khách tham dự, đối tác & diễn giả đã đồng hành');
                        setKeywords('Tổng kết, Tri ân diễn giả, Khảo sát ý kiến, Khoảnh khắc đáng nhớ, Slide bài giảng');
                      }
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      eventLifecycle === 'CONCLUDED'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏁 Tổng kết / Tri ân & Khảo sát
                  </button>
                </div>
              </div>
            </div>

            {/* Event Name & Category */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                {t('prStudio.eventName') || 'Tên Sự Kiện'}
              </h3>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Nhập tên sự kiện..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Category with quick chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                {t('prStudio.eventCategory') || 'Danh Mục Sự Kiện'}
              </label>
              <input
                type="text"
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                placeholder="Nhập danh mục sự kiện..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORY_CHIPS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEventCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      eventCategory === cat
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Time & Hall / Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  {t('prStudio.time') || 'Thời Gian'}
                </label>
                <input
                  type="text"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  placeholder="VD: 15-16 Oct 2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  {t('prStudio.location') || 'Hội Trường / Địa Điểm'}
                </label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="VD: GEM Center"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                {t('prStudio.audience') || 'Người Dùng / Đối Tượng Mục Tiêu'}
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="VD: Tech Leaders, Kỹ Sư AI, Sinh viên..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Main Topic */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                {t('prStudio.contentTopic') || 'Chủ Đề Chính'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t('prStudio.topicPlaceholder') || 'Ví dụ: Giới thiệu hệ thống AI Concierge tại AI Summit 2026...'}
                value={mainTopic}
                onChange={(e) => setMainTopic(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />

              {/* Sample Topic Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SAMPLE_TOPICS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMainTopic(prompt)}
                    className="text-left px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 transition-colors cursor-pointer"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Key Keywords */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                {t('prStudio.keywords') || 'Từ Khóa Chính'}
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder={t('prStudio.keywordsPlaceholder') || 'Ví dụ: AI, RAG, QR Check-in...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {KEYWORD_SUGGESTIONS.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => addKeyword(kw)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    +{kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Tone Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-900">
                {t('prStudio.toneStyle') || 'Bộ Chọn Tông Giọng (Tone of Voice)'}:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TONE_OPTIONS.map((opt) => {
                  const isActive = tone === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTone(opt.value)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isActive
                          ? `${opt.activeBorder} ${opt.activeBg}`
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-base">{opt.icon}</span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                        )}
                      </div>
                      <div>
                        <div className={`text-xs ${isActive ? opt.activeText : 'font-bold text-slate-800'}`}>
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          {opt.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !mainTopic.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  {t('prStudio.generating') || 'Đang tạo nội dung bằng Gemini AI...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  {t('prStudio.generateBtn') || '✨ Tạo Nội Dung Bằng AI'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Multi-Tab Output & Skeleton Loading */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[560px]">
            {/* Tab Bar */}
            <div className="flex items-center gap-2 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'email' | 'social' | 'reminder')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              {isGenerating ? (
                /* Skeleton Loading State */
                <div className="space-y-6 py-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                    </div>
                    <div>
                      <div className="h-4 w-48 bg-slate-200 rounded-md" />
                      <div className="h-3 w-32 bg-slate-100 rounded-md mt-1.5" />
                    </div>
                  </div>

                  {/* Simulated Subject / Hook box */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="h-3.5 w-24 bg-indigo-200 rounded" />
                    <div className="h-4 w-5/6 bg-slate-200 rounded" />
                  </div>

                  {/* Simulated Paragraphs */}
                  <div className="space-y-2.5 pt-2">
                    <div className="h-3.5 w-full bg-slate-200 rounded" />
                    <div className="h-3.5 w-11/12 bg-slate-200 rounded" />
                    <div className="h-3.5 w-4/5 bg-slate-200 rounded" />
                    <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3.5 w-5/6 bg-slate-200 rounded" />
                  </div>

                  {/* Simulated Action / Hashtags pills */}
                  <div className="flex gap-2 pt-4">
                    <div className="h-8 w-28 bg-indigo-100 rounded-lg" />
                    <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                    <div className="h-8 w-20 bg-slate-100 rounded-lg" />
                  </div>

                  <div className="pt-8 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-500 animate-bounce" />
                    Gemini 2.5 đang biên soạn và tối ưu đa kênh theo phong cách {tone.toUpperCase()}...
                  </div>
                </div>
              ) : generatedResults ? (
                /* Multi-Tab Rendered Content */
                <div className="space-y-5">
                  {/* Tab 1: Bản tin Email */}
                  {activeTab === 'email' && (
                    <div className="space-y-4">
                      {generatedResults.email_subject && (
                        <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                              {t('prStudio.emailSubject') || 'Tiêu Đề Email (Subject)'}
                            </span>
                            <p className="text-xs font-bold text-slate-900">{generatedResults.email_subject}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedResults.email_subject || '');
                              toast.success('Đã sao chép tiêu đề email!');
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                            title="Sao chép tiêu đề"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-h-[360px] overflow-y-auto font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {generatedResults.email}
                      </div>

                      {generatedResults.email_cta && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              CTA
                            </span>
                            <span className="text-xs font-bold text-emerald-900">{generatedResults.email_cta}</span>
                          </div>
                          <span className="text-[11px] text-emerald-600 font-medium">Nút chuyển đổi</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Bài Đăng Mạng Xã Hội */}
                  {activeTab === 'social' && (
                    <div className="space-y-4">
                      {generatedResults.social_hook && (
                        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-3.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 block mb-1">
                            {t('prStudio.socialHook') || 'Câu Mở Đầu Giật Tít (Hook)'}
                          </span>
                          <p className="text-xs font-bold text-slate-900">{generatedResults.social_hook}</p>
                        </div>
                      )}

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-h-[360px] overflow-y-auto font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {generatedResults.social}
                      </div>

                      {generatedResults.social_hashtags && generatedResults.social_hashtags.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            {t('prStudio.hashtags') || 'Thẻ Hashtags Đề Xuất'}:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {generatedResults.social_hashtags.map((tag, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(tag);
                                  toast.success(`Đã sao chép ${tag}`);
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-indigo-100"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Tin Nhắc Sự Kiện */}
                  {activeTab === 'reminder' && (
                    <div className="space-y-4">
                      {/* Mobile Notification Frame Mockup */}
                      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3 border border-slate-800">
                        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-semibold text-slate-300">Push Notification / SMS</span>
                          </div>
                          <span className="text-[10px]">Vừa xong • EventHub AI</span>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white">
                            <Bell className="w-4 h-4" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              ⏰ Nhắc Lịch Tham Dự: {eventName}
                            </h4>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              {generatedResults.reminder}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-800/80 rounded-xl p-2.5 text-[11px] text-indigo-300 flex items-center justify-between">
                          <span>🎟️ Yêu cầu xuất trình vé tại cổng</span>
                          <span className="font-bold text-white bg-indigo-600/80 px-2 py-0.5 rounded">Mã QR Sẵn Sàng</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                        {generatedResults.reminder}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty Placeholder State */
                <div className="text-center py-24 space-y-3 text-slate-400 my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">Chưa Có Ấn Phẩm Nào Được Sinh</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Điền đầy đủ thông tin sự kiện bên trái, chọn tông giọng và bấm nút [✨ Tạo Nội Dung Bằng AI] để Gemini tạo 3 bản tin truyền thông chuyên biệt.
                  </p>
                </div>
              )}

              {/* Quick Content Actions Toolbar (Requirement 4) */}
              {generatedResults && !isGenerating && (
                <div className="pt-5 mt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyContent}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      {copiedTab === activeTab ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                      {t('prStudio.copyContent') || '📋 Sao Chép Nội Dung'}
                    </button>

                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isGenerating ? 'animate-spin' : ''}`} />
                      {t('prStudio.regenerate') || '🔄 Tạo Lại Bản Khác'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportDocument}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('prStudio.exportDoc') || 'Xuất Văn Bản'}</span>
                    </button>

                    {canApproveAIPost && (
                      <button
                        type="button"
                        onClick={() => {
                          toast.success('🎉 Đã duyệt bài AI & lưu vào chiến dịch truyền thông sự kiện thành công!');
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>✓ Duyệt Bài AI & Phát Hành</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPRStudio;

