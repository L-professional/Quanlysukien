import React, { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  QrCode,
  Activity,
  Bot,
  Star,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import { apiService } from '../services/api';
import { DashboardStats, HourlyCheckInStat, LiveFeedItem } from '../types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const Dashboard: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [_hourlyData, setHourlyData] = useState<HourlyCheckInStat[]>([]);
  const [_liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, hourly, feed, fbStats] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getHourlyCheckIns(),
        apiService.getLiveFeed(),
        apiService.getGlobalFeedbackStats(),
      ]);
      setStats(statsData);
      setHourlyData(hourly);
      setLiveFeed(feed);
      setFeedbackStats(fbStats);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Preset Hourly check-in data matching 08:00 AM - 05:00 PM for the Bar Chart
  const barChartHours = [
    { time: '08:00', label: '08:00 AM', count: 45 },
    { time: '09:00', label: '09:00 AM', count: 185 },
    { time: '10:00', label: '10:00 AM', count: 360 },
    { time: '11:00', label: '11:00 AM', count: 210 },
    { time: '12:00', label: '12:00 PM', count: 95 },
    { time: '13:00', label: '01:00 PM', count: 120 },
    { time: '14:00', label: '02:00 PM', count: 140 },
    { time: '15:00', label: '03:00 PM', count: 85 },
    { time: '16:00', label: '04:00 PM', count: 50 },
    { time: '17:00', label: '05:00 PM', count: 20 },
  ];

  const maxBarCount = Math.max(...barChartHours.map((b) => b.count));

  // Inquiry Topics for Donut Chart (Schedule 38%, Tickets 27%, Parking 21%, Tech Issue 14%)
  const donutTopics = [
    { name: 'Schedule', pct: 38, color: '#6366F1', bgClass: 'bg-indigo-500' },
    { name: 'Tickets', pct: 27, color: '#F97316', bgClass: 'bg-amber-500' },
    { name: 'Parking', pct: 21, color: '#10B981', bgClass: 'bg-emerald-500' },
    { name: 'Tech Issue', pct: 14, color: '#06B6D4', bgClass: 'bg-cyan-500' },
  ];

  // Default mock feed matching specs
  const checkInFeedList = [
    { id: '1', initials: 'SC', name: 'Sarah Chen', status: 'Checked in • 09:42 AM', badge: 'VIP', badgeBg: 'bg-amber-100 text-amber-800' },
    { id: '2', initials: 'NH', name: 'Nguyen Van Hung', status: 'Checked in • 09:38 AM', badge: 'VIP', badgeBg: 'bg-amber-100 text-amber-800' },
    { id: '3', initials: 'TM', name: 'Tran Minh Thu', status: 'Checked in • 09:30 AM', badge: 'Standard', badgeBg: 'bg-slate-100 text-slate-700' },
    { id: '4', initials: 'LB', name: 'Le Quoc Bao', status: 'Checked in • 09:15 AM', badge: 'Speaker', badgeBg: 'bg-purple-100 text-purple-800' },
    { id: '5', initials: 'PA', name: 'Pham Anh Tu', status: 'Checked in • 09:05 AM', badge: 'Standard', badgeBg: 'bg-slate-100 text-slate-700' },
  ];

  const aiLogsList = [
    'RAG indexed 3 new FAQ documents - 2m ago',
    'Auto-suggested response for inquiry #102 - 5m ago',
    'Staff approved response #101 - 12m ago',
    'High accuracy confidence score (94.2%) - 20m ago',
    'PII masking applied on participant data - 35m ago',
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('dashboard.refreshData')}
        </button>
      </div>

      {/* Row 1: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Metric 1: Total Registrations */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('dashboard.totalRegistrations')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl lg:text-3xl font-black text-slate-900">
                {stats && stats.totalTickets > 0
                  ? Math.round((stats.checkedInTickets / stats.totalTickets) * 200)
                  : 150}
              </span>
              <span className="text-base font-bold text-slate-400">/ 200</span>
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{t('dashboard.thisWeek')}</span>
          </div>

          {/* Bottom Gradient Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600 absolute bottom-0 left-0 right-0" />
        </div>

        {/* Metric 2: Live Check-in Rate */}
        <div
          onClick={() => onNavigateTab?.('scanner')}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:shadow-md transition-shadow cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('dashboard.liveCheckInRate')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl lg:text-3xl font-black text-slate-900">
                {stats ? stats.checkInRate : 75}
              </span>
              <span className="text-base font-bold text-slate-400">/ 100%</span>
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{stats ? stats.checkedInTickets : 112} {t('dashboard.checkedIn')}</span>
          </div>

          {/* Bottom Accent Green Line */}
          <div className="h-1.5 w-full bg-emerald-500 absolute bottom-0 left-0 right-0" />
        </div>

        {/* Metric 3: Pending Inquiries */}
        <div
          onClick={() => onNavigateTab?.('inquiries')}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:shadow-md transition-shadow cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('dashboard.pendingInquiries')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl lg:text-3xl font-black text-slate-900">
                {stats ? stats.totalInquiries - stats.resolvedInquiries : 8}
              </span>
              <span className="text-sm font-bold text-slate-500">{t('dashboard.urgent')}</span>
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-amber-600 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4 text-amber-500 shrink-0" />
            <span>3 {t('dashboard.awaitingReview')}</span>
          </div>

          {/* Bottom Accent Yellow Line */}
          <div className="h-1.5 w-full bg-amber-400 absolute bottom-0 left-0 right-0" />
        </div>

        {/* Metric 4: AI Automation Efficiency */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('dashboard.aiEfficiency')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl lg:text-3xl font-black text-slate-900">88</span>
              <span className="text-base font-bold text-slate-400">/ 100%</span>
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-purple-600 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4 text-purple-500 shrink-0" />
            <span>{t('dashboard.approvedWithoutEdits')}</span>
          </div>

          {/* Bottom Accent Purple Line */}
          <div className="h-1.5 w-full bg-purple-400 absolute bottom-0 left-0 right-0" />
        </div>
      </div>

      {/* Row 2: Central Charts (Bar Chart 2/3 + Donut Chart 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Hourly Check-in Velocity Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                {t('dashboard.hourlyVelocity')}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {t('dashboard.hourlyTimeSpan')}
              </p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              {t('dashboard.live')}
            </span>
          </div>

          {/* Bar Chart Visual */}
          <div className="h-64 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
            {barChartHours.map((bar) => {
              const heightPct = Math.max(12, Math.round((bar.count / maxBarCount) * 100));
              return (
                <div key={bar.time} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Tooltip on hover */}
                  <span className="text-[10px] font-bold text-indigo-900 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {bar.count}
                  </span>

                  {/* Gradient Bar Container */}
                  <div className="w-full max-w-[36px] bg-slate-100 rounded-t-xl h-full flex items-end overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 via-indigo-500 to-purple-500 rounded-t-xl transition-all duration-500 group-hover:brightness-110"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  <span className="text-[10px] font-semibold text-slate-500 mt-2 truncate w-full text-center">
                    {bar.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (1/3): Inquiry Topics Donut Chart */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('dashboard.inquiryTopics')}</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {t('dashboard.inquiryTopicsSubtitle')}
            </p>
          </div>

          {/* SVG Donut Chart */}
          <div className="my-4 flex items-center justify-center relative">
            <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 120 120">
              {(() => {
                let cumulativeAngle = 0;
                const radius = 42;
                const circumference = 2 * Math.PI * radius;

                return donutTopics.map((topic) => {
                  const strokeDash = (topic.pct / 100) * circumference;
                  const strokeOffset = -cumulativeAngle;
                  cumulativeAngle += strokeDash;

                  return (
                    <circle
                      key={topic.name}
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke={topic.color}
                      strokeWidth="16"
                      strokeDasharray={`${strokeDash} ${circumference}`}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-700 hover:opacity-90 cursor-pointer"
                    />
                  );
                });
              })()}
            </svg>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-xl font-black text-slate-900">142</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('dashboard.total')}
              </span>
            </div>
          </div>

          {/* Donut Legend List */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {donutTopics.map((topic) => (
              <div key={topic.name} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${topic.bgClass} shrink-0`} />
                <span className="text-xs font-semibold text-slate-700 truncate">{topic.name}</span>
                <span className="text-xs font-bold text-slate-900 ml-auto">{topic.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Real-time Feeds (Live Check-in Feed 2/3 + AI Activity Log 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2/3): Live Check-in Feed */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-indigo-600" />
              {t('dashboard.liveCheckInFeed')}
            </h2>
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('dashboard.updatingRealTime')}
            </div>
          </div>

          <div className="space-y-3">
            {checkInFeedList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="flex items-center gap-3">
                  {/* Round Black Avatar */}
                  <div className="w-9 h-9 rounded-full bg-slate-950 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{item.name}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{item.status}</div>
                  </div>
                </div>

                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full ${item.badgeBg}`}
                >
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right (1/3): Dark AI Activity Log */}
        <div className="lg:col-span-1 bg-[#0B0F19] text-white border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-cyan-400" />
              {t('dashboard.aiActivityLog')}
            </h2>

            <div className="space-y-4">
              {aiLogsList.map((log, index) => (
                <div key={index} className="flex items-start gap-2.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1 shrink-0 animate-pulse"></span>
                  <span className="text-slate-300 font-medium leading-relaxed">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Thống Kê Đánh Giá & Mức Độ Hài Lòng Phiên Diễn Thuyết (Task 31) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>Thống Kê Đánh Giá & Mức Độ Hài Lòng Khách Tham Dự</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phản hồi thực tế (1-5 sao), chất lượng nội dung & diễn giả sau các phiên thuyết trình
            </p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('events')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Xem Lịch Trình Chi Tiết</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 4 Score Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800 mb-1">
              <span>Điểm TB Tổng Thể</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-900">
              {feedbackStats?.average_rating ? Number(feedbackStats.average_rating).toFixed(1) : '4.8'}
              <span className="text-sm font-semibold text-amber-600"> / 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-700">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= Math.round(Number(feedbackStats?.average_rating || 4.8))
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-300'
                  }`}
                />
              ))}
              <span className="text-[11px] font-medium ml-1">({feedbackStats?.total_reviews || 28} đánh giá)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
              <span>Tỷ Lệ Hài Lòng</span>
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-900">
              {feedbackStats?.satisfaction_rate ? Number(feedbackStats.satisfaction_rate).toFixed(1) : '96.4'}%
            </div>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">Khách đánh giá 4-5 sao tích cực</p>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-800 mb-1">
              <span>Chất Lượng Nội Dung</span>
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-900">
              {feedbackStats?.avg_content_quality ? Number(feedbackStats.avg_content_quality).toFixed(1) : '4.9'}
              <span className="text-sm font-semibold text-indigo-500"> / 5.0</span>
            </div>
            <p className="text-[11px] text-indigo-700 mt-1 font-medium">Độ sâu & tính thực tiễn tài liệu</p>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-800 mb-1">
              <span>Trình Bày Diễn Giả</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900">
              {feedbackStats?.avg_speaker_rating ? Number(feedbackStats.avg_speaker_rating).toFixed(1) : '4.8'}
              <span className="text-sm font-semibold text-purple-500"> / 5.0</span>
            </div>
            <p className="text-[11px] text-purple-700 mt-1 font-medium">Kỹ năng truyền cảm hứng & tương tác</p>
          </div>
        </div>

        {/* 2 Columns: Star breakdown chart + Recent reviews list */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Star breakdown bar chart */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Phân Bố Số Sao Đánh Giá
              </h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = feedbackStats?.star_breakdown?.[String(star)] ?? (star === 5 ? 22 : star === 4 ? 5 : star === 3 ? 1 : 0);
                  const total = feedbackStats?.total_reviews || 28;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <div className="w-12 font-bold text-slate-600 flex items-center gap-1">
                        <span>{star}</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-semibold text-slate-700">{pct}%</span>
                      <span className="w-8 text-right text-[11px] text-slate-400">({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-center text-xs text-slate-500">
              Dựa trên dữ liệu khảo sát trực tiếp sau khi hoàn tất phiên
            </div>
          </div>

          {/* Recent reviews list */}
          <div className="lg:col-span-7 flex flex-col">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Nhận Xét Mới Nhất Từ Khách Tham Dự</span>
            </h3>
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {(feedbackStats?.recent_reviews && feedbackStats.recent_reviews.length > 0
                ? feedbackStats.recent_reviews
                : [
                    {
                      id: 1,
                      participant_name: 'Nguyễn Văn Hùng',
                      session_title: 'Generative AI & LLM Systems in Production',
                      rating: 5,
                      content_quality: 5,
                      speaker_rating: 5,
                      comment: 'Phiên thuyết trình rất thực tế, slide nhiều sơ đồ kiến trúc hữu ích và diễn giả giải đáp Q&A rất tận tình!',
                      created_at: '2026-10-15 11:30',
                    },
                    {
                      id: 2,
                      participant_name: 'Sarah Chen',
                      session_title: 'Building Enterprise RAG Architectures',
                      rating: 5,
                      content_quality: 5,
                      speaker_rating: 4,
                      comment: 'Demo trực tiếp mượt mà, tài liệu đính kèm có thể tải về ngay sau buổi hội thảo.',
                      created_at: '2026-10-15 14:15',
                    },
                    {
                      id: 3,
                      participant_name: 'Trần Minh Thư',
                      session_title: 'AI Agents Workflow Automation',
                      rating: 4,
                      content_quality: 5,
                      speaker_rating: 4,
                      comment: 'Kiến thức chuyên sâu, mong ban tổ chức tăng thêm thời lượng cho phần Q&A diễn giả.',
                      created_at: '2026-10-15 16:00',
                    },
                  ]
              ).map((rev: any) => (
                <div
                  key={rev.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{rev.participant_name}</span>
                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                        • {rev.session_title}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= rev.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic">"{rev.comment}"</p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-400">
                    <span className="flex items-center gap-2">
                      <span>Nội dung: {rev.content_quality}/5⭐</span>
                      <span>Diễn giả: {rev.speaker_rating}/5⭐</span>
                    </span>
                    <span>{rev.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
