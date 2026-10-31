import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertTriangle, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

export const Unsubscribe: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValidToken, setIsValidToken] = useState<boolean>(false);
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [campaignName, setCampaignName] = useState<string>('');
  const [isAlreadyUnsubscribed, setIsAlreadyUnsubscribed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [reason, setReason] = useState<string>('Không còn nhu cầu nhận tin');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUnsubscribedSuccess, setIsUnsubscribedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorMessage('Không tìm thấy mã token xác thực hủy đăng ký.');
      return;
    }

    const fetchInfo = async () => {
      try {
        const info = await apiService.getUnsubscribeInfo(token);
        setIsValidToken(info.valid);
        setMaskedEmail(info.masked_email);
        setCampaignName(info.campaign_name);
        setIsAlreadyUnsubscribed(info.is_already_unsubscribed);
      } catch (err: any) {
        setIsValidToken(false);
        setErrorMessage(
          err.response?.data?.detail || 'Mã token hủy đăng ký không hợp lệ hoặc đã hết hạn.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchInfo();
  }, [token]);

  const handleConfirmUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    try {
      await apiService.unsubscribeRecipient({ token, reason });
      setIsUnsubscribedSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || 'Có lỗi xảy ra khi hủy đăng ký. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-600/20 mb-3">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          EventHub <span className="text-indigo-600">AI</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Cài Đặt Quyền Riêng Tư & Hủy Nhận Bản Tin Truyền Thông
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-3xl sm:px-10">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Đang xác thực liên kết bảo mật...
              </p>
            </div>
          ) : isUnsubscribedSuccess ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Đã Hủy Đăng Ký Thành Công
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Địa chỉ email <strong className="text-slate-800">{maskedEmail}</strong> đã được loại khỏi danh sách nhận thư truyền thông của EventHub AI.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                💡 Lưu ý: Bạn vẫn sẽ nhận được các email xác nhận vé sự kiện hoặc mã QR check-in khi chủ động đặt vé trên hệ thống.
              </div>
              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Quay về trang chủ EventHub AI
                </Link>
              </div>
            </div>
          ) : isAlreadyUnsubscribed ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Email Đã Ở Trạng Thái Hủy Nhận Tin
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Địa chỉ <strong className="text-slate-800">{maskedEmail}</strong> đã được hủy nhận các chiến dịch quảng bá trước đó.
              </p>
              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Về trang chủ
                </Link>
              </div>
            </div>
          ) : !isValidToken ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Liên Kết Không Khả Dụng
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {errorMessage || 'Liên kết hủy đăng ký này không hợp lệ hoặc đã hết hạn bảo mật.'}
              </p>
              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Về trang chủ EventHub AI
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmUnsubscribe} className="space-y-5">
              <div className="text-center space-y-1.5 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Xác Nhận Hủy Nhận Tin
                </h3>
                <p className="text-xs text-slate-500">
                  Chiến dịch: <span className="font-semibold text-slate-700">{campaignName}</span>
                </p>
                <p className="text-xs text-slate-700">
                  Email: <span className="font-bold text-indigo-600">{maskedEmail}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Lý do bạn không muốn nhận tin (tùy chọn):
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 font-medium"
                >
                  <option value="Không còn nhu cầu nhận tin">Không còn nhu cầu nhận tin</option>
                  <option value="Email gửi quá thường xuyên">Email gửi quá thường xuyên</option>
                  <option value="Nội dung không phù hợp quan tâm">Nội dung không phù hợp quan tâm</option>
                  <option value="Tôi chưa từng đăng ký nhận tin này">Tôi chưa từng đăng ký nhận tin này</option>
                  <option value="Khác">Lý do khác</option>
                </select>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Xác Nhận Hủy Nhận Thư Truyền Thông'
                  )}
                </button>
                <Link
                  to="/"
                  className="w-full py-2 px-4 rounded-xl text-center block text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Bỏ qua & Quay về trang chủ
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unsubscribe;
