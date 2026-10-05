import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, Calendar, Filter, RotateCcw,
  CalendarDays, Users, CheckCircle2, Star,
  AlertCircle, ChevronDown, FileText, Share2, Trash2, Eye, X, Clock,
  Sparkles, Wand2, TrendingUp, Award, Building2, Zap, AlertTriangle,
  Mic2, MessageSquare, Smile, HeartHandshake, Brain, Gauge, ShieldCheck,
  Cpu, Mail, Activity, Server, ShieldAlert, DollarSign, Send, Check
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import PermissionGuard from '../components/PermissionGuard';
import { apiService as api } from '../services/api';
import { cleanEventTitle } from '../components/EventCard';
import { useEventSync } from '../services/eventSync';
import { Event } from '../types';
import { exportToExcel, exportToPDF, AIInsightsExportData } from '../utils/reportExport';

const COLORS = ['#DC2626', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#6366F1'];
const TABS = [
  'Tổng quan',
  'Hiệu quả sự kiện',
  'Người tham dự',
  'Vé & QR',
  'Diễn giả',
  'Feedback',
  'AI',
  'Hệ thống'
];

export const Reports: React.FC = () => {
  const { user } = useAuth();
  
  // Tab & Loading States
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Modals
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  // Filter States
  const [filters, setFilters] = useState({
    date_range: '01/01/2026 - 31/12/2026',
    event_id: '' as string | number,
    report_type: 'Tổng quan',
    location: '',
    status: ''
  });
  
  // Real-Time Tab Data from PostgreSQL
  const [tabData, setTabData] = useState<any>(null);
  const [eventsList, setEventsList] = useState<Event[]>([]);
  
  // AI Executive Insights State
  const [aiInsights, setAiInsights] = useState<AIInsightsExportData | null>(null);

  // Scheduled Report Form State
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    report_type: 'Tổng quan',
    event_id: '',
    frequency: 'Hàng tuần',
    format: 'PDF',
    recipients: 'admin@eventhub.ai, director@eventhub.ai',
    send_confirmation_email: true
  });

  // Share Report Form State
  const [shareEmail, setShareEmail] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchRealEvents = async () => {
    try {
      const data = await api.getEvents();
      if (Array.isArray(data)) {
        setEventsList(data);
      }
    } catch (err) {
      console.error("Failed to fetch events list for reports:", err);
    }
  };

  const fetchCurrentTabData = useCallback(async (tabName: string, currentFilters: any) => {
    try {
      setLoading(true);
      const data = await api.getReportTabData({
        tab: tabName,
        event_id: currentFilters.event_id ? Number(currentFilters.event_id) : null,
        date_range: currentFilters.date_range || undefined
      });
      setTabData(data);
      
      // Automatically request AI Executive Insights for this tab's data
      fetchAIInsights(tabName, currentFilters, data);
    } catch (err) {
      console.error("Failed to fetch report tab data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAIInsights = async (tabName: string, currentFilters: any, dataPayload?: any) => {
    try {
      setAiLoading(true);
      const res = await api.analyzeReportWithAI({
        tab: tabName,
        event_id: currentFilters.event_id ? Number(currentFilters.event_id) : null,
        date_range: currentFilters.date_range,
        metrics: dataPayload || tabData
      });
      setAiInsights(res);
    } catch (err) {
      console.error("Failed to fetch AI insights:", err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchRealEvents();
  }, []);

  useEffect(() => {
    fetchCurrentTabData(activeTab, filters);
  }, [activeTab, fetchCurrentTabData]);

  useEventSync(() => {
    fetchRealEvents();
    fetchCurrentTabData(activeTab, filters);
  });

  const handleApplyFilter = () => {
    showToast('Đang cập nhật dữ liệu báo cáo...');
    fetchCurrentTabData(activeTab, filters);
  };

  const handleResetFilter = () => {
    const defaultFilters = {
      date_range: '01/01/2026 - 31/12/2026',
      event_id: '',
      report_type: activeTab,
      location: '',
      status: ''
    };
    setFilters(defaultFilters);
    fetchCurrentTabData(activeTab, defaultFilters);
    showToast('Đã đặt lại bộ lọc mặc định.');
  };

  const getSelectedEventTitle = (): string => {
    if (!filters.event_id) return 'Toàn bộ sự kiện';
    const found = eventsList.find(e => String(e.id) === String(filters.event_id));
    return found ? cleanEventTitle(found.title) || found.title : `Sự kiện #${filters.event_id}`;
  };

  const handleExportFile = async (format: 'EXCEL' | 'PDF' | 'CSV') => {
    setExporting(true);
    const filterInfo = {
      date_range: filters.date_range,
      event_id: filters.event_id,
      event_title: getSelectedEventTitle()
    };

    try {
      if (format === 'EXCEL') {
        exportToExcel(activeTab, tabData, filterInfo, aiInsights);
        showToast('Đã tạo và tải file Excel (.xlsx) thành công.');
      } else if (format === 'PDF') {
        exportToPDF(activeTab, tabData, filterInfo, aiInsights);
        showToast('Đã mở cửa sổ in ấn / lưu PDF đồ họa cao cấp.');
      } else {
        // CSV backend stream
        const blob = await api.exportReport({
          report_type: activeTab,
          event_id: filters.event_id ? Number(filters.event_id) : null,
          date_range: filters.date_range,
          format: 'CSV'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${activeTab.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Đã xuất file CSV thành công.');
      }

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setExportModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo file báo cáo. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleForm.name.trim()) {
      alert('Vui lòng nhập tên lịch báo cáo.');
      return;
    }
    try {
      const recipientList = scheduleForm.recipients
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

      await api.createScheduledReport({
        name: scheduleForm.name,
        report_type: scheduleForm.report_type,
        event_id: scheduleForm.event_id ? Number(scheduleForm.event_id) : null,
        frequency: scheduleForm.frequency,
        format: scheduleForm.format,
        recipients: recipientList,
        is_active: true
      });

      showToast(`Đã thiết lập lịch gửi báo cáo '${scheduleForm.name}' (${scheduleForm.frequency}) thành công!`);
      setScheduleModalOpen(false);
      setScheduleForm({
        name: '',
        report_type: 'Tổng quan',
        event_id: '',
        frequency: 'Hàng tuần',
        format: 'PDF',
        recipients: 'admin@eventhub.ai, director@eventhub.ai',
        send_confirmation_email: true
      });
    } catch (err) {
      console.error(err);
      alert('Lập lịch báo cáo thất bại. Vui lòng kiểm tra lại.');
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedReportId) return;
    try {
      await api.deleteReport(selectedReportId);
      showToast('Báo cáo đã được xóa thành công.');
      fetchCurrentTabData(activeTab, filters);
    } catch (err) {
      alert('Không thể xóa báo cáo.');
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const handleShareReport = async () => {
    if (!selectedReportId || !shareEmail.trim()) return;
    try {
      await api.shareReport(selectedReportId, {
        emails: [shareEmail.trim()],
        permissions: 'VIEW',
        message: 'Báo cáo quản trị được chia sẻ từ EventHub AI'
      });
      showToast(`Đã chia sẻ báo cáo tới ${shareEmail}`);
      setShareModalOpen(false);
      setShareEmail('');
    } catch (err) {
      alert('Không thể chia sẻ báo cáo.');
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12213A] text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 border border-slate-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-[14px] font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. BREADCRUMB & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold text-[#64748B] flex items-center gap-2 mb-1">
            <span className="hover:text-[#12213A] cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#12213A]">Báo Cáo & Phân Tích</span>
          </div>
          <h1 className="text-2xl font-bold text-[#12213A] flex items-center gap-2">
            Báo cáo & Phân tích
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
              ● PostgreSQL Live
            </span>
          </h1>
          <p className="text-[#64748B] mt-0.5 font-medium text-[13px]">
            Hệ thống phân tích quản trị thông minh kết nối 100% CSDL PostgreSQL và trợ lý AI Executive Insights.
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchCurrentTabData(activeTab, filters)}
            className="px-4 py-2 bg-white border border-[#E5EAF2] hover:bg-slate-50 text-[#12213A] rounded-xl text-[13px] font-bold transition-colors flex items-center gap-2 shadow-sm h-11"
            title="Tải lại dữ liệu"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          
          <PermissionGuard requirePermission="REPORT_SCHEDULE">
            <button
              onClick={() => {
                setScheduleForm(prev => ({ ...prev, report_type: activeTab, event_id: String(filters.event_id || '') }));
                setScheduleModalOpen(true);
              }}
              className="px-4 py-2 bg-white border border-[#E5EAF2] hover:bg-slate-50 text-[#12213A] rounded-xl text-[13px] font-bold transition-colors flex items-center gap-2 shadow-sm h-11"
            >
              <Calendar className="w-4 h-4 text-indigo-600" />
              Lập lịch báo cáo
            </button>
          </PermissionGuard>
          
          <PermissionGuard requirePermission="REPORT_EXPORT">
            <button
              onClick={() => setExportModalOpen(true)}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#b01433] text-white rounded-xl text-[13px] font-bold shadow-[0_4px_12px_rgba(215,25,63,0.25)] transition-colors flex items-center gap-2 h-11"
            >
              <Download className="w-4 h-4" />
              Xuất báo cáo
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* 2. GLOBAL REPORT FILTER BAR */}
      <div className="bg-white rounded-xl border border-[#E5EAF2] p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[170px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Khoảng thời gian</label>
            <input 
              type="text" 
              value={filters.date_range}
              onChange={(e) => setFilters({...filters, date_range: e.target.value})}
              placeholder="01/01/2026 - 31/12/2026"
              className="w-full px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] text-[13px] font-medium text-[#12213A] outline-none focus:border-[#DC2626]" 
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Sự kiện</label>
            <select 
              value={filters.event_id}
              onChange={(e) => setFilters({...filters, event_id: e.target.value})}
              className="w-full px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] text-[13px] font-medium text-[#12213A] outline-none cursor-pointer focus:border-[#DC2626]"
            >
              <option value="">Tất cả sự kiện ({eventsList.length})</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  #{ev.id} - {cleanEventTitle(ev.title) || ev.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Phân hệ báo cáo</label>
            <select 
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value);
                setFilters({...filters, report_type: e.target.value});
              }}
              className="w-full px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] text-[13px] font-medium text-[#12213A] outline-none focus:border-[#DC2626]"
            >
              {TABS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleApplyFilter} className="h-10 px-4 bg-[#12213A] hover:bg-[#1a2d4f] text-white rounded-lg text-[13px] font-bold transition-colors flex items-center gap-2 shadow-sm">
              <Filter className="w-4 h-4" />
              Áp dụng
            </button>
            <button onClick={handleResetFilter} className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[13px] font-bold transition-colors flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* 3. REPORT CATEGORY TABS (8 TABS) */}
      <div className="border-b border-[#E5EAF2]">
        <div className="flex overflow-x-auto hide-scrollbar gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setFilters(prev => ({...prev, report_type: tab})); }}
              className={`px-4 py-3 text-[14px] font-bold whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'text-[#DC2626]'
                  : 'text-[#64748B] hover:text-[#12213A]'
              }`}
            >
              <span>{tab}</span>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#DC2626] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 4. AI EXECUTIVE INSIGHTS WIDGET (AT TOP OF EVERY TAB) */}
      <div className="bg-gradient-to-r from-red-50/70 via-rose-50/50 to-amber-50/40 border border-red-200/80 rounded-2xl p-5 shadow-sm transition-all relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-red-100/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#DC2626] text-white flex items-center justify-center shadow-md">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-[#12213A] tracking-tight">
                  🪄 AI Executive Insights • Phân Tích Chuyên Sâu ({activeTab})
                </h3>
                {aiInsights?.score && (
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Điểm sức khỏe: {aiInsights.score}/100
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Trợ lý Cố vấn C-Level phân tích toàn diện các chỉ số PostgreSQL theo thời gian thực.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
              {aiInsights?.analyzed_at ? `Cập nhật: ${aiInsights.analyzed_at}` : ''}
            </span>
            <button
              onClick={() => fetchAIInsights(activeTab, filters, tabData)}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#DC2626] border border-red-200 rounded-lg text-[12px] font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
            >
              <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
              {aiLoading ? 'AI Đang Phân Tích...' : 'Làm mới phân tích AI'}
            </button>
          </div>
        </div>

        {/* AI Insight Content */}
        {aiLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-3 border-red-200 border-t-[#DC2626] rounded-full animate-spin" />
            <span className="text-[13px] font-semibold text-slate-600">
              Trí tuệ nhân tạo Gemini đang tổng hợp và đánh giá chỉ số...
            </span>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {aiInsights?.summary && (
              <p className="text-[13px] text-slate-800 font-medium leading-relaxed bg-white/70 p-3 rounded-xl border border-red-100">
                {aiInsights.summary}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Highlights */}
              <div className="bg-white rounded-xl p-3.5 border border-emerald-200/80 shadow-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[12px] uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  🟢 Điểm Sáng Nổi Bật
                </div>
                <ul className="space-y-1.5 text-[12px] text-slate-700">
                  {aiInsights?.highlights && aiInsights.highlights.length > 0 ? (
                    aiInsights.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))
                  ) : (
                    <li>Tỷ lệ người tham dự tích cực và chỉ số CSAT đạt kỳ vọng.</li>
                  )}
                </ul>
              </div>

              {/* Bottlenecks */}
              <div className="bg-white rounded-xl p-3.5 border border-amber-200/80 shadow-xs">
                <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[12px] uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  🟡 Điểm Nghẽn Cần Lưu Ý
                </div>
                <ul className="space-y-1.5 text-[12px] text-slate-700">
                  {aiInsights?.bottlenecks && aiInsights.bottlenecks.length > 0 ? (
                    aiInsights.bottlenecks.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))
                  ) : (
                    <li>Cần theo dõi sát diễn biến check-in tại các khung giờ cao điểm.</li>
                  )}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="bg-white rounded-xl p-3.5 border border-blue-200/80 shadow-xs">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[12px] uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  🎯 Khuyến Nghị Tối Ưu
                </div>
                <ul className="space-y-1.5 text-[12px] text-slate-700">
                  {aiInsights?.recommendations && aiInsights.recommendations.length > 0 ? (
                    aiInsights.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))
                  ) : (
                    <li>Tiếp tục tự động hóa các kênh nhắc lịch qua Omni-channel SMS/Email.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. TAB SPECIFIC KPIS (UPPER DECK) */}
      {tabData?.kpis && tabData.kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tabData.kpis.map((kpi: any, idx: number) => (
            <div key={idx} className="bg-white rounded-xl border border-[#E5EAF2] p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[12px] font-semibold text-[#64748B]">{kpi.title}</p>
                  <h3 className="text-2xl font-bold text-[#12213A] mt-1">{kpi.value}</h3>
                </div>
                <div className={`w-10 h-10 rounded-xl ${kpi.bg || 'bg-slate-50'} flex items-center justify-center shrink-0`}>
                  <Users className={`w-5 h-5 ${kpi.color || 'text-slate-600'}`} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4">
                <span className={`text-[12px] font-bold flex items-center ${kpi.isUp ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {kpi.growth}
                </span>
                <span className="text-[12px] text-slate-400">• Dữ liệu thực tế</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. TAB CONTENT RENDERING */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[350px]">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-[#DC2626] rounded-full animate-spin" />
        </div>
      ) : activeTab === 'Tổng quan' ? (
        /* ======================== TAB 1: TỔNG QUAN ======================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-[16px] font-bold text-[#12213A]">Xu hướng người tham dự theo tháng</h3>
                  <p className="text-[13px] text-[#64748B] mt-0.5">So sánh lượt đăng ký và lượt check-in thực tế trong năm 2026.</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tabData?.lineChartData || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis width={40} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="registered" name="Đăng ký" stroke="#DC2626" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="attended" name="Đã tham dự" stroke="#3B82F6" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6 flex flex-col">
              <h3 className="text-[16px] font-bold text-[#12213A] mb-2">Phân bố loại sự kiện</h3>
              <div className="flex-1 flex flex-col justify-center">
                <div className="relative h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tabData?.donutData || []} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                        {(tabData?.donutData || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5">
                  {(tabData?.donutData || []).map((entry: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-medium text-[#12213A]">{entry.name}</span>
                      </div>
                      <span className="font-bold text-[#12213A]">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Saved Reports Table */}
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[16px] font-bold text-[#12213A]">Báo cáo đã lưu trữ trong CSDL</h3>
              <button onClick={() => setExportModalOpen(true)} className="text-[12px] text-[#DC2626] font-bold hover:underline flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Xuất bản ghi
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5EAF2] text-[11px] font-bold text-[#64748B] uppercase">
                    <th className="py-2.5 px-2">Tên báo cáo</th>
                    <th className="py-2.5 px-2">Phân hệ</th>
                    <th className="py-2.5 px-2">Định dạng</th>
                    <th className="py-2.5 px-2">Ngày tạo</th>
                    <th className="py-2.5 px-2">Trạng thái</th>
                    <th className="py-2.5 px-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF2] text-[13px]">
                  {tabData?.savedReports && tabData.savedReports.length > 0 ? (
                    tabData.savedReports.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-2 font-bold text-[#12213A]">{r.name}</td>
                        <td className="py-3 px-2"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">{r.report_type}</span></td>
                        <td className="py-3 px-2 font-semibold text-slate-600">{r.format}</td>
                        <td className="py-3 px-2 text-slate-500 text-[12px]">{r.created_at}</td>
                        <td className="py-3 px-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleExportFile(r.format === 'EXCEL' ? 'EXCEL' : 'PDF')} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded" title="Tải xuống">
                              <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedReportId(r.id); setShareModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="Chia sẻ">
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedReportId(r.id); setDeleteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded" title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="text-center py-6 text-slate-400">Chưa có báo cáo nào được lưu.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'Hiệu quả sự kiện' ? (
        /* ======================== TAB 2: HIỆU QUẢ SỰ KIỆN ======================== */
        <div className="space-y-6">
          {/* Comparison Bar Chart */}
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-1">So sánh Sức chứa vs Đăng ký vs Check-in thực tế</h3>
            <p className="text-[13px] text-[#64748B] mb-4">Top các sự kiện có tỷ lệ lấp đầy cao nhất trong hệ thống.</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tabData?.comparisonChartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis width={40} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Sức chứa" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Đăng ký" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Check-in" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking Table */}
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-4">Bảng xếp hạng hiệu quả sự kiện</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5EAF2] text-[11px] font-bold text-[#64748B] uppercase">
                    <th className="py-2.5 px-3">Tên sự kiện</th>
                    <th className="py-2.5 px-3">Danh mục</th>
                    <th className="py-2.5 px-3 text-center">Sức chứa</th>
                    <th className="py-2.5 px-3 text-center">Đăng ký</th>
                    <th className="py-2.5 px-3 text-center">Check-in</th>
                    <th className="py-2.5 px-3 text-center">% Lấp đầy</th>
                    <th className="py-2.5 px-3 text-center">% Tham dự</th>
                    <th className="py-2.5 px-3 text-right">Doanh thu dự kiến</th>
                    <th className="py-2.5 px-3 text-center">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF2] text-[13px]">
                  {(tabData?.eventsRanking || []).map((ev: any) => (
                    <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-[#12213A] max-w-[240px] truncate" title={ev.title}>
                        {cleanEventTitle(ev.title) || ev.title}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[12px]">{ev.category}</td>
                      <td className="py-3 px-3 text-center font-medium">{ev.capacity}</td>
                      <td className="py-3 px-3 text-center font-bold text-[#12213A]">{ev.registered}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{ev.attended}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-[#12213A]">{ev.fill_rate}%</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600">{ev.conversion_rate}%</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-700">
                        {ev.revenue ? `${(ev.revenue / 1000000).toFixed(1)} tr` : '0 tr'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          ev.badge === 'Xuất sắc' ? 'bg-emerald-100 text-emerald-800' :
                          ev.badge === 'Tốt' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ev.badge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'Người tham dự' ? (
        /* ======================== TAB 3: NGƯỜI THAM DỰ ======================== */
        <div className="space-y-6">
          {/* Peak hours check-in density chart */}
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-1">Biểu đồ mật độ check-in theo khung giờ (Peak Hours)</h3>
            <p className="text-[13px] text-[#64748B] mb-4">Số lượng quét vé theo từng mốc thời gian để tối ưu hóa nhân sự quầy tiếp đón.</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tabData?.peakHoursChartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="checkinColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis width={40} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2' }} />
                  <Area type="monotone" dataKey="count" name="Lượt quét check-in" stroke="#DC2626" strokeWidth={3} fillOpacity={1} fill="url(#checkinColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demographics: Roles & Companies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
              <h3 className="text-[15px] font-bold text-[#12213A] mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Cơ cấu theo Chức danh / Vị trí
              </h3>
              <div className="space-y-3">
                {(tabData?.demographicsRoles || []).map((r: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between text-[12px] font-semibold mb-1">
                      <span className="text-[#12213A]">{r.role}</span>
                      <span className="text-slate-500">{r.count} ({r.pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, r.pct * 3)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
              <h3 className="text-[15px] font-bold text-[#12213A] mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Top Doanh nghiệp / Tổ chức tham dự
              </h3>
              <div className="space-y-3">
                {(tabData?.demographicsCompanies || []).map((c: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between text-[12px] font-semibold mb-1">
                      <span className="text-[#12213A]">{c.company}</span>
                      <span className="text-slate-500">{c.count} đại biểu</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, c.pct * 3.5)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Attendees List */}
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-4">Danh sách người tham dự gần nhất</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5EAF2] text-[11px] font-bold text-[#64748B] uppercase">
                    <th className="py-2.5 px-3">Họ và Tên</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Đơn vị</th>
                    <th className="py-2.5 px-3">Chức danh</th>
                    <th className="py-2.5 px-3">Hạng vé</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF2]">
                  {(tabData?.recentAttendees || []).map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#12213A]">{a.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[12px]">{a.email}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{a.company}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-[12px]">{a.job_title}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700">
                          {a.ticket_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          a.is_checked_in ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {a.is_checked_in ? '✓ Đã Check-in' : 'Chưa Check-in'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[12px]">{a.checked_in_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'Vé & QR' ? (
        /* ======================== TAB 4: VÉ & QR ======================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(tabData?.gateStats || []).map((g: any, idx: number) => (
              <div key={idx} className="bg-white border border-[#E5EAF2] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-slate-500">{g.gate}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{g.efficiency} SLA</span>
                </div>
                <div className="text-2xl font-black text-[#12213A]">{g.speed}</div>
                <div className="text-[12px] text-slate-500 mt-1">Đã xử lý <strong>{g.scanned}</strong> lượt check-in</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
              <h3 className="text-[16px] font-bold text-[#12213A] mb-4">Phân bổ hạng vé & doanh thu phát hành</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E5EAF2] text-[11px] font-bold text-[#64748B] uppercase">
                      <th className="py-2 px-3">Hạng vé</th>
                      <th className="py-2 px-3 text-center">Số lượng</th>
                      <th className="py-2 px-3 text-center">Đã check-in</th>
                      <th className="py-2 px-3 text-center">Tỷ lệ</th>
                      <th className="py-2 px-3 text-right">Doanh thu (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF2]">
                    {(tabData?.ticketTiers || []).map((t: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-[#12213A]">{t.tier}</td>
                        <td className="py-3 px-3 text-center font-semibold">{t.count}</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600">{t.checked_in}</td>
                        <td className="py-3 px-3 text-center font-bold text-blue-600">{t.pct}%</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800">
                          {t.revenue ? `${(t.revenue).toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6 flex flex-col justify-center items-center">
              <h3 className="text-[15px] font-bold text-[#12213A] mb-2 self-start">Tỷ lệ sử dụng vé</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tabData?.statusChartData || []} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      <Cell fill="#10B981" />
                      <Cell fill="#3B82F6" />
                      <Cell fill="#F43F5E" />
                    </Pie>
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'Diễn giả' ? (
        /* ======================== TAB 5: DIỄN GIẢ ======================== */
        <div className="space-y-6">
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-4">Bảng xếp hạng CSAT diễn giả & Tương tác Q&A</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5EAF2] text-[11px] font-bold text-[#64748B] uppercase">
                    <th className="py-2.5 px-3">Diễn giả</th>
                    <th className="py-2.5 px-3">Học vị / Đơn vị</th>
                    <th className="py-2.5 px-3 text-center">Số phiên</th>
                    <th className="py-2.5 px-3 text-center">CSAT Diễn giả</th>
                    <th className="py-2.5 px-3 text-center">Câu hỏi Q&A</th>
                    <th className="py-2.5 px-3 text-center">% Giải đáp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF2]">
                  {(tabData?.speakersRanking || []).map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-[#12213A]">{s.name}</td>
                      <td className="py-3 px-3 text-slate-500 text-[12px]">{s.role}</td>
                      <td className="py-3 px-3 text-center font-medium">{s.sessions_count}</td>
                      <td className="py-3 px-3 text-center font-bold text-purple-600">
                        ★ {s.csat} / 5.0
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-[#12213A]">{s.questions_count}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{s.answered_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Questions */}
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-3">Câu hỏi Q&A được quan tâm nhất tại hội thảo</h3>
            <div className="space-y-3">
              {(tabData?.topQuestions || []).map((q: any) => (
                <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <p className="text-[13px] font-bold text-[#12213A] leading-snug">{q.question}</p>
                    <span className="bg-red-50 text-[#DC2626] font-bold text-[11px] px-2 py-0.5 rounded-full shrink-0">
                      ▲ {q.upvotes} upvotes
                    </span>
                  </div>
                  {q.answer && (
                    <div className="mt-2 text-[12px] text-emerald-800 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100 flex items-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Trả lời:</strong> {q.answer}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'Feedback' ? (
        /* ======================== TAB 6: FEEDBACK ======================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
              <h3 className="text-[15px] font-bold text-[#12213A] mb-3">Phân bổ đánh giá sao (1 - 5 sao)</h3>
              <div className="space-y-2.5">
                {(tabData?.starDistribution || []).map((s: any) => (
                  <div key={s.stars} className="flex items-center gap-3 text-[12px]">
                    <span className="w-12 font-bold text-slate-700">{s.stars} sao</span>
                    <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="w-16 text-right font-semibold text-slate-600">{s.count} ({s.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6 flex flex-col justify-center items-center">
              <h3 className="text-[15px] font-bold text-[#12213A] mb-2 self-start">Chỉ số cảm xúc (Sentiment AI)</h3>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tabData?.sentimentChartData || []} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      <Cell fill="#10B981" />
                      <Cell fill="#F59E0B" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Attendee Comments Feed */}
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-4">Trích xuất ý kiến đóng góp từ người tham dự</h3>
            <div className="space-y-3">
              {(tabData?.commentsList || []).map((c: any) => (
                <div key={c.id} className="p-3.5 rounded-xl border border-slate-100 bg-[#F8FAFC] hover:bg-white hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-500 font-bold text-xs">
                        {'★'.repeat(c.rating)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' :
                        c.sentiment === 'neutral' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.sentiment === 'positive' ? 'Tích cực' : c.sentiment === 'neutral' ? 'Trung tính' : 'Cần cải thiện'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{c.created_at}</span>
                  </div>
                  <p className="text-[13px] text-slate-700 italic">"{c.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'AI' ? (
        /* ======================== TAB 7: AI ======================== */
        <div className="space-y-6">
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-3">Phân loại tác vụ AI trong hệ thống</h3>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tabData?.taskDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis width={40} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Bar dataKey="value" name="Số lượt thực thi" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-4">Nhật ký tác vụ AI (AI Telemetry & HITL)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5EAF2] text-[11px] font-bold text-[#64748B] uppercase">
                    <th className="py-2 px-3">Mã Log</th>
                    <th className="py-2 px-3">Tác vụ</th>
                    <th className="py-2 px-3">Hành động Staff</th>
                    <th className="py-2 px-3 text-center">Tokens</th>
                    <th className="py-2 px-3 text-center">Độ trễ</th>
                    <th className="py-2 px-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF2]">
                  {(tabData?.recentLogs || []).map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">#{l.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#12213A]">{l.task_type}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {l.staff_action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium">{l.tokens}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{l.latency_ms} ms</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[12px]">{l.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== TAB 8: HỆ THỐNG ======================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(tabData?.infraServices || []).map((s: any, idx: number) => (
              <div key={idx} className="bg-white border border-[#E5EAF2] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-bold text-[#12213A]">{s.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-[12px] font-semibold text-emerald-600">{s.status}</div>
                <div className="text-[11px] text-slate-500 mt-1">{s.detail}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
            <h3 className="text-[16px] font-bold text-[#12213A] mb-4">Nhật ký bảo mật & Gửi email thông báo (Security & SMTP)</h3>
            <div className="space-y-2.5">
              {(tabData?.securityLogs || []).map((s: any) => (
                <div key={s.id} className="p-3 rounded-xl border border-slate-100 bg-[#F8FAFC] flex items-start justify-between gap-3 text-[13px]">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {s.type}
                      </span>
                      <strong className="text-[#12213A]">{s.title}</strong>
                    </div>
                    <p className="text-slate-600 text-[12px]">{s.message}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{s.created_at}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXPORT MODAL */}
      {/* ========================================================================= */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E5EAF2]">
            <div className="px-6 py-4 border-b border-[#E5EAF2] flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-[#DC2626]" />
                <h3 className="text-[16px] font-bold text-[#12213A]">Xuất báo cáo ({activeTab})</h3>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {exportSuccess ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3 text-emerald-600">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-[16px] font-bold text-[#12213A]">Xuất báo cáo thành công!</h4>
                  <p className="text-[13px] text-[#64748B] mt-1">Tệp đã được xử lý và tải xuống máy của bạn.</p>
                </div>
              ) : exporting ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-[#DC2626] rounded-full animate-spin mb-4" />
                  <p className="text-[14px] font-bold text-[#12213A]">Đang tổng hợp dữ liệu PostgreSQL...</p>
                  <p className="text-[12px] text-slate-500 mt-1">Đang nhúng nhận xét từ AI Executive Insights</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[13px] text-slate-600">
                    Chọn định dạng xuất cho phân hệ <strong>"{activeTab}"</strong> với phạm vi <strong>"{getSelectedEventTitle()}"</strong>:
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => handleExportFile('EXCEL')}
                      className="p-4 border-2 border-emerald-200 hover:border-emerald-500 bg-emerald-50/40 rounded-xl flex items-center justify-between text-left transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                          XLSX
                        </div>
                        <div>
                          <strong className="text-[14px] text-slate-900 group-hover:text-emerald-700 block">
                            Bảng tính Excel (.xlsx)
                          </strong>
                          <span className="text-[12px] text-slate-500">Chứa 100% dữ liệu thô, KPIs và sheet AI Insights riêng biệt</span>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-emerald-600" />
                    </button>

                    <button
                      onClick={() => handleExportFile('PDF')}
                      className="p-4 border-2 border-red-200 hover:border-red-500 bg-red-50/40 rounded-xl flex items-center justify-between text-left transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#DC2626] text-white flex items-center justify-center font-bold text-sm">
                          PDF
                        </div>
                        <div>
                          <strong className="text-[14px] text-slate-900 group-hover:text-red-700 block">
                            Báo Cáo Đồ Họa C-Level (.pdf)
                          </strong>
                          <span className="text-[12px] text-slate-500">Bản in đồ họa đẹp mắt, kèm hộp phân tích AI và biểu đồ</span>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-[#DC2626]" />
                    </button>

                    <button
                      onClick={() => handleExportFile('CSV')}
                      className="p-4 border-2 border-blue-200 hover:border-blue-500 bg-blue-50/40 rounded-xl flex items-center justify-between text-left transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                          CSV
                        </div>
                        <div>
                          <strong className="text-[14px] text-slate-900 group-hover:text-blue-700 block">
                            Dữ liệu phẳng CSV (UTF-8 BOM)
                          </strong>
                          <span className="text-[12px] text-slate-500">Tương thích với Microsoft Excel, PowerBI, Tableau</span>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-blue-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCHEDULE MODAL */}
      {/* ========================================================================= */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#E5EAF2]">
            <div className="px-6 py-4 border-b border-[#E5EAF2] flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-[16px] font-bold text-[#12213A]">Lập lịch gửi báo cáo tự động</h3>
              </div>
              <button onClick={() => setScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Tên lịch báo cáo</label>
                <input
                  type="text"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({...scheduleForm, name: e.target.value})}
                  placeholder="VD: Báo cáo Tổng kết Hoạt động Tuần"
                  className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Phân hệ báo cáo</label>
                  <select
                    value={scheduleForm.report_type}
                    onChange={(e) => setScheduleForm({...scheduleForm, report_type: e.target.value})}
                    className="w-full border border-[#E5EAF2] rounded-xl px-3 py-2 text-[13px] outline-none"
                  >
                    {TABS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Tần suất gửi</label>
                  <select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({...scheduleForm, frequency: e.target.value})}
                    className="w-full border border-[#E5EAF2] rounded-xl px-3 py-2 text-[13px] outline-none"
                  >
                    <option value="Hàng ngày">Hàng ngày (Daily - 08:00 AM)</option>
                    <option value="Hàng tuần">Hàng tuần (Weekly - Thứ Hai)</option>
                    <option value="Hàng tháng">Hàng tháng (Monthly - Ngày 1)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Sự kiện áp dụng</label>
                  <select
                    value={scheduleForm.event_id}
                    onChange={(e) => setScheduleForm({...scheduleForm, event_id: e.target.value})}
                    className="w-full border border-[#E5EAF2] rounded-xl px-3 py-2 text-[13px] outline-none"
                  >
                    <option value="">Tất cả sự kiện</option>
                    {eventsList.map(ev => <option key={ev.id} value={ev.id}>#{ev.id} - {ev.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Định dạng đính kèm</label>
                  <select
                    value={scheduleForm.format}
                    onChange={(e) => setScheduleForm({...scheduleForm, format: e.target.value})}
                    className="w-full border border-[#E5EAF2] rounded-xl px-3 py-2 text-[13px] outline-none"
                  >
                    <option value="PDF">Bản PDF đồ họa cao cấp</option>
                    <option value="EXCEL">Bảng tính Excel (.xlsx)</option>
                    <option value="CSV">Dữ liệu CSV</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Email người nhận (ngăn cách bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={scheduleForm.recipients}
                  onChange={(e) => setScheduleForm({...scheduleForm, recipients: e.target.value})}
                  placeholder="admin@eventhub.ai, director@eventhub.ai"
                  className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="send_confirm"
                  checked={scheduleForm.send_confirmation_email}
                  onChange={(e) => setScheduleForm({...scheduleForm, send_confirmation_email: e.target.checked})}
                  className="w-4 h-4 text-[#DC2626] rounded border-slate-300"
                />
                <label htmlFor="send_confirm" className="text-[12px] font-medium text-slate-700 cursor-pointer">
                  Gửi email thông báo xác nhận thiết lập ngay lập tức qua SMTP
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F6F8FC] border-t border-[#E5EAF2] flex justify-end gap-3">
              <button onClick={() => setScheduleModalOpen(false)} className="px-5 py-2 text-[13px] font-bold text-[#64748B]">
                Hủy bỏ
              </button>
              <button onClick={handleCreateSchedule} className="px-5 py-2 bg-[#DC2626] hover:bg-[#b01433] text-white rounded-xl text-[13px] font-bold shadow-md transition-colors flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Lưu lịch báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHARE MODAL */}
      {/* ========================================================================= */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5EAF2] flex justify-between items-center bg-slate-50/50">
              <h3 className="text-[16px] font-bold text-[#12213A]">Chia sẻ báo cáo</h3>
              <button onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Email người nhận</label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="executive@eventhub.ai"
                  className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-[#DC2626]"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-[#F6F8FC] border-t border-[#E5EAF2] flex justify-end gap-3">
              <button onClick={() => setShareModalOpen(false)} className="px-5 py-2 text-[13px] font-bold text-[#64748B]">Hủy</button>
              <button onClick={handleShareReport} className="px-5 py-2 bg-[#DC2626] text-white rounded-xl text-[13px] font-bold">Chia sẻ</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE MODAL */}
      {/* ========================================================================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#12213A] mb-2">Xóa báo cáo này?</h3>
              <p className="text-sm text-[#64748B]">Hành động này sẽ xóa bản ghi báo cáo khỏi CSDL PostgreSQL.</p>
            </div>
            <div className="px-6 py-4 bg-[#F6F8FC] border-t border-[#E5EAF2] flex justify-end gap-3">
              <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#64748B]">Hủy</button>
              <button onClick={handleDeleteReport} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-bold">Xác nhận xóa</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
