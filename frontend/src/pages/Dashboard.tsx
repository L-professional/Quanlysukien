import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, CloudRain, Sun, CloudSun, Users, Mic, QrCode, ArrowUpRight, ArrowDownRight,
  Plus, ScanLine, Sparkles, UserPlus, FileText, CheckCircle2, XCircle, AlertCircle,
  Mail, ShieldCheck, Database, Star, DollarSign, Layers, Ticket
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealTimeClock } from '../hooks/useRealTimeClock';
import { apiService } from '../services/api';
import { useEventSync } from '../services/eventSync';
import { cleanEventTitle } from '../components/EventCard';
import { Event, ManagerDashboardData } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// Dynamic Range Chart Data
const CHART_DATA_RANGES = {
  '7d': [
    { name: 'T2', attendees: 450, events: 4 },
    { name: 'T3', attendees: 620, events: 6 },
    { name: 'T4', attendees: 890, events: 8 },
    { name: 'T5', attendees: 750, events: 5 },
    { name: 'T6', attendees: 1200, events: 12 },
    { name: 'T7', attendees: 1850, events: 18 },
    { name: 'CN', attendees: 1400, events: 15 },
  ],
  '30d': [
    { name: 'Tuần 1', attendees: 2400, events: 22 },
    { name: 'Tuần 2', attendees: 3100, events: 28 },
    { name: 'Tuần 3', attendees: 2900, events: 25 },
    { name: 'Tuần 4', attendees: 4200, events: 38 },
  ],
  'quarter': [
    { name: 'Quý 1', attendees: 10500, events: 85 },
    { name: 'Quý 2', attendees: 15800, events: 140 },
    { name: 'Quý 3', attendees: 21000, events: 190 },
    { name: 'Quý 4', attendees: 27000, events: 245 },
  ],
  'year': [
    { name: 'Thg 1', attendees: 3000, events: 20 },
    { name: 'Thg 2', attendees: 4000, events: 35 },
    { name: 'Thg 3', attendees: 3500, events: 30 },
    { name: 'Thg 4', attendees: 5000, events: 45 },
    { name: 'Thg 5', attendees: 4800, events: 40 },
    { name: 'Thg 6', attendees: 6000, events: 55 },
    { name: 'Thg 7', attendees: 5500, events: 50 },
    { name: 'Thg 8', attendees: 7000, events: 65 },
    { name: 'Thg 9', attendees: 8500, events: 75 },
    { name: 'Thg 10', attendees: 7500, events: 60 },
    { name: 'Thg 11', attendees: 9000, events: 85 },
    { name: 'Thg 12', attendees: 10500, events: 100 },
  ],
};

interface DonutItem {
  name: string;
  value: number;
  fullName?: string;
  count?: number;
}

const donutData: DonutItem[] = [
  { name: 'Hội nghị', value: 45, fullName: 'Hội nghị Công nghệ' },
  { name: 'Workshop', value: 30, fullName: 'Workshop Đào tạo' },
  { name: 'Webinar', value: 15, fullName: 'Hội thảo trực tuyến' },
  { name: 'Khác', value: 10, fullName: 'Các loại khác' },
];
const COLORS = ['#DC2626', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];


const topSpeakers = [
  { id: 1, name: 'Giàng A Chiến', title: 'CEO, AI Tech', views: '12.5k' },
  { id: 2, name: 'Lốp Văn Lộp', title: 'Director, Mkt Group', views: '10.2k' },
  { id: 3, name: 'Lê Văn C', title: 'Founder, Startup VN', views: '8.4k' },
];

const notifications = [
  { id: 1, text: 'Hệ thống AI xử lý thành công 1,200 lượt check-in', time: '10 phút trước', type: 'success' },
  { id: 2, text: 'Cảnh báo: CPU server AI vượt ngưỡng 85%', time: '1 giờ trước', type: 'warning' },
  { id: 3, text: 'Có 5 yêu cầu đăng ký diễn giả mới', time: '2 giờ trước', type: 'info' },
];

export interface DashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const { user, userRole } = useAuth();
  const currentRole = (userRole === 'PARTICIPANT' ? 'ATTENDEE' : userRole) || 'ATTENDEE';
  const { dateFormatted, timeString12, weather } = useRealTimeClock();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'quarter' | 'year'>('year');
  const [events, setEvents] = useState<Event[]>([]);
  const [, setLoadingEvents] = useState<boolean>(true);
  const [managerData, setManagerData] = useState<ManagerDashboardData | null>(null);
  const [managerSelectedEventId, setManagerSelectedEventId] = useState<number | null>(null);

  const roleSubtitle = useMemo(() => {
    switch (currentRole) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'Quản trị viên toàn hệ thống EventHub AI';
      case 'EVENT_MANAGER':
      case 'ORGANIZER':
        return 'Quản lý điều hành sự kiện & chiến dịch tiếp thị';
      case 'STAFF':
        return 'Bàn làm việc điều phối điểm danh & soát vé QR';
      case 'SPEAKER':
        return 'Cổng thông tin diễn giả & điều khiển sân khấu';
      default:
        return 'Không gian sự kiện cá nhân & vé tham dự';
    }
  }, [currentRole]);

  const fetchDashboardEvents = useCallback(async () => {
    try {
      const data = await apiService.getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load dashboard events', err);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardEvents();
  }, [fetchDashboardEvents]);

  // Load Manager Dashboard data when role is Manager/Organizer
  useEffect(() => {
    if (currentRole === 'EVENT_MANAGER' || currentRole === 'ORGANIZER') {
      const loadManagerDashboard = async () => {
        try {
          const mData = await apiService.getManagerDashboard(
            managerSelectedEventId || undefined,
            timeRange === 'quarter' ? '90d' : timeRange
          );
          setManagerData(mData);
        } catch (e) {
          console.warn('Lỗi tải dữ liệu manager dashboard:', e);
        }
      };
      loadManagerDashboard();
    }
  }, [currentRole, managerSelectedEventId, timeRange]);

  // Real-time synchronization whenever events are updated, created, or deleted across the system
  useEventSync(fetchDashboardEvents);

  const safeEvents = useMemo(() => (Array.isArray(events) ? events : []), [events]);

  const upcomingCount = useMemo(
    () => safeEvents.filter((e) => ['UPCOMING', 'upcoming', 'PUBLISHED', 'published'].includes(e.status)).length,
    [safeEvents]
  );
  const ongoingCount = useMemo(
    () => safeEvents.filter((e) => ['ONGOING', 'ongoing', 'LIVE', 'live'].includes(e.status)).length,
    [safeEvents]
  );
  const completedCount = useMemo(
    () => safeEvents.filter((e) => ['COMPLETED', 'completed', 'ended'].includes(e.status)).length,
    [safeEvents]
  );
  const draftCount = useMemo(
    () => safeEvents.filter((e) => ['DRAFT', 'draft'].includes(e.status)).length,
    [safeEvents]
  );
  const totalEventsCount = safeEvents.length;

  const totalAttendeesCount = useMemo(() => {
    const sum = safeEvents.reduce((acc, e) => acc + (e.registered_count ?? (e as any).attendees_count ?? 0), 0);
    return sum.toLocaleString('vi-VN');
  }, [safeEvents]);

  const dynamicDonutData = useMemo(() => {
    if (safeEvents.length === 0) return donutData;
    const catCounts: Record<string, number> = {};
    safeEvents.forEach(e => {
      const cat = (e.category || e.event_type || 'Công nghệ & AI').trim();
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const total = safeEvents.length;
    const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    const top4 = sorted.slice(0, 4);
    const others = sorted.slice(4);
    const result = top4.map(([name, count]) => ({
      name: name.length > 13 ? name.slice(0, 12) + '…' : name,
      fullName: name,
      value: Math.max(1, Math.round((count / total) * 100)),
    }));
    if (others.length > 0) {
      const othersCount = others.reduce((acc, [, c]) => acc + c, 0);
      result.push({
        name: 'Khác',
        fullName: 'Các lĩnh vực khác',
        value: Math.max(1, Math.round((othersCount / total) * 100)),
      });
    }
    return result;
  }, [safeEvents]);

  const displayRecentEvents = useMemo(() => {
    if (safeEvents.length === 0) return [];
    const activeTracked = safeEvents.filter((e) =>
      ['UPCOMING', 'ONGOING', 'COMPLETED', 'DRAFT', 'LIVE', 'PUBLISHED', 'upcoming', 'ongoing', 'completed', 'draft', 'live', 'published'].includes(
        e.status
      )
    );
    const source = activeTracked.length > 0 ? activeTracked : safeEvents;
    return (Array.isArray(source) ? source : []).slice(0, 5).map(evt => {
      const formattedDate = evt.start_date || (evt.start_time
        ? new Date(evt.start_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Chưa xếp ngày');
      
      let statusText = 'Sắp diễn ra';
      let statusColor = 'bg-blue-100 text-blue-700';
      if (evt.status === 'PUBLISHED' || evt.status === 'published') {
        statusText = 'Đã xuất bản';
        statusColor = 'bg-emerald-100 text-emerald-700';
      } else if (evt.status === 'DRAFT' || evt.status === 'draft') {
        statusText = 'Bản nháp';
        statusColor = 'bg-slate-100 text-slate-700';
      } else if (evt.status === 'COMPLETED' || evt.status === 'completed' || evt.status === 'ended') {
        statusText = 'Đã kết thúc';
        statusColor = 'bg-slate-100 text-slate-700';
      } else if (evt.status === 'ONGOING' || evt.status === 'ongoing' || evt.status === 'live') {
        statusText = 'Đang diễn ra';
        statusColor = 'bg-emerald-100 text-emerald-700';
      } else if (evt.status === 'CANCELLED' || evt.status === 'cancelled') {
        statusText = 'Đã hủy';
        statusColor = 'bg-red-100 text-red-700';
      } else if (evt.status === 'UPCOMING' || evt.status === 'upcoming') {
        statusText = 'Sắp diễn ra';
        statusColor = 'bg-blue-100 text-blue-700';
      }

      return {
        id: String(evt.id),
        name: cleanEventTitle(evt.title) || evt.title,
        date: formattedDate,
        attendees: `${evt.registered_count ?? (evt as any).attendees_count ?? 0} / ${evt.capacity || (evt as any).max_attendees || 500}`,
        status: statusText,
        statusColor: statusColor,
      };
    });
  }, [events]);

  const roleKPIs = useMemo(() => {
    if (currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN') {
      return [
        { title: 'Tổng sự kiện hệ thống', value: totalEventsCount.toLocaleString('vi-VN'), growth: '+12%', isUp: true, icon: Calendar, color: 'text-[#DC2626]', bg: 'bg-red-50' },
        { title: 'Tổng người tham dự sàn', value: totalAttendeesCount, growth: '+18%', isUp: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Sự kiện sắp diễn ra', value: upcomingCount.toLocaleString('vi-VN'), growth: '+5%', isUp: true, icon: Mic, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Lượt cấp vé toàn sàn', value: totalAttendeesCount, growth: '+22%', isUp: true, icon: QrCode, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      ];
    }
    if (currentRole === 'EVENT_MANAGER' || currentRole === 'ORGANIZER') {
      const kpis = managerData?.kpis;
      return [
        {
          title: 'Sự kiện phụ trách',
          value: kpis ? String(kpis.total_managed_events) : totalEventsCount.toLocaleString('vi-VN'),
          growth: kpis ? `${kpis.upcoming_events} sắp tới` : '+8%',
          isUp: true,
          icon: Calendar,
          color: 'text-[#DC2626]',
          bg: 'bg-red-50'
        },
        {
          title: 'Lượt khách đăng ký / Vé bán',
          value: kpis ? kpis.total_registrations.toLocaleString('vi-VN') : totalAttendeesCount,
          growth: kpis ? `${kpis.total_tickets_sold} vé` : '+24%',
          isUp: true,
          icon: Users,
          color: 'text-blue-600',
          bg: 'bg-blue-50'
        },
        {
          title: 'Doanh thu sự kiện',
          value: kpis ? `${kpis.total_event_revenue.toLocaleString('vi-VN')} đ` : '0 đ',
          growth: kpis?.pending_payments ? `${kpis.pending_payments} chờ thu` : 'Đã thanh toán',
          isUp: true,
          icon: DollarSign,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50'
        },
        {
          title: 'Tiến độ check-in vào cổng',
          value: kpis ? `${kpis.checkin_completion_rate}%` : '96.4%',
          growth: kpis ? `${kpis.total_checked_in} đã vào` : '+15%',
          isUp: true,
          icon: QrCode,
          color: 'text-purple-600',
          bg: 'bg-purple-50'
        },
      ];
    }
    if (currentRole === 'STAFF') {
      return [
        { title: 'Lượt check-in hôm nay', value: totalAttendeesCount, growth: '+32%', isUp: true, icon: QrCode, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: 'Tỷ lệ quét vé thành công', value: '99.4%', growth: '+0.4%', isUp: true, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Sự kiện đang trực', value: ongoingCount > 0 ? String(ongoingCount) : '1', growth: 'Hiện trường', isUp: true, icon: Calendar, color: 'text-[#DC2626]', bg: 'bg-red-50' },
        { title: 'Thắc mắc khách cần giải đáp', value: '2 câu hỏi', growth: '-50%', isUp: false, icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
      ];
    }
    if (currentRole === 'SPEAKER') {
      return [
        { title: 'Phiên thuyết trình được gán', value: '2 phiên', growth: 'Đã xác nhận', isUp: true, icon: Mic, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Khán giả đăng ký', value: '680+', growth: '+15%', isUp: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Câu hỏi Q&A trực tiếp', value: '5 câu', growth: 'Đang mở', isUp: true, icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
        { title: 'Điểm đánh giá trung bình', value: '4.9 ★', growth: 'Xuất sắc', isUp: true, icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      ];
    }
    // Default Attendee / User
    return [
      { title: 'Vé sự kiện của tôi', value: '2 vé', growth: 'Hợp lệ', isUp: true, icon: QrCode, color: 'text-[#DC2626]', bg: 'bg-red-50' },
      { title: 'Sự kiện sắp tham dự', value: upcomingCount > 0 ? `${upcomingCount} sự kiện` : '1 sự kiện', growth: 'Tuần này', isUp: true, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
      { title: 'Điểm thưởng tích lũy', value: '150 điểm', growth: '+50', isUp: true, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
      { title: 'Khảo sát chờ đánh giá', value: '1 khảo sát', growth: 'Mới', isUp: true, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];
  }, [currentRole, totalEventsCount, totalAttendeesCount, upcomingCount, ongoingCount]);

  const quickActions = useMemo(() => {
    if (currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN') {
      return [
        { label: 'Quản lý người dùng', tab: 'users', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', hoverBorder: 'hover:border-blue-500 hover:bg-blue-50/50' },
        { label: 'Nhật ký bảo mật', tab: 'logs', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50', hoverBorder: 'hover:border-purple-500 hover:bg-purple-50/50' },
        { label: 'Kho tri thức RAG AI', tab: 'knowledge-base', icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50', hoverBorder: 'hover:border-emerald-500 hover:bg-emerald-50/50' },
        { label: 'Báo cáo nền tảng', tab: 'reports', icon: Sparkles, color: 'text-white', bg: 'bg-[#12213A]', isDark: true },
      ];
    }
    if (currentRole === 'EVENT_MANAGER' || currentRole === 'ORGANIZER') {
      return [
        { label: 'Tạo sự kiện mới', tab: 'events', icon: Plus, color: 'text-[#DC2626]', bg: 'bg-[#DC2626]/10', hoverBorder: 'hover:border-[#DC2626] hover:bg-red-50/50' },
        { label: 'Lịch trình & Phiên', tab: 'manager-sessions', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50', hoverBorder: 'hover:border-indigo-500 hover:bg-indigo-50/50' },
        { label: 'Quản lý vé & Doanh thu', tab: 'manager-tickets', icon: Ticket, color: 'text-emerald-600', bg: 'bg-emerald-50', hoverBorder: 'hover:border-emerald-500 hover:bg-emerald-50/50' },
        { label: 'Người tham dự & Check-in', tab: 'manager-attendees', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', hoverBorder: 'hover:border-blue-500 hover:bg-blue-50/50' },
      ];
    }
    if (currentRole === 'STAFF') {
      return [
        { label: 'Quét vé QR Code camera', tab: 'scanner', icon: ScanLine, color: 'text-emerald-600', bg: 'bg-emerald-50', hoverBorder: 'hover:border-emerald-500 hover:bg-emerald-50/50' },
        { label: 'Tra cứu danh sách sự kiện', tab: 'events', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', hoverBorder: 'hover:border-blue-500 hover:bg-blue-50/50' },
        { label: 'Hỗ trợ khách (AI Concierge)', tab: 'inquiries', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50', hoverBorder: 'hover:border-purple-500 hover:bg-purple-50/50' },
        { label: 'Khảo sát & Đánh giá', tab: 'feedback', icon: Star, color: 'text-white', bg: 'bg-[#12213A]', isDark: true },
      ];
    }
    if (currentRole === 'SPEAKER') {
      return [
        { label: 'Cổng thông tin diễn giả', tab: 'speaker', icon: Mic, color: 'text-purple-600', bg: 'bg-purple-50', hoverBorder: 'hover:border-purple-500 hover:bg-purple-50/50' },
        { label: 'Lịch trình sự kiện', tab: 'events', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', hoverBorder: 'hover:border-blue-500 hover:bg-blue-50/50' },
        { label: 'Xem đánh giá phiên', tab: 'feedback', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', hoverBorder: 'hover:border-amber-500 hover:bg-amber-50/50' },
        { label: 'Cài đặt hồ sơ diễn giả', tab: 'settings', icon: Users, color: 'text-white', bg: 'bg-[#12213A]', isDark: true },
      ];
    }
    // Default Attendee / User
    return [
      { label: 'Khám phá sự kiện mới', tab: 'events', icon: Calendar, color: 'text-[#DC2626]', bg: 'bg-red-50', hoverBorder: 'hover:border-[#DC2626] hover:bg-red-50/50' },
      { label: 'Đánh giá & Góp ý sự kiện', tab: 'feedback', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', hoverBorder: 'hover:border-amber-500 hover:bg-amber-50/50' },
      { label: 'Cài đặt tài khoản & vé', tab: 'settings', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', hoverBorder: 'hover:border-blue-500 hover:bg-blue-50/50' },
      { label: 'Hỏi đáp AI Concierge', tab: 'inquiries', icon: Sparkles, color: 'text-white', bg: 'bg-[#12213A]', isDark: true },
    ];
  }, [currentRole]);

  return (
    <div className="space-y-6">
      
      {/* 1. WELCOME & WEATHER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#12213A]">
            Chào mừng trở lại, {user?.full_name || 'Quản trị viên'}!
          </h1>
          <p className="text-[#64748B] mt-1 font-medium">{roleSubtitle}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Manager Event Filter */}
          {(currentRole === 'EVENT_MANAGER' || currentRole === 'ORGANIZER') && (
            <select
              value={managerSelectedEventId || ''}
              onChange={(e) => setManagerSelectedEventId(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 bg-white border border-[#E5EAF2] rounded-xl text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Tất cả sự kiện quản lý ({safeEvents.length})</option>
              {safeEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-[#E5EAF2] shadow-sm select-none">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#DC2626]" />
              <span className="text-[13px] font-bold text-[#12213A]">{dateFormatted}</span>
            </div>
            <div className="w-px h-4 bg-[#E5EAF2]"></div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-[13px] font-bold text-[#12213A] font-mono">{timeString12}</span>
            </div>
            <div className="w-px h-4 bg-[#E5EAF2]"></div>
            <div className="flex items-center gap-2">
              {weather.condition === 'sunny' ? (
                <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
              ) : weather.condition === 'rain' ? (
                <CloudRain className="w-4 h-4 text-blue-500" />
              ) : (
                <CloudSun className="w-4 h-4 text-sky-500" />
              )}
              <span className="text-[13px] font-bold text-[#12213A]">{weather.tempText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manager Attention Banner */}
      {(currentRole === 'EVENT_MANAGER' || currentRole === 'ORGANIZER') &&
        managerData?.events_requiring_attention &&
        managerData.events_requiring_attention.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Sự kiện cần bạn lưu ý ({managerData.events_requiring_attention.length})
                </h4>
                <div className="mt-1 space-y-1">
                  {managerData.events_requiring_attention.map((att, idx) => (
                    <p key={idx} className="text-xs text-amber-800">
                      • <span className="font-semibold">{att.title}</span>: {att.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab?.('manager-tickets')}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition shrink-0"
            >
              Kiểm tra ngay
            </button>
          </div>
        )}

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roleKPIs.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-[#E5EAF2] p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[12px] font-semibold text-[#64748B]">{kpi.title}</p>
                <h3 className="text-2xl font-bold text-[#12213A] mt-1">{kpi.value}</h3>
              </div>
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4">
              <span className={`text-[12px] font-bold flex items-center ${kpi.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpi.isUp ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {kpi.growth}
              </span>
              <span className="text-[12px] text-slate-400">so với tháng trước</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. CHARTS AND ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Line Chart */}
        <div className="lg:col-span-6 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-[#12213A]">Thống kê sự kiện</h3>
              <p className="text-[12px] text-[#64748B] mt-0.5">Lượng người tham dự và số sự kiện trong 12 tháng qua</p>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="text-[12px] font-semibold border border-[#E5EAF2] rounded-lg px-3 py-1.5 outline-none focus:border-[#DC2626] bg-white cursor-pointer"
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="quarter">Theo quý (2026)</option>
              <option value="year">Cả năm (2026)</option>
            </select>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CHART_DATA_RANGES[timeRange]} margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis
                  width={38}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val))}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  labelStyle={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}
                />
                <Line type="monotone" dataKey="attendees" name="Người tham dự" stroke="#DC2626" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="events" name="Sự kiện" stroke="#3B82F6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="lg:col-span-3 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-5 flex flex-col">
          <div>
            <h3 className="text-[15px] font-bold text-[#12213A]">Loại sự kiện</h3>
            <p className="text-[12px] text-[#64748B] mt-0.5">Phân bổ tỷ trọng các sự kiện</p>
          </div>
          <div className="flex-1 flex flex-col justify-center mt-3">
            <div className="relative h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dynamicDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {dynamicDonutData.map((_entry, index) => (

                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2', padding: '4px 8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                    formatter={(value: any, name: any, item: any) => [`${value}%`, item?.payload?.fullName || name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Custom Center Text inside the donut hole */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-[#12213A]">{totalEventsCount.toLocaleString('vi-VN')}</span>
                <span className="text-[10px] text-[#64748B] font-semibold">Sự kiện</span>
              </div>
            </div>
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-2 mt-3">
              {dynamicDonutData.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5" title={entry.fullName || entry.name}>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-[11px] font-semibold text-[#12213A] truncate">{entry.name}</span>
                  <span className="text-[10px] text-slate-500 font-bold ml-auto">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-3 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-5">
          <h3 className="text-[15px] font-bold text-[#12213A]">Thao tác nhanh</h3>
          <p className="text-[12px] text-[#64748B] mt-0.5 mb-5">Truy cập nhanh các chức năng chính</p>
          
          <div className="space-y-3">
            {quickActions.map((qa, idx) => {
              const Icon = qa.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onNavigateTab?.(qa.tab)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group text-left cursor-pointer ${
                    qa.isDark
                      ? 'bg-[#12213A] hover:bg-[#1a2d4f] text-white shadow-[0_4px_12px_rgba(18,33,58,0.2)]'
                      : `border border-[#E5EAF2] ${qa.hoverBorder}`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${qa.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${qa.color}`} />
                    </div>
                    <span className={`text-[13px] font-bold ${qa.isDark ? 'text-white' : 'text-[#12213A]'}`}>
                      {qa.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Events */}
        <div className="lg:col-span-6 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[15px] font-bold text-[#12213A]">Sự kiện gần đây</h3>
            <button 
              onClick={() => onNavigateTab?.('events')}
              className="text-[12px] font-bold text-[#DC2626] hover:underline cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF2]">
                  <th className="pb-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Tên sự kiện</th>
                  <th className="pb-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Ngày tổ chức</th>
                  <th className="pb-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Số lượng</th>
                  <th className="pb-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF2]">
                {(Array.isArray(displayRecentEvents) ? displayRecentEvents : []).map(event => (
                  <tr 
                    key={event.id} 
                    onClick={() => onNavigateTab?.('events')}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-[#DC2626]" />
                        </div>
                        <span className="text-[13px] font-bold text-[#12213A] line-clamp-1">{event.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[12px] text-[#64748B] font-medium whitespace-nowrap">{event.date}</td>
                    <td className="py-3 text-[12px] text-[#12213A] font-bold whitespace-nowrap">{event.attendees}</td>
                    <td className="py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${event.statusColor}`}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Speakers */}
        <div className="lg:col-span-3 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[15px] font-bold text-[#12213A]">Top diễn giả</h3>
            <button className="text-[12px] font-bold text-[#DC2626] hover:underline">Chi tiết</button>
          </div>
          <div className="space-y-4">
            {(Array.isArray(topSpeakers) ? topSpeakers : []).map(speaker => (
              <div key={speaker.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 border border-slate-100 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${speaker.name}`} alt={speaker.name} />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#12213A]">{speaker.name}</div>
                    <div className="text-[11px] text-[#64748B]">{speaker.title}</div>
                  </div>
                </div>
                <div className="text-[12px] font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded">
                  {speaker.views}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Notifications */}
        <div className="lg:col-span-3 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[15px] font-bold text-[#12213A]">Thông báo hệ thống</h3>
          </div>
          <div className="space-y-4">
            {(Array.isArray(notifications) ? notifications : []).map(notif => (
              <div key={notif.id} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {notif.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                  {notif.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-500" />}
                  {notif.type === 'error' && <XCircle className="w-4 h-4 text-rose-500" />}
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#12213A] leading-tight">
                    {notif.text}
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-1">{notif.time}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-[12px] font-bold text-[#64748B] hover:text-[#12213A] py-2 border border-[#E5EAF2] rounded-lg transition-colors">
            Xem tất cả thông báo
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
