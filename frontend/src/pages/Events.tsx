import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, MapPin, Users, Activity, Eye, Edit, Trash2, Copy, Play, CheckCircle2, MoreVertical, X, Image as ImageIcon, Globe, FileOutput, Navigation2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiService as api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PermissionGuard } from '../components/PermissionGuard';

export const Events: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<any>({
    title: '', category_id: 1, event_type: 'Hội thảo', location: '', status: 'DRAFT'
  });

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents({ status: statusFilter, search, event_type: typeFilter });
      setEvents(data);
    } catch (err) {
      toast.error('Không thể tải danh sách sự kiện.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter, search]);

  const kpiData = {
    total: events.length,
    upcoming: events.filter(e => e.status === 'UPCOMING').length,
    ongoing: events.filter(e => e.status === 'ONGOING').length,
    completed: events.filter(e => e.status === 'COMPLETED').length,
    draft: events.filter(e => e.status === 'DRAFT').length
  };

  // Handlers
  const handleCreate = async () => {
    try {
      await api.createEvent(newEvent);
      toast.success('Sự kiện đã được tạo thành công.');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Lỗi khi tạo sự kiện.');
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await api.publishEvent(id);
      toast.success('Sự kiện đã xuất bản.');
      fetchData();
    } catch (err) {
      toast.error('Lỗi khi xuất bản sự kiện.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sự kiện này? Hành động này có thể đưa sự kiện vào trạng thái lưu trữ.')) return;
    try {
      await api.deleteEvent(id);
      toast.success('Sự kiện đã được lưu trữ/xóa.');
      fetchData();
    } catch (err) {
      toast.error('Không thể xóa sự kiện.');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await api.duplicateEvent(id);
      toast.success('Sự kiện đã được nhân bản.');
      fetchData();
    } catch (err) {
      toast.error('Không thể nhân bản.');
    }
  };

  const toggleHomepage = async (id: number, current: boolean) => {
    try {
      await api.updateHomepageVisibility(id, { homepage_visible: !current, featured: current ? false : undefined });
      toast.success(current ? 'Đã ẩn khỏi trang chủ' : 'Đã hiển thị trên trang chủ');
      fetchData();
    } catch (err) {
      toast.error('Không thể cập nhật trạng thái hiển thị.');
    }
  };

  const toggleFeatured = async (id: number, current: boolean) => {
    try {
      await api.updateHomepageVisibility(id, { featured: !current });
      toast.success(current ? 'Bỏ đánh dấu nổi bật' : 'Đã đánh dấu nổi bật');
      fetchData();
    } catch (err) {
      toast.error('Không thể cập nhật trạng thái nổi bật.');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportEventsList({ status: statusFilter });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event_list_${new Date().getTime()}.csv`;
      a.click();
      toast.success('Đã xuất danh sách sự kiện.');
    } catch (err) {
      toast.error('Lỗi khi xuất danh sách.');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      DRAFT: { label: 'Bản nháp', color: 'bg-gray-100 text-gray-700' },
      PUBLISHED: { label: 'Đã xuất bản', color: 'bg-blue-100 text-blue-700' },
      UPCOMING: { label: 'Sắp diễn ra', color: 'bg-yellow-100 text-yellow-700' },
      ONGOING: { label: 'Đang diễn ra', color: 'bg-emerald-100 text-emerald-700' },
      COMPLETED: { label: 'Đã kết thúc', color: 'bg-purple-100 text-purple-700' },
      CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
    };
    const b = badges[status] || badges['DRAFT'];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.color}`}>{b.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#12213A]">Danh mục sự kiện</h1>
          <p className="text-slate-500 mt-1">Quản lý, tổ chức và theo dõi toàn bộ sự kiện trên nền tảng EventAI.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
            <FileOutput size={18} />
            Xuất danh sách
          </button>
          <PermissionGuard requirePermission={['EVENT_CREATE']} fallback={<></>}>
            <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#D7193F] text-white rounded-lg hover:bg-[#b01332] transition-colors font-medium shadow-sm">
              <Plus size={18} />
              Tạo sự kiện
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-[#D7193F]" onClick={() => setStatusFilter('')}>
          <div className="text-slate-500 text-sm mb-1">Tổng sự kiện</div>
          <div className="text-2xl font-bold text-[#12213A]">{kpiData.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-yellow-500" onClick={() => setStatusFilter('UPCOMING')}>
          <div className="text-slate-500 text-sm mb-1">Sắp diễn ra</div>
          <div className="text-2xl font-bold text-yellow-600">{kpiData.upcoming}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-emerald-500" onClick={() => setStatusFilter('ONGOING')}>
          <div className="text-slate-500 text-sm mb-1">Đang diễn ra</div>
          <div className="text-2xl font-bold text-emerald-600">{kpiData.ongoing}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-purple-500" onClick={() => setStatusFilter('COMPLETED')}>
          <div className="text-slate-500 text-sm mb-1">Đã kết thúc</div>
          <div className="text-2xl font-bold text-purple-600">{kpiData.completed}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-gray-500" onClick={() => setStatusFilter('DRAFT')}>
          <div className="text-slate-500 text-sm mb-1">Bản nháp</div>
          <div className="text-2xl font-bold text-gray-600">{kpiData.draft}</div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm sự kiện, mã, địa điểm..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#D7193F] focus:ring-1 focus:ring-[#D7193F]"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm focus:outline-none focus:border-[#D7193F]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="UPCOMING">Sắp diễn ra</option>
              <option value="ONGOING">Đang diễn ra</option>
              <option value="COMPLETED">Đã kết thúc</option>
            </select>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm focus:outline-none focus:border-[#D7193F]"
            >
              <option value="">Tất cả loại sự kiện</option>
              <option value="Hội thảo">Hội thảo</option>
              <option value="Triển lãm">Triển lãm</option>
              <option value="Workshop">Workshop</option>
              <option value="Networking">Networking</option>
            </select>
            <button onClick={fetchData} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 text-sm transition-colors">
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-medium">
                <th className="py-3 px-4 w-10">
                  <input type="checkbox" className="rounded border-slate-300 text-[#D7193F] focus:ring-[#D7193F]" />
                </th>
                <th className="py-3 px-4 min-w-[250px]">Sự kiện</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Địa điểm</th>
                <th className="py-3 px-4 text-center">Đăng ký</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-center">Trang chủ</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-t-[#D7193F] border-slate-200 animate-spin"></div>
                      Đang tải danh sách...
                    </div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">Không tìm thấy sự kiện phù hợp.</p>
                      <button onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }} className="mt-3 text-[#D7193F] hover:underline text-sm font-medium">
                        Đặt lại bộ lọc
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                events.slice((page-1)*itemsPerPage, page*itemsPerPage).map((event) => (
                  <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-4">
                      <input type="checkbox" className="rounded border-slate-300 text-[#D7193F] focus:ring-[#D7193F]" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded overflow-hidden bg-slate-200 flex-shrink-0">
                          {event.cover_image ? (
                            <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400 m-2.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[#12213A] line-clamp-1">{event.title}</div>
                          <div className="text-xs text-slate-500 flex gap-2">
                            <span className="font-mono">{event.slug || `EVT-00${event.id}`}</span>
                            <span>•</span>
                            <span>{event.event_type}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-[#12213A]">{event.start_date || 'Chưa cập nhật'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-600 line-clamp-1 flex items-center gap-1">
                        <MapPin size={14} className="text-slate-400" />
                        {event.location || 'Chưa cập nhật'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 text-sm bg-slate-100 px-2 py-1 rounded">
                        <Users size={14} className="text-slate-500" />
                        <span className="font-medium text-[#12213A]">{event.registered_count || 0}</span>
                        <span className="text-slate-400">/ {event.capacity || 500}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(event.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => toggleHomepage(event.id, event.homepage_visible)}
                          className={`p-1.5 rounded-md transition-colors ${event.homepage_visible ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'text-slate-400 hover:bg-slate-100'}`}
                          title={event.homepage_visible ? "Đang hiển thị trên Trang chủ" : "Đang ẩn khỏi Trang chủ"}
                        >
                          <Globe size={16} />
                        </button>
                        {event.homepage_visible && (
                          <button 
                            onClick={() => toggleFeatured(event.id, event.featured)}
                            className={`p-1.5 rounded-md transition-colors ${event.featured ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' : 'text-slate-400 hover:bg-slate-100'}`}
                            title={event.featured ? "Sự kiện nổi bật" : "Đánh dấu nổi bật"}
                          >
                            <Activity size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Xem chi tiết">
                          <Eye size={16} />
                        </button>
                        <PermissionGuard requirePermission={['EVENT_EDIT']} fallback={<></>}>
                          <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Chỉnh sửa">
                            <Edit size={16} />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard requirePermission={['EVENT_PUBLISH']} fallback={<></>}>
                          {event.status === 'DRAFT' && (
                            <button onClick={() => handlePublish(event.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Xuất bản">
                              <Play size={16} />
                            </button>
                          )}
                        </PermissionGuard>
                        <PermissionGuard requirePermission={['EVENT_CREATE']} fallback={<></>}>
                          <button onClick={() => handleDuplicate(event.id)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded" title="Nhân bản">
                            <Copy size={16} />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard requirePermission={['EVENT_DELETE']} fallback={<></>}>
                          <button onClick={() => handleDelete(event.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hủy/Lưu trữ">
                            <Trash2 size={16} />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && events.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
            <div className="text-sm text-slate-500">
              Hiển thị <span className="font-medium text-slate-700">{(page-1)*itemsPerPage + 1}</span> - <span className="font-medium text-slate-700">{Math.min(page*itemsPerPage, events.length)}</span> trong <span className="font-medium text-slate-700">{events.length}</span> sự kiện
            </div>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium">Trước</button>
              <button disabled={page * itemsPerPage >= events.length} onClick={() => setPage(p => p+1)} className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium">Sau</button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL (WIZARD DEMO) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-[#12213A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
              <h2 className="text-xl font-bold text-[#12213A] flex items-center gap-2">
                <Plus className="text-[#D7193F]" size={24} />
                Tạo sự kiện mới
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex gap-4 mb-8">
                {/* Steps Visualizer */}
                {['Thông tin', 'Thời gian & Địa điểm', 'Đăng ký & Vé'].map((step, idx) => (
                  <div key={idx} className="flex-1">
                    <div className={`h-1.5 rounded-full w-full mb-2 ${idx === 0 ? 'bg-[#D7193F]' : 'bg-slate-100'}`}></div>
                    <div className={`text-xs font-semibold ${idx === 0 ? 'text-[#D7193F]' : 'text-slate-400'}`}>BƯỚC {idx + 1}</div>
                    <div className={`text-sm ${idx === 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{step}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#12213A] mb-1">Tên sự kiện <span className="text-[#D7193F]">*</span></label>
                  <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#D7193F] focus:ring-1 focus:ring-[#D7193F]" placeholder="Ví dụ: Hội nghị Công nghệ AI 2026" />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-[#12213A] mb-1">Loại sự kiện <span className="text-[#D7193F]">*</span></label>
                    <select value={newEvent.event_type} onChange={e => setNewEvent({...newEvent, event_type: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#D7193F]">
                      <option value="Hội thảo">Hội thảo</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Triển lãm">Triển lãm</option>
                      <option value="Networking">Networking</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#12213A] mb-1">Địa điểm <span className="text-[#D7193F]">*</span></label>
                    <input type="text" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#D7193F]" placeholder="Hà Nội, TP.HCM..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-[#12213A] mb-1">Ngày bắt đầu</label>
                    <input type="date" value={newEvent.start_date || ''} onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#D7193F]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#12213A] mb-1">Ngày kết thúc</label>
                    <input type="date" value={newEvent.end_date || ''} onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#D7193F]" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#12213A] mb-1">Sức chứa tối đa (Capacity)</label>
                  <input type="number" value={newEvent.capacity || ''} onChange={e => setNewEvent({...newEvent, capacity: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#D7193F]" placeholder="500" />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">Hủy bỏ</button>
              <button onClick={handleCreate} disabled={!newEvent.title || !newEvent.location} className="px-6 py-2 bg-[#D7193F] text-white rounded-lg hover:bg-[#b01332] transition-colors font-medium disabled:opacity-50 flex items-center gap-2 shadow-sm">
                Lưu & Tiếp tục
                <Navigation2 size={16} className="rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
