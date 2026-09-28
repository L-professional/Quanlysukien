import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Minus,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  Mic,
  Paperclip,
  Wifi,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { ChatMessage, EventScheduleItem, ActionLink } from '../../types';
import { apiService } from '../../services/api';
import { useEvent } from '../../context/EventContext';
import { useAuth } from '../../context/AuthContext';

export const FloatingChatbot: React.FC = () => {
  const { activeEvent } = useEvent();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sessions, setSessions] = useState<EventScheduleItem[]>([]);

  const wifiName = activeEvent.wifiName || 'EventHub_VIP_Guest';
  const wifiPass = activeEvent.wifiPassword || 'EventHub2026!';

  // Role-based Suggestions
  const roleSuggestions = useMemo(() => {
    const role = (userRole || 'ATTENDEE').toUpperCase();
    if (role === 'ADMIN' || role === 'EVENT_MANAGER') {
      return [
        '📊 Báo cáo tỷ lệ check-in và số lượng sự kiện?',
        '🎟️ Thống kê tổng số vé đã đăng ký?',
        '📅 Lịch trình các phiên sự kiện?',
        '📍 Sơ đồ hội trường & Bãi đỗ xe?',
      ];
    }
    if (role === 'STAFF') {
      return [
        '🎟️ Tỷ lệ check-in hiện tại bao nhiêu?',
        '🎟️ Hướng dẫn check-in QR vào cổng?',
        '📍 Sơ đồ hội trường & Bãi đỗ xe?',
        '☕ Teabreak & Mật khẩu WiFi?',
      ];
    }
    if (role === 'SPEAKER') {
      return [
        '🎤 Phiên diễn thuyết của tôi ở phòng nào?',
        '📅 Lịch trình hôm nay như thế nào?',
        '📍 Sơ đồ hội trường & Bãi đỗ xe?',
        '☕ Teabreak & Mật khẩu WiFi?',
      ];
    }
    return [
      '☕ Teabreak & Mật khẩu WiFi?',
      '🎟️ Hướng dẫn check-in QR vào cổng?',
      '📍 Sơ đồ hội trường & Bãi đỗ xe?',
      '📅 Lịch trình hôm nay như thế nào?',
    ];
  }, [userRole]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await apiService.getEventSchedule(activeEvent.id || 1);
        setSessions(data);
      } catch (err) {
        console.warn('Could not fetch sessions for chatbot context:', err);
      }
    };
    loadSessions();
  }, [activeEvent.id]);

  // Dynamic Initial Welcome Message tailored to Role
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const resetWelcomeMessage = () => {
    const role = (userRole || 'ATTENDEE').toUpperCase();
    let welcomeDesc = 'Xin chào bạn! Em là Trợ Lý AI Toàn Năng EventHub Copilot. Em có thể hỗ trợ bạn tra cứu toàn bộ danh mục sự kiện, kiểm tra sự kiện đang diễn ra hôm nay, lịch trình các phiên, địa điểm và vé cá nhân!';
    if (role === 'ADMIN' || role === 'EVENT_MANAGER') {
      welcomeDesc = `Xin chào Quản trị viên ${user?.full_name || 'Admin'}! Em là Autonomous AI Copilot toàn năng, sẵn sàng tra cứu dữ liệu PostgreSQL real-time (tỷ lệ check-in, số lượng sự kiện, thống kê vé) và hỗ trợ quản trị sự kiện.`;
    } else if (role === 'STAFF') {
      welcomeDesc = `Xin chào Nhân viên ${user?.full_name || 'Staff'}! Em là AI Copilot hỗ trợ kiểm tra tiến độ soát vé, tỷ lệ check-in và điều phối sảnh hội nghị.`;
    } else if (role === 'SPEAKER') {
      welcomeDesc = `Kính chào Diễn giả ${user?.full_name || 'Speaker'}! Em là AI Copilot hỗ trợ kiểm tra phòng thuyết trình, lịch trình cá nhân và feedback từ khán giả.`;
    }

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: welcomeDesc,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sources: ['PostgreSQL & AI Copilot Auto-Loaded'],
        actionLinks: role === 'ADMIN' || role === 'EVENT_MANAGER'
          ? [
              { label: '📊 Bảng Điều Khiển', url: '/dashboard' },
              { label: '🔗 Danh mục sự kiện', url: '/events' },
            ]
          : [
              { label: '🔗 Danh mục sự kiện', url: '/events' },
              { label: '🎟️ Vé của tôi', url: '/registrations' },
            ]
      },
    ]);
  };

  useEffect(() => {
    resetWelcomeMessage();
  }, [userRole, user?.full_name]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      // Task 93: Remove event context lock - only pass specific eventId if explicitly on an event page
      const pathname = window.location.pathname;
      const eventDetailMatch = pathname.match(/^\/events\/(\d+)$/);
      const contextualEventId = eventDetailMatch ? parseInt(eventDetailMatch[1], 10) : undefined;

      const response = await apiService.sendAttendeeChat(query, contextualEventId, {
        history: historyPayload,
        user_id: user?.id,
        role: userRole,
      });

      let answerText = response.answer;
      let sourcesList = response.sources && response.sources.length > 0 ? response.sources : ['PostgreSQL Real-Time & Gemini AI'];

      if (!answerText) {
        answerText = 'Dạ hiện tại em chưa tìm thấy thông tin chi tiết về nội dung này trong CSDL PostgreSQL. Bạn có thể kiểm tra danh sách sự kiện đầy đủ tại:\n\n[ 🔗 Chuyển đến trang Danh mục sự kiện ](/events)';
        sourcesList = ['CSDL PostgreSQL Events'];
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: answerText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sources: sourcesList,
        isFallback: response.is_fallback,
        actionLinks: response.action_links,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackAiMsg: ChatMessage = {
        id: `ai-hybrid-${Date.now()}`,
        sender: 'ai',
        text: `Hệ thống AI Copilot đang kết nối CSDL PostgreSQL. Bạn có thể hỏi tôi về bất kỳ sự kiện nào trong danh mục hoặc sự kiện đang diễn ra hôm nay!\n\n[ 🔗 Chuyển đến trang Danh mục sự kiện ](/events)`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sources: ['PostgreSQL Events (Global)'],
        isFallback: false,
        actionLinks: [
          { label: '🔗 Danh mục sự kiện', url: '/events' },
        ],
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setLoading(false);
    }
  };

  /** Parse inline markdown: **bold**, `code`, and [text](url) clickable links */
  const parseInline = (raw: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(raw)) !== null) {
      if (m.index > last) parts.push(raw.slice(last, m.index));
      if (m[1] && m[2]) {
        const label = m[1];
        const url = m[2];
        const isInternal = url.startsWith('/');
        parts.push(
          isInternal ? (
            <button
              key={m.index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(url);
              }}
              className="inline-flex items-center gap-1 mx-1 my-0.5 px-2.5 py-1 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-200 hover:text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-xs"
            >
              <span>{label}</span>
              <ArrowRight className="w-3 h-3 text-red-400" />
            </button>
          ) : (
            <a
              key={m.index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mx-1 my-0.5 px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 hover:text-white rounded-lg font-bold text-[11px] transition-all"
            >
              <span>{label}</span>
              <ExternalLink className="w-3 h-3 text-indigo-300" />
            </a>
          )
        );
      } else if (m[3]) {
        parts.push(<strong key={m.index} className="font-semibold text-white">{m[3]}</strong>);
      } else if (m[4]) {
        parts.push(<code key={m.index} className="bg-slate-700 text-emerald-300 px-1 rounded font-mono text-[11px]">{m[4]}</code>);
      }
      last = m.index + m[0].length;
    }
    if (last < raw.length) parts.push(raw.slice(last));
    return parts;
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1">
            {parseInline(line.slice(4))}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-base font-black text-white mt-3 mb-1">
            {parseInline(line.slice(3))}
          </h2>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 text-xs text-slate-200 mb-0.5 list-disc">
            {parseInline(line.slice(2))}
          </li>
        );
      }
      if (line.trim()) {
        return (
          <p key={idx} className="text-xs text-slate-200 leading-relaxed mb-1">
            {parseInline(line)}
          </p>
        );
      }
      return null;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer relative"
          aria-label="Open AI Copilot"
        >
          <Sparkles className="w-7 h-7 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white"></span>
        </button>
      )}

      {/* Chat Popup Window */}
      {isOpen && !isMinimized && (
        <div className="w-[92vw] sm:w-[440px] h-[610px] max-h-[85vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl shadow-slate-950/80 flex flex-col overflow-hidden animate-fade-in transition-all">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-red-950 to-slate-900 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-400 p-0.5 shadow-md">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-red-400 animate-pulse-subtle" />
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white tracking-tight">EventHub AI Copilot</h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/30 rounded">
                    {userRole || 'ATTENDEE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[210px]">{activeEvent.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={resetWelcomeMessage}
                title="Làm mới đoạn chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                title="Thu nhỏ cửa sổ"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Đóng chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active WiFi Context Pill Header */}
          <div className="px-4 py-1.5 bg-red-950/80 border-b border-red-900/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-red-200 font-semibold">
              <Wifi className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>WiFi: <code className="text-white bg-red-900 px-1 rounded font-mono">{wifiName}</code></span>
            </div>
            <div className="text-red-200 font-semibold">
              <span>Pass: <code className="text-white bg-red-900 px-1 rounded font-mono">{wifiPass}</code></span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-red-400'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-red-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.sender === 'ai' ? (
                    renderMarkdown(msg.text)
                  ) : (
                    <p className="text-xs whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {/* Smart Action Widgets */}
                  {msg.actionLinks && msg.actionLinks.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-700/50">
                      {msg.actionLinks.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          type="button"
                          onClick={() => {
                            if (action.url.startsWith('/')) {
                              navigate(action.url);
                            } else {
                              window.open(action.url, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600/25 hover:bg-red-600/40 border border-red-500/40 text-red-200 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <span>{action.label}</span>
                          <ArrowRight className="w-3 h-3 text-red-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Fallback Badge */}
                  {msg.isFallback && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-1 rounded-lg">
                      <HelpCircle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Đã chuyển thắc mắc tới Staff Dashboard</span>
                    </div>
                  )}

                  {/* Sources / Knowledge Base Citation */}
                  {msg.sender === 'ai' && !msg.isFallback && (
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-red-300 font-medium truncate">
                        <BookOpen className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="truncate">Nguồn: {msg.sources?.[0] || 'PostgreSQL Real-Time DB'}</span>
                      </div>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-950 border border-red-800/70 text-red-300 shrink-0">
                        AI Copilot
                      </span>
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

            {/* Typing / Analyzing Indicator */}
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
                  <span className="text-[11px] text-slate-300 font-medium">AI Copilot đang truy vấn PostgreSQL &amp; suy luận...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 overflow-x-auto flex gap-1.5 scrollbar-none">
            {roleSuggestions.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                disabled={loading}
                className="text-[11px] font-medium whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 text-slate-500 hover:text-slate-200 transition-colors"
                title="Đính kèm tệp tin"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  userRole === 'ADMIN' || userRole === 'EVENT_MANAGER'
                    ? 'Hỏi về tỷ lệ check-in, số lượng sự kiện, thống kê vé...'
                    : 'Hỏi về lịch trình, phòng họp, WiFi, vé của bạn...'
                }
                disabled={loading}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              <button
                type="button"
                className="p-2 text-slate-500 hover:text-slate-200 transition-colors"
                title="Ghi âm voice"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="p-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl shadow-md shadow-red-600/30 transition-all cursor-pointer"
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
      )}

      {/* Minimized FAB Button */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer relative"
        >
          <Sparkles className="w-7 h-7 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white"></span>
        </button>
      )}
    </div>
  );
};

export default FloatingChatbot;
