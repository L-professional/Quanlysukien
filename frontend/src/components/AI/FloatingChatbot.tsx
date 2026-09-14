import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { ChatMessage, EventScheduleItem } from '../../types';
import { apiService } from '../../services/api';
import { useEvent } from '../../context/EventContext';

const QUICK_SUGGESTIONS = [
  '☕ Teabreak & Mật khẩu WiFi?',
  '🎟️ Hướng dẫn check-in QR vào cổng?',
  '📍 Sơ đồ hội trường & Bãi đỗ xe?',
  '📅 Lịch trình hôm nay như thế nào?',
];

export const FloatingChatbot: React.FC = () => {
  const { activeEvent } = useEvent();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sessions, setSessions] = useState<EventScheduleItem[]>([]);

  const wifiName = activeEvent.wifiName || 'EventHub_VIP_Guest';
  const wifiPass = activeEvent.wifiPassword || 'EventHub2026!';

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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Xin chào quý khách! Em là Trợ Lý Sự Kiện Thông Minh EventHub AI. Em rất hân hạnh được hỗ trợ Anh/Chị thông tin về WiFi (${wifiName}), lịch trình, địa điểm (${activeEvent.location}) và dịch vụ hôm nay!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      sources: ['Event Context Auto-Loaded'],
    },
  ]);

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

    const q = query.toLowerCase();


    // ── Tiered WiFi Query Resolution ──
    if (q.includes('wifi') || q.includes('mật khẩu') || q.includes('pass') || q.includes('ssid') || q.includes('mạng') || q.includes('internet')) {
      // Check if asking for a specific room or speaker session
      const matchedSession = sessions.find((s) => {
        const roomMatch = s.room_location && q.includes(s.room_location.toLowerCase());
        const speakerMatch = s.speaker_name && q.includes(s.speaker_name.toLowerCase());
        const titleMatch = s.title && q.includes(s.title.toLowerCase());
        return (roomMatch || speakerMatch || titleMatch) && (s.wifiName || s.wifiPassword);
      });

      if (matchedSession) {
        setTimeout(() => {
          const roomWifiMsg: ChatMessage = {
            id: `ai-room-wifi-${Date.now()}`,
            sender: 'ai',
            text: `Dạ kính chào Anh/Chị! Thông tin kết nối WiFi riêng tại **${matchedSession.room_location}** (Diễn giả: ${matchedSession.speaker_name} — "${matchedSession.title}") như sau:\n\n📶 **Mạng WiFi Phòng (SSID):** \`${matchedSession.wifiName || wifiName}\`\n🔑 **Mật khẩu:** \`${matchedSession.wifiPassword || wifiPass}\`\n\n*Ngoài ra, Anh/Chị cũng có thể dùng mạng tổng sự kiện: SSID \`${wifiName}\` / Pass \`${wifiPass}\`.*`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            sources: [`Room Session Config — ${matchedSession.room_location}`],
            isFallback: false,
          };
          setMessages((prev) => [...prev, roomWifiMsg]);
          setLoading(false);
        }, 400);
        return;
      }

      // General WiFi Query
      setTimeout(() => {
        const wifiMsg: ChatMessage = {
          id: `ai-wifi-${Date.now()}`,
          sender: 'ai',
          text: `Dạ kính chào Anh/Chị! Thông tin kết nối mạng WiFi tại sự kiện **${activeEvent.title}** như sau:\n\n📶 **Mạng WiFi Tổng (SSID):** \`${wifiName}\`\n🔑 **Mật khẩu:** \`${wifiPass}\`\n\n💡 **WiFi Theo Phòng Họp / Session:**\n- **Grand Ballroom A:** \`EventHub_GrandBallroomA\` (Pass: \`BallroomA2026@Pass\`)\n- **Grand Ballroom B:** \`EventHub_GrandBallroomB\` (Pass: \`BallroomB2026@Pass\`)\n- **Phòng Workshop B1:** \`EventHub_WorkshopB1\` (Pass: \`WorkshopB1@Pass\`)\n- **Sảnh Gala:** \`EventHub_GalaLounge\` (Pass: \`GalaLounge@2026\`)`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          sources: ['Active Event & Session Config'],
          isFallback: false,
        };
        setMessages((prev) => [...prev, wifiMsg]);
        setLoading(false);
      }, 400);
      return;
    }

    // Priority 2 & 3: RAG Query + Hybrid Gemini Reasoning
    try {
      const response = await apiService.sendAttendeeChat(query, activeEvent.id || 1);

      let answerText = response.answer;
      let sourcesList = response.sources && response.sources.length > 0 ? response.sources : ['RAG Knowledge Base & Gemini AI'];

      // If answerText is empty, provide a clean direct prompt
      if (!answerText) {
        answerText = `Dạ hiện chưa có thông tin chi tiết về nội dung này. Bạn có thể hỏi tôi về lịch trình, diễn giả, phòng họp, WiFi hoặc dịch vụ tại sự kiện **${activeEvent.title}** nhé!`;
        sourcesList = ['Event Context'];
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: answerText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sources: sourcesList,
        isFallback: false,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      // Graceful natural fallback — no user query echo
      const fallbackAiMsg: ChatMessage = {
        id: `ai-hybrid-${Date.now()}`,
        sender: 'ai',
        text: `Xin lỗi, hệ thống đang bận. Bạn có thể hỏi tôi về WiFi (\`${wifiName}\`), lịch trình hoặc địa điểm sự kiện **${activeEvent.title}** — tôi sẵn sàng hỗ trợ ngay!`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sources: ['Gemini Intelligent Reasoning', 'Event Context'],
        isFallback: false,
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `Cuộc trò chuyện đã được làm mới. Em là AI Concierge của sự kiện **${activeEvent.title}**. Em có thể giúp gì thêm cho Anh/Chị hôm nay?`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sources: ['Event Context Auto-Loaded'],
      },
    ]);
  };

  /** Parse inline markdown: **bold**, `code`, and [text](url) clickable links */
  const parseInline = (raw: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Combined regex: links, bold, inline code
    const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(raw)) !== null) {
      if (m.index > last) parts.push(raw.slice(last, m.index));
      if (m[1] && m[2]) {
        // Markdown link [label](url)
        parts.push(
          <a
            key={m.index}
            href={m[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-300 underline underline-offset-2 hover:text-indigo-100 transition-colors"
          >
            {m[1]}
          </a>
        );
      } else if (m[3]) {
        // **bold**
        parts.push(<strong key={m.index} className="font-semibold text-white">{m[3]}</strong>);
      } else if (m[4]) {
        // `code`
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
          className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer relative"
          aria-label="Open AI Concierge Chatbot"
        >
          <Sparkles className="w-7 h-7 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white"></span>
        </button>
      )}

      {/* Chat Popup Window */}
      {isOpen && !isMinimized && (
        <div className="w-[92vw] sm:w-[420px] h-[590px] max-h-[85vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl shadow-indigo-950/80 flex flex-col overflow-hidden animate-fade-in transition-all">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 p-0.5 shadow-md">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse-subtle" />
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white tracking-tight">EventHub AI Assistant</h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                    RAG + Gemini 1.5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{activeEvent.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
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
          <div className="px-4 py-1.5 bg-indigo-950/80 border-b border-indigo-900/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
              <Wifi className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>WiFi: <code className="text-white bg-indigo-900 px-1 rounded font-mono">{wifiName}</code></span>
            </div>
            <div className="text-indigo-300 font-semibold">
              <span>Pass: <code className="text-white bg-indigo-900 px-1 rounded font-mono">{wifiPass}</code></span>
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
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-indigo-400'
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
                  className={`max-w-[82%] rounded-2xl p-3.5 space-y-2 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.sender === 'ai' ? (
                    renderMarkdown(msg.text)
                  ) : (
                    <p className="text-xs whitespace-pre-wrap">{msg.text}</p>
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
                      <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 font-medium truncate">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Source: {msg.sources?.[0] || 'Event Knowledge Base'}</span>
                      </div>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800/70 text-indigo-300 shrink-0">
                        Hybrid AI
                      </span>
                    </div>
                  )}

                  <span
                    className={`block text-[9px] ${
                      msg.sender === 'user' ? 'text-indigo-200 text-right' : 'text-slate-500'
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
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">Hybrid RAG &amp; Gemini AI đang suy luận...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 overflow-x-auto flex gap-1.5 scrollbar-none">
            {QUICK_SUGGESTIONS.map((chip, idx) => (
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
                placeholder="Hỏi về WiFi tổng, WiFi phòng họp, lịch trình..."
                disabled={loading}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
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
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> RAG + Gemini AI Concierge · UTC+7
              </span>
              <span>Google Maps · Real-time VN</span>
            </div>
          </form>
        </div>
      )}

      {/* Minimized FAB Button */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer relative"
        >
          <Sparkles className="w-7 h-7 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white"></span>
        </button>
      )}
    </div>
  );
};

export default FloatingChatbot;
