import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  Keyboard,
  UserCheck,
  Clock,
  Ticket,
  ShieldAlert,
  UserPlus,
  X,
} from 'lucide-react';
import { apiService } from '../services/api';
import { CheckInResult } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export const CheckInScanner: React.FC = () => {
  const { hasRole } = useAuth();
  const canIssueManual = hasRole(['ADMIN', 'STAFF', 'EVENT_MANAGER']);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [recentScans, setRecentScans] = useState<CheckInResult[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Manual Issue Modal State
  const [showManualIssue, setShowManualIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ full_name: '', email: '', ticket_type: 'Vé Vãng Lai' });
  const [issueLoading, setIssueLoading] = useState(false);

  const handleManualIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.full_name.trim() || !issueForm.email.trim()) {
      toast.error('Vui lòng nhập đầy đủ họ tên và email!');
      return;
    }
    setIssueLoading(true);
    try {
      const res = await apiService.manualIssueTicket({
        event_id: 1,
        full_name: issueForm.full_name.trim(),
        email: issueForm.email.trim(),
        ticket_type: issueForm.ticket_type,
      });
      toast.success(res.message);
      setIssueForm({ full_name: '', email: '', ticket_type: 'Vé Vãng Lai' });
      setShowManualIssue(false);
    } catch {
      toast.error('Không thể cấp vé. Vui lòng thử lại hoặc kiểm tra kết nối backend.');
    } finally {
      setIssueLoading(false);
    }
  };

  // Play audio tones using Web Audio API synthesizer
  const playFeedbackSound = (type: 'SUCCESS' | 'ALREADY_USED' | 'INVALID' | 'INVALID_EVENT') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'SUCCESS') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'ALREADY_USED') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch {
      // AudioContext unavailable or restricted
    }
  };

  // Start Camera with fallback & cleanup
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('Error stopping track:', e);
      }
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn('Error clearing srcObject:', e);
      }
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    stopCamera();
    try {
      setLoading(true);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      mediaStreamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        try {
          await video.play();
        } catch (e) {
          console.warn('Video play warning:', e);
        }
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.warn('Cannot open camera hardware:', err);
      const errorName = (err as { name?: string }).name;
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        toast.error('Trình duyệt chưa được cấp quyền Camera. Vui lòng cấp quyền trên thanh địa chỉ.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        toast.error('Camera đang bị ứng dụng khác chiếm giữ hoặc phần cứng bận.');
      } else {
        toast.error('Không thể kích hoạt camera trên thiết bị này.');
      }
      setCameraActive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Process Token Check-in
  const handleVerifyToken = async (tokenToVerify: string) => {
    const token = tokenToVerify.trim();
    if (!token) return;

    setLoading(true);
    try {
      const res = await apiService.verifyCheckInToken(token);
      setResult(res);
      playFeedbackSound(res.status);
      setRecentScans((prev) => [res, ...prev.slice(0, 9)]);

      if (res.status === 'SUCCESS') {
        toast.success(res.message);
      } else if (res.status === 'ALREADY_USED') {
        toast.warning(res.message);
      } else if (res.status === 'INVALID_EVENT') {
        toast.error(`⚠️ ${res.message}`);
      } else {
        toast.error(res.message);
      }
    } catch {
      const fallbackError: CheckInResult = {
        status: 'INVALID',
        message: 'Lỗi kết nối máy chủ xác thực mã vé!',
        token: token,
      };
      setResult(fallbackError);
      playFeedbackSound('INVALID');
      toast.error('Lỗi kết nối máy chủ xác thực mã vé!');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken) {
      handleVerifyToken(manualToken);
      setManualToken('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg">
              <QrCode className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Soát Vé & Check-in QR</h1>
          </div>
          <p className="text-sm text-slate-400">
            Quét mã QR từ vé điện tử của người tham dự hoặc nhập mã token để xác thực tức thì.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Manual Ticket Issue Button — Staff/Admin only */}
          {canIssueManual && (
            <button
              onClick={() => setShowManualIssue(true)}
              className="p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors bg-indigo-900/40 border-indigo-700/50 text-indigo-300 hover:bg-indigo-900/60 hover:text-indigo-200"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cấp Vé Vãng Lai</span>
            </button>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
              soundEnabled
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Bật/Tắt âm thanh thông báo"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</span>
          </button>
        </div>
      </div>

      {/* Manual Issue Modal */}
      {showManualIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-indigo-700/50 rounded-2xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Cấp Vé Vãng Lai</h3>
                  <p className="text-indigo-400 text-xs">Walk-in Ticket Issuance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualIssue(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualIssue} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Họ và Tên *</label>
                  <input
                    type="text"
                    value={issueForm.full_name}
                    onChange={(e) => setIssueForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={issueForm.email}
                    onChange={(e) => setIssueForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Loại Vé</label>
                  <select
                    value={issueForm.ticket_type}
                    onChange={(e) => setIssueForm((f) => ({ ...f, ticket_type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500/60"
                  >
                    <option value="Vé Vãng Lai">Vé Vãng Lai (Walk-in)</option>
                    <option value="Vé Tiêu Chuẩn">Vé Tiêu Chuẩn (Standard)</option>
                    <option value="Vé VIP">Vé VIP</option>
                    <option value="Vé Diễn Giả">Vé Diễn Giả (Speaker)</option>
                  </select>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowManualIssue(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={issueLoading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {issueLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                  Cấp Vé
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Grid: Left Scanner Viewfinder, Right Status and Manual Input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Scanner Camera Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel-glow rounded-2xl p-5 relative overflow-hidden flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-semibold text-slate-200">Camera Viewfinder</span>
              </div>
              <button
                onClick={cameraActive ? stopCamera : startCamera}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  cameraActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                {cameraActive ? 'Tắt Camera' : 'Bật Camera Quét'}
              </button>
            </div>

            {/* Video / Scanning Viewport */}
            <div className="relative w-full aspect-video bg-slate-900/90 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraActive ? 'opacity-100 block' : 'opacity-0 pointer-events-none absolute'
                }`}
                playsInline
                muted
              />

              {cameraActive ? (
                <>
                  {/* Laser Scanning Animation Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-64 h-64 border-2 border-dashed border-ai-cyan/60 rounded-2xl flex items-center justify-center shadow-2xl">
                      {/* Corner Target Markers */}
                      <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-ai-cyan rounded-tl-lg"></div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-ai-cyan rounded-tr-lg"></div>
                      <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-ai-cyan rounded-bl-lg"></div>
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-ai-cyan rounded-br-lg"></div>

                      {/* Animated Laser Bar */}
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-scan"></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-300">Camera hiện đang tắt</p>
                    <p className="text-xs text-slate-500">
                      Bấm &quot;Bật Camera Quét&quot; hoặc chọn mẫu Token thử nghiệm bên dưới
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-brand-500/20"
                  >
                    Kích hoạt Camera
                  </button>
                </div>
              )}
            </div>

            {/* Quick Test Simulation Tokens */}
            <div className="w-full mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Mẫu QR Token thử nghiệm nhanh (Demo):
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleVerifyToken('QR-TOKEN-EVENTHUB-VALID-01')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/40 text-emerald-300 text-[11px] font-medium transition-colors text-center"
                >
                  🟢 Vé Hợp Lệ
                </button>
                <button
                  onClick={() => handleVerifyToken('QR-TOKEN-EVENTHUB-001')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/40 text-amber-300 text-[11px] font-medium transition-colors text-center"
                >
                  🟡 Vé Đã Dùng
                </button>
                <button
                  onClick={() => handleVerifyToken('INVALID-TOKEN-999')}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/50 hover:bg-rose-900/40 text-rose-300 text-[11px] font-medium transition-colors text-center"
                >
                  🔴 Vé Không Hợp Lệ
                </button>
              </div>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="glass-panel rounded-2xl p-5">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-brand-400" />
                Nhập Token / Mã vé thủ công
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Ví dụ: QR-TOKEN-EVENTHUB-001..."
                  className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || !manualToken.trim()}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md shadow-brand-500/20"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Xác thực'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Validation Result & History Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Result Card */}
          {result ? (
            <div
              className={`rounded-2xl p-6 border transition-all duration-300 ${
                result.status === 'SUCCESS'
                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                  : result.status === 'ALREADY_USED'
                  ? 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : result.status === 'INVALID_EVENT'
                  ? 'bg-purple-950/30 border-purple-500/40 shadow-lg shadow-purple-500/10'
                  : 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-500/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5">
                  {result.status === 'SUCCESS' && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
                  {result.status === 'ALREADY_USED' && <AlertTriangle className="w-8 h-8 text-amber-400" />}
                  {result.status === 'INVALID_EVENT' && <AlertTriangle className="w-8 h-8 text-purple-400" />}
                  {result.status === 'INVALID' && <XCircle className="w-8 h-8 text-rose-400" />}
                </div>
                <div className="space-y-2 flex-1">
                  <div>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        result.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : result.status === 'ALREADY_USED'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : result.status === 'INVALID_EVENT'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {result.status === 'SUCCESS' && 'Xác thực thành công'}
                      {result.status === 'ALREADY_USED' && 'Cảnh báo: Vé đã check-in'}
                      {result.status === 'INVALID_EVENT' && 'Không đúng sự kiện cổng quét'}
                      {result.status === 'INVALID' && 'Mã vé không hợp lệ'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">{result.message}</h3>
                  </div>

                  {result.participantName && (
                    <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <UserCheck className="w-3.5 h-3.5 text-brand-400" /> Khách tham dự:
                        </span>
                        <strong className="text-white font-semibold">{result.participantName}</strong>
                      </div>

                      {result.ticketType && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Ticket className="w-3.5 h-3.5 text-indigo-400" /> Hạng vé:
                          </span>
                          <span className="text-indigo-300 font-medium">{result.ticketType}</span>
                        </div>
                      )}

                      {result.checkInTime && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" /> Thời gian:
                          </span>
                          <span className="text-slate-300">{result.checkInTime}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center space-y-2 border border-dashed border-slate-800">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Chờ quét mã vé tiếp theo</p>
              <p className="text-xs text-slate-500">
                Kết quả kiểm tra và thông tin người tham dự sẽ xuất hiện tại đây ngay khi quét.
              </p>
            </div>
          )}

          {/* Recent Scans History */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              Lịch sử quét gần nhất
            </h4>

            {recentScans.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {scan.status === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                      {scan.status === 'ALREADY_USED' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                      {scan.status === 'INVALID' && <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                      <div>
                        <p className="font-semibold text-slate-200">
                          {scan.participantName || scan.token || 'Vé không hợp lệ'}
                        </p>
                        <p className="text-[10px] text-slate-500">{scan.ticketType || scan.message}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{scan.checkInTime || 'Vừa xong'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">Chưa có lượt quét nào trong phiên làm việc này.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
