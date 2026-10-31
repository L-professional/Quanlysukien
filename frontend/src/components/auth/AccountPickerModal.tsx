import React, { useState, useEffect } from 'react';
import { X, UserPlus, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  getSavedAccounts,
  saveAccountToHistory,
  removeAccountFromHistory,
  DeviceSavedAccount,
} from '../../utils/accountHistory';

export const GoogleLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
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

export const MicrosoftLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
    <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
    <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
    <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
  </svg>
);

export interface AccountPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  provider?: 'google' | 'microsoft';
}

export const AccountPickerModal: React.FC<AccountPickerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  provider = 'google',
}) => {
  const { googleLogin, microsoftLogin } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<DeviceSavedAccount[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');

  const isGoogleOAuthClientConfigured = (): boolean => {
    const id = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID || '';
    return (
      Boolean(id) &&
      !id.includes('YOUR_GOOGLE_CLIENT_ID') &&
      !id.includes('demo-eventhub-ai') &&
      !id.startsWith('000000') &&
      id.endsWith('.apps.googleusercontent.com')
    );
  };

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedAccounts();
      // Filter or sort so accounts matching current provider appear first
      const sorted = [...saved].sort((a, b) => {
        if (a.provider === provider && b.provider !== provider) return -1;
        if (a.provider !== provider && b.provider === provider) return 1;
        return (b.lastUsed || 0) - (a.lastUsed || 0);
      });
      setAccounts(sorted);
      setErrorMsg('');
      setSelectedEmail(null);
      setIsManualInputOpen(false);
    }
  }, [isOpen, provider]);

  // Google Native OAuth popup hook with prompt: 'select_account'
  const triggerGooglePopup = useGoogleLogin({
    prompt: 'select_account',
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
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
            saveAccountToHistory({
              email: profile.email,
              name: profile.name || profile.email.split('@')[0],
              avatar: profile.picture,
              provider: 'google',
              lastUsed: Date.now(),
            });
            onClose();
            if (onSuccess) onSuccess();
            else navigate('/dashboard', { replace: true });
          }
        }
      } catch (err: unknown) {
        console.error('Google popup OAuth error:', err);
        const msg = err instanceof Error ? err.message : 'Đăng nhập Google thất bại';
        setErrorMsg(msg);
      } finally {
        setIsLoading(false);
      }
    },
    onError: (err) => {
      console.warn('Google Popup closed or error:', err);
      setErrorMsg(
        'Cửa sổ Google Popup không thể kết nối hoặc Client ID chưa đăng ký domain localhost:3000 trên Google Cloud Console. Đã chuyển sang chế độ Chọn tài khoản Safe Fallback.'
      );
      setIsManualInputOpen(true);
      setIsLoading(false);
    },
  });

  const handleUseAnotherAccount = () => {
    if (isGoogle) {
      if (!isGoogleOAuthClientConfigured()) {
        console.warn(
          '[Auth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Safe fallback mode enabled for Account Picker.'
        );
        setIsManualInputOpen(true);
        setErrorMsg('Chế độ Safe Fallback: Vui lòng nhập địa chỉ Email hoặc chọn tài khoản có sẵn trên thiết bị.');
        return;
      }
      try {
        triggerGooglePopup();
      } catch (err) {
        console.warn('triggerGooglePopup error:', err);
        setIsManualInputOpen(true);
      }
    } else {
      handleMicrosoftNativePopup();
    }
  };

  // Microsoft Native OAuth popup handler with prompt: 'select_account'
  const handleMicrosoftNativePopup = () => {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '00000000-0000-0000-0000-000000000000';
    const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
    const scope = encodeURIComponent('openid profile email User.Read');
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

    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
      }
    }, 1000);
  };

  const handleSelectAccount = async (account: DeviceSavedAccount) => {
    setSelectedEmail(account.email);
    setIsLoading(true);
    setErrorMsg('');

    try {
      let success = false;
      if (account.provider === 'microsoft' || provider === 'microsoft') {
        success = await microsoftLogin({
          email: account.email,
          full_name: account.name,
          avatar_url: account.avatar,
        });
      } else {
        success = await googleLogin({
          email: account.email,
          full_name: account.name,
          avatar_url: account.avatar,
        });
      }

      if (success) {
        saveAccountToHistory({
          ...account,
          lastUsed: Date.now(),
        });
        onClose();
        if (onSuccess) onSuccess();
        else navigate('/dashboard', { replace: true });
      } else {
        setErrorMsg('Không thể đăng nhập với tài khoản này.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xác thực tài khoản thất bại';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
      setSelectedEmail(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = manualEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Email hợp lệ');
      return;
    }

    const cleanName = manualName.trim() || cleanEmail.split('@')[0];
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;

    setIsLoading(true);
    setErrorMsg('');
    try {
      let success = false;
      if (provider === 'microsoft' || cleanEmail.includes('outlook') || cleanEmail.includes('hotmail')) {
        success = await microsoftLogin({
          email: cleanEmail,
          full_name: cleanName,
          avatar_url: avatar,
        });
      } else {
        success = await googleLogin({
          email: cleanEmail,
          full_name: cleanName,
          avatar_url: avatar,
        });
      }

      if (success) {
        saveAccountToHistory({
          email: cleanEmail,
          name: cleanName,
          avatar,
          provider: provider,
          lastUsed: Date.now(),
        });
        onClose();
        if (onSuccess) onSuccess();
        else navigate('/dashboard', { replace: true });
      } else {
        setErrorMsg('Đăng nhập thất bại.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xác thực tài khoản thất bại';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    const updated = removeAccountFromHistory(email);
    setAccounts(updated);
  };

  if (!isOpen) return null;

  const isGoogle = provider === 'google';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-[820px] bg-white rounded-[28px] shadow-2xl border border-[#dadce0] overflow-hidden flex flex-col md:flex-row text-[#202124]"
        style={{ fontFamily: '"Roboto", "Google Sans", "Be Vietnam Pro", sans-serif' }}
      >
        {/* Close button top right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124] transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ═══ CỘT TRÁI (LEFT SPLIT VIEW) ═══ */}
        <div className="w-full md:w-[42%] p-8 md:p-10 flex flex-col justify-between bg-white shrink-0">
          <div>
            {/* Provider Logo */}
            <div className="flex items-center gap-3">
              {isGoogle ? (
                <GoogleLogoIcon className="w-9 h-9" />
              ) : (
                <MicrosoftLogoIcon className="w-8 h-8" />
              )}
            </div>

            {/* Big Title */}
            <h2 className="text-[28px] md:text-[32px] font-semibold text-[#202124] tracking-tight leading-tight mt-6">
              Chọn tài khoản
            </h2>

            {/* Subtitle */}
            <p className="text-[15px] text-[#5f6368] mt-2 font-normal leading-snug">
              để tiếp tục đến{' '}
              <span className="text-[#1a73e8] font-medium hover:underline cursor-pointer">
                eventai.id.vn
              </span>
            </p>
          </div>

          {/* Left Footer: Identity Security Guarantee */}
          <div className="hidden md:flex items-center gap-2 pt-6 text-[12px] text-[#5f6368] border-t border-[#f1f3f4]">
            <ShieldCheck className="w-4 h-4 text-[#1a73e8] shrink-0" />
            <span>Xác thực SSO OAuth 2.0 an toàn theo chuẩn {isGoogle ? 'Google' : 'Microsoft'}</span>
          </div>
        </div>

        {/* ═══ CỘT PHẢI (RIGHT SPLIT VIEW) ═══ */}
        <div className="w-full md:w-[58%] p-6 md:p-10 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[#dadce0] bg-white min-h-[380px]">
          <div className="space-y-1">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!isManualInputOpen ? (
              <>
                {/* Account list */}
                <div className="space-y-1 max-h-[290px] overflow-y-auto pr-1">
                  {accounts.map((acc) => {
                    const isSelected = selectedEmail === acc.email;
                    return (
                      <div
                        key={acc.email}
                        onClick={() => !isLoading && handleSelectAccount(acc)}
                        className={`group relative flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#e8f0fe]'
                            : 'hover:bg-[#f8f9fa] active:bg-[#f1f3f4]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Circular Avatar */}
                          {acc.avatar ? (
                            <img
                              src={acc.avatar}
                              alt={acc.name}
                              className="w-10 h-10 rounded-full object-cover border border-[#dadce0] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#1a73e8] text-white font-bold flex items-center justify-center text-sm shrink-0 uppercase">
                              {acc.name.charAt(0)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-[#202124] truncate group-hover:text-[#1a73e8] transition-colors">
                              {acc.name}
                            </div>
                            <div className="text-[12px] text-[#5f6368] truncate">
                              {acc.email}
                            </div>
                          </div>
                        </div>

                        {/* Right action / Status */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isSelected && isLoading ? (
                            <Sparkles className="w-4 h-4 animate-spin text-[#1a73e8]" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveAccount(e, acc.email)}
                              title="Xóa khỏi thiết bị này"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Divider Line */}
                <div className="my-2 border-b border-[#dadce0]" />

                {/* Option: Sử dụng một tài khoản khác */}
                <div
                  onClick={handleUseAnotherAccount}
                  className="group flex items-center justify-between p-3 rounded-2xl cursor-pointer hover:bg-[#f8f9fa] active:bg-[#f1f3f4] transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full border border-dashed border-[#dadce0] flex items-center justify-center text-[#5f6368] group-hover:border-[#1a73e8] group-hover:text-[#1a73e8] transition-colors shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-[#202124] group-hover:text-[#1a73e8] transition-colors">
                        Sử dụng một tài khoản khác
                      </div>
                      <div className="text-[11px] text-[#5f6368]">
                        Mở popup chính chủ {isGoogle ? 'Google' : 'Microsoft'} (prompt: select_account)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary manual input toggle */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setIsManualInputOpen(true)}
                    className="text-[12px] font-medium text-[#1a73e8] hover:underline cursor-pointer"
                  >
                    Hoặc nhập email trực tiếp →
                  </button>
                </div>
              </>
            ) : (
              /* Inline Manual Account Input Form */
              <form onSubmit={handleManualSubmit} className="space-y-3.5 py-1 animate-in fade-in">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[13px] font-semibold text-[#202124]">
                    Nhập tài khoản {isGoogle ? 'Google' : 'Microsoft'} mới
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsManualInputOpen(false)}
                    className="text-[12px] text-[#1a73e8] hover:underline"
                  >
                    ← Quay lại danh sách
                  </button>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#5f6368] mb-1">
                    Email đăng nhập
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={isGoogle ? 'vidu@gmail.com' : 'vidu@outlook.com'}
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#dadce0] rounded-xl text-[13px] text-[#202124] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#5f6368] mb-1">
                    Họ và Tên hiển thị
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Hoàng Minh Trí"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#dadce0] rounded-xl text-[13px] text-[#202124] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsManualInputOpen(false)}
                    className="px-4 py-2 text-[13px] font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 text-[13px] font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        Đang kết nối...
                      </span>
                    ) : (
                      <>
                        Tiếp theo
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Legal Footer Bottom of Right Column */}
          <div className="pt-6 border-t border-[#f1f3f4] mt-4">
            <p className="text-[11px] text-[#5f6368] leading-relaxed">
              Trước khi sử dụng EventAI, bạn có thể xem{' '}
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Chính sách quyền riêng tư của EventAI: Bảo vệ dữ liệu cá nhân & thông tin vé theo tiêu chuẩn bảo mật cao nhất.');
                }}
                className="text-[#1a73e8] hover:underline"
              >
                Chính sách quyền riêng tư
              </a>{' '}
              và{' '}
              <a
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Điều khoản dịch vụ của EventAI: Quy định sử dụng nền tảng và tham dự hội thảo, sự kiện.');
                }}
                className="text-[#1a73e8] hover:underline"
              >
                Điều khoản dịch vụ
              </a>{' '}
              của ứng dụng này.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPickerModal;
