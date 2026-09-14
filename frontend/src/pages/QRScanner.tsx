import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Keyboard,
  UserCheck,
  Clock,
  Ticket,
  ShieldAlert,
  UserPlus,
  Volume2,
  VolumeX,
  Trash2,
  Sparkles,
  Layers,
  Check,
  FlipHorizontal,
} from 'lucide-react';
import jsQR from 'jsqr';
import { apiService } from '../services/api';
import { CheckInResult } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export const QRScanner: React.FC = () => {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canIssueManual = hasRole(['ADMIN', 'STAFF', 'EVENT_MANAGER']);

  // Camera & Stream states
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [usingFrontCamera, setUsingFrontCamera] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Auto-scan status & cooldown feedback
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'DETECTED' | 'PAUSED'>('IDLE');
  const [cooldownNotice, setCooldownNotice] = useState<string | null>(null);

  // Manual token & API loading
  const [manualToken, setManualToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Result & History
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [recentScans, setRecentScans] = useState<CheckInResult[]>([]);

  // Manual issue modal
  const [showManualIssue, setShowManualIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ full_name: '', email: '', ticket_type: 'Vé Vãng Lai' });
  const [issueLoading, setIssueLoading] = useState(false);

  // Refs for continuous video frame processing
  // Permanent DOM video ref ensures it's never null when mounting streams
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Refs for Anti-Duplicate (Debounce / Cooldown Lock)
  const scannedCooldownMap = useRef<Map<string, number>>(new Map());
  const isProcessingRef = useRef<boolean>(false);
  const resumeScanningAtRef = useRef<number>(0);

  // ── Web Audio API Feedback ───────────────────────────────────────────────
  const playFeedbackSound = useCallback(
    (type: 'SUCCESS' | 'ALREADY_USED' | 'INVALID') => {
      if (!soundEnabled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'SUCCESS') {
          // Thành công: Beep 800Hz, 150ms
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        } else {
          // Thất bại / Đã dùng / Sai mã: Buzzer 300Hz, 400ms
          osc.type = type === 'ALREADY_USED' ? 'sawtooth' : 'square';
          osc.frequency.setValueAtTime(300, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        }
      } catch (err) {
        console.warn('Web Audio API playback failed:', err);
      }
    },
    [soundEnabled]
  );

  // ── Verify Token (Backend API) ───────────────────────────────────────────
  const handleVerifyToken = useCallback(
    async (tokenToVerify: string, isAutoScan: boolean = false) => {
      const token = tokenToVerify.trim();
      if (!token) {
        isProcessingRef.current = false;
        return;
      }

      setLoading(true);
      if (isAutoScan) {
        setScanStatus('DETECTED');
      }

      try {
        const res = await apiService.verifyCheckInToken(token);
        setResult(res);
        playFeedbackSound(res.status);

        // Prepend latest check-in to top of recent scans
        setRecentScans((prev) => [res, ...prev.slice(0, 19)]);

        if (res.status === 'SUCCESS') {
          toast.success(res.message || 'Check-in thành công!');
        } else if (res.status === 'ALREADY_USED') {
          toast.warning(res.message || 'Vé đã được check-in trước đó!');
        } else {
          toast.error(res.message || 'Mã vé không hợp lệ!');
        }
      } catch (error) {
        console.error('Check-in error:', error);
        const fallbackError: CheckInResult = {
          status: 'INVALID',
          message: 'Lỗi kết nối máy chủ xác thực mã vé!',
          token: token,
        };
        setResult(fallbackError);
        playFeedbackSound('INVALID');
        setRecentScans((prev) => [fallbackError, ...prev.slice(0, 19)]);
        toast.error('Lỗi kết nối máy chủ xác thực!');
      } finally {
        setLoading(false);

        if (isAutoScan) {
          setScanStatus('PAUSED');
          resumeScanningAtRef.current = Date.now() + 1500;
          setTimeout(() => {
            isProcessingRef.current = false;
            setScanStatus('SCANNING');
            setCooldownNotice(null);
          }, 1500);
        } else {
          isProcessingRef.current = false;
        }
      }
    },
    [playFeedbackSound]
  );

  // ── Continuous Auto-Scan Frame Processor (jsQR) ──────────────────────────
  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const rawToken = code.data.trim();
        const now = Date.now();

        // Anti-Duplicate 3s Cooldown Lock
        const lastScanned = scannedCooldownMap.current.get(rawToken);
        if (lastScanned && now - lastScanned < 3000) {
          const remainingSec = Math.ceil((3000 - (now - lastScanned)) / 1000);
          setCooldownNotice(`Mã vừa quét — Chống quét trùng (${remainingSec}s)`);
        } else if (!isProcessingRef.current && now >= resumeScanningAtRef.current) {
          scannedCooldownMap.current.set(rawToken, now);
          isProcessingRef.current = true;
          setCooldownNotice(null);

          // Purge cooldown entries older than 10 seconds
          for (const [t, ts] of scannedCooldownMap.current.entries()) {
            if (now - ts > 10000) scannedCooldownMap.current.delete(t);
          }

          handleVerifyToken(rawToken, true);
        }
      }
    }

    // Keep loop active
    animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleVerifyToken]);

  // ── Camera Fallback Constraints Helper (Task 28 Requirement 2) ───────────
  const getMediaStreamWithFallback = async (
    preferFront: boolean = false
  ): Promise<{ stream: MediaStream; isFront: boolean }> => {
    const primaryMode = preferFront ? 'user' : { ideal: 'environment' };
    const secondaryMode = preferFront ? { ideal: 'environment' } : 'user';

    // Level 1: Primary camera with ideal resolution
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: primaryMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      return { stream, isFront: preferFront };
    } catch (err: unknown) {
      const errorName = (err as { name?: string }).name;
      // Do not fallback on hard permissions / device in-use errors
      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        errorName === 'NotReadableError' ||
        errorName === 'TrackStartError'
      ) {
        throw err;
      }
      console.warn('Level 1 camera constraints failed, attempting fallback...', err);
    }

    // Level 2: Alternate facing mode camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: secondaryMode,
        },
        audio: false,
      });
      return { stream, isFront: !preferFront };
    } catch (err: unknown) {
      const errorName = (err as { name?: string }).name;
      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        errorName === 'NotReadableError' ||
        errorName === 'TrackStartError'
      ) {
        throw err;
      }
      console.warn('Level 2 camera constraints failed, attempting generic video...', err);
    }

    // Level 3: Generic basic video constraint
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    return { stream, isFront: false };
  };

  // ── Friendly Error Messages (Task 28 Requirement 2) ──────────────────────
  const getReadableCameraErrorMessage = (err: unknown): string => {
    const error = err as { name?: string; message?: string };
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Trình duyệt chưa được cấp quyền Camera. Vui lòng bấm vào biểu tượng camera/ổ khóa trên thanh địa chỉ để cấp quyền.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Camera đang bị chiếm giữ bởi ứng dụng khác (Zoom, Teams, Meet, v.v.) hoặc lỗi phần cứng. Vui lòng đóng các app đó rồi thử lại.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'Không tìm thấy thiết bị Camera nào trên máy này. Vui lòng cắm webcam hoặc dùng tính năng nhập mã thủ công.';
      case 'OverconstrainedError':
        return 'Độ phân giải hoặc cấu hình camera yêu cầu không tương thích với thiết bị của bạn.';
      default:
        return error.message || 'Không thể khởi động camera. Vui lòng kiểm tra quyền và thử lại.';
    }
  };

  // ── Camera Cleanup Lifecycle (Task 28 Requirement 1) ─────────────────────
  const stopCamera = useCallback(() => {
    // 1. Cancel requestAnimationFrame
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    // 2. Stop all active media tracks completely
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.warn('Error stopping media track:', e);
      }
      mediaStreamRef.current = null;
    }

    // 3. Detach stream from video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn('Error clearing video srcObject:', e);
      }
    }

    setCameraActive(false);
    setScanStatus('IDLE');
    setCooldownNotice(null);
    isProcessingRef.current = false;
  }, []);

  // ── Camera Startup (Task 28 Requirement 1, 2, 3) ─────────────────────────
  const startCamera = async (flipCamera: boolean = false) => {
    // Crucial: Thoroughly stop and release any pre-existing media stream first
    stopCamera();

    const targetFront = flipCamera ? !usingFrontCamera : usingFrontCamera;

    try {
      setCameraLoading(true);
      setCameraError(null);

      // Acquire stream with hierarchical fallback
      const { stream, isFront } = await getMediaStreamWithFallback(targetFront);
      mediaStreamRef.current = stream;
      setUsingFrontCamera(isFront);

      // Attach stream to permanent video DOM element
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;

        // Wait until video has loaded metadata before playing to avoid black screen
        await new Promise<void>((resolve) => {
          const onLoaded = async () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            try {
              await video.play();
            } catch (playErr) {
              console.warn('Video play warning:', playErr);
            }
            resolve();
          };

          if (video.readyState >= 1) {
            video.play().catch(console.warn);
            resolve();
          } else {
            video.addEventListener('loadedmetadata', onLoaded);
          }
        });
      }

      setCameraActive(true);
      setScanStatus('SCANNING');
      isProcessingRef.current = false;
      resumeScanningAtRef.current = 0;

      // Kick off continuous RAF scan loop
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
      toast.success('Đã kích hoạt Camera quét QR thành công!');
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      const friendlyMsg = getReadableCameraErrorMessage(err);
      setCameraError(friendlyMsg);
      toast.error(friendlyMsg, { duration: 6000 });
      stopCamera();
    } finally {
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ── Form Handlers ────────────────────────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      handleVerifyToken(manualToken.trim(), false);
      setManualToken('');
    }
  };

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
      toast.success(res.message || 'Cấp vé thành công!');
      setIssueForm({ full_name: '', email: '', ticket_type: 'Vé Vãng Lai' });
      setShowManualIssue(false);
    } catch {
      toast.error('Không thể cấp vé. Vui lòng thử lại.');
    } finally {
      setIssueLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <QrCode className="w-5 h-5 text-indigo-600" />
            </div>
            {t('checkin.title', { defaultValue: 'Soát Vé Check-in QR Code' })}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {t('checkin.subtitle', {
              defaultValue:
                'Chế độ tự động quét liên tục (Continuous Auto-Scan) rảnh tay kết hợp chống quét trùng 3 giây.',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sound Toggle Button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title={soundEnabled ? 'Đang bật âm thanh (Beep/Buzzer)' : 'Đã tắt âm thanh'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span>{soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</span>
          </button>

          {canIssueManual && (
            <button
              onClick={() => setShowManualIssue(true)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl border text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {t('checkin.manualIssue', { defaultValue: 'Cấp Vé Tại Chỗ' })}
            </button>
          )}
        </div>
      </div>

      {/* Manual Issue Modal */}
      {showManualIssue && canIssueManual && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-[95vw] sm:max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                {t('checkin.manualIssue', { defaultValue: 'Cấp Vé Tại Chỗ' })}
              </h3>
              <button
                type="button"
                onClick={() => setShowManualIssue(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualIssue} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('auth.fullName', { defaultValue: 'Họ và tên' })}
                  </label>
                  <input
                    type="text"
                    value={issueForm.full_name}
                    onChange={(e) => setIssueForm({ ...issueForm, full_name: e.target.value })}
                    placeholder={t('auth.fullNamePlaceholder', { defaultValue: 'Nguyễn Văn A...' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('auth.email', { defaultValue: 'Địa chỉ Email' })}
                  </label>
                  <input
                    type="email"
                    value={issueForm.email}
                    onChange={(e) => setIssueForm({ ...issueForm, email: e.target.value })}
                    placeholder={t('auth.emailPlaceholder', { defaultValue: 'email@example.com...' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('checkin.ticketType', { defaultValue: 'Loại Vé' })}
                  </label>
                  <select
                    value={issueForm.ticket_type}
                    onChange={(e) => setIssueForm({ ...issueForm, ticket_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="Vé Vãng Lai">Vé Vãng Lai (Walk-in)</option>
                    <option value="Vé Tiêu Chuẩn">Vé Tiêu Chuẩn (Standard)</option>
                    <option value="Vé VIP">Vé VIP (All-Access Pass)</option>
                    <option value="Vé Diễn Giả">Vé Diễn Giả (Speaker)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowManualIssue(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-xs font-semibold text-slate-700 border-slate-200 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {t('common.cancel', { defaultValue: 'Hủy bỏ' })}
                </button>
                <button
                  type="submit"
                  disabled={issueLoading || !issueForm.full_name.trim() || !issueForm.email.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  {issueLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {t('checkin.manualIssue', { defaultValue: 'Cấp Vé Tại Chỗ' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Scanner & Manual Input */}
        <div className="lg:col-span-7 space-y-4">
          {/* Camera Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  }`}
                />
                <span className="text-xs font-bold text-slate-900">
                  {cameraActive
                    ? 'Chế độ Auto-Scan Liên Tục (Hands-free)'
                    : 'Camera Scanner'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Flip Camera Button when active */}
                {cameraActive && (
                  <button
                    type="button"
                    onClick={() => startCamera(true)}
                    disabled={cameraLoading}
                    className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    title="Đổi camera trước / sau"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Đổi Camera</span>
                  </button>
                )}

                <button
                  onClick={cameraActive ? stopCamera : () => startCamera(false)}
                  disabled={cameraLoading}
                  className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs ${
                    cameraActive
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {cameraLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {cameraActive
                    ? t('checkin.turnCameraOff', { defaultValue: 'Tắt Camera' })
                    : t('checkin.turnCameraOn', { defaultValue: 'Kích hoạt Camera' })}
                </button>
              </div>
            </div>

            {/* Viewport Box (Task 28 Requirement 3: Permanent DOM video container prevents black screen) */}
            <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center group shadow-inner">
              {/* Permanent video element ensures videoRef is always mounted and ready */}
              <video
                ref={videoRef}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraActive ? 'opacity-100 block' : 'opacity-0 pointer-events-none absolute'
                }`}
                playsInline
                muted
                autoPlay
              />

              {cameraActive ? (
                <>
                  {/* Laser Scanline Animation */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-[scanline_2.2s_ease-in-out_infinite] pointer-events-none" />

                  {/* Viewfinder Target Reticle */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
                    <div
                      className={`w-64 h-64 sm:w-72 sm:h-72 border-2 rounded-2xl relative transition-all duration-300 ${
                        scanStatus === 'DETECTED'
                          ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.4)] scale-102'
                          : scanStatus === 'PAUSED'
                          ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                          : 'border-white/30'
                      }`}
                    >
                      {/* Corner Accents */}
                      <span className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-cyan-400 rounded-tl-lg" />
                      <span className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-cyan-400 rounded-tr-lg" />
                      <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-cyan-400 rounded-bl-lg" />
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-cyan-400 rounded-br-lg" />

                      {/* Center Crosshair */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 border border-white/40 rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Overlay Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {usingFrontCamera ? 'Camera Trước (User)' : 'Camera Sau (Environment)'}
                    </span>

                    {scanStatus === 'PAUSED' && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-slate-950 text-[11px] font-black flex items-center gap-1.5 animate-pulse shadow-md">
                        <Clock className="w-3.5 h-3.5" />
                        Sẵn sàng sau 1.5s
                      </span>
                    )}

                    {scanStatus === 'DETECTED' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-black flex items-center gap-1.5 animate-bounce shadow-md">
                        <Check className="w-3.5 h-3.5" />
                        Đã bắt được mã!
                      </span>
                    )}
                  </div>

                  {/* Cooldown Alert Toast Banner on Camera */}
                  {cooldownNotice && (
                    <div className="absolute bottom-3 inset-x-3 text-center pointer-events-none animate-in fade-in slide-in-from-bottom-2">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-amber-500/40 text-amber-300 text-[11px] font-bold shadow-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        {cooldownNotice}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8 space-y-3 z-10 animate-in fade-in duration-150">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-400 shadow-sm">
                    <QrCode className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">
                      {t('checkin.noCamera', { defaultValue: 'Camera đang ở trạng thái tắt' })}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Bấm nút bên dưới để mở camera và quét mã vé tự động liên tục không cần thao tác tay.
                    </p>
                  </div>

                  {cameraError && (
                    <div className="max-w-md mx-auto p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium text-left flex items-start gap-2.5 shadow-md">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-rose-200">Không thể kết nối camera</p>
                        <p className="text-rose-300/90 leading-relaxed">{cameraError}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => startCamera(false)}
                    disabled={cameraLoading}
                    className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 mx-auto"
                  >
                    {cameraLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    {t('checkin.activateCamera', { defaultValue: 'Kích hoạt Camera' })}
                  </button>
                </div>
              )}
            </div>

            {/* Test Tokens */}
            <div className="w-full mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {t('checkin.testTokens', { defaultValue: 'Mẫu Token thử nghiệm nhanh (Demo):' })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleVerifyToken('QR-TOKEN-EVENTHUB-VALID-01', false)}
                  className="px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold text-center hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  🟢 {t('checkin.valid', { defaultValue: 'HỢP LỆ' })}
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyToken('QR-TOKEN-EVENTHUB-001', false)}
                  className="px-2.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold text-center hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  🟡 {t('checkin.alreadyUsed', { defaultValue: 'ĐÃ SỬ DỤNG' })}
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyToken('INVALID-TOKEN-999', false)}
                  className="px-2.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold text-center hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  🔴 {t('checkin.invalid', { defaultValue: 'KHÔNG HỢP LỆ' })}
                </button>
              </div>
            </div>
          </div>

          {/* Manual Input Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
                {t('checkin.manualInput', { defaultValue: 'Nhập Mã Thủ Công' })}
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder={t('checkin.manualPlaceholder', {
                    defaultValue: 'Nhập mã token vé (VD: QR-EVENTHUB-xxxx)...',
                  })}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 min-h-[44px] text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={loading || !manualToken.trim()}
                  className="px-5 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors shrink-0"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Keyboard className="w-4 h-4" />
                      {t('checkin.checkTicket', { defaultValue: 'Kiểm Tra' })}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Result Card & Recent History */}
        <div className="lg:col-span-5 space-y-4">
          {/* Result Card */}
          {result ? (
            <div
              className={`rounded-2xl p-6 border transition-all duration-300 shadow-md ${
                result.status === 'SUCCESS'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : result.status === 'ALREADY_USED'
                  ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                  : 'bg-rose-50/90 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {result.status === 'SUCCESS' && (
                    <CheckCircle2 className="w-9 h-9 text-emerald-600 shrink-0" />
                  )}
                  {result.status === 'ALREADY_USED' && (
                    <AlertTriangle className="w-9 h-9 text-amber-600 shrink-0" />
                  )}
                  {result.status === 'INVALID' && (
                    <XCircle className="w-9 h-9 text-rose-600 shrink-0" />
                  )}
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs ${
                        result.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : result.status === 'ALREADY_USED'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {result.status === 'SUCCESS' && (t('checkin.valid') || 'HỢP LỆ')}
                      {result.status === 'ALREADY_USED' && (t('checkin.alreadyUsed') || 'ĐÃ SỬ DỤNG')}
                      {result.status === 'INVALID' && (t('checkin.invalid') || 'KHÔNG TỒN TẠI')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                      {result.token}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {result.message}
                  </h3>

                  {/* Details block */}
                  {(result.participantName || result.ticketType || result.checkInTime) && (
                    <div className="bg-white/95 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs shadow-xs mt-2">
                      {result.participantName && (
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            Người tham dự:
                          </span>
                          <strong className="text-slate-900 font-bold truncate max-w-[180px]">
                            {result.participantName}
                          </strong>
                        </div>
                      )}

                      {result.ticketType && (
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                            Loại vé:
                          </span>
                          <span className="text-indigo-700 font-bold">{result.ticketType}</span>
                        </div>
                      )}

                      {result.eventTitle && (
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            Sự kiện / Phiên:
                          </span>
                          <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                            {result.eventTitle}
                          </span>
                        </div>
                      )}

                      {result.checkInTime && (
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            Thời gian:
                          </span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {result.checkInTime}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 shadow-sm">
              <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 mt-2">
                {t('checkin.waitingScan', { defaultValue: 'Chờ quét mã vé' })}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('checkin.resultHere', {
                  defaultValue: 'Kết quả xác thực và thông tin người tham dự sẽ xuất hiện tại đây.',
                })}
              </p>
            </div>
          )}

          {/* Recent Scans History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                {t('checkin.recentScans', { defaultValue: 'Lịch Sử Quét Gần Đây' })}
                <span className="px-1.5 py-0.2 bg-slate-100 rounded-md text-slate-500 text-[10px] font-mono">
                  {recentScans.length}
                </span>
              </h4>

              {recentScans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecentScans([])}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Xóa lịch sử quét"
                >
                  <Trash2 className="w-3 h-3" />
                  Xóa
                </button>
              )}
            </div>

            {recentScans.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 divide-y divide-slate-100">
                {recentScans.map((scan, idx) => (
                  <div
                    key={`${scan.token}-${idx}`}
                    className="pt-2 first:pt-0 pb-1 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {scan.status === 'SUCCESS' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {scan.status === 'ALREADY_USED' && (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      {scan.status === 'INVALID' && (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {scan.participantName || scan.token || 'Khách tham dự'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          {scan.ticketType || scan.message}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {scan.checkInTime || 'Vừa xong'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400">
                <Sparkles className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <p className="text-xs font-medium">
                  {t('checkin.noScans', { defaultValue: 'Chưa có lượt quét nào gần đây' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
