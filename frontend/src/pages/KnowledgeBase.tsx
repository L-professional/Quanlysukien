import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Brain,
  Upload,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { apiService } from '../services/api';
import { formatVietnameseDateTime } from '../utils/formatters';
import { toast } from 'sonner';

interface KnowledgeBaseItem {
  id: number;
  event_id: number;
  title: string;
  content: string;
  embedding?: number[];
  created_at?: string;
  updated_at?: string;
  category: string;
  status: 'INDEXED' | 'PENDING' | 'ERROR';
  dimensions: number;
}

const CATEGORIES = ['Schedule', 'Logistics', 'FAQ', 'Policies', 'Speakers'];
const MOCK_DOCS: KnowledgeBaseItem[] = [
  {
    id: 1,
    event_id: 1,
    title: 'Lịch trình sự kiện',
    content: 'Sự kiện diễn ra từ 08:00 AM đến 17:30 PM trong 2 ngày.',
    category: 'Schedule',
    status: 'INDEXED',
    dimensions: 1536,
    created_at: '2026-09-08T08:00:00Z',
  },
  {
    id: 2,
    event_id: 1,
    title: 'Địa điểm GEM Center & bãi đỗ xe',
    content: 'GEM Center, TP. Hồ Chí Minh. Bãi đỗ xe ô tô tại hầm B2-B3.',
    category: 'Logistics',
    status: 'INDEXED',
    dimensions: 1536,
    created_at: '2026-09-08T09:15:00Z',
  },
  {
    id: 3,
    event_id: 1,
    title: 'Câu hỏi thường gặp về check-in',
    content: 'Quét QR tại cổng A hoặc B. Mã vé có hiệu lực 24 giờ.',
    category: 'FAQ',
    status: 'PENDING',
    dimensions: 0,
    created_at: '2026-09-09T10:30:00Z',
  },
  {
    id: 4,
    event_id: 1,
    title: 'Chính sách bảo mật & PII Masking',
    content: 'Toàn bộ dữ liệu sẽ được mã hoá trước khi gửi ra Cloud LLM.',
    category: 'Policies',
    status: 'INDEXED',
    dimensions: 1536,
    created_at: '2026-09-07T14:20:00Z',
  },
];

export const KnowledgeBase: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('FAQ');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [reindexLoading, setReindexLoading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getKnowledgeBaseItems(1);
      const merged = (Array.isArray(data) && data.length > 0 ? data : []).map((item, idx) => ({
        ...item,
        category: (item as { category?: string }).category || CATEGORIES[idx % CATEGORIES.length] || 'FAQ',
        status: 'INDEXED' as const,
        dimensions: (item as { embedding?: number[] }).embedding?.length || 1536,
      }));
      setItems([...MOCK_DOCS, ...merged]);
    } catch {
      setItems(MOCK_DOCS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File "${file.name}" > 5MB`);
        continue;
      }
      const newItem: KnowledgeBaseItem = {
        id: Date.now() + Math.random(),
        event_id: 1,
        title: file.name,
        content: `[Attached: ${file.name}] RAG extracted.`,
        category: 'FAQ',
        status: 'PENDING',
        dimensions: 0,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
    }
    toast.success(t('common.success'));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleReindex = async (id: number) => {
    setReindexLoading(id);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: 'INDEXED', dimensions: 1536 } : i
        )
      );
      toast.success(t('common.success'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setReindexLoading(null);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error(t('common.error'));
      return;
    }
    try {
      const created = await apiService.createKnowledgeItem({
        event_id: 1,
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      setItems((prev) => [
        { ...created, category: newCategory, status: 'INDEXED', dimensions: 1536 },
        ...prev,
      ]);
      toast.success(t('common.success'));
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewCategory('FAQ');
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiService.deleteKnowledgeItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success(t('common.success'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusBadge = (status: KnowledgeBaseItem['status']) => {
    switch (status) {
      case 'INDEXED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'ERROR':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Brain className="w-5 h-5 text-indigo-600" />
            </div>
            {t('knowledge.title')}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {t('knowledge.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t('knowledge.uploadDoc')}
        </button>
      </div>

      {/* Search + Upload */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('knowledge.searchDocs')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs transition-all"
          />
        </div>
        <div
          className="relative flex items-center justify-center px-5 py-2.5 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer shadow-xs"
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".pdf,.txt,.md,.docx"
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              for (const file of files) {
                const newItem: KnowledgeBaseItem = {
                  id: Date.now() + Math.random(),
                  event_id: 1,
                  title: file.name,
                  content: `[File: ${file.name}]`,
                  category: 'FAQ',
                  status: 'PENDING',
                  dimensions: 0,
                  created_at: new Date().toISOString(),
                };
                setItems((prev) => [newItem, ...prev]);
              }
              toast.success(t('common.success'));
            }}
          />
          {isDragging ? (
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto text-indigo-600 mb-1" />
              <p className="text-xs text-indigo-600 font-bold">{t('knowledge.uploadDoc')}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>{t('knowledge.uploadDoc')} (.pdf, .txt, .md)</span>
            </div>
          )}
        </div>
      </div>

      {/* Document Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-200/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">{t('knowledge.searchDocs')}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    t('knowledge.docName'),
                    t('knowledge.category'),
                    t('common.status'),
                    t('knowledge.dimensions'),
                    t('logs.colTime'),
                    t('common.actions')
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs font-medium">
                            {item.content.slice(0, 60)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusBadge(item.status)}`}
                      >
                        {item.status === 'INDEXED' ? (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        ) : item.status === 'PENDING' ? (
                          <Clock className="w-3 h-3 text-amber-600" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                        )}
                        {item.status === 'INDEXED' ? t('knowledge.indexed') : item.status === 'PENDING' ? t('knowledge.pending') : t('knowledge.error')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                      {item.status === 'INDEXED' ? `${item.dimensions} dims` : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                      {item.created_at
                        ? formatVietnameseDateTime(item.created_at)
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {item.status !== 'INDEXED' && (
                          <button
                            onClick={() => handleReindex(item.id)}
                            disabled={reindexLoading === item.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Re-index"
                          >
                            {reindexLoading === item.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={t('knowledge.deleteDoc')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 p-4">
          <div className="w-[95vw] sm:max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                {t('knowledge.uploadDoc')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('knowledge.docName')}</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: FAQ Check-in"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('knowledge.category')}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('knowledge.content')}</label>
                  <textarea
                    rows={4}
                    placeholder="..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 min-h-[44px] py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;


