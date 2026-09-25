import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService as api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PermissionGuard } from '../components/PermissionGuard';
import { EventCard, cleanEventTitle, formatEventDateTime } from '../components/EventCard';
import { Event } from '../types';

export const Events: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<any>({
    title: '',
    category_id: 1,
    event_type: 'Hội thảo',
    location: '',
    status: 'DRAFT',
    capacity: 500,
  });

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllAndFilteredData();
    toast.success('Đã làm mới danh mục sự kiện thành công.');
  };

  // 2. Dynamic Metric KPI Calculations from real Database data
  const kpiData = useMemo(() => {
    const list = allEvents.length > 0 ? allEvents : events;
    return {
      total: list.length,
      upcoming: list.filter((e) => e.status === 'UPCOMING').length,
      ongoing: list.filter((e) => e.status === 'ONGOING').length,
      completed: list.filter((e) => e.status === 'COMPLETED').length,
      draft: list.filter((e) => e.status === 'DRAFT').length,
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

  // Handlers
  const handleCreate = async () => {
    try {
      await api.createEvent(newEvent);
      toast.success('Sự kiện đã được tạo thành công.');
      setIsCreateModalOpen(false);
      setNewEvent({
        title: '',
        category_id: 1,
        event_type: 'Hội thảo',
        location: '',
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
      setDeletingEvent(null);
      fetchAllAndFilteredData();
    } catch (err) {
      toast.error('Không thể xóa sự kiện.');
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await api.publishEvent(id);
      toast.success('Sự kiện đã được xuất bản thành công.');
      fetchAllAndFilteredData();
    } catch (err) {
      toast.error('Lỗi khi xuất bản sự kiện.');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await api.duplicateEvent(id);
      toast.success('Sự kiện đã được nhân bản thành công.');
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
      fetchAllAndFilteredData();
    } catch (err) {
      toast.error('Không thể cập nhật trạng thái hiển thị.');
    }
  };

  const toggleFeatured = async (id: number, current: boolean) => {
    try {
      await api.updateHomepageVisibility(id, { featured: !current });
      toast.success(current ? 'Bỏ đánh dấu nổi bật' : 'Đã đánh dấu sự kiện nổi bật');
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
            Quản lý, tổ chức và theo dõi toàn bộ sự kiện trên nền tảng EventHub AI theo thời gian thực.
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
              <span>+ Tạo sự kiện</span>
            </button>
          </PermissionGuard>
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
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Toàn bộ trong hệ thống</div>
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
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Đã sẵn sàng khai mạc</div>
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
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Trực tiếp thời gian thực</div>
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
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Đã hoàn thành phiên</div>
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
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Chờ biên tập & xuất bản</div>
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
                          {/* QR check-in shortcut */}
                          <button
                            type="button"
                            onClick={() => navigate(`/check-in?event_id=${event.id}`)}
                            className="p-1.5 text-slate-500 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Soát vé QR"
                          >
                            <QrCode size={16} />
                          </button>

                          {/* Edit */}
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

                          {/* Quick Publish */}
                          {event.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handlePublish(event.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Xuất bản"
                            >
                              <Play size={16} />
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(event.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Nhân bản"
                          >
                            <Copy size={16} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeletingEvent(event)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa sự kiện"
                          >
                            <Trash2 size={16} />
                          </button>
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

      {/* ================= MODAL 1: DELETE CONFIRMATION ================= */}
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

      {/* ================= MODAL 2: EDIT EVENT MODAL ================= */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả sự kiện
                </label>
                <textarea
                  rows={3}
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#DC2626] text-sm"
                />
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

      {/* ================= MODAL 3: CREATE EVENT MODAL ================= */}
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
                  placeholder="Ví dụ: Hội nghị AI & Tự Động Hóa 2026"
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
