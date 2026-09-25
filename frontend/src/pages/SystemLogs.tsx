import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Filter, CheckCircle2, Search, Terminal, AlertTriangle, Info, AlertCircle, Download, Trash2, Radio, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  actor: string;
  message: string;
}

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    time: '2026-09-11 18:04:12',
    level: 'INFO',
    actor: 'system.qr_service',
    message: 'QR check-in successful for Sarah Chen (VIP) [Ticket #EH-VIP-001]',
  },
  {
    id: 'log-2',
    time: '2026-09-11 18:02:45',
    level: 'INFO',
    actor: 'ai.concierge_engine',
    message: 'Draft response generated via RAG context [doc_id: 104, confidence: 0.94]',
  },
  {
    id: 'log-3',
    time: '2026-09-11 17:58:30',
    level: 'WARN',
    actor: 'auth.guard',
    message: 'Repeated login attempt from IP 192.168.1.45 (user: admin)',
  },
  {
    id: 'log-4',
    time: '2026-09-11 17:45:10',
    level: 'INFO',
    actor: 'vector_db.pgvector',
    message: "Document 'Event_Guide_v1.2.pdf' re-indexed (128 embeddings added)",
  },
  {
    id: 'log-5',
    time: '2026-09-11 17:30:22',
    level: 'WARN',
    actor: 'system.qr_service',
    message: 'Duplicate check-in attempt detected for QR #EH-8892',
  },
  {
    id: 'log-6',
    time: '2026-09-11 17:15:00',
    level: 'INFO',
    actor: 'analytics.sentiment',
    message: 'Batch sentiment analysis completed for 45 attendee feedback entries',
  },
  {
    id: 'log-7',
    time: '2026-09-11 16:50:18',
    level: 'INFO',
    actor: 'system.qr_service',
    message: 'VIP Check-in alert dispatched to Event Manager mobile app',
  },
  {
    id: 'log-8',
    time: '2026-09-11 16:42:05',
    level: 'ERROR',
    actor: 'api.gemini_gateway',
    message: 'Rate limit quota threshold reached on Gemini API fallback model. Retry queued in 30s.',
  },
  {
    id: 'log-9',
    time: '2026-09-11 16:20:11',
    level: 'ERROR',
    actor: 'websocket.turnstile_gate',
    message: 'Turnstile gate 03 heartbeat packet dropped. Reconnection protocol initiated.',
  },
];

export const SystemLogs: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);

  // Live streaming effect
  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = setInterval(() => {
      const sampleMessages = [
        { level: 'INFO' as const, actor: 'system.qr_service', message: 'Tín hiệu heartbeat từ Turnstile Cổng A ổn định (latency 12ms)' },
        { level: 'INFO' as const, actor: 'ai.concierge_engine', message: 'Tự động kiểm tra truy vấn RAG pgvector (Cache hit 98%)' },
        { level: 'WARN' as const, actor: 'auth.guard', message: 'Token refresh được yêu cầu từ phiên đăng nhập người dùng' },
      ];
      const randomMsg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      const newEntry: LogEntry = {
        id: `log-${Date.now()}`,
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        level: randomMsg.level,
        actor: randomMsg.actor,
        message: randomMsg.message,
      };
      setLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
    }, 12000);
    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  const handleDownloadLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `eventhub_system_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Đã tải xuống tệp dữ liệu nhật ký hệ thống (.json)!');
  };

  const handleClearLogs = () => {
    setLogs([]);
    toast.info('Đã xóa danh sách nhật ký hiển thị tạm thời.');
  };

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.time.includes(searchTerm);
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Shield className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('logs.title')}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t('logs.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live stream toggle */}
          <button
            type="button"
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isLiveStreaming
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={isLiveStreaming ? 'Tạm dừng nhận log trực tiếp' : 'Bật nhận log trực tiếp'}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveStreaming ? 'animate-pulse text-emerald-600' : 'text-slate-400'}`} />
            <span>{isLiveStreaming ? 'Live Stream: Bật' : 'Live Stream: Tắt'}</span>
          </button>

          {/* Download Logs */}
          <button
            type="button"
            onClick={handleDownloadLogs}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Tải tệp nhật ký hệ thống"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Tải Log</span>
          </button>

          {/* Clear Logs */}
          <button
            type="button"
            onClick={handleClearLogs}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Xóa danh sách nhật ký hiển thị"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> {t('common.filter')}:
          </span>
          {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterLevel === level
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {level === 'ALL' ? t('common.all') : level}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('logs.searchLogs')}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 transition-all font-mono"
          />
        </div>
      </div>

      {/* Console Table Card */}
      <div className="bg-[#0B0F19] text-slate-200 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-300">security_audit.log</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {filteredLogs.length} / {INITIAL_LOGS.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 text-[11px]">
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider w-44">{t('logs.colTime')}</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider w-24">{t('logs.colLevel')}</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider w-48">{t('logs.colActor')}</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">{t('logs.colMessage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-3 pr-4 text-slate-400 text-[11px] whitespace-nowrap">{log.time}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                        log.level === 'INFO'
                          ? 'bg-indigo-950 text-indigo-400 border-indigo-800'
                          : log.level === 'WARN'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {log.level === 'INFO' && <Info className="w-3 h-3 text-indigo-400 shrink-0" />}
                      {log.level === 'WARN' && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
                      {log.level === 'ERROR' && <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />}
                      {log.level}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-cyan-400 text-[11px] font-bold whitespace-nowrap">{log.actor}</td>
                  <td className="py-3 text-slate-300 text-[11px] leading-relaxed">{log.message}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                    {t('users.logs.noLogs')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
