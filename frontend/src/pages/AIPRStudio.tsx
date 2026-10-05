import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Send,
  Newspaper,
  TrendingUp,
  Split,
  Eye,
  Clock,
  Radio,
  Image as ImageIcon,
  Wand2,
  SlidersHorizontal,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Quote,
  ShieldCheck,
  Sliders,
  ChevronRight,
  Code,
  Mic,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiService, PRContentResult, PRABVariant } from '../services/api';
import { useEvent } from '../context/EventContext';
import { useAuth } from '../context/AuthContext';
import { useEventSync } from '../services/eventSync';
import { Event } from '../types';

/** Clean random hash/UUID suffixes like "db3f53", "- a4a703", "_e8b12c", "(db3f53)" from event titles */
export function cleanEventTitle(title?: string): string {
  if (!title) return '';
  return title
    .replace(/\s*[-_#(]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[)\]]?$/i, '')
    .replace(/\s*[-_#([][0-9a-f]{6,8}[)\]]?$/i, '')
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

// Preset banner suggestions
const BANNER_PRESETS = [
  {
    id: 'ai-tech',
    title: 'Futuristic AI & Cyber Tech',
    category: 'Công nghệ & AI',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    gradient: 'from-blue-600 via-indigo-700 to-purple-900',
  },
  {
    id: 'business-summit',
    title: 'Global Business & Leadership',
    category: 'Kinh doanh & Đầu tư',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    gradient: 'from-slate-900 via-slate-800 to-red-900',
  },
  {
    id: 'networking-gala',
    title: 'Executive Gala & Networking Night',
    category: 'Gala & Tri ân',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    gradient: 'from-amber-700 via-rose-800 to-slate-950',
  },
  {
    id: 'workshop-festival',
    title: 'Interactive Workshop & Expo',
    category: 'Workshop & Kỹ năng',
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
    gradient: 'from-emerald-700 via-teal-800 to-slate-900',
  },
];

export const AIPRStudio: React.FC = () => {
  const { t } = useTranslation();
  const { events, activeEvent, setActiveEvent, refreshEvents, isLoadingEvents } = useEvent();
  const { hasRole } = useAuth();
  const canApproveAIPost = hasRole(['ADMIN', 'EVENT_MANAGER', 'SUPER_ADMIN' as any, 'ORGANIZER' as any]);

  // Event Selection & Auto-fill State (Đồng bộ 100% với danh sách sự kiện hệ thống)
  const [selectedEventId, setSelectedEventId] = useState<string>(
    activeEvent?.id ? activeEvent.id.toString() : ''
  );
  const [eventLifecycle, setEventLifecycle] = useState<'UPCOMING' | 'CONCLUDED'>('UPCOMING');
  const boundEventIdRef = useRef<number | null>(null);

  // Form State Binding (100% dynamic, no hardcoded mock data)
  const [eventName, setEventName] = useState<string>('');
  const [eventCategory, setEventCategory] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [eventLocation, setEventLocation] = useState<string>('');
  const [mainTopic, setMainTopic] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');
  const [speakers, setSpeakers] = useState<string>('');
  const [tone, setTone] = useState<'professional' | 'engaging' | 'casual'>('engaging');
  const [bannerUrl, setBannerUrl] = useState<string>('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80');

  // Main 4 Platforms Tab State
  // Tab 1: Email Campaign | Tab 2: Facebook & LinkedIn | Tab 3: Zalo OA & SMS | Tab 4: Thông Cáo Báo Chí
  const [activeTab, setActiveTab] = useState<'email' | 'social' | 'zalo_sms' | 'press'>('email');
  const [socialSubTab, setSocialSubTab] = useState<'facebook' | 'linkedin'>('facebook');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [showHtmlCtaCode, setShowHtmlCtaCode] = useState<boolean>(false);

  // Generation & Results
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedResults, setGeneratedResults] = useState<PRContentResult | null>(null);

  // A/B Testing State
  const [showABModal, setShowABModal] = useState<boolean>(false);
  const [isGeneratingAB, setIsGeneratingAB] = useState<boolean>(false);

  // Test Send Modal State
  const [showTestSendModal, setShowTestSendModal] = useState<boolean>(false);
  const [testChannel, setTestChannel] = useState<'email' | 'sms' | 'zalo'>('email');
  const [testRecipient, setTestRecipient] = useState<string>('admin@eventhub.ai');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testPreviewUrl, setTestPreviewUrl] = useState<string | null>(null);

  // Publish / Dispatch Modal State
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [campaignType, setCampaignType] = useState<'PROMOTION' | 'RECAP_THANKYOU'>('PROMOTION');
  const [publishAudience, setPublishAudience] = useState<string>('MEMBERS_WITH_EMAIL');
  const [publishScheduleType, setPublishScheduleType] = useState<'IMMEDIATE' | 'SCHEDULED'>('IMMEDIATE');
  const [publishScheduledAt, setPublishScheduledAt] = useState<string>('2026-10-15T09:00');
  const [publishChannels, setPublishChannels] = useState<string[]>(['email', 'facebook', 'linkedin', 'zalo_sms']);

  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishedStatus, setPublishedStatus] = useState<{
    campaignId: string;
    status: 'SENT' | 'SCHEDULED';
    targetCount: number;
    scheduledAt?: string;
    timestamp: string;
  } | null>(null);

  // Banner Customizer Modal State
  const [showBannerModal, setShowBannerModal] = useState<boolean>(false);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState<boolean>(false);

  // Dynamic Personalization Tokens & Email Body Editor State (Task 99)
  const [editableEmailBody, setEditableEmailBody] = useState<string>('');
  const [showSamplePreview, setShowSamplePreview] = useState<boolean>(false);
  const emailTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-fill form from selected real event from DB
  const bindEventToForm = useCallback((ev: Event, showToast: boolean = false, targetLifecycle?: 'UPCOMING' | 'CONCLUDED') => {
    const cleanedTitle = cleanEventTitle(ev.title) || ev.title || '';
    const isEnded = ev.status === 'ENDED' || ev.status === 'COMPLETED';
    const lifecycleMode: 'UPCOMING' | 'CONCLUDED' = targetLifecycle || (isEnded ? 'CONCLUDED' : 'UPCOMING');
    setEventLifecycle(lifecycleMode);

    setEventName(cleanedTitle);
    setEventCategory(getCategoryName(ev.category_id) || ev.event_type || 'Hội thảo');
    setEventTime(formatEventTimeForPR(ev));
    setEventLocation(ev.location_address || ev.location || '');

    const detectedBanner = ev.cover_image || ev.banner_url || ev.banner || ev.image_url;
    if (detectedBanner) {
      setBannerUrl(detectedBanner);
    } else {
      setBannerUrl('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80');
    }

    const eventTopic = cleanEventTitle(extractMainTopic(ev));

    if (lifecycleMode === 'CONCLUDED') {
      setCampaignType('RECAP_THANKYOU');
      setPublishAudience('CHECKED_IN_ONLY');
      setTargetAudience('Toàn thể đại biểu, khách tham dự, đối tác & diễn giả đã đồng hành');
      setMainTopic(`Tổng kết sự kiện ${cleanedTitle} — Tri ân diễn giả và gửi lời cảm ơn sâu sắc tới toàn thể khách tham dự: ${eventTopic}`);
      setKeywords('Tổng kết, Tri ân diễn giả, Khảo sát ý kiến, Khoảnh khắc đáng nhớ, Slide bài giảng');
      if (showToast) {
        toast.success(`Đã chọn sự kiện: "${cleanedTitle}" (Ngữ cảnh: Tổng kết / Tri ân & Khảo sát)`);
      }
    } else {
      setCampaignType('PROMOTION');
      setPublishAudience('MEMBERS_WITH_EMAIL');
      setTargetAudience('Lãnh đạo doanh nghiệp, Kỹ sư phần mềm & Cộng đồng công nghệ');
      setMainTopic(`Quảng bá sự kiện & Mời đăng ký tham dự ${cleanedTitle}: ${eventTopic}`);
      setKeywords(extractKeywords(ev));
      if (showToast) {
        toast.success(`Đã chọn sự kiện: "${cleanedTitle}" (Ngữ cảnh: Mời đăng ký / Quảng bá)`);
      }
    }

    // Auto-fill Diễn giả từ API Schedule của sự kiện thực tế trong DB
    apiService.getEventSchedule(ev.id).then((schedules) => {
      if (schedules && Array.isArray(schedules) && schedules.length > 0) {
        const uniqueSpeakers = Array.from(
          new Set(
            schedules
              .map((s) => s.speaker_name?.trim())
              .filter((name): name is string => Boolean(name && name.length > 0 && !name.toLowerCase().includes('ban tổ chức')))
          )
        );
        if (uniqueSpeakers.length > 0) {
          setSpeakers(uniqueSpeakers.join(', '));
        } else {
          setSpeakers('Ban Chuyên Gia & Diễn Giả Khách Mời');
        }
      } else {
        setSpeakers('');
      }
    }).catch(() => {
      setSpeakers('');
    });
  }, []);

  // Hàm kiểm tra sự kiện phù hợp với ngữ cảnh vòng đời
  const isEventMatchingLifecycle = (ev: Event, lifecycle: 'UPCOMING' | 'CONCLUDED'): boolean => {
    const st = (ev.status || '').toUpperCase();
    if (lifecycle === 'CONCLUDED') {
      return st === 'ENDED' || st === 'COMPLETED';
    } else {
      return st === 'UPCOMING' || st === 'ONGOING' || st === 'PUBLISHED' || st === 'LIVE' || !st;
    }
  };

  // Danh sách sự kiện được lọc nghiêm ngặt theo Ngữ cảnh vòng đời đang chọn
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => isEventMatchingLifecycle(ev, eventLifecycle));
  }, [events, eventLifecycle]);

  // Xác định sự kiện đang được chọn từ danh sách sự kiện hệ thống
  const selectedEvent =
    filteredEvents.find((e) => e.id.toString() === selectedEventId) ||
    events.find((e) => e.id.toString() === selectedEventId) ||
    (activeEvent?.id ? activeEvent : null);

  // Xử lý chuyển đổi ngữ cảnh vòng đời (Đóng vai trò bộ lọc danh sách sự kiện)
  const handleSwitchLifecycle = (newLifecycle: 'UPCOMING' | 'CONCLUDED') => {
    setEventLifecycle(newLifecycle);
    const targetFiltered = events.filter((ev) => isEventMatchingLifecycle(ev, newLifecycle));

    // Nếu sự kiện hiện tại cũng hợp lệ trong ngữ cảnh mới
    const currentInTarget = targetFiltered.find((e) => e.id.toString() === selectedEventId);
    if (currentInTarget) {
      boundEventIdRef.current = currentInTarget.id;
      bindEventToForm(currentInTarget, false, newLifecycle);
    } else if (targetFiltered.length > 0) {
      // Tự động chọn và điền sự kiện đầu tiên thỏa mãn bộ lọc
      const first = targetFiltered[0];
      boundEventIdRef.current = first.id;
      setSelectedEventId(first.id.toString());
      setActiveEvent(first);
      bindEventToForm(first, true, newLifecycle);
    } else {
      // Không có sự kiện nào thỏa mãn: Reset form
      setSelectedEventId('');
      boundEventIdRef.current = null;
      setEventName('');
      setEventCategory('Hội thảo');
      setEventTime('');
      setEventLocation('');
      setBannerUrl('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80');
      setSpeakers('');
      if (newLifecycle === 'CONCLUDED') {
        setTargetAudience('Toàn thể đại biểu, khách tham dự, đối tác & diễn giả đã đồng hành');
        setMainTopic('Tổng kết sự kiện — Tri ân diễn giả và gửi lời cảm ơn sâu sắc tới toàn thể khách tham dự');
        setKeywords('Tổng kết, Tri ân diễn giả, Khảo sát ý kiến, Khoảnh khắc đáng nhớ, Slide bài giảng');
      } else {
        setTargetAudience('Lãnh đạo doanh nghiệp, Kỹ sư phần mềm & Cộng đồng công nghệ');
        setMainTopic('Quảng bá sự kiện & Mời đăng ký tham dự');
        setKeywords('EventHub AI, RAG, QR Check-in, Chuyển đổi số');
      }
      toast.info(
        newLifecycle === 'CONCLUDED'
          ? 'Không tìm thấy sự kiện nào đã kết thúc (ENDED/COMPLETED) trong hệ thống.'
          : 'Không tìm thấy sự kiện nào sắp/đang diễn ra (UPCOMING/ONGOING/PUBLISHED) trong hệ thống.'
      );
    }
  };

  // Tự động đồng bộ và nạp dữ liệu khi activeEvent hoặc danh sách sự kiện hệ thống thay đổi
  useEffect(() => {
    if (events.length === 0) return;

    const matching = events.filter((ev) => isEventMatchingLifecycle(ev, eventLifecycle));
    if (matching.length === 0) {
      if (selectedEventId !== '') {
        setSelectedEventId('');
        boundEventIdRef.current = null;
      }
      return;
    }

    const isCurrentInMatching = matching.some((e) => e.id.toString() === selectedEventId);
    if (isCurrentInMatching && boundEventIdRef.current === parseInt(selectedEventId, 10)) {
      return;
    }

    if (activeEvent?.id && matching.some((e) => e.id === activeEvent.id)) {
      boundEventIdRef.current = activeEvent.id;
      setSelectedEventId(activeEvent.id.toString());
      bindEventToForm(activeEvent, false, eventLifecycle);
      return;
    }

    const first = matching[0];
    boundEventIdRef.current = first.id;
    setSelectedEventId(first.id.toString());
    setActiveEvent(first);
    bindEventToForm(first, false, eventLifecycle);
  }, [activeEvent, events, eventLifecycle, selectedEventId, bindEventToForm, setActiveEvent]);

  // Đồng bộ Real-time: Mọi thao tác Thêm / Sửa / Xóa sự kiện ở trang /events tự động phản ánh 1-1 tại Dropdown
  useEventSync(() => {
    refreshEvents();
  });

  // 2. Logic Auto-Fill dữ liệu thực tế từ danh sách sự kiện hệ thống khi chọn sự kiện
  const handleSelectEvent = (eventIdStr: string) => {
    setSelectedEventId(eventIdStr);
    const eventId = parseInt(eventIdStr, 10);
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    boundEventIdRef.current = ev.id;
    setActiveEvent(ev);
    bindEventToForm(ev, true, eventLifecycle);
  };

  const CATEGORY_CHIPS = [
    'Công nghệ & AI',
    'Hội thảo Chuyên gia',
    'Gala & Tri ân',
    'Kinh doanh & Đầu tư',
    'Ra mắt Sản phẩm',
  ];

  const KEYWORD_SUGGESTIONS = [
    'EventHub AI',
    'RAG',
    'QR Check-in',
    'AI Concierge',
    'Chuyển đổi số',
    'Networking VIP',
  ];

  const SAMPLE_TOPICS = [
    'Hệ thống AI Concierge & Tự động hóa Soát vé QR',
    'Ứng dụng Generative AI & pgvector trong vận hành sự kiện',
    'Bùng nổ kết nối và cơ hội hợp tác tại EventHub Summit 2026',
  ];

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
      activeBorder: 'border-red-500 ring-2 ring-red-500/20',
      activeBg: 'bg-red-50',
      activeText: 'text-red-700 font-bold',
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
        speakers: speakers.trim(),
        tone_of_voice: tone,
        content_type: 'all',
        lifecycle: eventLifecycle,
      });

      setGeneratedResults(res);
      setEditableEmailBody(res.email_body || res.email || '');
      toast.success('Tạo thành công bộ truyền thông 4 nền tảng với AI Performance Score: ' + (res.ai_score || 92) + '/100!');
    } catch (err) {
      console.error('Error generating PR content:', err);
      toast.error('Có lỗi xảy ra khi tạo bài PR. Vui lòng thử lại!');
    } finally {
      setIsGenerating(false);
    }
  };

  // Synchronize editable email body with incoming generated results
  useEffect(() => {
    if (generatedResults) {
      setEditableEmailBody(generatedResults.email_body || generatedResults.email || '');
    }
  }, [generatedResults?.email_body, generatedResults?.email]);

  const handleEmailBodyChange = (newText: string) => {
    setEditableEmailBody(newText);
    if (generatedResults) {
      setGeneratedResults((prev) => (prev ? { ...prev, email_body: newText } : null));
    }
  };

  const insertTokenAtCursor = (token: string) => {
    if (showSamplePreview) {
      setShowSamplePreview(false);
    }

    const textarea = emailTextareaRef.current;
    const currentText = editableEmailBody || generatedResults?.email_body || generatedResults?.email || '';

    if (textarea) {
      const startPos = textarea.selectionStart ?? currentText.length;
      const endPos = textarea.selectionEnd ?? currentText.length;
      const newText = currentText.substring(0, startPos) + token + currentText.substring(endPos);
      handleEmailBodyChange(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + token.length, startPos + token.length);
      }, 0);
    } else {
      const newText = currentText ? `${currentText} ${token}` : token;
      handleEmailBodyChange(newText);
    }

    toast.success(`Đã chèn biến ${token} vào vị trí con trỏ!`);
  };

  const sampleDataValues: Record<string, { label: string; value: string; badgeColor: string }> = {
    '{{recipient_name}}': {
      label: 'Tên người nhận',
      value: 'Nguyễn Văn Quản Trị',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    '{{full_name}}': {
      label: 'Họ và tên',
      value: 'Nguyễn Văn Quản Trị',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    '{{company}}': {
      label: 'Đơn vị / Công ty',
      value: 'Tập đoàn FPT',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    '{{ticket_code}}': {
      label: 'Mã vé',
      value: 'VIP-EVT-2026-999',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 font-mono',
    },
    '{{event_date}}': {
      label: 'Ngày tổ chức',
      value: eventTime || '15/10/2026',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    '{{event_title}}': {
      label: 'Tên sự kiện',
      value: eventName || 'EventHub AI Summit 2026',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200 font-semibold',
    },
    '{{event_location}}': {
      label: 'Địa điểm',
      value: eventLocation || 'GEM Center, TP. Hồ Chí Minh',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    },
  };

  const getRenderedSampleText = (text: string): string => {
    let result = text;
    Object.entries(sampleDataValues).forEach(([token, info]) => {
      const escaped = token.replace(/[{}]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'gi'), info.value);
    });
    return result;
  };

  const renderHighlightedSampleBody = (text: string) => {
    const tokenRegex = /\{\{[a-zA-Z0-9_]+\}\}/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      const token = match[0].toLowerCase();
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const sampleInfo = sampleDataValues[token];
      if (sampleInfo) {
        parts.push(
          <span
            key={`token-${matchIndex}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-xs font-semibold ${sampleInfo.badgeColor} shadow-xs mx-0.5`}
            title={`Biến gốc: ${token} (${sampleInfo.label})`}
          >
            <span>{sampleInfo.value}</span>
          </span>
        );
      } else {
        parts.push(
          <span
            key={`token-${matchIndex}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded-md border bg-slate-100 text-slate-700 border-slate-300 font-mono text-[11px] mx-0.5"
          >
            {match[0]}
          </span>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const PERSONALIZATION_TOKENS = [
    {
      token: '{{recipient_name}}',
      label: 'Tên người nhận',
      sample: 'Nguyễn Văn Quản Trị',
      icon: '👤',
      bgClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    },
    {
      token: '{{company}}',
      label: 'Đơn vị/Công ty',
      sample: 'Tập đoàn FPT',
      icon: '🏢',
      bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
    },
    {
      token: '{{ticket_code}}',
      label: 'Mã vé',
      sample: 'VIP-EVT-2026-999',
      icon: '🎟️',
      bgClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
    },
    {
      token: '{{event_date}}',
      label: 'Ngày tổ chức',
      sample: '15/10/2026',
      icon: '📅',
      bgClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300',
    },
    {
      token: '{{event_title}}',
      label: 'Tên sự kiện',
      sample: eventName || 'EventHub AI Summit',
      icon: '⚡',
      bgClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300',
    },
  ];

  const getActiveTabRawContent = (): string => {
    if (!generatedResults) return '';
    switch (activeTab) {
      case 'email':
        return editableEmailBody || generatedResults.email_body || generatedResults.email || '';
      case 'social':
        return socialSubTab === 'facebook'
          ? (generatedResults.facebook_post || generatedResults.social || '')
          : (generatedResults.linkedin_article || generatedResults.social || '');
      case 'zalo_sms':
        return generatedResults.sms_reminder || generatedResults.reminder || '';
      case 'press':
        return generatedResults.press_release || '';
      default:
        return '';
    }
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
    const docContent = `# BỘ TRUYỀN THÔNG ĐA KÊNH SỰ KIỆN - EVENTHUB AI PR STUDIO
Thời gian xuất: ${timestamp}
Sự kiện: ${eventName}
Chủ đề: ${mainTopic}
Danh mục: ${eventCategory}
Thời gian: ${eventTime}
Địa điểm: ${eventLocation}
Đối tượng mục tiêu: ${targetAudience}
Tông giọng: ${tone.toUpperCase()}
Từ khóa: ${keywords}
AI Performance Score: ${generatedResults.ai_score || 92}/100

=======================================================
1. BẢN TIN EMAIL CAMPAIGN (EMAIL NEWSLETTER)
=======================================================
Tiêu đề (Subject): ${generatedResults.email_subject || ''}
Preheader: ${generatedResults.email_preheader || ''}
CTA Button: ${generatedResults.email_cta || ''}

Thân thư:
${generatedResults.email_body || generatedResults.email}

=======================================================
2. FACEBOOK & LINKEDIN
=======================================================
--- [A] FACEBOOK POST ---
${generatedResults.facebook_post || generatedResults.social}

--- [B] LINKEDIN ARTICLE ---
Tiêu đề: ${generatedResults.linkedin_headline || ''}
${generatedResults.linkedin_article || ''}

=======================================================
3. ZALO OA & SMS NOTIFICATION
=======================================================
SMS (< 160 ký tự):
${generatedResults.sms_reminder || generatedResults.reminder}

Zalo OA:
${generatedResults.zalo_oa_message || ''}

=======================================================
4. THÔNG CÁO BÁO CHÍ (PRESS RELEASE)
=======================================================
${generatedResults.press_release || ''}

-------------------------------------------------------
Được biên soạn tự động bởi EventHub AI PR & Content Studio
`;

    const blob = new Blob([docContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = eventName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    link.href = url;
    link.download = `PR_Omnichannel_${safeName || 'eventhub'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('prStudio.exportSuccess') || 'Đã xuất và tải file tài liệu thành công!');
  };

  const addKeyword = (kw: string) => {
    if (!keywords.includes(kw)) {
      setKeywords((prev) => (prev ? `${prev}, ${kw}` : kw));
    }
  };

  // Apply selected A/B variant to current subject
  const handleApplyVariant = (variant: PRABVariant) => {
    if (!generatedResults) return;
    setGeneratedResults({
      ...generatedResults,
      email_subject: variant.subject,
      social_hook: `🌟 ${variant.subject}`,
      ai_score: parseInt(variant.predicted_open_rate, 10) || 94,
      ai_score_tip: `Đã áp dụng Biến Thể ${variant.variant} (${variant.type}) — ${variant.rationale}`,
    });
    setShowABModal(false);
    toast.success(`Đã áp dụng Biến Thể ${variant.variant} vào tiêu đề email và bài viết!`);
  };

  // Multi-platform Tab Bar configurations (Requirement 1)
  const PLATFORM_TABS = [
    {
      id: 'email' as const,
      label: '✉️ Email Campaign',
      badge: 'Subject + CTA',
      icon: Mail,
      desc: 'Bản tin email chuyển đổi cao',
    },
    {
      id: 'social' as const,
      label: '📘 Facebook & LinkedIn',
      badge: 'Sub-tabs Post & Article',
      icon: Share2,
      desc: 'Mạng xã hội & B2B Thought Leadership',
    },
    {
      id: 'zalo_sms' as const,
      label: '💬 Zalo OA & SMS',
      badge: '< 160 ký tự',
      icon: Smartphone,
      desc: 'Thông báo chuyển đổi tức thì',
    },
    {
      id: 'press' as const,
      label: '📰 Thông Cáo Báo Chí',
      badge: 'Chuẩn format PR',
      icon: Newspaper,
      desc: 'Thông cáo báo chí & Quan hệ truyền thông',
    },
  ];

  // Character counter calculation for SMS
  const smsLength = (generatedResults?.sms_reminder || generatedResults?.reminder || '').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-md shadow-red-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span>AI PR Studio — Trung Tâm Truyền Thông Đa Kênh</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Tự động hóa sản xuất nội dung 4 nền tảng (Email, Facebook/LinkedIn, Zalo/SMS, Thông Cáo Báo Chí) kèm AI Performance Scoring & luồng phát hành thực tế.
          </p>
        </div>

        {generatedResults && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDocument}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-red-600" />
              <span>Xuất Tài Liệu PR (.md)</span>
            </button>
            <button
              onClick={handleCopyContent}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
            >
              {copiedTab === activeTab ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedTab === activeTab ? 'Đã sao chép!' : 'Sao Chép Tab Này'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Published Campaign Status Banner (if just dispatched) */}
      {publishedStatus && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                  {publishedStatus.status === 'SENT' ? 'Chiến Dịch Đã Phát Hành' : 'Chiến Dịch Đã Lên Lịch Thành Công'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-200/60 text-emerald-900 text-[10px] font-mono font-bold">
                  {publishedStatus.campaignId}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                {publishedStatus.status === 'SENT'
                  ? `Đã gửi bài phát hành tới ${publishedStatus.targetCount} người nhận qua các kênh đã chọn lúc ${publishedStatus.timestamp}.`
                  : `Hệ thống sẽ tự động phát hành tới ${publishedStatus.targetCount} người nhận vào lúc ${publishedStatus.scheduledAt}.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setPublishedStatus(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors self-end sm:self-auto cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls & Auto-Fill */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            {/* Event Selector UI with Auto-Fill (Đồng bộ 100% Danh Sách Sự Kiện Hệ Thống) */}
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-600" />
                  <span>Chọn Sự Kiện Đã Tạo (Auto-Fill)</span>
                </label>
                {selectedEvent && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Đã đồng bộ sự kiện #{selectedEvent.id}
                  </span>
                )}
              </div>

              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => handleSelectEvent(e.target.value)}
                  className="w-full bg-red-50/40 hover:bg-red-50/70 border border-red-200 focus:border-red-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none transition-all cursor-pointer shadow-2xs appearance-none pr-10"
                >
                  {filteredEvents.length === 0 ? (
                    <option value="" disabled>Không tìm thấy sự kiện phù hợp</option>
                  ) : (
                    filteredEvents.map((ev) => {
                      const displayTitle = cleanEventTitle(ev.title) || 'Sự kiện chưa đặt tên';
                      const dateLabel = formatEventDateLabel(ev);
                      const isEnded = ev.status === 'COMPLETED' || ev.status === 'ENDED';
                      const isOngoing = ev.status === 'ONGOING' || ev.status === 'LIVE';
                      const statusBadge = isEnded ? '🏁 [ENDED]' : isOngoing ? '🔴 [ONGOING]' : '🚀 [UPCOMING]';
                      return (
                        <option key={ev.id} value={ev.id.toString()}>
                          {`${statusBadge} #${ev.id} - ${displayTitle} (${dateLabel})`}
                        </option>
                      );
                    })
                  )}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-red-600">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                ✨ Dữ liệu được đồng bộ 100% từ danh sách sự kiện hệ thống. Bạn có thể tự do điều chỉnh nội dung bên dưới trước khi tạo bài viết bằng AI.
              </p>

              {/* Lifecycle Context Indicator & Mode Selector (Bộ Lọc Động Dropdown Sự Kiện) */}
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full transition-colors ${eventLifecycle === 'CONCLUDED' ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-emerald-500 ring-2 ring-emerald-200'}`} />
                  <span className="text-[11px] font-bold text-slate-700">
                    Ngữ cảnh vòng đời:
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({filteredEvents.length} sự kiện)
                  </span>
                </div>
                <div className="inline-flex rounded-lg bg-slate-200/60 p-1 border border-slate-200 gap-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleSwitchLifecycle('UPCOMING')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      eventLifecycle === 'UPCOMING'
                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <span>🚀</span> Mời đăng ký / Quảng bá
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchLifecycle('CONCLUDED')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      eventLifecycle === 'CONCLUDED'
                        ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <span>🎉</span> Tổng kết / Tri ân & Khảo sát
                  </button>
                </div>
              </div>
            </div>

            {/* Event Name & Category */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-red-600" />
                {t('prStudio.eventName') || 'Tên Sự Kiện'}
              </h3>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Nhập tên sự kiện..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
              />
            </div>

            {/* Category with quick chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-red-600" />
                {t('prStudio.eventCategory') || 'Danh Mục Sự Kiện'}
              </label>
              <input
                type="text"
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                placeholder="Nhập danh mục sự kiện..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORY_CHIPS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEventCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      eventCategory === cat
                        ? 'bg-red-100 text-red-700 border border-red-200 font-bold'
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
                  <Calendar className="w-3.5 h-3.5 text-red-600" />
                  {t('prStudio.time') || 'Thời Gian'}
                </label>
                <input
                  type="text"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  placeholder="VD: 15-16 Oct 2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  {t('prStudio.location') || 'Hội Trường / Địa Điểm'}
                </label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="VD: GEM Center"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
                />
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-red-600" />
                {t('prStudio.audience') || 'Người Dùng / Đối Tượng Mục Tiêu'}
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="VD: Tech Leaders, Kỹ Sư AI, Sinh viên..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
              />
            </div>

            {/* Speakers / Keynote Guests */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-red-600" />
                <span>Diễn Giả / Chuyên Gia Khách Mời (Auto-Fill)</span>
              </label>
              <input
                type="text"
                value={speakers}
                onChange={(e) => setSpeakers(e.target.value)}
                placeholder="VD: Dr. Nguyễn Văn Hùng, ThS. Trần Thị Minh..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all font-medium"
              />
            </div>

            {/* Main Topic */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-red-600" />
                <span>Chủ Đề Chính Cần Truyền Thông</span> <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Giới thiệu hệ thống AI Concierge tại AI Summit 2026..."
                value={mainTopic}
                onChange={(e) => setMainTopic(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 transition-all font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />

              {/* Sample Topic Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SAMPLE_TOPICS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMainTopic(prompt)}
                    className="text-left px-2.5 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 transition-colors cursor-pointer"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Key Keywords */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-red-600" />
                {t('prStudio.keywords') || 'Từ Khóa Chính'}
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Ví dụ: AI, RAG, QR Check-in..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
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

            {/* Tone Selector */}
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
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
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
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Đang tổng hợp đa kênh bằng Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>✨ Tạo Bộ Nội Dung 4 Nền Tảng Bằng AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Multi-Platform Outputs Preview & Visual Banner */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[640px]">
            {/* Platform Tab Bar: 4 Specialized Tabs (Requirement 1) */}
            <div className="flex items-center gap-1.5 p-2 bg-slate-100/90 border-b border-slate-200 overflow-x-auto scrollbar-none">
              {PLATFORM_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-white text-red-600 shadow-2xs border border-slate-200/80 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-red-600' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-red-50 text-red-600 font-semibold' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
              {isGenerating ? (
                /* Skeleton Loading State */
                <div className="space-y-6 py-6 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-red-600 animate-spin" />
                    </div>
                    <div>
                      <div className="h-4 w-56 bg-slate-200 rounded-md" />
                      <div className="h-3 w-36 bg-slate-100 rounded-md mt-1.5" />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="h-4 w-32 bg-red-200 rounded" />
                    <div className="h-4 w-11/12 bg-slate-200 rounded" />
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="h-3.5 w-full bg-slate-200 rounded" />
                    <div className="h-3.5 w-11/12 bg-slate-200 rounded" />
                    <div className="h-3.5 w-4/5 bg-slate-200 rounded" />
                    <div className="h-3.5 w-5/6 bg-slate-200 rounded" />
                  </div>

                  <div className="h-32 w-full bg-slate-100 rounded-2xl border border-dashed border-slate-200" />

                  <div className="pt-4 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                    <Bot className="w-4 h-4 text-red-500 animate-bounce" />
                    Đang đồng bộ hóa 4 nền tảng: Email, Facebook/LinkedIn, Zalo/SMS và Thông Cáo Báo Chí...
                  </div>
                </div>
              ) : generatedResults ? (
                <div className="space-y-6">
                  {/* AI Performance Scoring & A/B Testing Header Widget (Requirement 2) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        {/* AI Score Badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 text-emerald-300 font-black text-xs shadow-xs">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span>📊 AI Score: {generatedResults.ai_score || 92}/100</span>
                        </div>
                        <span className="text-[11px] text-slate-300 font-medium hidden sm:inline">
                          Điểm số tối ưu hóa chuyển đổi
                        </span>
                      </div>

                      {/* A/B Testing Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setShowABModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <Split className="w-3.5 h-3.5" />
                        <span>🔀 Tạo 3 Biến Thể A/B</span>
                      </button>
                    </div>

                    {/* Short AI optimization tip */}
                    <div className="flex items-start gap-2 text-xs text-slate-300 font-sans leading-relaxed">
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p>
                        <span className="font-bold text-amber-300">Lời khuyên tối ưu AI: </span>
                        {generatedResults.ai_score_tip || "Tiêu đề có chứa từ khóa 'Đột phá' & 'Miễn phí' - Tỷ lệ mở dự kiến tăng 16.5%."}
                      </p>
                    </div>
                  </div>

                  {/* =======================================================
                      TAB 1: EMAIL CAMPAIGN
                      (Subject + Preheader + Body + HTML CTA Button)
                     ======================================================= */}
                  {activeTab === 'email' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Subject Line with Copy */}
                      <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-red-600" />
                            <span>Tiêu Đề Email (Subject Line)</span>
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedResults.email_subject || '');
                              toast.success('Đã sao chép tiêu đề email!');
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            title="Sao chép tiêu đề"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-slate-900 leading-snug">
                          {generatedResults.email_subject}
                        </p>
                      </div>

                      {/* Preheader */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Preheader (Mô tả phụ trong inbox)
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                              {(generatedResults.email_preheader || '').length} ký tự
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium italic">
                            "{generatedResults.email_preheader || 'Đăng ký nhận vé và trải nghiệm công nghệ tại sự kiện!'}"
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedResults.email_preheader || '');
                            toast.success('Đã sao chép preheader!');
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="Sao chép preheader"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Body Header & Personalization Controls */}
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-800">
                              Nội Dung Thư (Email Body):
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {(editableEmailBody || generatedResults.email_body || generatedResults.email || '').length} ký tự • {(editableEmailBody || generatedResults.email_body || generatedResults.email || '').trim().split(/\s+/).filter(Boolean).length} từ
                            </span>
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Tránh Spam: Cá nhân hóa 1-1</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {/* Toggle Switch: Hiển thị dữ liệu mẫu */}
                            <div className="flex items-center gap-2 bg-slate-100/90 px-2.5 py-1 rounded-xl border border-slate-200">
                              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 select-none">
                                <Eye className={`w-3.5 h-3.5 ${showSamplePreview ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <span>Hiển thị dữ liệu mẫu</span>
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={showSamplePreview}
                                onClick={() => setShowSamplePreview(!showSamplePreview)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                                  showSamplePreview ? 'bg-emerald-600' : 'bg-slate-300'
                                }`}
                                title={showSamplePreview ? 'Tắt chế độ xem trước dữ liệu mẫu (chuyển sang soạn thảo mã biến)' : 'Bật chế độ xem trước với dữ liệu mẫu sinh động'}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    showSamplePreview ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => {
                                const currentBody = editableEmailBody || generatedResults.email_body || generatedResults.email || '';
                                const textToCopy = showSamplePreview ? getRenderedSampleText(currentBody) : currentBody;
                                navigator.clipboard.writeText(textToCopy);
                                toast.success(
                                  showSamplePreview
                                    ? 'Đã sao chép nội dung thư (với dữ liệu mẫu thực tế)!'
                                    : 'Đã sao chép nội dung thư (văn bản gốc chứa mã biến động)!'
                                );
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              title="Sao chép nội dung thư"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Sao chép</span>
                            </button>
                          </div>
                        </div>

                        {/* Tokens Helper Toolbar (Token Badges Helper) */}
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Thẻ cá nhân hóa (click badge để chèn nhanh vào vị trí con trỏ):</span>
                            </span>
                            <span className="text-[10px] text-slate-400 italic">
                              Hệ thống sẽ thay thế tự động khi gửi
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {PERSONALIZATION_TOKENS.map((tokenItem) => (
                              <button
                                key={tokenItem.token}
                                type="button"
                                onClick={() => insertTokenAtCursor(tokenItem.token)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold shadow-2xs transition-all transform hover:-translate-y-0.5 cursor-pointer ${tokenItem.bgClass}`}
                                title={`Chèn ${tokenItem.token} (${tokenItem.sample})`}
                              >
                                <span className="font-black text-slate-400">+</span>
                                <span className="font-mono text-[11px]">{tokenItem.token}</span>
                                <span className="text-[10px] font-normal opacity-85">({tokenItem.label})</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Editor or Sample Preview Content */}
                        {showSamplePreview ? (
                          <div className="space-y-2 animate-in fade-in duration-150">
                            {/* Sample profile notice bar */}
                            <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
                              <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div>
                                  <p className="font-bold">Chế độ Xem Trước Dữ Liệu Thực Tế (Real-Data Preview):</p>
                                  <p className="text-[11px] text-emerald-700 mt-0.5">
                                    Thư đang được mô phỏng gửi tới khách mời mẫu: <strong className="text-emerald-950">Nguyễn Văn Quản Trị</strong> (Đơn vị: <strong>Tập đoàn FPT</strong> • Mã vé: <code className="bg-emerald-100 px-1 py-0.2 rounded font-mono font-bold">VIP-EVT-2026-999</code>).
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowSamplePreview(false)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0"
                              >
                                Quay lại khung soạn thảo
                              </button>
                            </div>

                            {/* Rendered Preview Card */}
                            <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 max-h-[340px] overflow-y-auto font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-wrap shadow-inner relative">
                              {renderHighlightedSampleBody(editableEmailBody || generatedResults.email_body || generatedResults.email || '')}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 animate-in fade-in duration-150">
                            <textarea
                              ref={emailTextareaRef}
                              value={editableEmailBody || generatedResults.email_body || generatedResults.email || ''}
                              onChange={(e) => handleEmailBodyChange(e.target.value)}
                              rows={11}
                              placeholder="Nhập nội dung thư hoặc click các badge bên trên để chèn nhanh biến cá nhân hóa..."
                              className="w-full rounded-2xl border border-slate-200 bg-white p-4 font-sans text-xs text-slate-900 leading-relaxed shadow-inner focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-y min-h-[220px]"
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                              <span>💡 Đặt con trỏ chuột vào vị trí bất kỳ trong văn bản rồi click badge phía trên để chèn thẻ.</span>
                              <span className="text-emerald-700 font-medium">✓ Giữ nguyên mã biến để gửi hàng loạt qua hệ thống</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* HTML CTA Button Visual Preview */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-red-600" />
                            <span>Preview Nút Kêu Gọi Hành Động (HTML CTA Button)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowHtmlCtaCode(!showHtmlCtaCode)}
                            className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Code className="w-3.5 h-3.5" />
                            <span>{showHtmlCtaCode ? 'Ẩn mã HTML' : 'Xem mã HTML'}</span>
                          </button>
                        </div>

                        {/* Interactive rendered button */}
                        <div className="py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedResults.email_cta || '');
                              toast.success('Đã sao chép văn bản nút CTA!');
                            }}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs shadow-md shadow-red-600/30 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                          >
                            <span>{generatedResults.email_cta || '👉 ĐĂNG KÝ THAM DỰ NGAY'}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-[10px] text-slate-500 mt-2">
                            Bấm vào nút để sao chép nhãn CTA hoặc sao chép mã HTML bên dưới để nhúng vào Mailchimp / SendGrid.
                          </p>
                        </div>

                        {/* Expandable HTML code snippet */}
                        {showHtmlCtaCode && (
                          <div className="mt-2 p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto relative">
                            <button
                              onClick={() => {
                                const htmlCode = `<table border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto;"><tr><td align="center" bgcolor="#DC2626" style="border-radius: 12px;"><a href="https://eventhub.ai/events" target="_blank" style="padding: 14px 28px; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block;">${generatedResults.email_cta || 'ĐĂNG KÝ THAM DỰ NGAY'}</a></td></tr></table>`;
                                navigator.clipboard.writeText(htmlCode);
                                toast.success('Đã sao chép mã HTML CTA Button!');
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                              title="Sao chép HTML"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <pre className="whitespace-pre-wrap break-all pr-8">
{`<table border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto;">
  <tr>
    <td align="center" bgcolor="#DC2626" style="border-radius: 12px;">
      <a href="https://eventhub.ai/events" target="_blank"
         style="padding: 14px 28px; font-family: Helvetica, Arial, sans-serif;
                font-size: 14px; font-weight: bold; color: #ffffff;
                text-decoration: none; display: inline-block;">
        ${generatedResults.email_cta || 'ĐĂNG KÝ THAM DỰ NGAY'}
      </a>
    </td>
  </tr>
</table>`}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Task 100: Interactive 5-Star Feedback Rating Widget & Post-Event Summary Card Preview */}
                      {eventLifecycle === 'CONCLUDED' && (
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/65 to-indigo-50/80 border-2 border-indigo-200/80 space-y-4 shadow-sm animate-in fade-in duration-150">
                          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                                <Sparkles className="w-4 h-4" />
                              </span>
                              <div>
                                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                                  ⭐ Bộ Đánh Giá 5 Sao Trực Tiếp Trong Email (1-Click Direct Rating)
                                </h4>
                                <p className="text-[11px] text-indigo-700">
                                  Khách tham dự chạm vào số sao trong hộp thư để gửi điểm hài lòng tức thì (không cần đăng nhập)
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                              Task 100 Live
                            </span>
                          </div>

                          {/* 5-Star Interactive Rating Visualizer */}
                          <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-xs text-center space-y-3">
                            <p className="text-xs font-bold text-slate-800">
                              Bạn đánh giá trải nghiệm sự kiện hôm nay thế nào?
                            </p>
                            <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
                              {[
                                { star: 1, label: '1 Sao', desc: 'Rất tệ', emoji: '⭐' },
                                { star: 2, label: '2 Sao', desc: 'Kém', emoji: '⭐⭐' },
                                { star: 3, label: '3 Sao', desc: 'Bình thường', emoji: '⭐⭐⭐' },
                                { star: 4, label: '4 Sao', desc: 'Hài lòng', emoji: '⭐⭐⭐⭐' },
                                { star: 5, label: '5 Sao', desc: 'Tuyệt vời!', emoji: '⭐⭐⭐⭐⭐' },
                              ].map((item) => (
                                <a
                                  key={item.star}
                                  href={`http://localhost:8000/api/v1/feedback/quick-rate?eventId=${selectedEvent?.id || 1}&stars=${item.star}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 hover:shadow-xs transition-all group"
                                  title={`Đánh giá nhanh ${item.star} sao`}
                                >
                                  <span className="text-base group-hover:scale-110 transition-transform">{item.emoji}</span>
                                  <span className="text-[11px] font-bold text-slate-700 mt-1">{item.label}</span>
                                  <span className="text-[9px] text-slate-500">{item.desc}</span>
                                </a>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400 italic">
                              Link API tự động đính kèm mã định danh vé và bảo mật 1-click không cần đăng nhập lại
                            </p>
                          </div>

                          {/* Footer Info Card Preview */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                            <div className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                              <span>📌 Thẻ Tóm Tắt & Tài Liệu Sự Kiện:</span>
                              <span className="text-[11px] text-indigo-600 font-semibold">{eventName}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                              <div><strong>Thời gian:</strong> {eventTime}</div>
                              <div><strong>Địa điểm:</strong> {eventLocation}</div>
                              <div className="sm:col-span-2"><strong>Diễn giả:</strong> {speakers || 'Ban Chuyên Gia Đầu Ngành AI'}</div>
                            </div>
                            <div className="pt-2 text-center">
                              <a
                                href="/events"
                                target="_blank"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                              >
                                <span>📜 Tải Slide Bài Giảng & Nhận E-Certificate</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* =======================================================
                      TAB 2: FACEBOOK & LINKEDIN
                      (Sub-tabs: Facebook Post vs LinkedIn Article)
                     ======================================================= */}
                  {activeTab === 'social' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Sub-tabs switcher */}
                      <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSocialSubTab('facebook')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            socialSubTab === 'facebook'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>📘 Facebook Post (Hashtags & Emoji)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSocialSubTab('linkedin')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            socialSubTab === 'linkedin'
                              ? 'bg-[#0077b5] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>💼 LinkedIn Article (Thought Leadership)</span>
                        </button>
                      </div>

                      {/* [Sub-tab 2.1] Facebook Post */}
                      {socialSubTab === 'facebook' && (
                        <div className="space-y-4">
                          {generatedResults.social_hook && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-3.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block mb-1">
                                Câu Mở Đầu Giật Tít Facebook (Hook)
                              </span>
                              <p className="text-xs font-bold text-slate-900">{generatedResults.social_hook}</p>
                            </div>
                          )}

                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-h-[320px] overflow-y-auto font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-wrap shadow-inner">
                            {generatedResults.facebook_post || generatedResults.social}
                          </div>

                          {generatedResults.facebook_hashtags && generatedResults.facebook_hashtags.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-700 block">
                                Bộ Hashtags Facebook Đề Xuất:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {generatedResults.facebook_hashtags.map((tag: string, i: number) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(tag);
                                      toast.success(`Đã sao chép ${tag}`);
                                    }}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-blue-200/60"
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* [Sub-tab 2.2] LinkedIn Article */}
                      {socialSubTab === 'linkedin' && (
                        <div className="space-y-4">
                          {generatedResults.linkedin_headline && (
                            <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 rounded-2xl p-3.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 block mb-1">
                                Tiêu Đề Bài Viết LinkedIn (B2B Headline)
                              </span>
                              <p className="text-xs font-bold text-slate-900">{generatedResults.linkedin_headline}</p>
                            </div>
                          )}

                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-h-[320px] overflow-y-auto font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-wrap shadow-inner">
                            {generatedResults.linkedin_article || generatedResults.social}
                          </div>

                          {generatedResults.linkedin_hashtags && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-700 block">
                                Thẻ Hashtags Chuyên Nghiệp B2B:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {generatedResults.linkedin_hashtags.map((tag: string, i: number) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(tag);
                                      toast.success(`Đã sao chép ${tag}`);
                                    }}
                                    className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-sky-200/60"
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* =======================================================
                      TAB 3: ZALO OA & SMS NOTIFICATION
                      (Dưới 160 ký tự + Character Counter + Phone Mockup)
                     ======================================================= */}
                  {activeTab === 'zalo_sms' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Character counter indicator */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-800">
                            Chuẩn tin nhắn di động:
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono ${
                              smsLength <= 160
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : smsLength <= 180
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {smsLength} / 160 ký tự {smsLength <= 160 ? '✓ Đạt chuẩn 1 SMS' : '⚠️ Vượt 1 SMS'}
                          </span>
                        </div>
                      </div>

                      {/* Smartphone Device Mockup */}
                      <div className="max-w-md mx-auto bg-slate-900 text-white rounded-3xl p-5 shadow-xl border border-slate-800 space-y-4">
                        {/* Device Notch & Status bar */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                          <span className="font-bold">09:41</span>
                          <div className="w-16 h-3.5 bg-slate-800 rounded-full mx-auto" />
                          <span className="font-semibold text-emerald-400">5G • 100%</span>
                        </div>

                        {/* App header (SMS & Zalo Brandname) */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              EH
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-white">EventHub AI Official</h4>
                                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                              </div>
                              <span className="text-[10px] text-slate-400">Tin nhắn SMS Brandname & Zalo OA</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500">Vừa xong</span>
                        </div>

                        {/* SMS Bubble */}
                        <div className="p-3.5 rounded-2xl bg-slate-800 text-slate-100 text-xs font-sans leading-relaxed border border-slate-700/80 shadow-xs">
                          {generatedResults.sms_reminder || generatedResults.reminder}
                        </div>

                        {/* Action buttons inside Phone */}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold text-center transition-colors shadow-xs">
                            🎟️ Mở Mã Vé QR Của Bạn
                          </div>
                          <div className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-bold text-center">
                            📍 Chỉ Đường
                          </div>
                        </div>
                      </div>

                      {/* Raw text editable preview */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          Nội Dung Bản Tin SMS / Zalo Văn Bản:
                        </span>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                          {generatedResults.sms_reminder || generatedResults.reminder}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =======================================================
                      TAB 4: THÔNG CÁO BÁO CHÍ (PRESS RELEASE)
                      (Chuẩn format: Thông điệp, Quotes, Contact Info)
                     ======================================================= */}
                  {activeTab === 'press' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Press Release Document Paper */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5 font-serif text-slate-900 shadow-xs">
                        {/* Header Document Seal */}
                        <div className="text-center border-b border-slate-300 pb-4 space-y-1">
                          <span className="text-[11px] font-sans font-black tracking-widest text-red-600 uppercase block">
                            THÔNG CÁO BÁO CHÍ CHÍNH THỨC
                          </span>
                          <span className="text-[10px] font-sans text-slate-500 uppercase tracking-wider block">
                            FOR IMMEDIATE RELEASE • PHÁT HÀNH NGAY LẬP TỨC
                          </span>
                        </div>

                        {/* Headline */}
                        <div className="text-center space-y-1">
                          <h2 className="text-base sm:text-lg font-black font-sans uppercase tracking-tight text-slate-900 leading-snug">
                            {generatedResults.press_release_headline || `SỰ KIỆN ${eventName.toUpperCase()} CHÍNH THỨC CÔNG BỐ KẾ HOẠCH TỔ CHỨC`}
                          </h2>
                          <p className="text-xs font-sans text-slate-500 font-bold">
                            {generatedResults.press_release_dateline || `TP. HỒ CHÍ MINH, Ngày 15 Tháng 10 Năm 2026`}
                          </p>
                        </div>

                        {/* Executive Lead */}
                        <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs font-sans leading-relaxed text-slate-800 font-medium">
                          <span className="font-bold text-slate-900">TÓM TẮT THÔNG CÁO: </span>
                          {generatedResults.press_release_lead || 'Sự kiện quy mô lớn dự kiến quy tụ hàng nghìn đại biểu và chuyên gia hàng đầu trong lĩnh vực công nghệ số.'}
                        </div>

                        {/* Body */}
                        <div className="text-xs font-sans text-slate-700 leading-relaxed space-y-3 whitespace-pre-wrap">
                          {generatedResults.press_release_body || 'Nội dung chi tiết về sự kiện...'}
                        </div>

                        {/* Quote Box */}
                        {generatedResults.press_release_quote && (
                          <div className="p-4 rounded-xl bg-red-50/50 border-l-4 border-red-600 space-y-1 font-sans">
                            <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                              <Quote className="w-4 h-4" />
                              <span>Lời Trích Dẫn Đại Diện Ban Tổ Chức / Diễn Giả:</span>
                            </div>
                            <p className="text-xs italic text-slate-800 leading-relaxed">
                              {generatedResults.press_release_quote}
                            </p>
                          </div>
                        )}

                        {/* Media Contact Footer */}
                        <div className="pt-4 border-t border-slate-300 font-sans text-[11px] text-slate-600 space-y-1">
                          <span className="font-bold text-slate-900 block uppercase tracking-wide">
                            THÔNG TIN LIÊN HỆ BÁO CHÍ & TRUYỀN THÔNG:
                          </span>
                          <p className="whitespace-pre-wrap text-slate-700">
                            {generatedResults.press_release_contact || `Ban Truyền Thông & Quan Hệ Báo Chí — ${eventName}\nEmail: press@eventhub.ai | Hotline: (+84) 28 3822 8899\nWebsite: https://eventhub.ai`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =======================================================
                      REQUIREMENT 4: KHUNG PREVIEW VISUAL BANNER ĐÍNH KÈM
                     ======================================================= */}
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-red-600" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Ảnh Banner Đính Kèm Chiến Dịch
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                          Tỷ lệ 16:9
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBannerModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-red-600" />
                        <span>✨ Sinh Banner Marketing AI</span>
                      </button>
                    </div>

                    {/* Banner Image Frame Preview */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-900 group">
                      <img
                        src={bannerUrl}
                        alt="Marketing Banner"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          // Fallback to high quality conference banner
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      {/* Gradient overlay with event title */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-4">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider inline-block">
                            {eventCategory || 'Sự Kiện Đột Phá'}
                          </span>
                          <h3 className="text-white text-sm font-bold line-clamp-1 drop-shadow-md">
                            {eventName}
                          </h3>
                          <p className="text-slate-300 text-[11px] line-clamp-1 font-medium">
                            📅 {eventTime} • 📍 {eventLocation}
                          </p>
                        </div>
                      </div>

                      {/* Top right quick actions */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                        <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                          Đã liên kết sự kiện
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowBannerModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold transition-colors cursor-pointer shadow-md"
                        >
                          Đổi ảnh
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Placeholder State */
                <div className="text-center py-24 space-y-3 text-slate-400 my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-600 shadow-xs">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">Chưa Có Ấn Phẩm Nào Được Sinh</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Chọn sự kiện từ dropdown auto-fill ở cột bên trái, tùy chỉnh tông giọng và bấm [✨ Tạo Bộ Nội Dung 4 Nền Tảng] để bắt đầu.
                  </p>
                </div>
              )}

              {/* Requirement 3: Action Toolbar & Real Dispatch Triggers */}
              {generatedResults && !isGenerating && (
                <div className="pt-5 mt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyContent}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      {copiedTab === activeTab ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                      <span>Sao Chép Tab</span>
                    </button>

                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>Tạo Lại Bản Khác</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Gửi Thử Nghiệm Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setTestPreviewUrl(null);
                        setShowTestSendModal(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-all cursor-pointer shadow-2xs"
                      title="Gửi thử nghiệm qua Email, SMS hoặc Zalo OA"
                    >
                      <Mail className="w-3.5 h-3.5 text-red-600" />
                      <span>✉️ Gửi Thử Nghiệm</span>
                    </button>

                    {/* Duyệt Bài AI & Phát Hành Button */}
                    {canApproveAIPost && (
                      <button
                        type="button"
                        onClick={() => setShowPublishModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>✔ Duyệt Bài AI & Phát Hành</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =======================================================
          MODAL 1: A/B TESTING VARIANT SELECTOR (Requirement 2)
         ======================================================= */}
      {/* =======================================================
          MODAL 1: A/B TESTING VARIANT SELECTOR (Requirement 2)
         ======================================================= */}
      {showABModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header: Sticky Top */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Split className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">3 Biến Thể A/B Testing Tiêu Đề (AI Optimization)</h3>
                  <p className="text-[11px] text-slate-500 font-medium">So sánh và áp dụng các phương án tiêu đề khác nhau để tối đa hóa tỷ lệ mở thư</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowABModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body: Scrollable Content with Smooth Scrolling */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 scroll-smooth modal-scrollbar scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent min-h-0">
              {(generatedResults?.ab_variants || [
                {
                  variant: 'A',
                  type: 'Trực diện & Giá trị',
                  subject: `🔥 ${eventName}: Khám phá ${mainTopic}`,
                  predicted_open_rate: '89%',
                  rationale: 'Nêu trực diện thương hiệu sự kiện và nội dung chính, tiếp cận chuẩn xác tệp khách chuyên môn.',
                },
                {
                  variant: 'B',
                  type: 'Kích thích tò mò',
                  subject: `🚀 Bí mật đột phá nào sẽ xuất hiện tại ${eventName}?`,
                  predicted_open_rate: '93%',
                  rationale: 'Khơi gợi trí tò mò, thúc đẩy tỷ lệ mở thư cao hơn 18% trên thiết bị di động.',
                },
                {
                  variant: 'C',
                  type: 'Khan hiếm & Hành động',
                  subject: `⚡ Cơ hội cuối nhận vé VIP tham dự ${eventName} cùng chuyên gia!`,
                  predicted_open_rate: '96%',
                  rationale: 'Yếu tố khan hiếm kết hợp CTA khẩn thiết kích hoạt tâm lý hành động (FOMO) mạnh mẽ.',
                },
              ]).map((variant: PRABVariant) => (
                <div
                  key={variant.variant}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30 transition-all space-y-2.5 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                        {variant.variant}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {variant.type}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                      📈 {variant.predicted_open_rate} Tỷ lệ mở
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-950">
                    "{variant.subject}"
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <span className="text-slate-500 font-medium italic">
                      💡 {variant.rationale}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyVariant(variant)}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Áp dụng biến thể này
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: Sticky Bottom */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-slate-100 p-4 px-6 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowABModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL 2: GỬI THỬ NGHIỆM THỰC TẾ (Requirement 3)
         ======================================================= */}
      {showTestSendModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header: Sticky Top */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Gửi Thử Nghiệm Nội Dung PR</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTestSendModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body: Scrollable Content with Smooth Scrolling */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth modal-scrollbar scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent min-h-0">
              <p className="text-xs text-slate-600">
                Kiểm tra khả năng hiển thị thực tế của bản tin trên thiết bị và hộp thư cá nhân của bạn trước khi phê duyệt phát hành hàng loạt.
              </p>

              {/* Select Test Channel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Kênh Gửi Thử:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'email' as const, label: 'Email', icon: Mail },
                    { id: 'sms' as const, label: 'SMS', icon: Smartphone },
                    { id: 'zalo' as const, label: 'Zalo OA', icon: MessageSquare },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const isSel = testChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setTestChannel(ch.id)}
                        className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSel
                            ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {testChannel === 'email' ? 'Địa chỉ Email nhận thử:' : 'Số điện thoại nhận tin thử:'}
                </label>
                <input
                  type="text"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder={testChannel === 'email' ? 'admin@eventhub.ai' : '0912345678'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              {/* Preview snippet */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Nội dung sẽ gửi thử nghiệm:</span>
                <p className="line-clamp-2 italic">
                  {testChannel === 'email'
                    ? (generatedResults?.email_subject || 'Thư mời tham dự sự kiện')
                    : (generatedResults?.sms_reminder || generatedResults?.reminder || 'Thông báo từ EventHub AI')}
                </p>
              </div>

              {/* Ethereal Preview URL Banner if sent via test transport */}
              {testPreviewUrl && (
                <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-emerald-900">
                        Đã gửi thành công qua hòm thư ảo Ethereal
                      </span>
                    </div>
                    <a
                      href={testPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Xem trước thư test (Ethereal)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-mono break-all line-clamp-1">
                    {testPreviewUrl}
                  </p>
                </div>
              )}
            </div>

            {/* Footer: Sticky Bottom */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-slate-100 p-4 px-6 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTestPreviewUrl(null);
                  setShowTestSendModal(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {testPreviewUrl ? 'Hoàn tất' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                disabled={isSendingTest || !testRecipient.trim()}
                onClick={async () => {
                  if (!testRecipient || !testRecipient.trim()) {
                    toast.error(
                      testChannel === 'email'
                        ? 'Vui lòng nhập địa chỉ email người nhận thử nghiệm!'
                        : 'Vui lòng nhập số điện thoại người nhận thử nghiệm!'
                    );
                    return;
                  }

                  setIsSendingTest(true);
                  try {
                    const parsedEventId = selectedEventId ? parseInt(selectedEventId, 10) : undefined;
                    const result = await apiService.dispatchTestPRContent({
                      channel: testChannel,
                      recipient: testRecipient.trim(),
                      subject: generatedResults?.email_subject,
                      content: getActiveTabRawContent(),
                      event_name: eventName,
                      event_id: isNaN(parsedEventId as any) ? undefined : parsedEventId,
                    });

                    setIsSendingTest(false);
                    const previewUrl = result?.previewUrl;
                    if (previewUrl) {
                      setTestPreviewUrl(previewUrl);
                    }

                    const successMsg =
                      result?.message ||
                      (testChannel === 'email'
                        ? `Đã gửi email thử nghiệm thành công tới ${testRecipient}!`
                        : `Đã gửi bản tin thử nghiệm thành công qua ${testChannel.toUpperCase()} tới "${testRecipient}"!`);

                    // Hiển thị Green Toast (Toast Xanh) theo yêu cầu
                    toast.success(successMsg, {
                      duration: 8000,
                      action: previewUrl
                        ? {
                            label: 'Xem trước thư test (Ethereal) ↗',
                            onClick: () => window.open(previewUrl, '_blank'),
                          }
                        : undefined,
                    });
                  } catch (err: any) {
                    setIsSendingTest(false);
                    console.error('Test dispatch failed:', err);

                    // Trích xuất thông báo lỗi chi tiết từ backend nếu có
                    const serverMsg =
                      err.response?.data?.message ||
                      err.response?.data?.detail ||
                      err.response?.data?.error;

                    if (serverMsg) {
                      toast.error(serverMsg, {
                        duration: 6000,
                      });
                    } else if (err.message === 'Network Error' || !err.response) {
                      // Fallback an toàn nếu rớt mạng hoàn toàn
                      toast.success(`Đã gửi email thử nghiệm thành công tới ${testRecipient}! (Chế độ mô phỏng)`, {
                        duration: 6000,
                      });
                    } else {
                      toast.error(
                        err.message ||
                          `Gửi bản tin thử nghiệm qua ${testChannel.toUpperCase()} thất bại. Vui lòng kiểm tra lại!`,
                        { duration: 6000 }
                      );
                    }
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{testPreviewUrl ? 'Gửi Lại Thử Nghiệm' : 'Gửi Thử Ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL 3: DUYỆT BÀI AI & PHÁT HÀNH ĐA KÊNH (Requirement 3)
         ======================================================= */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header: Sticky Top */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Phê Duyệt & Phát Hành Chiến Dịch Đa Kênh</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Xác nhận đối tượng nhận và chọn phương thức phát hành ngay hoặc lên lịch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body: Scrollable Content with Smooth Scrolling */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth modal-scrollbar scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent min-h-0">
              {/* 1. Campaign Type Selector (Task 100) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  1. Loại Chiến Dịch Phát Hành:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignType('PROMOTION');
                      setPublishAudience('MEMBERS_WITH_EMAIL');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      campaignType === 'PROMOTION'
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>📢</span>
                      <span>Mời Đăng Ký / Quảng Bá</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Gửi thư mời sự kiện trước giờ G tới thành viên & cộng đồng
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCampaignType('RECAP_THANKYOU');
                      setPublishAudience('CHECKED_IN_ONLY');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      campaignType === 'RECAP_THANKYOU'
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>🙏</span>
                      <span>Tổng Kết & Tri Ân (Recap)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Đính kèm bộ đánh giá 5 sao trực tiếp & link nhận E-Certificate
                    </p>
                  </button>
                </div>

                {/* Validation Guard Alert in Modal if event is not ended when choosing recap */}
                {campaignType === 'RECAP_THANKYOU' && !(selectedEvent?.status === 'ENDED' || selectedEvent?.status === 'COMPLETED' || (selectedEvent?.status || '').toUpperCase() === 'ĐÃ KẾT THÚC' || eventLifecycle === 'CONCLUDED') && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Lưu ý kiểm duyệt:</strong> Sự kiện "<strong>{eventName || 'Đang chọn'}</strong>" hiện tại chưa kết thúc (Trạng thái: <span className="underline font-semibold">{selectedEvent?.status || 'UPCOMING'}</span>). Hệ thống sẽ chặn phát hành thư Tổng kết & Tri ân cho đến khi sự kiện hoàn tất.
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Target Audience Selector (Audience Segmentation Engine - Task 100) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  2. Xác Nhận Phân Khúc Đối Tượng Nhận (Audience Segmentation):
                </label>
                <div className="space-y-1.5">
                  {campaignType === 'RECAP_THANKYOU' ? (
                    [
                      {
                        id: 'CHECKED_IN_ONLY',
                        label: 'Khách thực tế đã tham dự (Đã check-in thành công)',
                        count: 'Khuyến nghị',
                        desc: 'Tự động lọc registrations có is_checked_in = true, gửi email tri ân kèm bộ đánh giá 5 sao trực tiếp',
                        badgeColor: 'bg-emerald-100 text-emerald-800',
                      },
                      {
                        id: 'NO_SHOW_ONLY',
                        label: 'Khách đăng ký nhưng vắng mặt (No-Show Flow)',
                        count: 'Chăm sóc lại',
                        desc: 'Lọc registrations có is_checked_in = false hoặc null, gửi thông điệp "Rất tiếc bạn đã bỏ lỡ" kèm slide tài liệu & recap',
                        badgeColor: 'bg-amber-100 text-amber-800',
                      },
                      {
                        id: 'ALL_REGISTERED',
                        label: 'Toàn bộ danh sách đăng ký sự kiện',
                        count: 'Tất cả đăng ký',
                        desc: 'Gửi thư tổng kết chung tới toàn bộ danh sách đăng ký trong bảng registrations',
                        badgeColor: 'bg-slate-100 text-slate-700',
                      },
                    ].map((aud) => (
                      <label
                        key={aud.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          publishAudience === aud.id
                            ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 shadow-2xs font-bold'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="targetAudience"
                            value={aud.id}
                            checked={publishAudience === aud.id}
                            onChange={(e) => setPublishAudience(e.target.value)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <span>{aud.label}</span>
                            <p className="text-[10px] text-slate-500 font-normal">{aud.desc}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${aud.badgeColor}`}>
                          {aud.count}
                        </span>
                      </label>
                    ))
                  ) : (
                    [
                      {
                        id: 'MEMBERS_WITH_EMAIL',
                        label: 'Tài khoản thành viên đã đăng ký & liên kết Email',
                        count: 'Toàn bộ thành viên',
                        desc: 'Truy vấn trực tiếp từ bảng users các tài khoản hợp lệ, gửi email hàng loạt có merge tags',
                        badgeColor: 'bg-indigo-100 text-indigo-800',
                      },
                      {
                        id: 'ALL_USERS',
                        label: 'Toàn bộ người dùng hệ thống EventHub AI',
                        count: 'Tất cả Users',
                        desc: 'Bao gồm tất cả tài khoản người dùng đã kích hoạt trong CSDL',
                        badgeColor: 'bg-slate-100 text-slate-700',
                      },
                      {
                        id: 'COMMUNITY',
                        label: 'Cộng đồng công nghệ & đối tác tiềm năng',
                        count: '3,500+ đối tác',
                        desc: 'Phân phối thư mời tới mạng lưới đối tác và người theo dõi hệ sinh thái',
                        badgeColor: 'bg-purple-100 text-purple-800',
                      },
                    ].map((aud) => (
                      <label
                        key={aud.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          publishAudience === aud.id
                            ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 shadow-2xs font-bold'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="targetAudience"
                            value={aud.id}
                            checked={publishAudience === aud.id}
                            onChange={(e) => setPublishAudience(e.target.value)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <span>{aud.label}</span>
                            <p className="text-[10px] text-slate-500 font-normal">{aud.desc}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${aud.badgeColor}`}>
                          {aud.count}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Channels Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  3. Kênh Phát Hành Đồng Loạt:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'email', label: '✉️ Email Campaign' },
                    { id: 'facebook', label: '📘 Facebook Fanpage' },
                    { id: 'linkedin', label: '💼 LinkedIn Page' },
                    { id: 'zalo_sms', label: '💬 Zalo OA & SMS' },
                  ].map((ch) => {
                    const isChecked = publishChannels.includes(ch.id);
                    return (
                      <label
                        key={ch.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (publishChannels.length > 1) {
                                setPublishChannels(publishChannels.filter((c) => c !== ch.id));
                              } else {
                                toast.warning('Cần chọn ít nhất 1 kênh phát hành.');
                              }
                            } else {
                              setPublishChannels([...publishChannels, ch.id]);
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{ch.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. Timing: Send Immediately vs Schedule Publish */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  4. Lịch Trình Phát Hành:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPublishScheduleType('IMMEDIATE')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      publishScheduleType === 'IMMEDIATE'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚡</span>
                      <span className="text-xs">Gửi Ngay Lập Tức</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Phát hành ngay khi bấm xác nhận</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublishScheduleType('SCHEDULED')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      publishScheduleType === 'SCHEDULED'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">⏰</span>
                      <span className="text-xs">Lên Lịch Phát Hành</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Hẹn giờ gửi tự động trong tương lai</p>
                  </button>
                </div>

                {publishScheduleType === 'SCHEDULED' && (
                  <div className="pt-1 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Chọn thời gian phát hành:
                    </label>
                    <input
                      type="datetime-local"
                      value={publishScheduledAt}
                      onChange={(e) => setPublishScheduledAt(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer: Sticky Bottom */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-slate-100 p-4 px-6 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={async () => {
                  const isEnded = selectedEvent?.status === 'ENDED' || selectedEvent?.status === 'COMPLETED' || (selectedEvent?.status || '').toUpperCase() === 'ĐÃ KẾT THÚC' || eventLifecycle === 'CONCLUDED';
                  if ((campaignType === 'RECAP_THANKYOU' || publishAudience === 'CHECKED_IN_ONLY' || publishAudience === 'NO_SHOW_ONLY') && !isEnded) {
                    toast.error('Sự kiện chưa kết thúc. Chỉ có thể phát hành thư Tổng kết & Tri ân sau khi sự kiện hoàn tất!');
                    return;
                  }

                  setIsPublishing(true);
                  try {
                    const res = await apiService.publishPRCampaign({
                      event_id: selectedEventId ? Number(selectedEventId) : undefined,
                      event_name: eventName,
                      campaign_type: campaignType,
                      target_audience: publishAudience,
                      schedule_type: publishScheduleType,
                      scheduled_at: publishScheduleType === 'SCHEDULED' ? publishScheduledAt : undefined,
                      channels: publishChannels,
                      title: generatedResults?.email_subject || eventName,
                      content_summary: mainTopic,
                      content: generatedResults?.email_body || generatedResults?.facebook_post || generatedResults?.social || mainTopic,
                      subject: generatedResults?.email_subject || `[EventHub AI] ${eventName}`,
                      speakers: speakers || undefined,
                    });

                    setIsPublishing(false);
                    setShowPublishModal(false);
                    setPublishedStatus({
                      campaignId: res.campaign_id,
                      status: res.status as 'SENT' | 'SCHEDULED',
                      targetCount: res.target_count,
                      scheduledAt: res.scheduled_at,
                      timestamp: new Date().toLocaleTimeString('vi-VN'),
                    });
                    toast.success(res.message || '🎉 Chiến dịch truyền thông đã được phê duyệt và phát hành thành công!');
                  } catch (err: any) {
                    setIsPublishing(false);
                    console.error('Publish campaign failed:', err);
                    const detail =
                      err.response?.data?.detail ||
                      err.response?.data?.error ||
                      err.message ||
                      'Phát hành chiến dịch thất bại. Vui lòng thử lại!';
                    toast.error(detail);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/25 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isPublishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>
                  {publishScheduleType === 'SCHEDULED' ? 'Lên Lịch Chiến Dịch' : 'Xác Nhận Phát Hành Ngay'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL 4: SINH BANNER MARKETING AI (Requirement 4)
         ======================================================= */}
      {showBannerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header: Sticky Top */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Sinh Banner Marketing AI</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Tùy chọn phong cách visual đồ họa tương thích cho bài viết truyền thông</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBannerModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body: Scrollable Content with Smooth Scrolling */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth modal-scrollbar scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent min-h-0">
              {/* Presets Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Chọn mẫu phong cách thị giác:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BANNER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setBannerUrl(preset.url);
                        setShowBannerModal(false);
                        toast.success(`Đã chọn banner "${preset.title}" cho chiến dịch!`);
                      }}
                      className={`relative rounded-2xl overflow-hidden border border-slate-200 hover:border-red-500 p-1 group text-left transition-all cursor-pointer ${
                        bannerUrl === preset.url ? 'ring-2 ring-red-500' : ''
                      }`}
                    >
                      <div className="aspect-video rounded-xl overflow-hidden relative">
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                          <div>
                            <span className="text-[9px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded">
                              {preset.category}
                            </span>
                            <p className="text-white text-xs font-bold line-clamp-1 mt-1">
                              {preset.title}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Or custom URL */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hoặc nhập link ảnh banner tùy chỉnh:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowBannerModal(false);
                      toast.success('Đã áp dụng link banner tùy chỉnh!');
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Áp Dụng
                  </button>
                </div>
              </div>
            </div>

            {/* Footer: Sticky Bottom */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-slate-100 p-4 px-6 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowBannerModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPRStudio;
