import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Plus,
  Filter,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { apiService } from '../services/api';
import { StaffTaskItem } from '../types';
import { formatVietnamDateTime } from '../utils/formatters';

export const StaffTasks: React.FC = () => {
  const [tasks, setTasks] = useState<StaffTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedTask, setSelectedTask] = useState<StaffTaskItem | null>(null);
  const [actionModalType, setActionModalType] = useState<'COMPLETE' | 'BLOCK' | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, categoryFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStaffTasks({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      setTasks(data);
    } catch (err) {
      console.error('Error fetching staff tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (task: StaffTaskItem) => {
    try {
      await apiService.updateStaffTask(task.id, { status: 'IN_PROGRESS' });
      setToastMessage(`Đã chuyển nhiệm vụ "${task.title}" sang Đang thực hiện.`);
      fetchTasks();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error starting task:', err);
      alert('Không thể cập nhật trạng thái nhiệm vụ.');
    }
  };

  const handleOpenModal = (task: StaffTaskItem, type: 'COMPLETE' | 'BLOCK') => {
    setSelectedTask(task);
    setActionModalType(type);
    setNotesInput('');
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !actionModalType) return;

    try {
      setActionLoading(true);
      if (actionModalType === 'COMPLETE') {
        await apiService.updateStaffTask(selectedTask.id, {
          status: 'COMPLETED',
          completion_notes: notesInput || 'Đã hoàn tất nhiệm vụ theo quy trình.',
        });
        setToastMessage(`Đã đánh dấu hoàn thành nhiệm vụ "${selectedTask.title}".`);
      } else if (actionModalType === 'BLOCK') {
        await apiService.updateStaffTask(selectedTask.id, {
          status: 'BLOCKED',
          blocker_reason: notesInput || 'Gặp trở ngại kỹ thuật/mặt bằng, cần hỗ trợ.',
        });
        setToastMessage(`Đã ghi nhận nhiệm vụ "${selectedTask.title}" đang bị nghẽn.`);
      }

      setActionModalType(null);
      fetchTasks();
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Không thể lưu cập nhật.');
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'URGENT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">Khẩn cấp</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Ưu tiên cao</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Trung bình</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">Tiêu chuẩn</span>;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'QR_CHECKIN':
        return '🔍 Soát vé QR';
      case 'REGISTRATION_SUPPORT':
        return '📋 Bàn đón tiếp / Thẻ vé';
      case 'VENUE_OPS':
        return '🏛️ Vận hành hội trường';
      case 'ATTENDEE_ASSISTANCE':
        return '👥 Hỗ trợ đại biểu';
      default:
        return '⚡ Tác vụ chung';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-teal-950/40 via-cyan-950/30 to-slate-900 border border-teal-800/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Điều phối công việc
            </span>
            <span className="text-xs text-slate-400">Danh sách cá nhân</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nhiệm Vụ Được Giao</h1>
          <p className="text-sm text-slate-300 mt-1">
            Theo dõi, cập nhật tiến độ và báo cáo khó khăn trong ca trực của bạn.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        {/* Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'NOT_STARTED', label: 'Chưa bắt đầu' },
            { id: 'IN_PROGRESS', label: 'Đang làm' },
            { id: 'COMPLETED', label: 'Hoàn thành' },
            { id: 'BLOCKED', label: 'Bị nghẽn' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Hạng mục:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Tất cả hạng mục</option>
            <option value="QR_CHECKIN">Soát vé QR</option>
            <option value="REGISTRATION_SUPPORT">Bàn đón tiếp</option>
            <option value="VENUE_OPS">Vận hành hội trường</option>
            <option value="ATTENDEE_ASSISTANCE">Hỗ trợ đại biểu</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
          <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">Không có nhiệm vụ nào trong mục này</h3>
          <p className="text-xs text-slate-400">
            Bạn đã hoàn thành các nhiệm vụ được giao hoặc chưa có nhiệm vụ mới.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const isCompleted = task.status === 'COMPLETED';
            const isInProgress = task.status === 'IN_PROGRESS';
            const isBlocked = task.status === 'BLOCKED';

            return (
              <div
                key={task.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  isCompleted
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-80'
                    : isBlocked
                    ? 'bg-rose-950/20 border-rose-800/40'
                    : isInProgress
                    ? 'bg-cyan-950/20 border-cyan-800/50 shadow-md'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      {getCategoryLabel(task.category)}
                    </span>
                    {getPriorityBadge(task.priority)}
                  </div>

                  <h3 className={`text-base font-bold text-white ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="text-xs text-slate-400 space-y-1 pt-1">
                    <div className="truncate">Sự kiện: <span className="text-slate-200">{task.event_title}</span></div>
                    {task.deadline && (
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Hạn hoàn tất: {formatVietnamDateTime(task.deadline)}</span>
                      </div>
                    )}
                  </div>

                  {task.blocker_reason && (
                    <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Lý do nghẽn:</span>
                        {task.blocker_reason}
                      </div>
                    </div>
                  )}

                  {task.completion_notes && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Ghi chú hoàn tất:</span>
                        {task.completion_notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Task Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {task.status === 'NOT_STARTED' && (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400">Chưa bắt đầu</span>
                    )}
                    {isInProgress && (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                        ● Đang thực hiện
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                        ✓ Đã hoàn thành
                      </span>
                    )}
                    {isBlocked && (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                        ⚠ Bị nghẽn
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status === 'NOT_STARTED' && (
                      <button
                        onClick={() => handleStartTask(task)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Bắt đầu</span>
                      </button>
                    )}

                    {!isCompleted && (
                      <>
                        <button
                          onClick={() => handleOpenModal(task, 'BLOCK')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/50 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700/60 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          Báo nghẽn
                        </button>
                        <button
                          onClick={() => handleOpenModal(task, 'COMPLETE')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Hoàn thành</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Notes Modal */}
      {actionModalType && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {actionModalType === 'COMPLETE' ? 'Xác Nhận Hoàn Thành Nhiệm Vụ' : 'Báo Cáo Nhiệm Vụ Bị Nghẽn'}
              </h3>
              <button
                onClick={() => setActionModalType(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
                <span className="text-slate-400 block mb-0.5">Nhiệm vụ:</span>
                <span className="text-white font-semibold">{selectedTask.title}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {actionModalType === 'COMPLETE' ? 'Ghi chú hoàn tất (tùy chọn)' : 'Lý do bị nghẽn / Cần hỗ trợ gì? *'}
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  required={actionModalType === 'BLOCK'}
                  rows={3}
                  placeholder={
                    actionModalType === 'COMPLETE'
                      ? 'Ghi lại kết quả thực hiện hoặc lưu ý bàn giao ca...'
                      : 'Mô tả trở ngại: thiếu thiết bị, cần thêm người hỗ trợ, sự cố thiết bị...'
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionModalType(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer ${
                    actionModalType === 'COMPLETE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {actionLoading ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
