import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { ChatMessage, ActionLink } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { executeClientAutonomousCopilot } from '../../utils/aiCopilotClient';

export interface ChatDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  eventId?: number | null;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen = true,
  onClose,
  eventId,
}) => {
  const { user, userRole } = useAuth();
  const { activeEvent } = useEvent();
  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const resetChat = () => {
    const role = (userRole || 'ATTENDEE').toUpperCase();
    const initialSuggestions =
      role === 'ADMIN' || role === 'EVENT_MANAGER'
        ? [
            '📊 Báo cáo tỷ lệ check-in và số lượng sự kiện?',
            '🎟️ Thống kê tổng số vé đã đăng ký?',
            '📅 Lịch trình các phiên sự kiện tiêu biểu?',
          ]
        : [
            '🔴 Hôm nay có sự kiện nào đang diễn ra không?',
            '🎟️ Các phân hạng vé hiện có trong hệ thống?',
            '📅 Lịch trình các phiên sự kiện tiêu biểu?',
          ];

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `Xin chào! Tôi là Trợ Lý AI Toàn Năng EventHub Concilot. Tôi có thể hỗ trợ bạn tra cứu toàn bộ danh mục sự kiện, kiểm tra lịch trình, vé tham dự cá nhân và sơ đồ hội trường!`,
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        sources: ['PostgreSQL & AI Concierge Engine'],
        suggestedQuestions: initialSuggestions,
      },
    ]);
  };

  useEffect(() => {
    resetChat();
  }, [userRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    const targetEventId = eventId || activeEvent?.id || null;
    const historyPayload = messages.slice(-6).map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    try {
      const response = await apiService.sendAttendeeChat(query, targetEventId, {
        history: historyPayload,
        user_id: user?.id,
        role: userRole,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.answer || 'Dạ hiện tại em chưa tìm thấy thông tin chi tiết.',
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        sources: response.sources || ['PostgreSQL Real-Time & Gemini AI'],
        isFallback: response.is_fallback,
        actionLinks: response.action_links,
        suggestedQuestions: response.suggested_questions || [
          '🔴 Hôm nay có sự kiện nào đang diễn ra không?',
          '🎟️ Các phân hạng vé hiện có trong hệ thống?',
          '📅 Lịch trình các phiên sự kiện tiêu biểu?',
        ],
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const liveEvents = await apiService.getEvents().catch(() => []);
      const clientRes = executeClientAutonomousCopilot({
        question: query,
        events: liveEvents,
        eventId: targetEventId,
        userId: user?.id,
        role: userRole,
        history: historyPayload,
      });

      const fallbackMsg: ChatMessage = {
        id: `ai-fb-${Date.now()}`,
        sender: 'ai',
        text: clientRes.answer,
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        sources: clientRes.sources || ['Client Resilient Copilot'],
        isFallback: false,
        actionLinks: clientRes.action_links,
        suggestedQuestions: clientRes.suggested_questions || [
          '🔴 Hôm nay có sự kiện nào đang diễn ra không?',
          '🎟️ Các phân hạng vé hiện có trong hệ thống?',
          '📅 Lịch trình các phiên sự kiện tiêu biểu?',
        ],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col animate-slide-left">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-red-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-400 p-0.5 shadow-md">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">EventAI Concierge</h3>
            <p className="text-[11px] text-slate-400">Trợ Lý AI Toàn Năng · Gemini 2.5 Flash</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={resetChat}
            title="Làm mới cuộc trò chuyện"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Đóng drawer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 border border-slate-700 text-red-400'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-red-600 text-white rounded-tr-none shadow-md'
                  : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-none shadow-sm'
              }`}
            >
              <p className="text-xs whitespace-pre-wrap">{msg.text}</p>

              {/* Action Links */}
              {msg.actionLinks && msg.actionLinks.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-700/50">
                  {msg.actionLinks.map((action, aIdx) => (
                    <a
                      key={aIdx}
                      href={action.url}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600/25 hover:bg-red-600/40 border border-red-500/40 text-red-200 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      <span>{action.label}</span>
                      <ArrowRight className="w-3 h-3 text-red-400" />
                    </a>
                  ))}
                </div>
              )}

              {/* Source citation */}
              {msg.sender === 'ai' && (
                <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1 truncate">
                    <BookOpen className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="truncate">{msg.sources?.[0] || 'PostgreSQL Real-Time DB'}</span>
                  </div>
                  <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-red-950 border border-red-800/70 text-red-300">
                    AI Concierge
                  </span>
                </div>
              )}

              {/* Gemini-style Dynamic Pill Suggestion Chips */}
              {msg.sender === 'ai' &&
                (msg.suggestedQuestions || msg.suggested_questions) &&
                (msg.suggestedQuestions || msg.suggested_questions)!.length > 0 && (
                  <div className="pt-2.5 flex flex-col gap-1.5 border-t border-slate-700/50">
                    <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>Gợi ý câu hỏi tiếp theo:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(msg.suggestedQuestions || msg.suggested_questions)!.slice(0, 3).map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          disabled={loading}
                          onClick={() => handleSendMessage(chip)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-700/90 border border-slate-600/70 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-200 text-[11px] font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50 text-left active:scale-95"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                          <span>{chip}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              <span
                className={`block text-[9px] ${
                  msg.sender === 'user' ? 'text-red-200 text-right' : 'text-slate-500'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-red-400 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-[11px] text-slate-300 font-medium">
                AI Concierge đang truy vấn CSDL &amp; suy luận...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-slate-950 border-t border-slate-800"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Hỏi về sự kiện, lịch trình, phòng họp, WiFi, vé..."
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="p-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl shadow-md transition-all cursor-pointer"
            title="Gửi câu hỏi"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> PostgreSQL Tools + RBAC Guardrails
          </span>
          <span>Multi-turn Memory · UTC+7</span>
        </div>
      </form>
    </div>
  );
};

export default ChatDrawer;
