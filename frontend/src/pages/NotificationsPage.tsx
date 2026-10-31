import React, { useState, useEffect } from 'react';
import {
  Bell, CheckCircle, Info, AlertTriangle, AlertCircle,
  Clock, Trash2, CheckCheck, RefreshCw, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { NotificationItem } from '../types';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Lỗi tải thông báo:', err);
      toast.error('Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      toast.success('Đã đánh dấu thông báo là đã đọc');
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả:', err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'unread') return !n.is_read;
    if (filterType === 'alerts') return n.type === 'ALERT' || n.type === 'WARNING';
    if (filterType === 'inquiry') return n.type === 'INQUIRY_PENDING';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'ALERT':
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'ERROR':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              Trung Tâm Điều Hành
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Thông Báo</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Thông Báo & Cảnh Báo Vận Hành
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi dòng sự kiện, cảnh báo nghẽn soát vé, câu hỏi từ khách và trạng thái chiến dịch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <CheckCheck className="w-4 h-4" />
            Đọc tất cả
          </button>
          <button
            onClick={fetchNotifications}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
            filterType === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          onClick={() => setFilterType('unread')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
            filterType === 'unread'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Chưa đọc ({notifications.filter((n) => !n.is_read).length})
        </button>
        <button
          onClick={() => setFilterType('alerts')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
            filterType === 'alerts'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cảnh báo & Rủi ro
        </button>
        <button
          onClick={() => setFilterType('inquiry')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
            filterType === 'inquiry'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Hỏi đáp khách hàng
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Đang đồng bộ thông báo...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-100">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Không có thông báo mới</h3>
            <p className="text-xs text-slate-400 mt-1">
              Bạn đã cập nhật tất cả thông tin mới nhất của sự kiện.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                n.is_read
                  ? 'bg-white border-slate-100 opacity-80'
                  : 'bg-white border-blue-200 ring-1 ring-blue-100 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-slate-50 rounded-xl shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.link && (
                  <button
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id);
                      navigate(n.link!);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                  >
                    Xem chi tiết
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    title="Đánh dấu đã đọc"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
