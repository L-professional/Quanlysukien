import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Users,
  Search,
  Bot,
  QrCode,
  Sparkles,
  Send,
  Bell,
  CreditCard,
  Lock,
  ChevronRight,
  Ticket,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { toast } from 'sonner';

export interface DashboardProps {
  onNavigateTab?: (tab: string) => void;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DashboardErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Crash Caught By Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-slate-900">Đã xảy ra lỗi tải Bảng điều khiển</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {this.state.error?.message || 'Có sự cố phát sinh khi dựng giao diện Dashboard.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              🔄 Tải lại trang
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const DashboardContent: React.FC<DashboardProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, userRole } = useAuth();

  // Dynamic Dashboard Metrics (Task 59 Requirement 4)
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  const fetchDashboardStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await apiService.getDashboardStats();
      setDashboardStats(data);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Safe guarded arrays (Task 60 Hotfix)
  const userRolesList = Array.isArray(dashboardStats?.user_roles)
    ? dashboardStats.user_roles
    : typeof dashboardStats?.user_roles === 'object' && dashboardStats?.user_roles !== null
    ? Object.entries(dashboardStats.user_roles).map(([k, v]) => ({
        name: k === 'ADMIN' ? 'Quản trị viên' : k === 'EVENT_MANAGER' ? 'Ban tổ chức' : k === 'SPEAKER' ? 'Diễn giả' : 'Khách tham dự',
        pct: `${Math.round(((v as number) / Math.max(dashboardStats?.total_users || 1, 1)) * 100)}%`,
        color: k === 'ADMIN' ? 'bg-purple-600' : k === 'EVENT_MANAGER' ? 'bg-blue-600' : 'bg-emerald-600',
      }))
    : [
        { name: 'Khách tham dự', pct: '68%', color: 'bg-emerald-600' },
        { name: 'Ban tổ chức', pct: '20%', color: 'bg-blue-600' },
        { name: 'Quản trị viên', pct: '12%', color: 'bg-purple-600' },
      ];

  const recentActivitiesList = Array.isArray(dashboardStats?.recent_activities) && dashboardStats.recent_activities.length > 0
    ? dashboardStats.recent_activities
    : [
        { title: 'Đăng nhập hệ thống', time: '2 phút trước', desc: 'admin@eventai.vn đăng nhập thành công' },
        { title: 'Tạo sự kiện mới', time: '15 phút trước', desc: 'Sự kiện "Tech Summit 2026" đã được tạo' },
        { title: 'Cập nhật thông tin khách mời', time: '1 giờ trước', desc: 'Đồng bộ 24 hồ sơ check-in PostgreSQL' },
        { title: 'Sao lưu dữ liệu', time: '2 giờ trước', desc: 'Tự động sao lưu cơ sở dữ liệu hoàn tất' },
      ];

  const revenueByTierList = Array.isArray(dashboardStats?.revenue_by_tier) && dashboardStats.revenue_by_tier.length > 0
    ? dashboardStats.revenue_by_tier
    : [
        { name: 'Vé VIP All-Access', percentage: 65, color: 'bg-blue-600' },
        { name: 'Vé Tiêu Chuẩn', percentage: 25, color: 'bg-emerald-500' },
        { name: 'Vé Tham Dự', percentage: 10, color: 'bg-amber-500' },
      ];

  // Active role view automatically determined by logged-in user role
  // Task 63: Staff có quyền Dashboard Báo Cáo BẰNG HOÀN TOÀN với Manager (ORGANIZER)
  const activeRoleView: 'ATTENDEE' | 'STAFF' | 'ORGANIZER' | 'ADMIN' =
    userRole === 'ATTENDEE' || userRole === 'PARTICIPANT'
      ? 'ATTENDEE'
      : userRole === 'STAFF'
      ? 'STAFF'
      : userRole === 'EVENT_MANAGER'
      ? 'ORGANIZER'
      : 'ADMIN';

  // Attendee QR Modal
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<{ title: string; date: string; code: string } | null>(null);

  // Search queries
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-900 animate-in fade-in duration-200">
      {isLoadingStats && (
        <div className="w-full h-1 bg-slate-100 overflow-hidden rounded-full">
          <div className="w-1/3 h-full bg-blue-600 rounded-full animate-pulse" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. GIAO DIỆN NGƯỜI THAM DỰ (ATTENDEE) */}
      {/* ========================================================================= */}
      {activeRoleView === 'ATTENDEE' && (
        <div className="space-y-6">
          {/* Header Banner + AI Assistant Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left 8 Cols: Welcome & Search */}
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {t('dashboard.attendeeWelcome')}, {user?.full_name || 'Nguyễn Văn An'}! 👋
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t('dashboard.attendeeSubtitle')}
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('dashboard.searchEventsPlaceholder')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  {t('dashboard.searchBtn')}
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Trợ lý AI Box */}
            <div className="lg:col-span-4 bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('dashboard.aiAssistantTitle')}</h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                    {t('dashboard.aiAssistantSubtitle')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  toast.success(t('dashboard.aiAssistantTitle') + '!');
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('dashboard.askAiBtn')}</span>
              </button>
            </div>
          </div>

          {/* Thẻ Chỉ Số Cá Nhân Của Người Tham Dự (Task 61 Requirement 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t('dashboard.myTicketsStat')}</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">3 {t('dashboard.myTicketsStat')}</p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ {t('status.valid')}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t('dashboard.upcomingEventsStat')}</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">2 {t('dashboard.eventsCount')}</p>
                <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">📅 25/04/2026</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t('dashboard.todayScheduleStat')}</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">1 {t('dashboard.sessionsToday')}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">⏰ 09:00 - Hội trường Melia</p>
              </div>
            </div>
          </div>

          {/* Section: Sự kiện sắp diễn ra */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{t('dashboard.upcomingEvents')}</h3>
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>{t('dashboard.viewAll')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  id: 1,
                  title: 'Hội nghị Công nghệ 2026',
                  time: '15 Tháng 4, 2026 · 09:00 - 17:00',
                  venue: 'Khách sạn Melia, Hà Nội',
                  tags: ['Công nghệ', 'Doanh nghiệp'],
                  image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=500&q=80',
                },
                {
                  id: 2,
                  title: 'Workshop Kỹ năng mềm',
                  time: '20 Tháng 4, 2026 · 13:30 - 16:30',
                  venue: 'Khách sạn InterContinental',
                  tags: ['Kỹ năng', 'Phát triển bản thân'],
                  image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=500&q=80',
                },
                {
                  id: 3,
                  title: 'Triển lãm Sản phẩm Công nghệ',
                  time: '25 Tháng 4, 2026 · 08:30 - 18:00',
                  venue: 'Trung tâm Hội chợ Triển lãm',
                  tags: ['Công nghệ', 'Triển lãm'],
                  image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=500&q=80',
                },
              ].map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <img src={evt.image} alt={evt.title} className="w-full h-36 object-cover" />
                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{evt.title}</h4>
                      <p className="text-[11px] text-slate-500">{evt.time}</p>
                      <p className="text-[11px] text-slate-500 truncate">{evt.venue}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {evt.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      type="button"
                      onClick={() => {
                        toast.success(`Đã đăng ký thành công vé tham dự "${evt.title}"!`);
                      }}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      Đăng ký ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Sự kiện đã đăng ký */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{t('dashboard.upcomingAndRegistered')}</h3>
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>{t('dashboard.viewAll')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'reg-1',
                  title: 'Hội thảo Khởi nghiệp Đổi mới sáng tạo',
                  time: '25/04/2026 · 09:00',
                  status: t('status.approved'),
                  statusBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  code: 'QR-PASS-STARTUP-2026',
                },
                {
                  id: 'reg-2',
                  title: 'Workshop Marketing số & Tự động hóa',
                  time: '18/04/2026 · 14:00',
                  status: t('status.valid'),
                  statusBg: 'bg-blue-50 text-blue-700 border-blue-200',
                  code: 'QR-PASS-MKT-AUTO',
                },
                {
                  id: 'reg-3',
                  title: 'Triển lãm Công nghệ Quốc tế 2026',
                  time: '10/04/2026 · 10:00',
                  status: t('status.valid'),
                  statusBg: 'bg-blue-50 text-blue-700 border-blue-200',
                  code: 'QR-PASS-TECH-INT',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicket({ title: item.title, date: item.time, code: item.code });
                        setShowQRModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t('dashboard.viewQR')}</span>
                    </button>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border ${item.statusBg}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Obsolete Staff Mockup View replaced by full Dashboard Báo Cáo */}
      {false && activeRoleView === 'STAFF' && (
        <div className="space-y-6">
          {/* Header Title & Breadcrumbs */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Tổng quan sự kiện</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Dashboard / Tổng quan</p>
          </div>

          {/* 4 Stat Cards - Focused on Real-time Check-in (Task 61 Requirement 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">Tiến độ Check-in thời gian thực</span>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-emerald-600">1,892 <span className="text-sm text-slate-400 font-bold">/ 2,458</span></p>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">77%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '77%' }} />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">566 khách chưa làm thủ tục</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">Tốc độ soát vé trung bình</span>
              <p className="text-2xl font-black text-blue-600">0.28s <span className="text-xs font-bold text-slate-400">/ lượt</span></p>
              <p className="text-[11px] text-blue-600 font-semibold">⚡ ~120 khách / phút (Auto-scan)</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">Cổng Soát Vé Trực Tuyến</span>
              <p className="text-2xl font-black text-slate-900">3 / 3 <span className="text-xs font-bold text-emerald-600">Cổng</span></p>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Camera Scanner Sẵn Sàng
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">Hàng Đợi AI Concierge (HITL)</span>
              <p className="text-2xl font-black text-amber-600">5 <span className="text-xs font-bold text-slate-400">yêu cầu</span></p>
              <button
                type="button"
                onClick={() => navigate('/inquiries')}
                className="text-[11px] text-amber-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xử lý câu hỏi ngay</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Middle Row: Sự kiện hôm nay & Thống kê khách mời */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 cols: Sự kiện hôm nay */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Sự kiện hôm nay</h3>

              <div className="space-y-3">
                {[
                  {
                    id: 1,
                    title: 'Hội nghị Công nghệ 2026',
                    time: '09:00 - 17:00 · Khách sạn Melia',
                    color: 'bg-blue-600',
                  },
                  {
                    id: 2,
                    title: 'Workshop Kỹ năng mềm',
                    time: '13:30 - 16:30 · Khách sạn InterContinental',
                    color: 'bg-emerald-600',
                  },
                  {
                    id: 3,
                    title: 'Gala Dinner 2026',
                    time: '18:00 - 22:00 · Khách sạn Sheraton',
                    color: 'bg-purple-600',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${item.color} text-white flex items-center justify-center shrink-0`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-500">{item.time}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/events')}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 7 cols: Thống kê khách mời (Line Chart) */}
            <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Thống kê khách mời</h3>
                <span className="text-[11px] text-slate-500 font-medium">7 ngày qua</span>
              </div>

              {/* SVG Line chart with data tooltip */}
              <div className="h-44 relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 450 140">
                  <defs>
                    <linearGradient id="staffArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="30" x2="450" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="70" x2="450" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="110" x2="450" y2="110" stroke="#f1f5f9" strokeWidth="1" />

                  <path
                    d="M 10,110 Q 70,80 140,95 T 280,45 T 440,25 L 440,135 L 10,135 Z"
                    fill="url(#staffArea)"
                  />
                  <path
                    d="M 10,110 Q 70,80 140,95 T 280,45 T 440,25"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Tooltip on peak */}
                  <g transform="translate(280, 20)">
                    <rect x="-35" y="-18" width="70" height="22" rx="6" fill="#0B132B" />
                    <text x="0" y="-3" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                      142 khách
                    </text>
                  </g>
                  <circle cx="280" cy="45" r="4.5" fill="#2563EB" stroke="#ffffff" strokeWidth="2" />
                </svg>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 px-2 mt-2">
                  <span>10/4</span>
                  <span>11/4</span>
                  <span>12/4</span>
                  <span>13/4</span>
                  <span>14/4</span>
                  <span>15/4</span>
                  <span>16/4</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Danh sách check-in gần đây & Thao tác nhanh (Khung Viền Xanh Bên Phải) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Danh sách check-in gần đây */}
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Danh sách check-in gần đây</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-100">
                    <tr>
                      <th className="py-2 px-3">Khách mời</th>
                      <th className="py-2 px-3">Sự kiện</th>
                      <th className="py-2 px-3">Thời gian</th>
                      <th className="py-2 px-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { name: 'Nguyễn Văn A', event: 'Hội nghị Công nghệ 2026', time: '09:15' },
                      { name: 'Trần Thị B', event: 'Workshop Kỹ năng mềm', time: '09:32' },
                      { name: 'Lê Văn C', event: 'Hội thảo Khởi nghiệp', time: '10:21' },
                      { name: 'Phạm Thị D', event: 'Gala Dinner 2026', time: '11:05' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">{row.name}</td>
                        <td className="py-3 px-3 text-slate-600">{row.event}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{row.time}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            Đã check-in
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 4 Cols: Thao Tác Nhanh (Khung Viền Xanh Rõ Ràng) */}
            <div className="lg:col-span-4 bg-white border-2 border-blue-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <h3 className="text-sm font-bold text-blue-700 flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-current" /> Thao tác nhanh
              </h3>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/check-in')}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Quét mã QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toast.info('Đang mở hộp thoại tìm kiếm khách mời...');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4 text-blue-600" />
                  <span>Tìm khách mời</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toast.info('Đang mở danh sách kiểm tra vé của sự kiện...');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Ticket className="w-4 h-4 text-blue-600" />
                  <span>Kiểm tra danh sách vé</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/inquiries')}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>Gửi thông báo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GIAO DIỆN QUẢN LÝ SỰ KIỆN & BÁO CÁO (STAFF / ORGANIZER - Task 63) */}
      {/* ========================================================================= */}
      {(activeRoleView === 'ORGANIZER' || activeRoleView === 'STAFF') && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('dashboard.systemOverview')}</h2>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">{t('dashboard.totalEvents')}</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{dashboardStats?.total_events ?? 0}</p>
              <p className="text-[11px] text-emerald-600 font-semibold">+12% {t('dashboard.vsLastMonth')}</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">{t('dashboard.totalAttendees')}</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {dashboardStats?.total_attendees?.toLocaleString('vi-VN') ?? 0}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">
                {t('dashboard.checkedIn')}: {dashboardStats?.actual_checked_in ?? 0}
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">{t('dashboard.revenue')}</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">
                {dashboardStats?.total_revenue_formatted ?? '0đ'}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">+22% {t('dashboard.vsLastMonth')}</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">{t('dashboard.satisfactionRate')}</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-600">
                {dashboardStats?.satisfaction_rate ? `${dashboardStats.satisfaction_rate}%` : '96%'}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">+3% {t('dashboard.vsLastMonth')}</p>
            </div>
          </div>

          {/* Middle Row: Biểu đồ tổng quan (Line Chart) & Sự kiện sắp tới */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 cols: Biểu đồ tổng quan */}
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('dashboard.overviewChart')}</h3>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Số người đăng ký
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-300" /> Khách thực tế
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Năm 2026
                </span>
              </div>

              {/* 2-Series Smooth Line Chart */}
              <div className="h-56">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="130" x2="500" y2="130" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Series 1: Registered (Blue) */}
                  <path
                    d="M 10,130 Q 80,90 160,110 T 320,50 T 490,20"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Series 2: Actual Attendees (Indigo Light) */}
                  <path
                    d="M 10,140 Q 80,110 160,125 T 320,70 T 490,45"
                    fill="none"
                    stroke="#818CF8"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1 mt-2">
                  <span>T1</span>
                  <span>T2</span>
                  <span>T3</span>
                  <span>T4</span>
                  <span>T5</span>
                  <span>T6</span>
                  <span>T7</span>
                  <span>T8</span>
                  <span>T9</span>
                  <span>T10</span>
                  <span>T11</span>
                  <span>T12</span>
                </div>
              </div>
            </div>

            {/* Right 4 cols: Sự kiện sắp tới */}
            <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{t('dashboard.upcomingEvents')}</h3>
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  {t('dashboard.viewAll')}
                </button>
              </div>

              <div className="space-y-2.5">
                {[
                  { title: 'Hội nghị Công nghệ 2026', time: '25/04/2026 · Khách sạn Melia' },
                  { title: 'Workshop Kỹ năng mềm', time: '02/05/2026 · Khách sạn InterContinental' },
                  { title: 'Triển lãm Sản phẩm Công nghệ', time: '10/05/2026 · Trung tâm Hội chợ' },
                  { title: 'Gala Dinner 2026', time: '20/05/2026 · Khách sạn Sheraton' },
                ].map((item, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/content-studio')}
                  className="flex-1 py-2 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200 text-center"
                >
                  ✨ PR Studio
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/feedback-summary')}
                  className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 text-center"
                >
                  ⭐ Feedback
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Doanh thu theo loại sự kiện (Donut Chart) & Hoạt động gần đây */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 cols: Doanh thu theo loại sự kiện */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">{t('dashboard.revenueByEventType')}</h3>

              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                {/* Donut Chart Visual with Center 856M */}
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#2563EB" strokeWidth="14" strokeDasharray="100 140" strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="14" strokeDasharray="62 178" strokeDashoffset="-100" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#8B5CF6" strokeWidth="14" strokeDasharray="36 204" strokeDashoffset="-162" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="14" strokeDasharray="24 216" strokeDashoffset="-198" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-black text-slate-900">
                      {dashboardStats?.total_revenue
                        ? (dashboardStats.total_revenue >= 1000000000
                            ? `${(dashboardStats.total_revenue / 1000000000).toFixed(1)}B`
                            : `${Math.round(dashboardStats.total_revenue / 1000000)}M`)
                        : '0M'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Tổng thu</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-1.5 text-xs">
                  {revenueByTierList.map((item: any, idx: number) => {
                    const colors = ['bg-blue-600', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-slate-400'];
                    const color = item.color || colors[idx % colors.length];
                    return (
                      <div key={item.name || idx} className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        <span className="w-28 text-slate-600 truncate">{item.name || 'Hạng vé'}</span>
                        <span className="font-bold text-slate-900">{item.percentage ?? 0}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 6 cols: Hoạt động gần đây */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">{t('dashboard.recentActivities')}</h3>

              <div className="space-y-3">
                {[
                  { name: 'Nguyễn Văn A', action: 'đã đăng ký vé Hội nghị Công nghệ 2026', time: '2 phút trước' },
                  { name: 'Trần Thị B', action: 'hoàn tất thanh toán vé VIP', time: '15 phút trước' },
                  { name: 'Lê Văn C', action: 'đã check-in sự kiện Workshop Kỹ năng mềm', time: '1 giờ trước' },
                  { name: 'Phạm Thị D', action: 'gửi yêu cầu hỗ trợ qua AI Concierge', time: '2 giờ trước' },
                ].map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {act.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-800">
                        <strong>{act.name}</strong> {act.action}
                      </p>
                      <p className="text-[10px] text-slate-400">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GIAO DIỆN QUẢN TRỊ VIÊN (ADMIN) */}
      {/* ========================================================================= */}
      {activeRoleView === 'ADMIN' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('dashboard.systemManagement')}</h2>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">{t('dashboard.totalUsers')}</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {dashboardStats?.total_users?.toLocaleString('vi-VN') ?? 0}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">+10% {t('dashboard.vsLastMonth')}</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">{t('dashboard.activeEvents')}</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {dashboardStats?.active_events ?? 0}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">{t('dashboard.outOfTotal')} {dashboardStats?.total_events ?? 0} {t('dashboard.eventsCount')}</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">{t('dashboard.monthlyRevenue')}</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">
                {dashboardStats?.total_revenue_formatted ?? '0đ'}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">+22% {t('dashboard.vsLastMonth')}</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500">{t('dashboard.uptimeRate')}</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-600">
                {dashboardStats?.uptime_rate ? `${dashboardStats.uptime_rate}%` : '99.9%'}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">+0.1% {t('dashboard.vsLastMonth')}</p>
            </div>
          </div>

          {/* Central Row: Người dùng theo vai trò (Donut Chart) & Hoạt động hệ thống */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 cols: Người dùng theo vai trò */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">{t('dashboard.usersByRole')}</h3>

              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#2563EB" strokeWidth="14" strokeDasharray="162 78" strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="14" strokeDasharray="36 204" strokeDashoffset="-162" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="14" strokeDasharray="24 216" strokeDashoffset="-198" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#8B5CF6" strokeWidth="14" strokeDasharray="18 222" strokeDashoffset="-222" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-black text-slate-900">
                      {dashboardStats?.total_users?.toLocaleString('vi-VN') ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{t('dashboard.totalAccounts')}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {userRolesList.map((item: any, idx: number) => (
                    <div key={item.name || idx} className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color || 'bg-blue-600'}`} />
                      <span className="w-24 text-slate-600">{item.name}</span>
                      <span className="font-bold text-slate-900">{item.pct ?? '0%'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 6 cols: Hoạt động hệ thống */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{t('dashboard.recentActivities')}</h3>
                <button
                  type="button"
                  onClick={() => navigate('/logs')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  {t('dashboard.viewAll')}
                </button>
              </div>

              <div className="space-y-3">
                {recentActivitiesList.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-start justify-between gap-3 text-xs pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-slate-800">{log.title}</p>
                      <p className="text-[11px] text-slate-500">{log.desc}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row: Cài đặt hệ thống nhanh & Thông báo hệ thống */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 cols: Cài đặt hệ thống nhanh */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">{t('dashboard.systemQuickSettings')}</h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/users')}
                  className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-slate-900">{t('dashboard.manageUsers')}</p>
                  <p className="text-[10px] text-slate-500">Phân quyền tài khoản</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-bold text-slate-900">{t('dashboard.manageEvents')}</p>
                  <p className="text-[10px] text-slate-500">Mẫu và tham số</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/logs')}
                  className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-bold text-slate-900">{t('dashboard.securityAudit')}</p>
                  <p className="text-[10px] text-slate-500">Nhật ký truy vết</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/inquiries')}
                  className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-bold text-slate-900">{t('dashboard.aiConciergeHITL')}</p>
                  <p className="text-[10px] text-slate-500">Hàng đợi kiểm duyệt</p>
                </button>
              </div>
            </div>

            {/* Right 6 cols: Thông báo hệ thống */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">{t('dashboard.systemAlerts')}</h3>

              <div className="space-y-3">
                {[
                  { title: 'Bảo trì hệ thống định kỳ', time: 'Hôm nay, 22:00', desc: 'Nâng cấp hạ tầng CSDL PostgreSQL' },
                  { title: 'Cập nhật tính năng mới', time: '12/04/2026', desc: 'Bổ sung Smart Prompt Assistant vào AI Concierge' },
                  { title: 'Đánh giá hiệu suất hệ thống', time: '10/04/2026', desc: 'Tốc độ quét QR đạt chuẩn 0.28s' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 text-xs">
                    <Bell className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ATTENDEE QR TICKET MODAL */}
      {/* ========================================================================= */}
      {showQRModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                THẺ VÉ ĐIỆN TỬ
              </span>
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-44 h-44 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl mx-auto p-3 flex items-center justify-center">
              <QrCode className="w-full h-full text-slate-900" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">{selectedTicket.title}</h4>
              <p className="text-xs text-slate-500">{selectedTicket.date}</p>
              <p className="text-[11px] font-mono font-bold text-blue-600 mt-1">{selectedTicket.code}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = (props) => {
  return (
    <DashboardErrorBoundary>
      <DashboardContent {...props} />
    </DashboardErrorBoundary>
  );
};

export default Dashboard;
