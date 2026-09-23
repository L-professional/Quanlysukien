import React, { useState, useEffect } from 'react';
import {
  Download, Calendar, Filter, RotateCcw,
  CalendarDays, Users, CheckCircle2, Star,
  AlertCircle, ChevronDown, FileText, Share2, Trash2, Eye, X, Clock
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import PermissionGuard from '../components/PermissionGuard';
import { apiService as api } from '../services/api';

const COLORS = ['#D7193F', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];
const TABS = ['Tổng quan', 'Hiệu quả sự kiện', 'Người tham dự', 'Vé & QR', 'Diễn giả', 'Feedback', 'AI', 'Hệ thống'];

export const Reports: React.FC = () => {
  const { user } = useAuth();
  
  // States
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [loading, setLoading] = useState(false);
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
    date_range: '01/01/2025 - 31/12/2025',
    event_id: '' as string | number,
    report_type: 'Tổng quan',
    location: '',
    status: ''
  });
  
  // Data States
  const [kpis, setKpis] = useState<any[]>([]);
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [donutData, setDonutData] = useState<any[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [reportTableData, setReportTableData] = useState<any[]>([]);

  const fetchOverview = async (currentFilters: any) => {
    try {
      setLoading(true);
      const data = await api.getReportOverview({
        ...currentFilters,
        event_id: currentFilters.event_id ? Number(currentFilters.event_id) : null
      });
      setKpis(data.kpis || []);
      setLineChartData(data.lineChartData || []);
      setDonutData(data.donutData || []);
      setBarChartData(data.barChartData || []);
    } catch (err) {
      console.error("Failed to fetch overview", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportsList = async () => {
    try {
      const data = await api.getReportsList();
      setReportTableData(data || []);
    } catch (err) {
      console.error("Failed to fetch reports list", err);
      // Fallback
      setReportTableData([
        { id: 1, name: 'Báo cáo Tech Summit 2025', type: 'Hiệu quả sự kiện', period: '01/03/2025 - 16/03/2025', creator: 'Nguyễn Văn Admin', date: '16/03/2025', status: 'Hoàn thành' }
      ]);
    }
  };

  useEffect(() => {
    if (activeTab === 'Tổng quan') {
      fetchOverview(filters);
      fetchReportsList();
    }
  }, [activeTab]);

  const handleApplyFilter = () => {
    showToast('Đã cập nhật báo cáo.');
    if (activeTab === 'Tổng quan') {
      fetchOverview(filters);
    }
  };

  const handleResetFilter = () => {
    const defaultFilters = {
      date_range: '01/01/2025 - 31/12/2025',
      event_id: '',
      report_type: 'Tổng quan',
      location: '',
      status: ''
    };
    setFilters(defaultFilters);
    if (activeTab === 'Tổng quan') {
      fetchOverview(defaultFilters);
    }
    showToast('Đã đặt lại bộ lọc.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      const blob = await api.exportReport({
        ...filters,
        format,
        event_id: filters.event_id ? Number(filters.event_id) : null
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_export_${Date.now()}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      setExportSuccess(true);
      showToast('Đã xuất báo cáo thành công.');
      setTimeout(() => {
        setExportSuccess(false);
        setExportModalOpen(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo báo cáo. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedReportId) return;
    try {
      await api.deleteReport(selectedReportId);
      showToast('Báo cáo đã được xóa.');
      fetchReportsList();
    } catch (err) {
      alert('Không thể xóa báo cáo.');
    } finally {
      setDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12213A] text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5">
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
            <span className="text-[#12213A]">Báo Cáo</span>
          </div>
          <h1 className="text-2xl font-bold text-[#12213A]">
            Báo cáo & Phân tích
          </h1>
          <p className="text-[#64748B] mt-0.5 font-medium text-[13px]">
            Phân tích toàn diện hiệu quả sự kiện, người tham dự và hoạt động hệ thống.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'Tổng quan') fetchOverview(filters);
              fetchReportsList();
            }}
            className="px-4 py-2 bg-white border border-[#E5EAF2] hover:bg-slate-50 text-[#12213A] rounded-xl text-[13px] font-bold transition-colors flex items-center gap-2 shadow-sm h-11"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          
          <PermissionGuard requirePermission="REPORT_SCHEDULE">
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="px-4 py-2 bg-white border border-[#E5EAF2] hover:bg-slate-50 text-[#12213A] rounded-xl text-[13px] font-bold transition-colors flex items-center gap-2 shadow-sm h-11"
            >
              <Calendar className="w-4 h-4" />
              Lập lịch báo cáo
            </button>
          </PermissionGuard>
          
          <PermissionGuard requirePermission="REPORT_EXPORT">
            <button
              onClick={() => setExportModalOpen(true)}
              className="px-4 py-2 bg-[#D7193F] hover:bg-[#b01433] text-white rounded-xl text-[13px] font-bold shadow-[0_4px_12px_rgba(215,25,63,0.25)] transition-colors flex items-center gap-2 h-11"
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
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Khoảng thời gian</label>
            <input 
              type="text" 
              value={filters.date_range}
              onChange={(e) => setFilters({...filters, date_range: e.target.value})}
              className="w-full px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] text-[13px] font-medium text-[#12213A] outline-none" 
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Sự kiện</label>
            <select 
              value={filters.event_id}
              onChange={(e) => setFilters({...filters, event_id: e.target.value})}
              className="w-full px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] text-[13px] font-medium text-[#12213A] outline-none"
            >
              <option value="">Tất cả sự kiện</option>
              <option value="1">Tech Summit 2025</option>
              <option value="2">AI & Future 2025</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Loại báo cáo</label>
            <select 
              value={filters.report_type}
              onChange={(e) => setFilters({...filters, report_type: e.target.value})}
              className="w-full px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] text-[13px] font-medium text-[#12213A] outline-none"
            >
              {TABS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleApplyFilter} className="h-10 px-4 bg-[#12213A] hover:bg-[#1a2d4f] text-white rounded-lg text-[13px] font-bold transition-colors flex items-center gap-2">
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

      {/* 3. REPORT CATEGORY TABS */}
      <div className="border-b border-[#E5EAF2]">
        <div className="flex overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setFilters({...filters, report_type: tab}); }}
              className={`px-4 py-3 text-[14px] font-bold whitespace-nowrap transition-colors relative ${
                activeTab === tab
                  ? 'text-[#D7193F]'
                  : 'text-[#64748B] hover:text-[#12213A]'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7193F] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-[#D7193F] rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'Tổng quan' ? (
        <>
          {/* 4. KPI SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-[#E5EAF2] p-5 shadow-sm flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[12px] font-semibold text-[#64748B]">{kpi.title}</p>
                    <h3 className="text-2xl font-bold text-[#12213A] mt-1">{kpi.value}</h3>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                    <Users className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-4">
                  <span className={`text-[12px] font-bold flex items-center ${kpi.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {kpi.growth}
                  </span>
                  <span className="text-[12px] text-slate-400">So với kỳ trước</span>
                </div>
              </div>
            ))}
          </div>

          {/* 5. MAIN ANALYTICS CHART & DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[16px] font-bold text-[#12213A]">Xu hướng người tham dự</h3>
                  <p className="text-[13px] text-[#64748B] mt-1">So sánh số lượng đăng ký và số lượng tham dự theo thời gian.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-[#F6F8FC] p-1 rounded-lg border border-[#E5EAF2]">
                    <button className="px-3 py-1 text-[12px] font-bold text-[#64748B] hover:text-[#12213A] rounded">Ngày</button>
                    <button className="px-3 py-1 text-[12px] font-bold text-[#64748B] hover:text-[#12213A] rounded">Tuần</button>
                    <button className="px-3 py-1 text-[12px] font-bold text-[#12213A] bg-white rounded shadow-sm">Tháng</button>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} dx={-10} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2' }}
                      itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="registered" name="Đăng ký" stroke="#D7193F" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="attended" name="Đã tham dự" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6 flex flex-col">
              <div>
                <h3 className="text-[16px] font-bold text-[#12213A]">Phân bố loại sự kiện</h3>
              </div>
              <div className="flex-1 flex flex-col justify-center relative mt-6">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                        {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2', padding: '6px 10px' }} itemStyle={{ fontSize: '13px', fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                  <span className="text-3xl font-bold text-[#12213A]">{(donutData || []).reduce((acc, curr) => acc + curr.value, 0)}</span>
                  <span className="text-[11px] text-[#64748B] font-bold uppercase tracking-wide">Sự kiện</span>
                </div>
                <div className="mt-4 space-y-2">
                  {donutData.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-[13px] font-semibold text-[#12213A]">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-[#12213A]">{entry.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 6. REPORT TABLE */}
          <div className="bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6 flex flex-col mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[16px] font-bold text-[#12213A]">Chi tiết báo cáo đã lưu</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5EAF2]">
                    <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Tên báo cáo</th>
                    <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Loại</th>
                    <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Ngày tạo</th>
                    <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Trạng thái</th>
                    <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF2]">
                  {reportTableData.length > 0 ? reportTableData.map(report => (
                    <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3 px-2">
                        <div className="text-[13px] font-bold text-[#12213A]">{report.name || 'Báo cáo'}</div>
                      </td>
                      <td className="py-3 px-2"><span className="text-[12px] font-semibold text-[#12213A] bg-slate-100 px-2 py-1 rounded-md">{report.report_type || report.type}</span></td>
                      <td className="py-3 px-2 text-[12px] text-[#64748B]">{report.created_at ? new Date(report.created_at).toLocaleDateString() : report.date}</td>
                      <td className="py-3 px-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50" title="Xem">
                            <Eye className="w-4 h-4" />
                          </button>
                          <PermissionGuard requirePermission="REPORT_EXPORT">
                            <button className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50" title="Tải xuống">
                              <Download className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard requirePermission="REPORT_SHARE">
                            <button onClick={() => { setSelectedReportId(report.id); setShareModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50" title="Chia sẻ">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard requirePermission="REPORT_DELETE">
                            <button onClick={() => { setSelectedReportId(report.id); setDeleteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50" title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">Chưa có báo cáo nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-[#E5EAF2] rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-[16px] font-bold text-[#12213A] mb-1">Chưa có dữ liệu</h3>
          <p className="text-[13px] text-[#64748B] max-w-sm mb-6">
            Không có dữ liệu trong khoảng thời gian đã chọn cho mục "{activeTab}". Vui lòng thay đổi bộ lọc hoặc xem lại sau.
          </p>
          <button 
            onClick={() => setActiveTab('Tổng quan')}
            className="px-5 py-2.5 bg-white border border-[#E5EAF2] text-[#12213A] font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            Quay lại Tổng quan
          </button>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5EAF2] flex justify-between items-center">
              <h3 className="text-[16px] font-bold text-[#12213A]">Xuất báo cáo</h3>
              <button onClick={() => setExportModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {exportSuccess ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="text-[15px] font-bold text-[#12213A]">Thành công!</h4>
                  <p className="text-[13px] text-[#64748B] mt-1">Báo cáo đã được tải xuống.</p>
                </div>
              ) : exporting ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-[#D7193F] rounded-full animate-spin mb-4" />
                  <p className="text-[13px] font-bold text-[#12213A]">Đang tạo báo cáo...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#12213A] mb-2">Định dạng</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => handleExport('PDF')} className="border border-[#E5EAF2] text-[#64748B] hover:border-[#D7193F] hover:text-[#D7193F] font-bold text-[13px] py-2 rounded-xl">PDF</button>
                      <button onClick={() => handleExport('CSV')} className="border-2 border-[#D7193F] bg-red-50 text-[#D7193F] font-bold text-[13px] py-2 rounded-xl">CSV</button>
                      <button onClick={() => handleExport('EXCEL')} className="border border-[#E5EAF2] text-[#64748B] hover:border-[#D7193F] hover:text-[#D7193F] font-bold text-[13px] py-2 rounded-xl">Excel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#12213A] mb-2">Xóa báo cáo?</h3>
              <p className="text-sm text-[#64748B]">Bạn có chắc chắn muốn xóa báo cáo này? Thao tác này không thể hoàn tác.</p>
            </div>
            <div className="px-6 py-4 bg-[#F6F8FC] border-t border-[#E5EAF2] flex justify-end gap-3">
              <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#64748B]">Hủy</button>
              <button onClick={handleDeleteReport} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold">Xóa báo cáo</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5EAF2] flex justify-between items-center">
              <h3 className="text-[16px] font-bold text-[#12213A]">Chia sẻ báo cáo</h3>
              <button onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Email người nhận</label>
                <input type="email" placeholder="admin@eventhub.ai" className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2 text-[13px] outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 bg-[#F6F8FC] border-t border-[#E5EAF2] flex justify-end gap-3">
              <button onClick={() => setShareModalOpen(false)} className="px-5 py-2 text-[13px] font-bold text-[#64748B]">Hủy</button>
              <button onClick={() => { setShareModalOpen(false); showToast('Đã chia sẻ báo cáo thành công.'); }} className="px-5 py-2 bg-[#D7193F] text-white rounded-xl text-[13px] font-bold">Chia sẻ</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Schedule Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5EAF2] flex justify-between items-center">
              <h3 className="text-[16px] font-bold text-[#12213A]">Lập lịch báo cáo</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold mb-1.5">Tên báo cáo</label>
                  <input type="text" className="w-full border rounded-xl px-4 py-2 text-[13px]" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold mb-1.5">Tần suất</label>
                  <select className="w-full border rounded-xl px-4 py-2 text-[13px]">
                    <option>Hàng tuần</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#F6F8FC] border-t flex justify-end gap-3">
              <button onClick={() => setScheduleModalOpen(false)} className="px-5 py-2 text-[13px] font-bold">Hủy</button>
              <button onClick={() => { setScheduleModalOpen(false); showToast('Lịch báo cáo đã được tạo.'); }} className="px-5 py-2 bg-[#D7193F] text-white rounded-xl text-[13px] font-bold">Lưu lịch</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
