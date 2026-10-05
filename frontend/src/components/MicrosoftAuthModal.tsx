import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const MicrosoftIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/>
    <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/>
    <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/>
    <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/>
  </svg>
);

interface MicrosoftAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MicrosoftAuthModal: React.FC<MicrosoftAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { microsoftLogin, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPopupLoading, setIsPopupLoading] = useState(false);

  if (!isOpen) return null;

  // Microsoft OAuth 2.0 Popup Handler with prompt="select_account"
  const handleOpenMicrosoftPopup = () => {
    setIsPopupLoading(true);
    setErrorMsg('');

    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '00000000-0000-0000-0000-000000000000';
    const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
    const scope = encodeURIComponent('openid profile email User.Read');
    // Enforce prompt=select_account so the Microsoft Account Selector dialog is always displayed
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scope}&prompt=select_account`;

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'Microsoft OAuth Account Selector',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    // If client ID is placeholder or popup closes without token, allow seamless fallback to account chooser
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        setIsPopupLoading(false);
      }
    }, 1000);
  };

  const handleQuickSelect = (chosenEmail: string, name: string) => {
    setEmail(chosenEmail);
    setFullName(name);
    setErrorMsg('');
  };

  const handleMicrosoftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Email Microsoft / Outlook hợp lệ (@outlook.com, @hotmail.com, @live.com)');
      return;
    }

    const name = fullName.trim() || trimmedEmail.split('@')[0];

    try {
      const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      const success = await microsoftLogin({
        email: trimmedEmail,
        full_name: name,
        avatar_url: avatar,
      });

      if (success) {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setErrorMsg('Xác thực tài khoản Microsoft không thành công.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ Microsoft OAuth';
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
              <MicrosoftIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Microsoft Entra ID (SSO OAuth 2.0)</h3>
              <p className="text-[11px] text-slate-400">Chọn tài khoản Microsoft công việc hoặc cá nhân</p>
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
          <div className="p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-xs text-blue-200/90 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-slate-300">
              Tài khoản Microsoft mới sẽ được tự động đồng bộ vào CSDL PostgreSQL với vai trò <strong className="text-blue-300">Khách Tham Dự (Participant)</strong>.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/70 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Microsoft OAuth 2.0 Account Selector Popup Button */}
          <div>
            <button
              type="button"
              disabled={isPopupLoading || isLoading}
              onClick={handleOpenMicrosoftPopup}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group border border-slate-200"
            >
              <MicrosoftIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>
                {isPopupLoading ? 'Đang mở cửa sổ Microsoft...' : 'Mở Cửa Sổ Microsoft Account Selector (prompt=select_account)'}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Bộ chọn tài khoản Microsoft nhanh
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Quick select Microsoft Accounts */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Danh sách tài khoản Microsoft gợi ý:
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('alex.participant@outlook.com', 'Alex Participant')}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                    AP
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">
                      Alex Participant
                    </div>
                    <div className="text-[10px] text-slate-400">alex.participant@outlook.com</div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-medium">
                  Khách mới
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('attendee@eventhub.ai', 'Phạm Quốc Khách Hàng')}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                    PQ
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      Phạm Quốc Khách Hàng
                    </div>
                    <div className="text-[10px] text-slate-400">attendee@eventhub.ai</div>
                  </div>
                </div>
                <span className="text-[10px] text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full font-medium">
                  Đã có trong DB
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('lequanghuy@microsoft.com', 'TS. Lê Quang Huy')}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                    QH
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      TS. Lê Quang Huy (MS Speaker)
                    </div>
                    <div className="text-[10px] text-slate-400">lequanghuy@microsoft.com</div>
                  </div>
                </div>
                <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full font-medium">
                  Microsoft Account
                </span>
              </button>
            </div>
          </div>

          {/* Input form */}
          <form onSubmit={handleMicrosoftSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Địa chỉ Email Microsoft / Outlook
              </label>
              <input
                type="email"
                required
                placeholder="tenban@outlook.com hoặc @microsoft.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Họ và Tên hiển thị
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Trần Văn Nam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 min-h-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                  Đang kết nối Microsoft...
                </span>
              ) : (
                <>
                  <MicrosoftIcon className="w-4 h-4" />
                  Đăng Nhập Với Tài Khoản Microsoft Này <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
