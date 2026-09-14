import React, { useState, useEffect } from 'react';
import {
  X,
  Ticket,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MessageSquare,
  Sparkles,
  Clock,
  MapPin,
  Loader2,
  Users,
} from 'lucide-react';
import { EventScheduleItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { toast } from 'sonner';

interface SessionRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: EventScheduleItem | null;
  onSuccess: (ticketData: any, updatedSchedule: EventScheduleItem) => void;
}

export const SessionRegisterModal: React.FC<SessionRegisterModalProps> = ({
  isOpen,
  onClose,
  session,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync user profile data when opening modal or user state changes
  useEffect(() => {
    if (isOpen) {
      setFullName(user?.full_name || '');
      setEmail(user?.email || '');
      setPhoneNumber(user?.phone_number || '');
      setOrganization('');
      setJobTitle('');
      setNotes('');
    }
  }, [isOpen, user]);

  if (!isOpen || !session) return null;

  const capacity = session.capacity ?? 100;
  const registered = session.registered_count ?? 0;
  const remainingSeats = Math.max(0, capacity - registered);
  const isSoldOut = remainingSeats <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Vui lòng nhập Họ và tên!');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error('Vui lòng nhập địa chỉ Email hợp lệ!');
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      toast.error('Vui lòng nhập Số điện thoại liên hệ hợp lệ (tối thiểu 9-11 số)!');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiService.registerSessionTicket(session.id, {
        ticket_type: 'Vé Tham Dự',
        full_name: fullName.trim(),
        email: email.trim(),
        phone: cleanPhone,
        phone_number: cleanPhone,
        company: organization.trim() || undefined,
        organization: organization.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      const updatedSchedule: EventScheduleItem = {
        ...session,
        registered_count: registered + 1,
        is_registered: true,
        registration_id: response.id,
        qr_code_token: response.qr_code_token,
        qr_code_image: response.qr_code_image,
      };

      toast.success(response.message || 'Đăng ký vé tham dự phiên thành công!');
      onSuccess(response, updatedSchedule);
      onClose();
    } catch (err: any) {
      console.error('Failed to register ticket:', err);
      let rawMsg = '';
      if (typeof err?.response?.data?.detail === 'string') {
        rawMsg = err.response.data.detail;
      } else if (typeof err?.response?.data?.message === 'string') {
        rawMsg = err.response.data.message;
      } else if (err?.message === 'Network Error') {
        rawMsg = 'Lỗi kết nối máy chủ (Network Error). Vui lòng kiểm tra lại đường truyền hoặc dịch vụ!';
      } else if (err?.message) {
        rawMsg = err.message;
      }

      const lower = (rawMsg || '').toLowerCase();
      let cleanMsg = 'Đăng ký vé không thành công. Vui lòng thử lại!';

      if (
        lower.includes('unique') ||
        lower.includes('duplicate') ||
        lower.includes('uq_') ||
        lower.includes('đã đăng ký') ||
        lower.includes('đã sở hữu') ||
        lower.includes('already registered')
      ) {
        cleanMsg = 'Bạn đã sở hữu vé cho phiên này rồi!';
      } else if (lower.includes('hết vé') || lower.includes('sold out')) {
        cleanMsg = 'Phiên này đã hết vé tham dự!';
      } else if (
        lower.includes('select ') ||
        lower.includes('insert ') ||
        lower.includes('syntaxerror') ||
        lower.includes('traceback') ||
        lower.includes('postgresql') ||
        lower.includes('database') ||
        lower.includes('asyncpg')
      ) {
        cleanMsg = 'Không thể hoàn tất đăng ký vé do lỗi hệ thống. Vui lòng thử lại sau!';
      } else if (rawMsg.trim()) {
        cleanMsg = rawMsg.trim();
      }

      toast.error(cleanMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-[95vw] sm:max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md">
              <Ticket className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Đăng Ký Vé Tham Dự Phiên
              </h3>
              <p className="text-xs text-indigo-200/80">Điền thông tin để nhận mã vé QR Code check-in tại cổng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Target Session Card Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {session.track || 'General'} • {session.date_label || 'Ngày 1'}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isSoldOut
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                }`}
              >
                <Users className="w-3 h-3" />
                {isSoldOut ? 'Đã hết chỗ' : `Còn lại: ${remainingSeats}/${capacity} chỗ`}
              </span>
            </div>

            <h4 className="font-bold text-sm text-white leading-snug">{session.title}</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>
                  {session.start_time} - {session.end_time}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">
                  {session.speaker_name} ({session.speaker_role || 'Diễn giả'})
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{session.room_location}</span>
              </div>
            </div>
          </div>

          {/* Form Inputs */}
          <form id="session-register-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Thông tin người tham dự (Bắt buộc)
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Họ và tên <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Email & Phone grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email nhận vé QR <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Số điện thoại <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="0912 345 678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Supplementary Information */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Thông tin bổ trợ (Không bắt buộc)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Đơn vị / Công ty / Trường học</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="VD: ĐH Bách Khoa, VinAI, ..."
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Chức danh / Vai trò</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="VD: Kỹ sư AI, Sinh viên, Quản lý..."
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ghi chú / Câu hỏi cho diễn giả</label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    placeholder="Bạn có thắc mắc hay kỳ vọng gì muốn gửi tới diễn giả trong phiên này?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
          >
            Hủy Bỏ
          </button>

          <button
            type="submit"
            form="session-register-form"
            disabled={isSubmitting || isSoldOut}
            className="px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xử lý & cấp vé...
              </>
            ) : isSoldOut ? (
              'Phiên Đã Hết Chỗ'
            ) : (
              <>
                <Ticket className="w-4 h-4" />
                Xác Nhận Đăng Ký Vé
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
