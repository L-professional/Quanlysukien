import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Ticket,
  Calendar,
  MapPin,
  Download,
  Copy,
  Check,
  Mail,
  Sparkles,
  Trash2,
  AlertTriangle,
  Loader2,
  Building2,
  Phone,
  Clock,
  QrCode,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

export interface TicketData {
  id: number;
  event_id: number;
  participant_name: string;
  participant_email: string;
  qr_code_token: string;
  ticket_code?: string;
  token?: string;
  qr_code_image?: string;
  qr_code_url?: string;
  qr_code_base64?: string;
  ticket_type?: string;
  event_title?: string;
  schedule_id?: number;
  schedule_title?: string;
  phone_number?: string;
  organization?: string;
  job_title?: string;
  notes?: string;
  room_location?: string;
  start_time?: string;
  end_time?: string;
  date_label?: string;
  message?: string;
}

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketData | null;
  onCancelTicket?: (ticketId: number, scheduleId?: number) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onCancelTicket,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [imageError, setImageError] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setImageError(false);
  }, [ticket?.id, ticket?.qr_code_token, ticket?.ticket_code, ticket?.token]);

  if (!isOpen || !ticket) return null;

  const ticketCode =
    ticket.ticket_code ||
    ticket.qr_code_token ||
    ticket.token ||
    `QR-EVENTHUB-${ticket.id}`;

  const rawServerImage = ticket.qr_code_base64 || ticket.qr_code_image || ticket.qr_code_url;
  const hasServerImage = Boolean(rawServerImage);
  const serverImageSrc = rawServerImage
    ? rawServerImage.startsWith('http') || rawServerImage.startsWith('data:')
      ? rawServerImage
      : `data:image/png;base64,${rawServerImage}`
    : '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticketCode);
    setCopied(true);
    toast.success((t('events.copyToken') || 'Đã sao chép mã vé') + '!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const sanitizedCode = ticketCode.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `ve-eventhub-${sanitizedCode}.png`;

    // 1. Export directly from QRCodeCanvas (100% reliable, zero CORS issues, high resolution)
    const canvas = qrCanvasRef.current || (document.getElementById('ticket-qr-canvas') as HTMLCanvasElement | null);
    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success((t('events.downloadTicket') || 'Tải ảnh vé QR') + ' thành công!');
        return;
      } catch (err) {
        console.warn('Canvas export failed, falling back to base64 image source', err);
      }
    }

    // 2. Fallback to base64 server image if canvas was not rendered
    if (rawServerImage && (rawServerImage.startsWith('data:') || !rawServerImage.startsWith('http'))) {
      const link = document.createElement('a');
      link.href = serverImageSrc;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success((t('events.downloadTicket') || 'Tải ảnh vé QR') + ' thành công!');
      return;
    }

    // 3. Fallback to URL
    if (serverImageSrc.startsWith('http')) {
      const link = document.createElement('a');
      link.href = serverImageSrc;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Đang tải ảnh mã QR...');
      return;
    }

    // 4. Fallback copy
    handleCopyCode();
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      let res: any;
      if (ticket.schedule_id) {
        res = await apiService.cancelSessionRegistration(ticket.schedule_id, ticket.id, ticket.qr_code_token);
      } else {
        res = await apiService.cancelRegistration(ticket.id);
      }
      toast.success(res?.message || 'Hủy vé thành công');
      setShowCancelConfirm(false);
      if (onCancelTicket) {
        onCancelTicket(ticket.id, ticket.schedule_id);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to cancel registration:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Hủy vé không thành công. Vui lòng thử lại!';
      toast.error(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-[95vw] sm:max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 border-b border-indigo-800/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md">
              <Ticket className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{t('events.ticketModalTitle')}</h3>
              <p className="text-xs text-indigo-200/80">{t('events.ticketQrSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCancelConfirm(false);
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Status Alert */}
          <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/60 rounded-2xl text-xs text-emerald-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-300">
                {ticket.message || 'Đăng ký vé thành công! Mã QR có hiệu lực check-in'}
              </p>
              <p className="text-[11px] text-emerald-400/90 mt-0.5 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Email đăng ký: <strong className="text-white">{ticket.participant_email}</strong>
              </p>
            </div>
          </div>

          {/* Event & Session Summary Card */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {ticket.ticket_type || 'Vé Tham Dự'}
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Hợp lệ (Valid)
              </span>
            </div>

            {ticket.schedule_title ? (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-400 block">
                  Ca Diễn Thuyết / Session:
                </span>
                <h4 className="font-bold text-sm text-white leading-snug">{ticket.schedule_title}</h4>
                <p className="text-xs text-slate-400">{ticket.event_title || 'EventHub AI Summit 2026'}</p>
              </div>
            ) : (
              <h4 className="font-bold text-sm text-white line-clamp-2">
                {ticket.event_title || 'Hội Nghị Công Nghệ AI 2026'}
              </h4>
            )}

            <div className="text-xs text-slate-400 space-y-1 pt-1 border-t border-slate-800/60">
              {ticket.start_time && (
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {ticket.date_label ? `${ticket.date_label} • ` : ''}
                    {ticket.start_time} - {ticket.end_time}
                  </span>
                </p>
              )}
              <p className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>15/10/2026 - 16/10/2026</span>
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{ticket.room_location || 'Trung tâm Hội nghị GEM Center, TP.HCM'}</span>
              </p>
              {(ticket.organization || ticket.phone_number) && (
                <p className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                  {ticket.phone_number && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {ticket.phone_number}
                    </span>
                  )}
                  {ticket.organization && (
                    <span className="flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {ticket.organization}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="bg-white rounded-2xl p-5 text-slate-900 text-center shadow-lg border border-slate-200">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <QrCode className="w-4 h-4 text-indigo-600" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                MÃ QR SOÁT VÉ CHECK-IN
              </p>
            </div>

            {/* High-contrast QR Container */}
            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl shadow-inner border border-slate-200/90 mx-auto max-w-[230px] my-2">
              {hasServerImage && !imageError ? (
                <>
                  <img
                    src={serverImageSrc}
                    alt="Mã QR Soát Vé"
                    onError={() => setImageError(true)}
                    className="w-[192px] h-[192px] object-contain rounded-lg"
                  />
                  {/* Hidden high-res canvas ready for PNG export without CORS */}
                  <div className="hidden">
                    <QRCodeCanvas
                      ref={qrCanvasRef}
                      id="ticket-qr-canvas"
                      value={ticketCode}
                      size={256}
                      level="H"
                      includeMargin={true}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>
                </>
              ) : (
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  id="ticket-qr-canvas"
                  value={ticketCode}
                  size={192}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  className="rounded-lg"
                />
              )}
            </div>

            {/* Display Token for Manual Check-in */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5">
              <span className="font-mono font-bold text-xs sm:text-sm text-slate-800 tracking-wider bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 select-all">
                {ticketCode}
              </span>
            </div>

            <div className="mt-2 text-xs font-semibold text-slate-800">
              Khách tham dự: <span className="font-bold text-indigo-600">{ticket.participant_name}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Vui lòng giữ mã QR này trên điện thoại để nhân viên quét qua cổng soát vé
            </p>
          </div>

          {/* Token Code Display & Copy */}
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Mã vé (Token):</span>
              <code className="text-xs text-indigo-400 font-mono font-bold truncate block">
                {ticketCode}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ml-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Đã chép
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép
                </>
              )}
            </button>
          </div>

          {/* Calendar Integration: Google / Apple / Outlook */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Lưu vào lịch cá nhân (Tự động nhắc hẹn):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const title = encodeURIComponent(ticket.event_title || ticket.schedule_title || 'Sự kiện EventHub AI');
                  const details = encodeURIComponent(
                    `Mã vé QR Check-in: ${ticketCode}\nLoại vé: ${ticket.ticket_type || 'Vé Tham Dự'}\nKhách tham dự: ${ticket.participant_name}\n\nVui lòng chuẩn bị mã QR trên điện thoại để quét tại cổng.`
                  );
                  const location = encodeURIComponent(ticket.room_location || 'Trung tâm Hội nghị GEM Center, TP.HCM');
                  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
                  window.open(gCalUrl, '_blank');
                  toast.success('Đang mở Google Calendar để thêm sự kiện!');
                }}
                className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-indigo-500/50"
                title="Lưu sự kiện vào Google Calendar"
              >
                <span>📅 Google Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const title = ticket.event_title || ticket.schedule_title || 'Sự kiện EventHub AI';
                  const desc = `Mã vé QR: ${ticketCode} | Loại vé: ${ticket.ticket_type || 'Vé Tham Dự'}`;
                  const loc = ticket.room_location || 'Trung tâm Hội nghị GEM Center, TP.HCM';
                  const icsContent = [
                    'BEGIN:VCALENDAR',
                    'VERSION:2.0',
                    'PRODID:-//EventHub AI//Event Calendar//VI',
                    'CALSCALE:GREGORIAN',
                    'BEGIN:VEVENT',
                    `SUMMARY:${title}`,
                    `DESCRIPTION:${desc}`,
                    `LOCATION:${loc}`,
                    `DTSTART:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                    `DTEND:${new Date(Date.now() + 3 * 3600 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                    `STATUS:CONFIRMED`,
                    'END:VEVENT',
                    'END:VCALENDAR'
                  ].join('\r\n');
                  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                  const link = document.createElement('a');
                  link.href = window.URL.createObjectURL(blob);
                  link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast.success('Đã tải file .ics cho Apple Calendar & Outlook!');
                }}
                className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-indigo-500/50"
                title="Tải file .ics cho Apple Calendar và Outlook"
              >
                <span>🍏 Apple Calendar</span>
              </button>
            </div>
          </div>

          {/* Cancel Ticket Trigger Button */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 py-2.5 px-4 min-h-[44px] rounded-xl bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/40 hover:border-rose-700/60 transition-all cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Hủy Đăng Ký Vé</span>
            </button>
          </div>
        </div>

        {/* Modal Fixed Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 grid grid-cols-2 gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleDownloadQR}
            className="w-full py-2.5 px-3 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {t('events.downloadTicket')}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCancelConfirm(false);
              onClose();
            }}
            className="w-full py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer flex items-center justify-center"
          >
            {t('events.close')}
          </button>
        </div>
      </div>

      {/* Separate Blocking Cancellation Confirmation Dialog */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm bg-black/70 animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative w-[95vw] sm:max-w-sm bg-slate-900 border-2 border-rose-600/80 rounded-3xl p-6 shadow-2xl shadow-rose-950/60 text-slate-100 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
              <AlertTriangle className="w-7 h-7 text-rose-500 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-white tracking-tight">
                Xác Nhận Hủy Đăng Ký Vé?
              </h4>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                Bạn có chắc chắn muốn hủy vé tham dự phiên{' '}
                <span className="font-bold text-white">
                  "{ticket.schedule_title || ticket.event_title}"
                </span>
                ?
              </p>
              <p className="text-[11px] text-slate-400 leading-normal pt-1">
                Chỗ ngồi sẽ được nhường lại cho người khác và mã QR này sẽ bị hủy trên hệ thống. Thao tác này không thể hoàn tác!
              </p>
            </div>

            {/* Mandatory 2-Button Action Bar */}
            <div className="w-full flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="w-full py-2.5 px-4 min-h-[44px] rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/40 hover:shadow-rose-600/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý hủy vé...</span>
                  </>
                ) : (
                  <>
                    <span>🔥 Xác Nhận Hủy Vé</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setShowCancelConfirm(false)}
                className="w-full py-2.5 px-4 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700/80 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
              >
                Quay Lại / Giữ Vé
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
