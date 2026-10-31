import React, { useState } from 'react';
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  UserCheck,
  Phone,
  Mail,
  Copy,
  Printer,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { apiService } from '../services/api';
import { StaffAttendeeItem } from '../types';

export const StaffRegistrationSupport: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [attendee, setAttendee] = useState<StaffAttendeeItem | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [checkInLoading, setCheckInLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [incidentModalOpen, setIncidentModalOpen] = useState<boolean>(false);
  const [incidentDesc, setIncidentDesc] = useState<string>('');
  const [reportingIncident, setReportingIncident] = useState<boolean>(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setHasSearched(true);
      const res = await apiService.getStaffAttendees({
        search: searchQuery.trim(),
        limit: 1,
      });

      if (res.items && res.items.length > 0) {
        setAttendee(res.items[0]);
      } else {
        setAttendee(null);
      }
    } catch (err) {
      console.error('Error looking up registration:', err);
      setAttendee(null);
    } finally {
      setSearching(false);
    }
  };

  const handleCheckInNow = async () => {
    if (!attendee || attendee.is_checked_in) return;
    try {
      setCheckInLoading(true);
      const resp = await apiService.manualCheckIn({ registration_id: attendee.id });
      if (resp.status === 'SUCCESS') {
        setAttendee({
          ...attendee,
          is_checked_in: true,
          checked_in_at: resp.checkInTime || 'Vừa xong',
        });
        setToastMessage(`Check-in thành công cho khách: ${attendee.full_name}`);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(resp.message || 'Không thể check-in vé này!');
      }
    } catch (err) {
      console.error('Check-in error:', err);
      alert('Có lỗi xảy ra khi thực hiện check-in.');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleReportFraud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendee) return;
    try {
      setReportingIncident(true);
      await apiService.reportStaffIncident({
        event_id: attendee.event_id,
        incident_type: 'INVALID_TICKET',
        severity: 'HIGH',
        title: `Nghi vấn vé không hợp lệ / Trùng lặp: ${attendee.full_name}`,
        description: incidentDesc || `Khách xuất trình vé ${attendee.qr_code_token} nhưng có sự cố đối chiếu tại quầy hỗ trợ.`,
        ticket_code: attendee.qr_code_token,
      });
      setToastMessage('Đã báo cáo nghi vấn vé lên Ban Quản Lý sự kiện.');
      setIncidentModalOpen(false);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Fraud report error:', err);
      alert('Không thể gửi báo cáo sự cố.');
    } finally {
      setReportingIncident(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-800/40 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Bàn hướng dẫn & Cấp thẻ vé
          </span>
          <span className="text-xs text-slate-400">Xử lý tại chỗ</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Hỗ Trợ Đăng Ký & Xử Lý Sự Cố Vé</h1>
        <p className="text-sm text-slate-300 mt-1">
          Hỗ trợ đại biểu quên mang mã QR, chưa nhận được email xác nhận hoặc đối chiếu thông tin cấp thẻ đeo hội trường.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Result */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lookup Input Card */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-400" />
              Tra cứu nhanh người tham dự
            </h2>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập Email, Số điện thoại hoặc Họ tên đại biểu..."
                  className="w-full pl-4 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
              >
                {searching ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>Gợi ý mẫu:</span>
              <button
                type="button"
                onClick={() => setSearchQuery('staff@eventhub.ai')}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                staff@eventhub.ai
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setSearchQuery('Nguyễn')}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                Họ "Nguyễn"
              </button>
            </div>
          </div>

          {/* Search Result */}
          {hasSearched && (
            <div>
              {attendee ? (
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/40 shadow-2xl space-y-6 animate-scale-up">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Tìm thấy hồ sơ vé
                      </span>
                      <h3 className="text-xl font-bold text-white mt-2">{attendee.full_name}</h3>
                      <p className="text-sm text-slate-400">{attendee.event_title}</p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        attendee.ticket_type.toUpperCase().includes('VIP')
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}
                    >
                      {attendee.ticket_type}
                    </span>
                  </div>

                  {/* Info Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        Email đăng ký
                      </div>
                      <div className="text-slate-200 font-medium">{attendee.email || 'Chưa cung cấp'}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        Số điện thoại
                      </div>
                      <div className="text-slate-200 font-medium">{attendee.phone_number || 'Chưa cung cấp'}</div>
                    </div>
                  </div>

                  {/* QR Token display */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Mã định danh vé (Token Check-in)</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(attendee.qr_code_token);
                          setToastMessage('Đã sao chép mã vé vào clipboard!');
                          setTimeout(() => setToastMessage(null), 3000);
                        }}
                        className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        Sao chép
                      </button>
                    </div>
                    <div className="font-mono text-cyan-300 text-sm break-all bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      {attendee.qr_code_token}
                    </div>
                  </div>

                  {/* Check-in Status */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div>
                      <div className="text-xs text-slate-400">Tình trạng vào cổng</div>
                      <div className="font-semibold text-sm mt-0.5">
                        {attendee.is_checked_in ? (
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Đã Check-in ({attendee.checked_in_at || 'Vừa xong'})
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" />
                            Chưa Check-in tại cổng
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!attendee.is_checked_in ? (
                        <button
                          onClick={handleCheckInNow}
                          disabled={checkInLoading}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>{checkInLoading ? 'Đang duyệt...' : 'Check-in tại quầy'}</span>
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                          Đã hoàn tất
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Operational actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In thẻ đeo đại biểu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncidentModalOpen(true)}
                      className="text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer font-medium"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Báo cáo vé bất thường</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-10 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                  <h3 className="text-base font-bold text-white">Không tìm thấy thông tin đăng ký</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Không tìm thấy người tham dự với thông tin "{searchQuery}". Vui lòng kiểm tra lại chính tả hoặc đối chiếu với Ban Tổ Chức.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: SOP Guidelines */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Quy Trình Xử Lý Tại Cổng (SOP)
            </h2>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="font-bold text-cyan-300 block mb-1">1. Quên mã QR</span>
                <span>Nhập Email hoặc SĐT của đại biểu vào ô tìm kiếm bên cạnh. Nhấn "Check-in tại quầy" và cấp thẻ đeo tương ứng hạng vé.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="font-bold text-amber-300 block mb-1">2. Vé báo ALREADY_USED</span>
                <span>Yêu cầu khách xuất trình CCCD/CMND để đối chiếu họ tên. Nếu trùng khớp, kiểm tra lịch sử quét lần đầu xem có bị quét nhầm tại cổng khác không.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="font-bold text-indigo-300 block mb-1">3. Khách mời VIP / Diễn giả</span>
                <span>Dẫn khách vào quầy lễ tân riêng, cung cấp thẻ All-Access và liên hệ nhân sự phụ trách tiếp đón VIP.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="font-bold text-rose-300 block mb-1">4. Khách vãng lai chưa mua vé</span>
                <span>Hướng dẫn khách quét mã QR tại bàn đăng ký để mua vé trực tuyến qua cổng thanh toán EventHub.</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-800/40 space-y-2 text-xs">
            <div className="font-bold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-cyan-400" />
              Đường dây nóng Quản lý sự kiện
            </div>
            <p className="text-slate-300">
              Trường hợp phát sinh tranh chấp vé hoặc lỗi hệ thống mạng kéo dài:
            </p>
            <div className="font-mono text-cyan-300 font-bold text-sm">
              Hotline: 0988.123.456 (Trưởng ban Điều phối)
            </div>
          </div>
        </div>
      </div>

      {/* Fraud Incident Modal */}
      {incidentModalOpen && attendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Báo Cáo Nghi Vấn Vé Bất Thường</h3>
              </div>
              <button
                onClick={() => setIncidentModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReportFraud} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
                <div><span className="text-slate-400">Đại biểu:</span> <span className="text-white font-semibold">{attendee.full_name}</span></div>
                <div><span className="text-slate-400">Mã vé:</span> <span className="font-mono text-cyan-300">{attendee.qr_code_token}</span></div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mô tả dấu hiệu bất thường *</label>
                <textarea
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  required
                  rows={3}
                  placeholder="Ví dụ: Hai khách cùng xuất trình một mã QR; khách không nhớ email đăng ký; vé nghi bị làm giả..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIncidentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={reportingIncident}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {reportingIncident ? 'Đang gửi...' : 'Gửi cảnh báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
