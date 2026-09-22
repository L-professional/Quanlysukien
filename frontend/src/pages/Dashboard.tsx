import React from 'react';
import {
  Calendar, Clock, CloudRain, Users, Mic, QrCode, ArrowUpRight, ArrowDownRight,
  Plus, ScanLine, Sparkles, UserPlus, FileText, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// Dummy Data
const lineChartData = [
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
];

const donutData = [
  { name: 'Hội nghị', value: 45 },
  { name: 'Workshop', value: 30 },
  { name: 'Webinar', value: 15 },
  { name: 'Khác', value: 10 },
];
const COLORS = ['#D7193F', '#3B82F6', '#8B5CF6', '#10B981'];

const recentEvents = [
  { id: 1, name: 'AI Summit 2026', date: '25/11/2026', attendees: '1,200', status: 'Đang diễn ra', statusColor: 'bg-emerald-100 text-emerald-700' },
  { id: 2, name: 'Tech Startup Workshop', date: '28/11/2026', attendees: '350', status: 'Sắp diễn ra', statusColor: 'bg-blue-100 text-blue-700' },
  { id: 3, name: 'Global Marketing Trends', date: '01/12/2026', attendees: '850', status: 'Sắp diễn ra', statusColor: 'bg-blue-100 text-blue-700' },
  { id: 4, name: 'Web3 & Blockchain', date: '15/11/2026', attendees: '500', status: 'Đã kết thúc', statusColor: 'bg-slate-100 text-slate-700' },
];

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

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      
      {/* 1. WELCOME & WEATHER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#12213A]">
            Chào mừng trở lại, {user?.full_name || 'Giàng A Chiếndmin'}!
          </h1>
          <p className="text-[#64748B] mt-1 font-medium">Quản trị viên hệ thống</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-[#E5EAF2] shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#D7193F]" />
            <span className="text-[13px] font-bold text-[#12213A]">25/11/2026</span>
          </div>
          <div className="w-px h-4 bg-[#E5EAF2]"></div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-[13px] font-bold text-[#12213A]">08:30 AM</span>
          </div>
          <div className="w-px h-4 bg-[#E5EAF2]"></div>
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-500" />
            <span className="text-[13px] font-bold text-[#12213A]">24°C Hà Nội</span>
          </div>
        </div>
      </div>

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Tổng sự kiện', value: '1,248', growth: '+12%', isUp: true, icon: Calendar, color: 'text-[#D7193F]', bg: 'bg-red-50' },
          { title: 'Tổng người tham dự', value: '45,200', growth: '+18%', isUp: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Tổng diễn giả', value: '320', growth: '+5%', isUp: true, icon: Mic, color: 'text-purple-600', bg: 'bg-purple-50' },
          { title: 'Lượt quét QR', value: '38,400', growth: '+22%', isUp: true, icon: QrCode, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((kpi, idx) => (
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
            <select className="text-[12px] font-semibold border border-[#E5EAF2] rounded-lg px-3 py-1.5 outline-none focus:border-[#D7193F]">
              <option>Năm 2026</option>
              <option>Năm 2025</option>
            </select>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF2" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  labelStyle={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}
                />
                <Line type="monotone" dataKey="attendees" name="Người tham dự" stroke="#D7193F" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
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
          <div className="flex-1 flex flex-col justify-center relative mt-4">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5EAF2', padding: '4px 8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
              <span className="text-2xl font-bold text-[#12213A]">1,248</span>
              <span className="text-[10px] text-[#64748B] font-semibold">Tổng số</span>
            </div>
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-1 mt-2">
              {donutData.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-[11px] font-semibold text-[#12213A] truncate">{entry.name}</span>
                  <span className="text-[10px] text-slate-400 ml-auto">{entry.value}%</span>
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
            <button className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E5EAF2] hover:border-[#D7193F] hover:bg-red-50/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D7193F]/10 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-[#D7193F]" />
                </div>
                <span className="text-[13px] font-bold text-[#12213A] group-hover:text-[#D7193F]">Tạo sự kiện mới</span>
              </div>
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E5EAF2] hover:border-blue-500 hover:bg-blue-50/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[13px] font-bold text-[#12213A] group-hover:text-blue-600">Thêm diễn giả</span>
              </div>
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E5EAF2] hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <ScanLine className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[13px] font-bold text-[#12213A] group-hover:text-emerald-600">Quét vé QR Code</span>
              </div>
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-[#12213A] hover:bg-[#1a2d4f] transition-colors border border-transparent shadow-[0_4px_12px_rgba(18,33,58,0.2)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-[13px] font-bold text-white">Phân tích bằng AI</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 4. LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Events */}
        <div className="lg:col-span-6 bg-white border border-[#E5EAF2] rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[15px] font-bold text-[#12213A]">Sự kiện gần đây</h3>
            <button className="text-[12px] font-bold text-[#D7193F] hover:underline">Xem tất cả</button>
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
                {recentEvents.map(event => (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-[#D7193F]" />
                        </div>
                        <span className="text-[13px] font-bold text-[#12213A]">{event.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[12px] text-[#64748B] font-medium">{event.date}</td>
                    <td className="py-3 text-[12px] text-[#12213A] font-bold">{event.attendees}</td>
                    <td className="py-3">
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
            <button className="text-[12px] font-bold text-[#D7193F] hover:underline">Chi tiết</button>
          </div>
          <div className="space-y-4">
            {topSpeakers.map(speaker => (
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
                <div className="text-[12px] font-bold text-[#D7193F] bg-red-50 px-2 py-0.5 rounded">
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
            {notifications.map(notif => (
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
