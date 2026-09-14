import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.32 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { googleLogin, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPopupLoading, setIsPopupLoading] = useState(false);

  // Official Google OAuth 2.0 Popup Handler via @react-oauth/google
  const triggerGooglePopup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsPopupLoading(true);
      setErrorMsg('');
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        if (!userInfoRes.ok) {
          throw new Error('Không thể tải thông tin từ Google UserInfo API');
        }
        const profile = await userInfoRes.json();
        if (profile?.email) {
          const success = await googleLogin({
            email: profile.email,
            full_name: profile.name || profile.given_name || profile.email.split('@')[0],
            avatar_url: profile.picture,
          });
          if (success) {
            onClose();
            if (onSuccess) onSuccess();
            else navigate('/events', { replace: true });
          }
        } else {
          setErrorMsg('Tài khoản Google không cung cấp thông tin Email');
        }
      } catch (err: unknown) {
        console.error('Google OAuth Popup error:', err);
        const msg = err instanceof Error ? err.message : 'Đăng nhập Google thất bại';
        setErrorMsg(msg);
      } finally {
        setIsPopupLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.warn('Google Popup closed or error:', errorResponse);
      setErrorMsg('Cửa sổ Google Popup bị đóng hoặc chưa cấu hình Client ID hợp lệ.');
    },
  });

  if (!isOpen) return null;

  const handleQuickSelect = (demoEmail: string, name: string) => {
    setEmail(demoEmail);
    setFullName(name);
    setErrorMsg('');
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Email Google hợp lệ (@gmail.com)');
      return;
    }

    const name = fullName.trim() || trimmedEmail.split('@')[0];

    try {
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedEmail)}`;
      const success = await googleLogin({
        email: trimmedEmail,
        full_name: name,
        avatar_url: avatar,
      });

      if (success) {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/events', { replace: true });
        }
      } else {
        setErrorMsg('Xác thực tài khoản Google không thành công.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ Google OAuth';
      setErrorMsg(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-[95vw] sm:max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Fixed Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800 shrink-0 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <GoogleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Đăng Nhập Google OAuth 2.0</h3>
              <p className="text-[11px] text-slate-400">Thu thập Email thực gửi vé QR &amp; thông báo sự kiện</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
          {/* Info notice */}
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs text-indigo-200/90 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-slate-300">
            Tài khoản Google mới sẽ được tự động cấp quyền <strong className="text-indigo-300">Khách Tham Dự (Participant)</strong> để nhận vé QR Code và lịch nhắc sự kiện qua email.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/70 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google OAuth 2.0 Standard Popup Button */}
        <div>
          <button
            type="button"
            disabled={isPopupLoading || isLoading}
            onClick={() => triggerGooglePopup()}
            className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group border border-slate-200"
          >
            <GoogleIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>
              {isPopupLoading ? 'Đang mở cửa sổ Google...' : 'Mở Cửa Sổ Google OAuth Popup'}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
            Hoặc chọn / nhập tài khoản
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Quick select Google Accounts */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Gợi ý Email Google nhanh:
          </label>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickSelect('participant@gmail.com', 'Alex Participant')}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                  AP
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    Alex Participant
                  </div>
                  <div className="text-[10px] text-slate-400">participant@gmail.com</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-medium">
                Khách mới
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickSelect('attendee@eventhub.ai', 'Attendee User')}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-purple-600/20 text-purple-300 font-bold text-xs flex items-center justify-center border border-purple-500/30">
                  AU
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                    Attendee User
                  </div>
                  <div className="text-[10px] text-slate-400">attendee@eventhub.ai</div>
                </div>
              </div>
              <span className="text-[10px] text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full font-medium">
                Đã có trong DB
              </span>
            </button>
          </div>
        </div>

        {/* Input form */}
        <form onSubmit={handleGoogleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Địa chỉ Gmail của bạn
            </label>
            <input
              type="email"
              required
              placeholder="tenban@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Họ và Tên hiển thị
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Hoàng Minh Trí"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 min-h-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
                Đang kết nối Google...
              </span>
            ) : (
              <>
                <GoogleIcon className="w-4 h-4" />
                Đăng Nhập Với Tài Khoản Google Này <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};
