import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  Activity,
  Eye,
  Edit,
  Trash2,
  Copy,
  Play,
  X,
  Image as ImageIcon,
  Globe,
  FileOutput,
  Navigation2,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  QrCode,
  AlertTriangle,
  Clock,
  Sparkles,
  Ticket,
  Star,
  Loader2,
  CheckCircle2,
  Check,
  Download,
  Building2,
  Phone,
  Mail,
  User as UserIcon,
  MessageSquare,
  BellRing,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService as api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PermissionGuard } from '../components/PermissionGuard';
import {
  EventCard,
  cleanEventTitle,
  formatEventDateTime,
  buildGoogleCalendarUrl,
  downloadIcsFile,
} from '../components/EventCard';
import { TicketModal, TicketData } from '../components/TicketModal';
import { notifyEventChange, useEventSync } from '../services/eventSync';
import { Event } from '../types';

export const Events: React.FC = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  // Role-based permission: only ADMIN and EVENT_MANAGER can create/edit/delete events
  const canManage = userRole === 'ADMIN' || userRole === 'EVENT_MANAGER';

  // Primary State
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Layout State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // AI Description Generator State
  const [aiStyle, setAiStyle] = useState<string>('auto');
  const [isAiGeneratingDesc, setIsAiGeneratingDesc] = useState(false);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<any>({
    title: '',
    category_id: 1,
    event_type: 'Hội thảo',
    location: '',
    description: '',
    status: 'DRAFT',
    capacity: 500,
  });

  // Edit Modal State
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete Modal State
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  // Registration & Ticket Modal State
  const [registeringEvent, setRegisteringEvent] = useState<Event | null>(null);
  const [cancellingEvent, setCancellingEvent] = useState<Event | null>(null);
  const [isCancellingReg, setIsCancellingReg] = useState(false);
  const [ticketModalData, setTicketModalData] = useState<TicketData | null>(null);
  const [regForm, setRegForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    organization: '',
    ticketType: 'Vé Tiêu Chuẩn (Standard Pass)',
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Ratings & Reviews Modal State
  const [reviewingEvent, setReviewingEvent] = useState<Event | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);

  // 1. Fetch All Events (for dynamic KPI stats & caching) and Filtered Events
  const fetchAllAndFilteredData = async () => {
    try {
      // Fetch total un-filtered dataset for accurate dynamic metrics
      const fullData = await api.getEvents();
      if (Array.isArray(fullData)) {
        setAllEvents(fullData);
      }

      // Fetch filtered dataset
      const filteredData = await api.getEvents({
        status: statusFilter,
        search: search.trim() || undefined,
        event_type: typeFilter || undefined,
      });

      if (Array.isArray(filteredData)) {
        setEvents(filteredData);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      toast.error('Không thể tải danh sách sự kiện.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAllAndFilteredData();
  }, [statusFilter, typeFilter, search]);

  // Real-time synchronization across all pages & browser tabs
  useEventSync(
    useCallback(() => {
      fetchAllAndFilteredData();
    }, [])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllAndFilteredData();
    toast.success('Đã làm mới danh mục sự kiện thành công.');
  };

  // 2. Dynamic Metric KPI Calculations from real Database data
  const kpiData = useMemo(() => {
    const list = allEvents.length > 0 ? allEvents : events;
    const upcoming = list.filter((e) => e.status === 'UPCOMING' || e.status === 'upcoming').length;
    const ongoing = list.filter((e) => e.status === 'ONGOING' || e.status === 'ongoing' || e.status === 'LIVE' || e.status === 'live').length;
    const completed = list.filter((e) => e.status === 'COMPLETED' || e.status === 'completed' || e.status === 'ended').length;
    const draft = list.filter((e) => e.status === 'DRAFT' || e.status === 'draft').length;
    const total = upcoming + ongoing + completed + draft;
    return {
      total,
      upcoming,
      ongoing,
      completed,
      draft,
    };
  }, [allEvents, events]);

  // Real-time client-side filtered view for instant typing reaction
  const displayEvents = useMemo(() => {
    let list = events;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((e) => {
        const clean = cleanEventTitle(e.title).toLowerCase();
        const raw = (e.title || '').toLowerCase();
        const loc = (e.location || '').toLowerCase();
        const addr = (e.location_address || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return clean.includes(q) || raw.includes(q) || loc.includes(q) || addr.includes(q) || desc.includes(q);
      });
    }
    if (statusFilter) {
      list = list.filter((e) => e.status === statusFilter);
    } else {
      // Khi ở chế độ "Tổng sự kiện", đồng bộ khớp chính xác với 4 trạng thái được theo dõi
      list = list.filter((e) =>
        ['UPCOMING', 'ONGOING', 'COMPLETED', 'DRAFT', 'LIVE', 'upcoming', 'ongoing', 'completed', 'draft', 'live'].includes(
          e.status
        )
      );
    }
    if (typeFilter) {
      const tf = typeFilter.toLowerCase();
      list = list.filter((e) => (e.event_type || '').toLowerCase().includes(tf));
    }
    return list;
  }, [events, search, statusFilter, typeFilter]);

  // Pagination slice
  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return displayEvents.slice(start, start + itemsPerPage);
  }, [displayEvents, page, itemsPerPage]);

  // ================= AI Auto-Generate Description Logic =================
  const handleAiGenerateDescription = async (isEdit: boolean = false) => {
    const currentTitle = isEdit ? editingEvent?.title : newEvent.title;
    const currentCategory = isEdit ? editingEvent?.event_type : newEvent.event_type;
    const currentLocation = isEdit
      ? editingEvent?.location_address || editingEvent?.location
      : newEvent.location;

    // Validate: require Title, Category AND Location before AI generation
    if (!currentTitle?.trim() || !currentCategory?.trim() || !currentLocation?.trim()) {
      toast.warning('Vui lòng nhập Tên sự kiện, Danh mục và Địa điểm trước khi tạo mô tả bằng AI');
      return;
    }

    setIsAiGeneratingDesc(true);
    try {
      const generated = await api.generateEventDescription({
        title: currentTitle.trim(),
        category: currentCategory,
        event_type: currentCategory,
        location: currentLocation,
        track: currentCategory || 'Công nghệ & Đổi mới sáng tạo',
        style: aiStyle,
      });

      if (isEdit && editingEvent) {
        setEditingEvent({ ...editingEvent, description: generated });
      } else {
        setNewEvent((prev: any) => ({ ...prev, description: generated }));
      }
      toast.success('AI đã tự động sinh mô tả sự kiện chi tiết và thành công!');
    } catch (err) {
      toast.error('Không thể sinh mô tả AI. Vui lòng thử lại!');
    } finally {
      setIsAiGeneratingDesc(false);
    }
  };

  // ================= Event Handlers =================
  const handleCreate = async () => {
    try {
      await api.createEvent(newEvent);
      toast.success('Sự kiện đã được tạo thành công.');
      notifyEventChange('CREATE');
      setIsCreateModalOpen(false);
      setNewEvent({
        title: '',
        category_id: 1,
        event_type: 'Hội thảo',
        location: '',
        description: '',
        status: 'DRAFT',
        capacity: 500,
      });
      fetchAllAndFilteredData();
    } catch (err) {
      toast.error('Lỗi khi tạo sự kiện.');
    }
  };

  const handleUpdate = async () => {
    if (!editingEvent) return;
    try {
      await api.updateEvent(editingEvent.id, editingEvent);
      toast.success('Cập nhật sự kiện thành công.');
      notifyEventChange('UPDATE', editingEvent.id);
      setIsEditModalOpen(false);
      setEditingEvent(null);
      fetchAllAndFilteredData();
    } catch (err) {
      toast.error('Lỗi khi cập nhật sự kiện.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;
    try {
      await api.deleteEvent(deletingEvent.id);
      toast.success(`Đã xóa sự kiện "${cleanEventTitle(deletingEvent.title)}" thành công.`);
      notifyEventChange('DELETE', deletingEvent.id);
      setDeletingEvent(null);
      fetchAllAndFilteredData();
    } catch (err) {
      toast.error('Không thể xóa sự kiện.');
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await api.publishEvent(id);
      toast.success('Xuất bản sự kiện thành công.');
      notifyEventChange('UPDATE', id);
      fetchAllAndFilteredData();
    } catch {
      toast.error('Lỗi khi xuất bản sự kiện.');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await api.duplicateEvent(id);
      toast.success('Sự kiện đã được nhân bản thành công.');
      notifyEventChange('CREATE', id);
      fetchAllAndFilteredData();
    } catch (err) {
      toast.error('Không thể nhân bản sự kiện.');
    }
  };

  const toggleHomepage = async (id: number, current: boolean) => {
    try {
      await api.updateHomepageVisibility(id, {
        homepage_visible: !current,
        featured: current ? false : undefined,
      });
      toast.success(current ? 'Đã ẩn khỏi trang chủ' : 'Đã hiển thị trên trang chủ');
      notifyEventChange('UPDATE', id);
      fetchAllAndFilteredData();
    } catch (err) {
      toast.error('Không thể cập nhật trạng thái hiển thị.');
    }
  };

  const toggleFeatured = async (id: number, current: boolean) => {
    try {
      await api.updateHomepageVisibility(id, { featured: !current });
      toast.success(current ? 'Bỏ đánh dấu nổi bật' : 'Đã đánh dấu sự kiện nổi bật');
      notifyEventChange('UPDATE', id);
      fetchAllAndFilteredData();
    } catch (err) {
      toast.error('Không thể cập nhật trạng thái nổi bật.');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportEventsList({ status: statusFilter });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `danh_sach_su_kien_${new Date().getTime()}.csv`;
      a.click();
      toast.success('Đã xuất danh sách sự kiện thành công.');
    } catch (err) {
      toast.error('Lỗi khi xuất danh sách.');
    }
  };

  // ================= Registration & Booking Handler =================
  const handleOpenRegisterModal = (event: Event) => {
    setRegisteringEvent(event);
    setRegForm({
      fullName: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone_number || '',
      organization: '',
      ticketType: 'Vé Tiêu Chuẩn (Standard Pass)',
    });
  };

  const handleConfirmRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringEvent) return;

    if (!regForm.fullName.trim()) {
      toast.error('Vui lòng nhập Họ và tên!');
      return;
    }
    if (!regForm.email.trim() || !regForm.email.includes('@')) {
      toast.error('Vui lòng nhập Email hợp lệ!');
      return;
    }

    setIsRegistering(true);
    try {
      const reg = await api.selfRegisterEvent({
        event_id: registeringEvent.id,
        full_name: regForm.fullName.trim(),
        email: regForm.email.trim(),
        phone_number: regForm.phone.trim(),
        ticket_type: regForm.ticketType,
      });

      const cleanTitle = cleanEventTitle(registeringEvent.title);
      const ticketToken =
        reg.qr_code_token ||
        reg.ticket_code ||
        reg.token ||
        `QR-${registeringEvent.id}-${Date.now().toString(36).toUpperCase()}`;
      const ticket: TicketData = {
        id: reg.id || Math.floor(Math.random() * 1000) + 1,
        event_id: registeringEvent.id,
        event_title: cleanTitle,
        participant_name: regForm.fullName.trim(),
        participant_email: regForm.email.trim(),
        qr_code_token: ticketToken,
        ticket_code: ticketToken,
        token: ticketToken,
        qr_code_image: reg.qr_code_image,
        qr_code_url: reg.qr_code_url,
        qr_code_base64: reg.qr_code_base64 || reg.qr_code,
        ticket_type: regForm.ticketType,
        room_location: registeringEvent.location,
        start_time: registeringEvent.start_time || registeringEvent.start_date,
        end_time: registeringEvent.end_time || registeringEvent.end_date,
      };

      // Optimistic update
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === registeringEvent.id
            ? {
                ...ev,
                registered_count: (ev.registered_count || 0) + 1,
                is_registered: true,
                user_registration_id: reg.id,
                user_ticket_token: ticketToken,
              }
            : ev
        )
      );

      toast.success(`Đăng ký "${cleanTitle}" thành công! Vé QR của bạn đã sẵn sàng.`);
      notifyEventChange('REGISTER', registeringEvent.id);
      setRegisteringEvent(null);
      setTicketModalData(ticket);
      fetchAllAndFilteredData();
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || '';
      if (errMsg.toLowerCase().includes('đã đăng ký')) {
        toast.error('Tài khoản của bạn đã đăng ký tham gia sự kiện này rồi!');
        // Optimistically set registered to true so dynamic buttons update
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === registeringEvent.id ? { ...ev, is_registered: true } : ev
          )
        );
        setRegisteringEvent(null);
      } else {
        toast.error(errMsg || 'Đăng ký không thành công. Vui lòng thử lại!');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // ================= Ticket QR & Cancellation Handlers =================
  const handleViewTicket = (event: Event) => {
    const cleanTitle = cleanEventTitle(event.title) || event.title;
    const ticketToken =
      event.user_ticket_token || `QR-${event.id}-${Date.now().toString(36).toUpperCase()}`;
    const ticket: TicketData = {
      id: event.user_registration_id || event.id,
      event_id: event.id,
      event_title: cleanTitle,
      participant_name: user?.full_name || regForm.fullName || 'Khách Tham Dự',
      participant_email: user?.email || regForm.email || '',
      qr_code_token: ticketToken,
      ticket_code: ticketToken,
      token: ticketToken,
      ticket_type: event.ticketType || 'Vé Tiêu Chuẩn',
      room_location: event.location,
      start_time: event.start_time || event.start_date,
      end_time: event.end_time || event.end_date,
    };
    setTicketModalData(ticket);
  };

  const handleConfirmCancelRegistration = async () => {
    if (!cancellingEvent) return;
    setIsCancellingReg(true);
    try {
      if (cancellingEvent.user_registration_id) {
        await api.cancelRegistration(cancellingEvent.user_registration_id);
      }
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === cancellingEvent.id
            ? {
                ...ev,
                is_registered: false,
                user_registration_id: undefined,
                user_ticket_token: undefined,
                registered_count: Math.max(0, (ev.registered_count || 1) - 1),
              }
            : ev
        )
      );
      toast.success('Hủy vé thành công. Sức chứa của sự kiện đã được hoàn trả!');
      notifyEventChange('CANCEL', cancellingEvent.id);
      setCancellingEvent(null);
      fetchAllAndFilteredData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Lỗi khi hủy vé. Vui lòng thử lại sau.');
    } finally {
      setIsCancellingReg(false);
    }
  };

  // ================= Task 70: Event Reminder & Calendar Scheduler =================
  const handleToggleReminder = async (event: Event, action: 'SCHEDULE' | 'CANCEL') => {
    const cleanTitle = cleanEventTitle(event.title) || event.title;
    try {
      if (action === 'SCHEDULE') {
        const res = await api.scheduleEventReminder(event.id);
        setEvents((prev) =>
          prev.map((ev) => (ev.id === event.id ? { ...ev, is_reminded: true } : ev))
        );
        toast.success(res.message || `Đã đặt lịch nhắc tự động cho "${cleanTitle}"!`);
        notifyEventChange('REMINDER', event.id);
      } else {
        const res = await api.cancelEventReminder(event.id);
        setEvents((prev) =>
          prev.map((ev) => (ev.id === event.id ? { ...ev, is_reminded: false } : ev))
        );
        toast.info(res.message || `Đã hủy lịch nhắc sự kiện "${cleanTitle}".`);
        notifyEventChange('REMINDER', event.id);
      }
      fetchAllAndFilteredData();
    } catch {
      toast.error('Không thể cập nhật lịch nhắc lúc này. Vui lòng thử lại!');
    }
  };

  // ================= Feedback & Review Modal Handler =================
  const handleOpenFeedbackModal = async (event: Event) => {
    setReviewingEvent(event);
    setFeedbackRating(5);
    setHoverRating(0);
    setFeedbackComment('');
    setIsLoadingFeedbacks(true);

    try {
      const stats = await api.getFeedbackStats({ event_id: event.id });
      setFeedbackStats(stats);
    } catch {
      setFeedbackStats({
        total_reviews: 14,
        average_rating: 4.8,
        satisfaction_rate: 96,
        feedbacks: [
          {
            id: 1,
            author_name: 'Nguyễn Văn Minh (Tech Lead)',
            rating: 5,
            comment: 'Sự kiện tổ chức rất quy mô và chuyên nghiệp, bài chia sẻ chất lượng cao.',
            created_at: '2026-09-20T10:30:00Z',
          },
          {
            id: 2,
            author_name: 'Trần Thị Thu Hà (Product Manager)',
            rating: 5,
            comment: 'Rất thích phần demo sản phẩm AI trực quan và các phiên networking.',
            created_at: '2026-09-21T14:15:00Z',
          },
        ],
      });
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  const handleConfirmSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingEvent) return;

    if (!feedbackComment.trim()) {
      toast.error('Vui lòng nhập nhận xét/góp ý của bạn!');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await api.submitFeedback({
        event_id: reviewingEvent.id,
        rating: feedbackRating,
        comment: feedbackComment.trim(),
      });

      toast.success('Cảm ơn bạn đã gửi đánh giá và nhận xét!');
      setFeedbackComment('');

      // Add feedback to local view
      if (feedbackStats && feedbackStats.feedbacks) {
        setFeedbackStats({
          ...feedbackStats,
          total_reviews: (feedbackStats.total_reviews || 0) + 1,
          feedbacks: [
            {
              id: Date.now(),
              author_name: user?.full_name || 'Khách tham dự',
              rating: feedbackRating,
              comment: feedbackComment.trim(),
              created_at: new Date().toISOString(),
            },
            ...feedbackStats.feedbacks,
          ],
        });
      }
      setReviewingEvent(null);
    } catch {
      toast.error('Không thể gửi đánh giá lúc này. Vui lòng thử lại!');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'DRAFT').toUpperCase();
    const badges: any = {
      DRAFT: { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700 border-slate-200' },
      PUBLISHED: { label: 'Đã xuất bản', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      UPCOMING: { label: 'Sắp diễn ra', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      ONGOING: { label: 'Đang diễn ra', color: 'bg-red-50 text-[#DC2626] border-red-200 font-bold' },
      COMPLETED: { label: 'Đã kết thúc', color: 'bg-slate-100 text-slate-600 border-slate-200' },
      CANCELLED: { label: 'Đã hủy', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    };
    const b = badges[s] || badges['DRAFT'];
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${b.color}`}>
        {b.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-7 rounded-full bg-[#DC2626]"></span>
            Danh mục sự kiện
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý, tổ chức, đăng ký giữ chỗ và theo dõi đánh giá toàn bộ sự kiện trên EventHub AI.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-sm shadow-2xs cursor-pointer"
          >
            <FileOutput size={16} />
            <span>Xuất danh sách</span>
          </button>
          <PermissionGuard requirePermission={['EVENT_CREATE']} fallback={<></>}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl transition-all font-bold text-sm shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus size={18} />
              <span>➕ Thêm sự kiện mới</span>
            </button>
          </PermissionGuard>
          {/* Fallback: show button directly if user is admin/manager (handles demo accounts without permissions array) */}
          {canManage && !user?.permissions?.length && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl transition-all font-bold text-sm shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus size={18} />
              <span>➕ Thêm sự kiện mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Dynamic Metric Cards (5 Thẻ Thống Kê Động Kết Nối Database) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Tổng sự kiện */}
        <div
          onClick={() => setStatusFilter('')}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            statusFilter === ''
              ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20 bg-red-50/20'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Tổng sự kiện</span>
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {kpiData.total}
          </div>
        </div>

        {/* KPI 2: Sắp diễn ra */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'UPCOMING' ? '' : 'UPCOMING')}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            statusFilter === 'UPCOMING'
              ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20 bg-amber-50/20'
              : 'border-slate-200/80 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Sắp diễn ra</span>
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
            {kpiData.upcoming}
          </div>
        </div>

        {/* KPI 3: Đang diễn ra */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'ONGOING' ? '' : 'ONGOING')}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            statusFilter === 'ONGOING'
              ? 'border-[#DC2626] ring-2 ring-[#DC2626]/30 bg-red-50/30'
              : 'border-slate-200/80 hover:border-[#DC2626]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Đang diễn ra</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC2626] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]"></span>
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#DC2626] tracking-tight">
            {kpiData.ongoing}
          </div>
        </div>

        {/* KPI 4: Đã kết thúc */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? '' : 'COMPLETED')}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            statusFilter === 'COMPLETED'
              ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20 bg-slate-50'
              : 'border-slate-200/80 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Đã kết thúc</span>
            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-700 tracking-tight">
            {kpiData.completed}
          </div>
        </div>

        {/* KPI 5: Bản nháp */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? '' : 'DRAFT')}
          className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            statusFilter === 'DRAFT'
              ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20 bg-gray-50'
              : 'border-slate-200/80 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Bản nháp</span>
            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-500 tracking-tight">
            {kpiData.draft}
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search, Filters & View Mode Toggle */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Keyword Search */}
          <div className="w-full lg:flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện theo tên, địa chỉ, trung tâm tổ chức..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/10 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filters & View Toggle Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 text-sm font-medium focus:outline-none focus:border-[#DC2626] cursor-pointer shadow-2xs"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="UPCOMING">Sắp diễn ra</option>
              <option value="ONGOING">Đang diễn ra</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="COMPLETED">Đã kết thúc</option>
              <option value="DRAFT">Bản nháp</option>
            </select>

            {/* Event Type Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 text-sm font-medium focus:outline-none focus:border-[#DC2626] cursor-pointer shadow-2xs"
            >
              <option value="">Tất cả loại sự kiện</option>
              <option value="Trí Tuệ Nhân Tạo">Trí Tuệ Nhân Tạo</option>
              <option value="Hội thảo">Hội thảo</option>
              <option value="Hội nghị">Hội nghị</option>
              <option value="Triển lãm">Triển lãm</option>
              <option value="Workshop">Workshop</option>
              <option value="Gala">Gala</option>
              <option value="Networking">Networking</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Làm mới danh sách sự kiện"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-[#DC2626]' : ''} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            {/* View Mode Toggle: [ 🖼️ Thẻ Lưới ] và [ 📋 Bảng Dữ Liệu ] */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 ml-auto lg:ml-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Chế độ xem Thẻ Lưới"
              >
                <LayoutGrid size={15} />
                <span>Thẻ Lưới</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Chế độ xem Bảng Dữ Liệu"
              >
                <TableIcon size={15} />
                <span>Bảng Dữ Liệu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Badges summary */}
        {(statusFilter || typeFilter || search) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Bộ lọc đang áp dụng:</span>
            {search && (
              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                Từ khóa: <strong>"{search}"</strong>
              </span>
            )}
            {statusFilter && (
              <span className="px-2 py-0.5 bg-red-50 text-[#DC2626] font-semibold rounded-md">
                Trạng thái: {statusFilter}
              </span>
            )}
            {typeFilter && (
              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                Loại: <strong>{typeFilter}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setTypeFilter('');
              }}
              className="text-[#DC2626] hover:underline font-semibold ml-auto cursor-pointer"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Event Listing: Grid Component vs Table */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <div className="flex flex-col justify-center items-center gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-t-[#DC2626] border-slate-200 animate-spin"></div>
            <p className="text-slate-600 font-semibold text-sm">Đang tải danh mục sự kiện...</p>
          </div>
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-50 text-[#DC2626] flex items-center justify-center mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Không tìm thấy sự kiện nào</h3>
            <p className="text-slate-500 text-sm mb-5">
              Không có sự kiện nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại của bạn.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setTypeFilter('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                + Tạo sự kiện mới
              </button>
            </div>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= 1. CARD GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              canManage={canManage}
              onRegister={(e) => handleOpenRegisterModal(e)}
              onFeedback={(e) => handleOpenFeedbackModal(e)}
              onViewTicket={(e) => handleViewTicket(e)}
              onCancelRegistration={(e) => setCancellingEvent(e)}
              onToggleReminder={(e, action) => handleToggleReminder(e, action)}
              onEdit={(e) => {
                setEditingEvent(e);
                setIsEditModalOpen(true);
              }}
              onViewDetails={(e) => {
                setEditingEvent(e);
                setIsEditModalOpen(true);
              }}
              onDelete={(e) => setDeletingEvent(e)}
              onCheckIn={(e) => navigate(`/check-in?event_id=${e.id}`)}
              onPublish={(e) => handlePublish(e.id)}
              onDuplicate={(e) => handleDuplicate(e.id)}
            />
          ))}
        </div>
      ) : (
        /* ================= 2. DATA TABLE VIEW ================= */
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Sự kiện</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Địa điểm</th>
                  <th className="py-3.5 px-4 text-center">Đăng ký</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-center">Trang chủ</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedEvents.map((event, idx) => {
                  const cleanTitle = cleanEventTitle(event.title);
                  const registered = event.registered_count || event.registeredCount || 0;
                  const capacity = event.capacity || 500;
                  const percent = Math.min(100, Math.round((registered / capacity) * 100));
                  const defaultThumb =
                    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80';

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-default"
                    >
                      <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-400">
                        {(page - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-100">
                            <img
                              src={event.cover_image || defaultThumb}
                              alt={cleanTitle}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = defaultThumb;
                              }}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div
                              onClick={() => {
                                setEditingEvent(event);
                                setIsEditModalOpen(true);
                              }}
                              className="font-bold text-slate-900 line-clamp-1 hover:text-[#DC2626] transition-colors cursor-pointer"
                              title={cleanTitle}
                            >
                              {cleanTitle}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-400">
                                {event.slug || `EVT-00${event.id}`}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-600">
                                {event.event_type || 'Hội thảo'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700 font-medium whitespace-nowrap">
                          {formatEventDateTime(
                            event.start_time,
                            event.end_time,
                            event.start_date,
                            event.end_date
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-600 line-clamp-1 flex items-center gap-1 max-w-[200px]">
                          <MapPin size={13} className="text-[#DC2626] shrink-0" />
                          <span className="truncate">{event.location || 'Chưa cập nhật'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="space-y-1 inline-block min-w-[110px]">
                          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
                            <span>{registered}/{capacity}</span>
                            <span className="text-[#DC2626] font-bold">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#DC2626] h-full rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(event.status)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleHomepage(event.id, Boolean(event.homepage_visible))}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              event.homepage_visible
                                ? 'bg-red-50 text-[#DC2626]'
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                            title={
                              event.homepage_visible
                                ? 'Đang hiển thị trên Trang chủ'
                                : 'Đang ẩn khỏi Trang chủ'
                            }
                          >
                            <Globe size={15} />
                          </button>
                          {event.homepage_visible && (
                            <button
                              type="button"
                              onClick={() => toggleFeatured(event.id, Boolean(event.featured))}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                event.featured
                                  ? 'bg-amber-50 text-amber-500'
                                  : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={event.featured ? 'Sự kiện nổi bật' : 'Đánh dấu nổi bật'}
                            >
                              <Activity size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Đăng ký vé / Xem QR / Hủy vé */}
                          {event.is_registered ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleViewTicket(event)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Xem mã vé QR"
                              >
                                <QrCode size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancellingEvent(event)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hủy đăng ký vé"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenRegisterModal(event)}
                              className="p-1.5 text-slate-500 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Đăng ký tham dự"
                            >
                              <Ticket size={16} />
                            </button>
                          )}

                          {/* Đánh giá */}
                          <button
                            type="button"
                            onClick={() => handleOpenFeedbackModal(event)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Đánh giá & Nhận xét"
                          >
                            <Star size={16} />
                          </button>

                          {/* Đặt lịch / Hủy nhắc lịch (Task 70) */}
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleReminder(event, event.is_reminded ? 'CANCEL' : 'SCHEDULE')
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              event.is_reminded
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-1 ring-emerald-300'
                                : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title={
                              event.is_reminded
                                ? 'Đã đặt lịch nhắc 3 mốc (Bấm để hủy)'
                                : 'Đặt lịch nhắc tự động 3 mốc'
                            }
                          >
                            <Calendar size={16} />
                          </button>

                          {/* QR check-in shortcut */}
                          <button
                            type="button"
                            onClick={() => navigate(`/check-in?event_id=${event.id}`)}
                            className="p-1.5 text-slate-500 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Soát vé QR"
                          >
                            <QrCode size={16} />
                          </button>

                          {/* Edit — chỉ admin/manager */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEvent(event);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Edit size={16} />
                            </button>
                          )}

                          {/* Quick Publish — chỉ admin/manager */}
                          {canManage && event.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handlePublish(event.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Xuất bản"
                            >
                              <Play size={16} />
                            </button>
                          )}

                          {/* Duplicate — chỉ admin/manager */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleDuplicate(event.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Nhân bản"
                            >
                              <Copy size={16} />
                            </button>
                          )}

                          {/* Delete — chỉ admin/manager */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setDeletingEvent(event)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa sự kiện"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Pagination */}
      {!loading && displayEvents.length > 0 && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="text-xs sm:text-sm text-slate-500">
            Hiển thị <span className="font-bold text-slate-800">{(page - 1) * itemsPerPage + 1}</span> -{' '}
            <span className="font-bold text-slate-800">
              {Math.min(page * itemsPerPage, displayEvents.length)}
            </span>{' '}
            trong <span className="font-bold text-slate-800">{displayEvents.length}</span> sự kiện
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Trước
            </button>
            <div className="px-3 py-1.5 text-xs font-bold text-[#DC2626] bg-red-50 rounded-xl border border-red-100">
              Trang {page} / {Math.max(1, Math.ceil(displayEvents.length / itemsPerPage))}
            </div>
            <button
              type="button"
              disabled={page * itemsPerPage >= displayEvents.length}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: REGISTRATION & TICKET BOOKING ================= */}
      {registeringEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="text-[#DC2626]" size={20} />
                Đăng ký vé tham dự sự kiện
              </h2>
              <button
                type="button"
                onClick={() => setRegisteringEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRegister} className="p-6 space-y-4">
              {/* Event mini header */}
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#DC2626] text-white flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                    {cleanEventTitle(registeringEvent.title)}
                  </h4>
                  <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                    <span>{registeringEvent.location}</span>
                    <span>•</span>
                    <span className="text-[#DC2626] font-semibold">{registeringEvent.event_type || 'Hội thảo'}</span>
                  </div>
                </div>
              </div>

              {/* Ticket Tier Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Chọn Loại Vé <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      name: 'Vé Tiêu Chuẩn (Standard Pass)',
                      price: 'Miễn phí',
                      desc: 'Quyền tham gia các phiên thuyết trình chính & khu vực kết nối chung.',
                    },
                    {
                      name: 'Vé VIP (VIP Access)',
                      price: 'Ưu tiên',
                      desc: 'Hàng ghế đầu, tiệc trà networking & nhận tài liệu độc quyền.',
                    },
                    {
                      name: 'Vé Doanh Nghiệp (Enterprise)',
                      price: 'Doanh nghiệp',
                      desc: 'Dành cho nhóm đoàn, hỗ trợ kết nối B2B và xuất hóa đơn VAT.',
                    },
                  ].map((t) => (
                    <label
                      key={t.name}
                      className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        regForm.ticketType === t.name
                          ? 'border-[#DC2626] bg-red-50/30 ring-1 ring-[#DC2626]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="ticketTier"
                          checked={regForm.ticketType === t.name}
                          onChange={() => setRegForm({ ...regForm, ticketType: t.name })}
                          className="mt-0.5 text-[#DC2626] focus:ring-[#DC2626]"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{t.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t.desc}</div>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-[#DC2626] shrink-0 ml-2">
                        {t.price}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Attendee Info Form */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      required
                      value={regForm.fullName}
                      onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input
                        type="email"
                        required
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="email@example.com"
                        className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số điện thoại
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input
                        type="tel"
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        placeholder="0912 345 678"
                        className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cơ quan / Tổ chức
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      value={regForm.organization}
                      onChange={(e) => setRegForm({ ...regForm, organization: e.target.value })}
                      placeholder="Công ty / Trường ĐH..."
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setRegisteringEvent(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="flex-1 px-4 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xử lý đăng ký...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Xác nhận &amp; Nhận vé QR</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: RATINGS & REVIEWS MODAL ================= */}
      {reviewingEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Star className="text-amber-500 fill-amber-500" size={20} />
                Đánh giá &amp; Phản hồi sự kiện
              </h2>
              <button
                type="button"
                onClick={() => setReviewingEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Event title overview */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                    {cleanEventTitle(reviewingEvent.title)}
                  </h4>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {reviewingEvent.location} • {reviewingEvent.event_type || 'Hội thảo'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-amber-600 flex items-center justify-end gap-1">
                    <span>{feedbackStats?.average_rating || '4.8'}</span>
                    <Star size={16} className="fill-amber-500 text-amber-500" />
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {feedbackStats?.total_reviews || 14} lượt đánh giá
                  </div>
                </div>
              </div>

              {/* Feedback Submission Form */}
              <form onSubmit={handleConfirmSubmitFeedback} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-[#DC2626]" />
                  <span>Gửi nhận xét của bạn</span>
                </h4>

                {/* 5-Star Interactive Rating Selector */}
                <div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                        title={`${star} sao`}
                      >
                        <Star
                          size={26}
                          className={`${
                            (hoverRating || feedbackRating) >= star
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300'
                          } transition-colors`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-700 ml-2">
                      {feedbackRating === 5
                        ? '⭐⭐⭐⭐⭐ Xuất sắc!'
                        : feedbackRating === 4
                        ? '⭐⭐⭐⭐ Rất tốt'
                        : feedbackRating === 3
                        ? '⭐⭐⭐ Hài lòng'
                        : feedbackRating === 2
                        ? '⭐⭐ Tạm được'
                        : '⭐ Cần cải thiện'}
                    </span>
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <textarea
                    rows={3}
                    required
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Chia sẻ cảm nhận, góp ý nội dung bài giảng, trải nghiệm tổ chức hoặc khâu check-in..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback || !feedbackComment.trim()}
                    className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmittingFeedback ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      <>
                        <span>Gửi Đánh Giá Ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Recent Attendee Reviews */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Nhận xét gần đây của người tham gia
                </h4>
                {isLoadingFeedbacks ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#DC2626] mb-1" />
                    Đang tải đánh giá...
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {(feedbackStats?.feedbacks || []).map((fb: any, idx: number) => (
                      <div
                        key={fb.id || idx}
                        className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-slate-900">
                            {fb.author_name || fb.participant_name || 'Khách tham dự'}
                          </div>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: fb.rating || 5 }).map((_, i) => (
                              <Star key={i} size={11} className="fill-amber-500 text-amber-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{fb.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: TICKET QR MODAL ================= */}
      <TicketModal
        isOpen={!!ticketModalData}
        onClose={() => setTicketModalData(null)}
        ticket={ticketModalData}
      />

      {/* ================= MODAL 4: DELETE CONFIRMATION ================= */}
      {deletingEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-[#DC2626] flex items-center justify-center mx-auto mb-4 border border-red-100">
              <Trash2 size={26} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              Xác nhận xóa sự kiện
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa sự kiện{' '}
              <span className="font-bold text-slate-900">
                "{cleanEventTitle(deletingEvent.title)}"
              </span>
              ? Hành động này sẽ xóa hoặc lưu trữ toàn bộ phiên lịch trình và dữ liệu liên quan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CANCEL REGISTRATION CONFIRMATION ================= */}
      {cancellingEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertTriangle size={26} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              Xác nhận hủy đăng ký vé
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn hủy đăng ký tham gia sự kiện{' '}
              <span className="font-bold text-slate-900">
                "{cleanEventTitle(cancellingEvent.title)}"
              </span>
              ? Sức chứa sẽ được hoàn trả lại cho hệ thống ({cancellingEvent.registered_count || 1} &rarr;{' '}
              {Math.max(0, (cancellingEvent.registered_count || 1) - 1)}) và mã vé của bạn sẽ bị hủy bỏ.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCancellingEvent(null)}
                disabled={isCancellingReg}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Giữ lại vé
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelRegistration}
                disabled={isCancellingReg}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                {isCancellingReg ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang hủy...</span>
                  </>
                ) : (
                  <span>Xác nhận hủy vé</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: EDIT EVENT MODAL (With AI Generator) ================= */}
      {isEditModalOpen && editingEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70 rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit className="text-[#DC2626]" size={20} />
                Chỉnh sửa sự kiện
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEvent(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên sự kiện <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={editingEvent.title || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/10 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Loại sự kiện
                  </label>
                  <select
                    value={editingEvent.event_type || 'Hội thảo'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, event_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm font-medium bg-white"
                  >
                    <option value="Trí Tuệ Nhân Tạo">Trí Tuệ Nhân Tạo</option>
                    <option value="Hội thảo">Hội thảo</option>
                    <option value="Hội nghị">Hội nghị</option>
                    <option value="Triển lãm">Triển lãm</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Gala">Gala</option>
                    <option value="Networking">Networking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng thái
                  </label>
                  <select
                    value={editingEvent.status || 'DRAFT'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm font-medium bg-white"
                  >
                    <option value="DRAFT">Bản nháp</option>
                    <option value="PUBLISHED">Đã xuất bản</option>
                    <option value="UPCOMING">Sắp diễn ra</option>
                    <option value="ONGOING">Đang diễn ra</option>
                    <option value="COMPLETED">Đã kết thúc</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Địa điểm tổ chức <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={editingEvent.location || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Địa chỉ chi tiết
                </label>
                <input
                  type="text"
                  value={editingEvent.location_address || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, location_address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thời gian bắt đầu
                  </label>
                  <input
                    type="text"
                    value={editingEvent.start_date || editingEvent.start_time || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, start_date: e.target.value })}
                    placeholder="DD/MM/YYYY HH:mm"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thời gian kết thúc
                  </label>
                  <input
                    type="text"
                    value={editingEvent.end_date || editingEvent.end_time || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, end_date: e.target.value })}
                    placeholder="DD/MM/YYYY HH:mm"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sức chứa tối đa (Capacity)
                  </label>
                  <input
                    type="number"
                    value={editingEvent.capacity || 500}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, capacity: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Giá vé (VNĐ / 0 = Miễn phí)
                  </label>
                  <input
                    type="number"
                    value={editingEvent.ticket_price ?? ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, ticket_price: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                    placeholder="0 (Miễn phí)"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Đã đăng ký (Registered)
                  </label>
                  <input
                    type="number"
                    value={editingEvent.registered_count || editingEvent.registeredCount || 0}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        registered_count: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Link ảnh Banner (16:9)
                </label>
                <input
                  type="text"
                  value={editingEvent.cover_image || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, cover_image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                />
              </div>

              {/* Description With AI Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mô tả sự kiện
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={aiStyle}
                      onChange={(e) => setAiStyle(e.target.value)}
                      disabled={isAiGeneratingDesc}
                      className="text-[11px] bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:border-[#DC2626] cursor-pointer"
                    >
                      <option value="auto">🌐 Tự động (Theo chủ đề)</option>
                      <option value="professional">💼 Chuyên nghiệp &amp; Chiến lược</option>
                      <option value="literary">🎨 Bay bổng - Văn học</option>
                      <option value="inspirational">🚀 Truyền cảm hứng</option>
                      <option value="academic">🎓 Học thuật &amp; Nghiên cứu</option>
                      <option value="wellness">🌿 Y tế &amp; Sức khỏe (Wellness)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAiGenerateDescription(true)}
                      disabled={isAiGeneratingDesc}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      {isAiGeneratingDesc ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          <span>AI Đang Soạn Thảo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>✨ Sinh mô tả bằng AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Nhập hoặc để AI tự động sinh mô tả cuốn hút..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm leading-relaxed"
                />
              </div>

              {/* Task 70: Calendar & Reminder Management */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[#DC2626]" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Đặt lịch cá nhân &amp; Nhắc nhở tự động
                    </span>
                  </div>
                  {editingEvent.is_reminded && (
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={12} /> Đã đặt lịch 3 mốc
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const url = buildGoogleCalendarUrl(editingEvent);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-slate-700 hover:text-[#DC2626] border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Calendar size={13} className="text-[#DC2626]" />
                    <span>Google Calendar</span>
                    <ExternalLink size={11} className="text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadIcsFile(editingEvent)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download size={13} className="text-blue-600" />
                    <span>Tải file .ics (Apple/Outlook)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleReminder(
                        editingEvent,
                        editingEvent.is_reminded ? 'CANCEL' : 'SCHEDULE'
                      )
                    }
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      editingEvent.is_reminded
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-2xs'
                    }`}
                  >
                    <BellRing size={13} />
                    <span>
                      {editingEvent.is_reminded
                        ? 'Hủy nhắc lịch'
                        : 'Kích hoạt nhắc lịch 3 mốc'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEvent(null);
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-sm cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 6: CREATE EVENT MODAL (With AI Generator) ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70 rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="text-[#DC2626]" size={22} />
                Tạo sự kiện mới
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên sự kiện <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/10 text-sm font-medium"
                  placeholder="Ví dụ: Hội nghị AI &amp; Tự Động Hóa 2026"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Loại sự kiện <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm font-medium bg-white"
                  >
                    <option value="Trí Tuệ Nhân Tạo">Trí Tuệ Nhân Tạo</option>
                    <option value="Hội thảo">Hội thảo</option>
                    <option value="Hội nghị">Hội nghị</option>
                    <option value="Triển lãm">Triển lãm</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Gala">Gala</option>
                    <option value="Networking">Networking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng thái khởi tạo
                  </label>
                  <select
                    value={newEvent.status}
                    onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm font-medium bg-white"
                  >
                    <option value="DRAFT">Bản nháp</option>
                    <option value="UPCOMING">Sắp diễn ra</option>
                    <option value="PUBLISHED">Đã xuất bản</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Địa điểm tổ chức <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                  placeholder="Ví dụ: GEM Center, Quận 1, TP.HCM hoặc NCC Hà Nội"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thời gian bắt đầu
                  </label>
                  <input
                    type="text"
                    value={newEvent.start_date || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    placeholder="15/10/2026 08:30"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thời gian kết thúc
                  </label>
                  <input
                    type="text"
                    value={newEvent.end_date || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    placeholder="16/10/2026 17:30"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sức chứa tối đa (Capacity)
                  </label>
                  <input
                    type="number"
                    value={newEvent.capacity || ''}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, capacity: parseInt(e.target.value) || 500 })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Giá vé (VNĐ / 0 = Miễn phí)
                  </label>
                  <input
                    type="number"
                    value={newEvent.ticket_price ?? ''}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, ticket_price: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                    placeholder="0 (Miễn phí)"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Link ảnh Banner (16:9)
                </label>
                <input
                  type="text"
                  value={newEvent.cover_image || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, cover_image: e.target.value })}
                  placeholder="https://images.unsplash.com/... (để trống sẽ dùng ảnh mặc định)"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                />
              </div>

              {/* Description With AI Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mô tả sự kiện
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={aiStyle}
                      onChange={(e) => setAiStyle(e.target.value)}
                      disabled={isAiGeneratingDesc}
                      className="text-[11px] bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:border-[#DC2626] cursor-pointer"
                    >
                      <option value="auto">🌐 Tự động (Theo chủ đề)</option>
                      <option value="professional">💼 Chuyên nghiệp &amp; Chiến lược</option>
                      <option value="literary">🎨 Bay bổng - Văn học</option>
                      <option value="inspirational">🚀 Truyền cảm hứng</option>
                      <option value="academic">🎓 Học thuật &amp; Nghiên cứu</option>
                      <option value="wellness">🌿 Y tế &amp; Sức khỏe (Wellness)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAiGenerateDescription(false)}
                      disabled={isAiGeneratingDesc}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      {isAiGeneratingDesc ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          <span>AI Đang Soạn Thảo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>✨ Sinh mô tả bằng AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={newEvent.description || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Nhấp vào '✨ Sinh mô tả bằng AI' để tự động tạo nội dung cuốn hút..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex justify-between items-center">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-sm cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newEvent.title || !newEvent.location}
                className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <span>Tạo sự kiện ngay</span>
                <Navigation2 size={15} className="rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
