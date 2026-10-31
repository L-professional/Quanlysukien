import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserCheck, QrCode, Shield, Phone, Mail,
  CheckCircle, Plus, RefreshCw, X, Award, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { Event, ManagerStaffItem } from '../types';

export const ManagerStaff: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [staffList, setStaffList] = useState<ManagerStaffItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);

  // Form states
  const [selectedStaffUser, setSelectedStaffUser] = useState<number>(0);
  const [assignedRole, setAssignedRole] = useState<string>('CHECKIN_STAFF');
  const [assignedTask, setAssignedTask] = useState<string>('Soát vé QR tại cổng chính A');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const evList = await apiService.getManagerEvents();
        setEvents(evList);
        if (evList.length > 0) {
          setSelectedEventId(evList[0].id);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách sự kiện:', err);
        toast.error('Không thể tải danh sách sự kiện');
      }
    };
    fetchEvents();
  }, []);

  // Fetch staff
  const fetchStaffData = async (eventId: number | null) => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiService.getManagerStaff(eventId);
      setStaffList(data);
      if (data.length > 0 && !selectedStaffUser) {
        setSelectedStaffUser(data[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách nhân viên:', err);
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData(selectedEventId);
  }, [selectedEventId]);

  // Handle assign staff submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !selectedStaffUser) {
      toast.error('Vui lòng chọn nhân viên và sự kiện');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiService.assignManagerStaff({
        event_id: selectedEventId,
        user_id: selectedStaffUser,
        assigned_role: assignedRole,
        assigned_task: assignedTask,
      });
      if (res.success) {
        toast.success(res.message);
        setIsAssignModalOpen(false);
        fetchStaffData(selectedEventId);
      }
    } catch (err) {
      console.error('Lỗi phân công nhân viên:', err);
      toast.error('Không thể cập nhật phân công nhân viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Staff summary stats
  const totalScans = useMemo(() => {
    return staffList.reduce((acc, s) => acc + (s.scanned_count || 0), 0);
  }, [staffList]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              Quản Lý Sự Kiện
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Nhân Sự Vận Hành</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Phân Công & Giám Sát Nhân Viên Vận Hành
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Giao phó vị trí soát vé QR, điều phối lễ tân tiếp đón và theo dõi năng suất thông cổng thực tế.
          </p>
        </div>

        {/* Event selector & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Sự kiện:
            </label>
            <select
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Phân Công Nhiệm Vụ
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng nhân viên vận hành</p>
            <h3 className="text-2xl font-bold text-slate-900">{staffList.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Nhân viên đang trực tuyến</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {staffList.filter((s) => s.is_active).length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Lượt quét QR thực hiện</p>
            <h3 className="text-2xl font-bold text-slate-900">{totalScans}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Năng suất bình quân</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {staffList.length > 0 ? Math.round(totalScans / staffList.length) : 0} lượt/người
            </h3>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Đang đồng bộ dữ liệu nhân sự...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Chưa có nhân viên nào</h3>
            <p className="text-xs text-slate-400 mt-1">
              Chưa có nhân viên nào được phân công điều phối cho sự kiện này.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Nhân Viên Vận Hành</th>
                  <th className="px-6 py-4">Liên Hệ</th>
                  <th className="px-6 py-4">Nhiệm Vụ Phân Công</th>
                  <th className="px-6 py-4">Trạng Thái Trực</th>
                  <th className="px-6 py-4">Hiệu Suất Quét QR</th>
                  <th className="px-6 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{st.full_name}</div>
                      <div className="text-xs text-slate-400">ID: #{st.id}</div>
                    </td>

                    <td className="px-6 py-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{st.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{st.phone_number || '—'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-md border border-amber-200">
                        {st.assigned_task}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {st.is_active ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Đang trực
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md w-fit">
                          Ngoại tuyến
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-slate-900">{st.scanned_count}</span>
                        <span className="text-xs text-slate-400">lượt thành công</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedStaffUser(st.id);
                          setAssignedTask(st.assigned_task);
                          setIsAssignModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                      >
                        Đổi nhiệm vụ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Phân Công Nhiệm Vụ Nhân Viên</h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn nhân viên vận hành <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStaffUser}
                  onChange={(e) => setSelectedStaffUser(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vai trò phân công
                </label>
                <select
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="CHECKIN_STAFF">Nhân viên soát vé QR (Check-in Staff)</option>
                  <option value="RECEPTIONIST">Lễ tân tiếp đón & Hướng dẫn (Receptionist)</option>
                  <option value="HALL_COORDINATOR">Điều phối hội trường (Hall Coordinator)</option>
                  <option value="TECHNICAL_SUPPORT">Hỗ trợ kỹ thuật & Âm thanh (AV Support)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả nhiệm vụ cụ thể <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Soát vé QR tại Cửa A - Sảnh chính"
                  value={assignedTask}
                  onChange={(e) => setAssignedTask(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Lưu Phân Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
