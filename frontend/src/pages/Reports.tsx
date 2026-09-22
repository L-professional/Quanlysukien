import React, { useState } from 'react';
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

// --- Dummy Data ---
const lineChartData = [
  { name: 'Th1', registered: 300, attended: 250 },
  { name: 'Th2', registered: 400, attended: 350 },
  { name: 'Th3', registered: 350, attended: 300 },
  { name: 'Th4', registered: 500, attended: 450 },
  { name: 'Th5', registered: 480, attended: 400 },
  { name: 'Th6', registered: 600, attended: 550 },
  { name: 'Th7', registered: 550, attended: 500 },
  { name: 'Th8', registered: 700, attended: 650 },
  { name: 'Th9', registered: 850, attended: 750 },
  { name: 'Th10', registered: 750, attended: 600 },
  { name: 'Th11', registered: 900, attended: 850 },
  { name: 'Th12', registered: 1050, attended: 950 },
];

const barChartData = [
  { name: 'Tech Summit 2025', value: 850 },
  { name: 'AI & Future 2025', value: 720 },
  { name: 'Business Connect', value: 640 },
  { name: 'Marketing Expo 2025', value: 580 },
  { name: 'Innovation Day', value: 450 },
];

const donutData = [
  { name: 'Hội thảo', value: 45 },
  { name: 'Triển lãm', value: 30 },
  { name: 'Workshop', value: 15 },
  { name: 'Kết nối', value: 5 },
  { name: 'Khác', value: 5 },
];
const COLORS = ['#D7193F', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

const reportTableData = [
  { id: 1, name: 'Báo cáo Tech Summit 2025', type: 'Hiệu quả sự kiện', period: '01/03/2025 - 16/03/2025', creator: 'Nguyễn Văn Admin', date: '16/03/2025', status: 'Hoàn thành' },
  { id: 2, name: 'Tổng hợp đánh giá Q1', type: 'Feedback', period: '01/01/2025 - 31/03/2025', creator: 'Hệ thống (Auto)', date: '01/04/2025', status: 'Hoàn thành' },
  { id: 3, name: 'Báo cáo hiệu suất AI tháng 5', type: 'AI', period: '01/05/2025 - 31/05/2025', creator: 'Trần Văn Super', date: '01/06/2025', status: 'Đang xử lý' },
];

const TABS = [
  'Tổng quan', 'Hiệu quả sự kiện', 'Người tham dự', 'Vé & QR', 'Diễn giả', 'Feedback', 'AI', 'Hệ thống'
];

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setExportModalOpen(false);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      
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
            <div className="flex items-center justify-between px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] cursor-pointer hover:border-slate-300">
              <span className="text-[13px] font-medium text-[#12213A]">01/01/2025 - 31/12/2025</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Sự kiện</label>
            <div className="flex items-center justify-between px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] cursor-pointer hover:border-slate-300">
              <span className="text-[13px] font-medium text-[#12213A]">Tất cả sự kiện</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Loại báo cáo</label>
            <div className="flex items-center justify-between px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] cursor-pointer hover:border-slate-300">
              <span className="text-[13px] font-medium text-[#12213A]">Tổng quan</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Địa điểm</label>
            <div className="flex items-center justify-between px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] cursor-pointer hover:border-slate-300">
              <span className="text-[13px] font-medium text-[#12213A]">Tất cả</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Trạng thái</label>
            <div className="flex items-center justify-between px-3 h-10 border border-[#E5EAF2] rounded-lg bg-[#F6F8FC] cursor-pointer hover:border-slate-300">
              <span className="text-[13px] font-medium text-[#12213A]">Tất cả</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button className="h-10 px-4 bg-[#12213A] hover:bg-[#1a2d4f] text-white rounded-lg text-[13px] font-bold transition-colors flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Áp dụng
            </button>
            <button className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[13px] font-bold transition-colors flex items-center gap-2">
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
              onClick={() => setActiveTab(tab)}
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

      {activeTab === 'Tổng quan' ? (
        <>
          {/* 4. KPI SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Tổng sự kiện', value: '12', growth: '+20%', isUp: true, icon: CalendarDays, color: 'text-[#D7193F]', bg: 'bg-red-50' },
              { title: 'Tổng người tham dự', value: '4.832', growth: '+32%', isUp: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { title: 'Tỷ lệ tham dự', value: '86,4%', growth: '+8,2%', isUp: true, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { title: 'Mức độ hài lòng', value: '4,7 / 5', growth: '+0,4', isUp: true, icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-[#E5EAF2] p-5 shadow-sm flex flex-col justify-between">
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
                    {kpi.growth}
                  </span>
                  <span className="text-[12px] text-slate-400">So với kỳ trước</span>
                </div>
              </div>
            ))}
          </div>

          {/* 5. MAIN ANALYTICS CHART & DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Line Chart */}
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
                  <select className="text-[12px] font-bold border border-[#E5EAF2] rounded-lg px-3 py-1.5 h-[30px] outline-none hover:border-slate-300">
                    <option>Năm 2025</option>
                  </select>
                </div>
              </div>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} dx={-10} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                      labelStyle={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="registered" name="Đăng ký" stroke="#D7193F" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="attended" name="Đã tham dự" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="lg:col-span-4 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6 flex flex-col">
              <div>
                <h3 className="text-[16px] font-bold text-[#12213A]">Phân bố loại sự kiện</h3>
              </div>
              <div className="flex-1 flex flex-col justify-center relative mt-6">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2', padding: '6px 10px' }}
                        itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                  <span className="text-3xl font-bold text-[#12213A]">12</span>
                  <span className="text-[11px] text-[#64748B] font-bold uppercase tracking-wide">Sự kiện</span>
                </div>
                {/* Legend List */}
                <div className="mt-4 space-y-2">
                  {donutData.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-[13px] font-semibold text-[#12213A]">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-[#12213A]">{Math.round(entry.value * 0.12)}</span>
                        <span className="text-[12px] text-slate-400 w-8 text-right">{entry.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 6. EVENT PERFORMANCE & TABLE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Horizontal Bar Chart */}
            <div className="lg:col-span-4 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[16px] font-bold text-[#12213A]">Hiệu quả theo sự kiện</h3>
                <select className="text-[12px] font-bold border border-[#E5EAF2] rounded-lg px-2 py-1 outline-none">
                  <option>Tỷ lệ tham dự</option>
                  <option>Số lượng</option>
                </select>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5EAF2" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#12213A', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: '#F6F8FC' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2' }}
                    />
                    <Bar dataKey="value" fill="#D7193F" radius={[0, 4, 4, 0]} barSize={24}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#D7193F' : '#f4a5b4'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Report Table */}
            <div className="lg:col-span-8 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[16px] font-bold text-[#12213A]">Chi tiết báo cáo</h3>
                <button className="text-[13px] font-bold text-[#D7193F] hover:underline">Xem tất cả</button>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5EAF2]">
                      <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Tên báo cáo</th>
                      <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Loại</th>
                      <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Khoảng thời gian</th>
                      <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Trạng thái</th>
                      <th className="pb-3 pt-2 px-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF2]">
                    {reportTableData.map(report => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <div>
                              <div className="text-[13px] font-bold text-[#12213A]">{report.name}</div>
                              <div className="text-[11px] text-[#64748B]">{report.creator} • {report.date}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-[12px] font-semibold text-[#12213A] bg-slate-100 px-2 py-1 rounded-md">
                            {report.type}
                          </span>
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell text-[12px] text-[#64748B] font-medium">{report.period}</td>
                        <td className="py-3 px-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            report.status === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
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
                              <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50" title="Chia sẻ">
                                <Share2 className="w-4 h-4" />
                              </button>
                            </PermissionGuard>
                            <PermissionGuard requirePermission="REPORT_DELETE">
                              <button className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50" title="Xóa">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </PermissionGuard>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      ) : (
        /* EMPTY STATE FOR OTHER TABS */
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

      {/* MODALS */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
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
                  <p className="text-[13px] text-[#64748B] mt-1">Báo cáo đã được tạo thành công.</p>
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
                      <button className="border-2 border-[#D7193F] bg-red-50 text-[#D7193F] font-bold text-[13px] py-2 rounded-xl">PDF</button>
                      <button className="border border-[#E5EAF2] text-[#64748B] font-bold text-[13px] py-2 rounded-xl hover:border-slate-300">Excel</button>
                      <button className="border border-[#E5EAF2] text-[#64748B] font-bold text-[13px] py-2 rounded-xl hover:border-slate-300">CSV</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#12213A] mb-2">Phạm vi dữ liệu</label>
                    <select className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2.5 text-[13px] font-medium outline-none focus:border-[#D7193F]">
                      <option>Tất cả sự kiện</option>
                      <option>Chỉ sự kiện đã chọn</option>
                      <option>Chế độ xem hiện tại</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {!exportSuccess && !exporting && (
              <div className="px-6 py-4 bg-[#F6F8FC] border-t border-[#E5EAF2] flex justify-end gap-3">
                <button 
                  onClick={() => setExportModalOpen(false)}
                  className="px-5 py-2 text-[13px] font-bold text-[#64748B] hover:text-[#12213A] transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleExport}
                  className="px-5 py-2 bg-[#D7193F] hover:bg-[#b01433] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors"
                >
                  Xuất báo cáo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Modal (Visual mock) */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12213A]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E5EAF2] flex justify-between items-center">
              <h3 className="text-[16px] font-bold text-[#12213A]">Lập lịch báo cáo</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Tên báo cáo</label>
                  <input type="text" placeholder="Báo cáo tuần..." className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-[#D7193F]" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Loại báo cáo</label>
                  <select className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-[#D7193F]">
                    <option>Tổng quan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Tần suất</label>
                  <select className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-[#D7193F]">
                    <option>Hàng tuần</option>
                    <option>Hàng tháng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Định dạng</label>
                  <select className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-[#D7193F]">
                    <option>PDF</option>
                    <option>Excel</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#12213A] mb-1.5">Người nhận (Email)</label>
                <input type="text" placeholder="admin@eventhub.ai, ..." className="w-full border border-[#E5EAF2] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-[#D7193F]" />
              </div>
            </div>
            <div className="px-6 py-4 bg-[#F6F8FC] border-t border-[#E5EAF2] flex justify-end gap-3">
              <button 
                onClick={() => setScheduleModalOpen(false)}
                className="px-5 py-2 text-[13px] font-bold text-[#64748B] hover:text-[#12213A] transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => setScheduleModalOpen(false)}
                className="px-5 py-2 bg-[#D7193F] hover:bg-[#b01433] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
