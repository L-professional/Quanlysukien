import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  Users,
  MessageSquare,
  ThumbsUp,
  Pin,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  FileText,
  UploadCloud,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronLeft,
  RefreshCw,
  Radio,
  Eye,
  Trash2,
  Send,
  HelpCircle,
} from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'sonner';

export const SpeakerControlCenter: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const numericSessionId = Number(sessionId) || 1;

  // Session & Control States
  const [session, setSession] = useState<any>(null);
  const [_loading, setLoading] = useState<boolean>(true);

  // Q&A Stream States
  const [questions, setQuestions] = useState<any[]>([]);
  const [qaLoading, setQaLoading] = useState<boolean>(false);
  const [qaSortBy, setQaSortBy] = useState<'upvotes' | 'created_at'>('upvotes');
  const [qaFilter, setQaFilter] = useState<'ALL' | 'PINNED' | 'ANSWERING' | 'PENDING' | 'ANSWERED'>('ALL');
  const [answeringQuestionId, setAnsweringQuestionId] = useState<number | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<string>('');

  // Countdown Timer States (Default 45 minutes)
  const [timerSeconds, setTimerSeconds] = useState<number>(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Slide & Resource States
  const [resources, setResources] = useState<any[]>([]);
  const [activeSlideUrl, setActiveSlideUrl] = useState<string>('');
  const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadLinkUrl, setUploadLinkUrl] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-refresh Q&A poll interval
  useEffect(() => {
    fetchSessionData();
    fetchQAStream();

    const interval = setInterval(() => {
      fetchQAStream(false);
    }, 8000); // 8-second stage live stream poll

    return () => clearInterval(interval);
  }, [numericSessionId, qaSortBy, qaFilter]);

  // Countdown timer effect
  useEffect(() => {
    let timer: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      timer = setInterval(() => {
        setTimerSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timerSeconds]);

  const fetchSessionData = async () => {
    try {
      const data = await apiService.getSpeakerSessionDetail(numericSessionId);
      setSession(data);
      if (data.resources && data.resources.length > 0) {
        setResources(data.resources);
        if (!activeSlideUrl) {
          setActiveSlideUrl(data.resources[0].file_url);
        }
      }
    } catch (err) {
      console.error('Error loading session detail:', err);
      toast.error('Không thể tải thông tin phiên');
    } finally {
      setLoading(false);
    }
  };

  const fetchQAStream = async (showLoader = true) => {
    if (showLoader) setQaLoading(true);
    try {
      const qList = await apiService.getSpeakerSessionQA(numericSessionId, qaSortBy, qaFilter);
      setQuestions(qList);

      // Detect current answering question
      const currentAnswering = qList.find((q: any) => q.status === 'answering');
      if (currentAnswering) {
        setAnsweringQuestionId(currentAnswering.id);
      }
    } catch (err) {
      console.error('Error loading QA stream:', err);
    } finally {
      if (showLoader) setQaLoading(false);
    }
  };

  // Timer format (HH:MM:SS or MM:SS)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Status Action Handlers
  const handleSetQuestionStatus = async (questionId: number, targetStatus: string, answer?: string) => {
    try {
      await apiService.updateSpeakerQuestionStatus(questionId, targetStatus, answer);
      if (targetStatus === 'answering') {
        setAnsweringQuestionId(questionId);
        toast.success('Đã chọn câu hỏi thảo luận trực tiếp trên sân khấu!');
      } else if (targetStatus === 'answered') {
        if (answeringQuestionId === questionId) setAnsweringQuestionId(null);
        toast.success('Đã đánh dấu hoàn tất câu hỏi!');
      } else if (targetStatus === 'pinned') {
        toast.success('Đã ghim câu hỏi lên màn hình chính!');
      }
      fetchQAStream(false);
    } catch (err) {
      toast.error('Không thể cập nhật trạng thái câu hỏi');
    }
  };

  const handleSendReply = async (questionId: number) => {
    if (!replyText.trim()) return;
    await handleSetQuestionStatus(questionId, 'answered', replyText.trim());
    setActiveReplyId(null);
    setReplyText('');
  };

  // Slide Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    try {
      const res = await apiService.uploadSpeakerSlide(numericSessionId, formData);
      setResources((prev) => [res, ...prev]);
      setActiveSlideUrl(res.file_url);
      toast.success(`Đã tải lên slide bài giảng: ${file.name}`);
    } catch (err) {
      toast.error('Tải file slide thất bại. Vui lòng thử lại!');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLinkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadLinkUrl.trim()) {
      toast.error('Vui lòng dán link tài liệu hoặc slide!');
      return;
    }

    setIsUploading(true);
    try {
      const res = await apiService.uploadSpeakerSlide(numericSessionId, {
        title: uploadTitle.trim() || 'Slide Trực Tuyến',
        file_url: uploadLinkUrl.trim(),
      });
      setResources((prev) => [res, ...prev]);
      setActiveSlideUrl(res.file_url);
      setUploadLinkUrl('');
      setUploadTitle('');
      toast.success('Đã đính kèm link slide bài giảng thành công!');
    } catch (err) {
      toast.error('Không thể thêm link tài liệu');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResource = async (resId: number) => {
    try {
      await apiService.deleteSpeakerResource(resId);
      setResources((prev) => prev.filter((r) => r.id !== resId));
      if (resources.length > 1) {
        const remaining = resources.filter((r) => r.id !== resId);
        setActiveSlideUrl(remaining[0]?.file_url || '');
      } else {
        setActiveSlideUrl('');
      }
      toast.success('Đã gỡ slide tài liệu khỏi phiên');
    } catch (err) {
      toast.error('Không thể xóa tài liệu');
    }
  };

  // Timer Color logic
  const isTimerCritical = timerSeconds <= 5 * 60; // < 5 mins
  const isTimerWarning = timerSeconds <= 10 * 60 && !isTimerCritical; // < 10 mins

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans select-none -m-4 sm:-m-6 lg:-m-8 p-3 sm:p-5 lg:p-6 space-y-4">
      {/* =========================================================================
          TOP BAR: Studio Stage Header (High Contrast, Large Typography)
         ========================================================================= */}
      <header className="bg-[#0D1322] border border-slate-800/80 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xl shrink-0">
        {/* Left: Back button & Session title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/speaker/dashboard')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Quay lại Cổng Diễn Giả"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                LIVE STAGE CONTROL
              </span>
              <span className="text-xs text-slate-400 font-medium truncate">
                {session?.room_location || 'Hội Trường Chính'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-tight truncate max-w-xl">
              {session?.title || 'Đang tải thông tin phiên diễn thuyết...'}
            </h1>
          </div>
        </div>

        {/* Center / Right: Stage Counters (Timer + Audience) */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-auto">
          {/* Real-time Audience Check-in Counter */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Khán Giả Check-in</div>
              <div className="text-lg font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                <span>{session?.checked_in_count || 0}</span>
                <span className="text-xs font-semibold text-slate-500">/ {session?.capacity || 100}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              </div>
            </div>
          </div>

          {/* Real-time Stage Countdown Timer */}
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all shadow-inner ${
              isTimerCritical
                ? 'bg-rose-950/40 border-rose-600 text-rose-300 animate-pulse'
                : isTimerWarning
                ? 'bg-amber-950/40 border-amber-600 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-emerald-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider">
                {formatTimer(timerSeconds)}
              </span>
            </div>

            {/* Timer Control Buttons */}
            <div className="flex items-center gap-1 border-l border-slate-700/60 pl-2">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                title={isTimerRunning ? 'Tạm dừng đếm ngược' : 'Bắt đầu đếm ngược'}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
              <button
                type="button"
                onClick={() => setTimerSeconds((prev) => prev + 5 * 60)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-white cursor-pointer transition-colors"
                title="Cộng thêm 5 phút thuyết trình"
              >
                +5m
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(45 * 60);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Khởi tạo lại đồng hồ (45 phút)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN STUDIO GRID: 2 COLUMNS (Left: Live Q&A Stream, Right: Slide & Materials)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 flex-1 min-h-0">
        {/* =======================================================================
            LEFT COLUMN (7/12): Live Q&A Stream from Audience
           ======================================================================= */}
        <section className="lg:col-span-7 bg-[#0D1322] border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl overflow-hidden min-h-[580px]">
          {/* Header Controls: Sort & Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>Q&A Khán Giả Real-Time</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {questions.length} câu hỏi
                  </span>
                </h2>
              </div>
            </div>

            {/* Sort & Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setQaSortBy('upvotes')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    qaSortBy === 'upvotes'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔥 Upvote Nhiều Nhất
                </button>
                <button
                  type="button"
                  onClick={() => setQaSortBy('created_at')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    qaSortBy === 'created_at'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⏱️ Mới Nhất
                </button>
              </div>

              <button
                type="button"
                onClick={() => fetchQAStream(true)}
                disabled={qaLoading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Làm mới câu hỏi ngay"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${qaLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto text-xs shrink-0 scrollbar-none">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'ANSWERING', label: '▶️ Đang Trả Lời' },
              { key: 'PINNED', label: '📌 Ghim Sân Khấu' },
              { key: 'PENDING', label: '⏳ Chờ Trả Lời' },
              { key: 'ANSWERED', label: '✅ Đã Xong' },
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setQaFilter(chip.key as any)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  qaFilter === chip.key
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Scrollable Questions Stream (High Contrast & Big Font) */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1 min-h-0">
            {qaLoading && questions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                <p className="text-xs">Đang đồng bộ câu hỏi từ khán phòng...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
                <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">Chưa có câu hỏi nào trong danh mục này</p>
                <p className="text-xs text-slate-600 mt-1">Câu hỏi của khán giả gửi qua app sẽ hiển thị trực tiếp tại đây.</p>
              </div>
            ) : (
              questions.map((q) => {
                const isAnswering = q.status === 'answering';
                const isPinned = q.status === 'pinned';
                const isAnswered = q.status === 'answered';

                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl p-4 sm:p-5 transition-all duration-300 border ${
                      isAnswering
                        ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/50'
                        : isPinned
                        ? 'bg-amber-950/30 border-amber-500/60 shadow-md'
                        : isAnswered
                        ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Status Ribbon & Asker Info */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-extrabold text-white">{q.asker_name}</span>
                        <span className="text-[11px] text-slate-400">• {q.created_at}</span>
                      </div>

                      {/* Top Badges */}
                      <div className="flex items-center gap-1.5">
                        {isAnswering && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <Radio className="w-3 h-3 text-slate-950" />
                            ĐANG TRẢ LỜI
                          </span>
                        )}
                        {isPinned && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold flex items-center gap-1">
                            <Pin className="w-3 h-3" />
                            GHIM
                          </span>
                        )}
                        {isAnswered && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                            ĐÃ XONG
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Content (Large Legible Typography for Stage) */}
                    <div className="flex items-start gap-3.5 my-2.5">
                      {/* Big Upvote Badge */}
                      <div className="flex flex-col items-center justify-center min-w-[50px] p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-amber-400 shrink-0">
                        <ThumbsUp className="w-4 h-4 fill-current" />
                        <span className="text-base font-black leading-tight mt-0.5 text-white">
                          {q.upvotes || 0}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Votes</span>
                      </div>

                      <p
                        className={`text-sm sm:text-base lg:text-lg font-bold leading-snug flex-1 ${
                          isAnswering ? 'text-emerald-100 font-extrabold' : 'text-slate-100'
                        }`}
                      >
                        "{q.question_text || q.question}"
                      </p>
                    </div>

                    {/* Display Answer if already answered */}
                    {q.answer && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300">
                        <span className="font-bold text-emerald-400">Trả lời từ diễn giả: </span>
                        {q.answer}
                      </div>
                    )}

                    {/* Reply Input Box (when active) */}
                    {activeReplyId === q.id && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Nhập nội dung tóm tắt câu trả lời cho khán giả..."
                          className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveReplyId(null)}
                            className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendReply(q.id)}
                            className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center gap-1.5"
                          >
                            <Send className="w-3 h-3" />
                            Gửi & Hoàn tất
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Fast Stage Action Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/60">
                      <div className="flex items-center gap-2">
                        {/* 1. Đang trả lời */}
                        <button
                          type="button"
                          onClick={() => handleSetQuestionStatus(q.id, isAnswering ? 'pending' : 'answering')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            isAnswering
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                              : 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isAnswering ? 'Dừng trả lời' : '▶️ Đang trả lời'}</span>
                        </button>

                        {/* 2. Ghim */}
                        <button
                          type="button"
                          onClick={() => handleSetQuestionStatus(q.id, isPinned ? 'pending' : 'pinned')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isPinned
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                          <span>{isPinned ? 'Bỏ Ghim' : '📌 Ghim'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Text reply toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReplyId(activeReplyId === q.id ? null : q.id);
                            setReplyText(q.answer || '');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          Soạn phản hồi
                        </button>

                        {/* 3. Đã xong */}
                        <button
                          type="button"
                          onClick={() => handleSetQuestionStatus(q.id, isAnswered ? 'pending' : 'answered')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isAnswered
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isAnswered ? 'Mở lại' : '✅ Đã xong'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* =======================================================================
            RIGHT COLUMN (5/12): Slide & Presentation Resources Manager
           ======================================================================= */}
        <section className="lg:col-span-5 bg-[#0D1322] border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white">Slide & Tài Liệu Sân Khấu</h2>
                <p className="text-[11px] text-slate-400">PDF, Google Slides, Canva</p>
              </div>
            </div>

            {/* Quick Upload Button trigger */}
            <label className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Đang tải...' : 'Upload PDF'}</span>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.ppt,.pptx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Interactive Slide Viewer Preview Box */}
          <div className="flex-1 flex flex-col min-h-[300px] rounded-xl overflow-hidden border border-slate-800 bg-[#060911] relative">
            {/* Viewer Toolbar */}
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
              <span className="font-bold text-slate-300 truncate max-w-[200px] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Xem trước slide</span>
              </span>

              <div className="flex items-center gap-1.5">
                {activeSlideUrl && (
                  <>
                    <a
                      href={activeSlideUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Mở link ngoài"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title={isFullscreenPreview ? 'Thu nhỏ' : 'Toàn màn hình'}
                    >
                      {isFullscreenPreview ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Viewer Frame */}
            <div className="flex-1 relative flex items-center justify-center bg-slate-950">
              {activeSlideUrl ? (
                <iframe
                  title="Stage Slide Presentation"
                  src={activeSlideUrl}
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                  <p className="text-xs font-semibold text-slate-400">Chưa có slide nào được chọn</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Tải lên file PDF hoặc chọn tài liệu bên dưới để chiếu</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Paste Slide URL Form */}
          <form onSubmit={handleLinkUpload} className="space-y-2 pt-1 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                placeholder="Tên slide (vd: Keynote AI.pdf)"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 text-xs"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Dán link Canva / Drive / Slide URL..."
                  value={uploadLinkUrl}
                  onChange={(e) => setUploadLinkUrl(e.target.value)}
                  className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500 text-xs"
                />
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  Thêm
                </button>
              </div>
            </div>
          </form>

          {/* Uploaded Resources List */}
          <div className="space-y-2 shrink-0">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Danh Sách Slide Đã Đính Kèm ({resources.length})</span>
            </div>

            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
              {resources.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-600 bg-slate-900/50 rounded-xl">
                  Chưa có tài liệu đính kèm nào.
                </div>
              ) : (
                resources.map((res) => {
                  const isActive = activeSlideUrl === res.file_url;
                  return (
                    <div
                      key={res.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        isActive
                          ? 'bg-purple-950/40 border-purple-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSlideUrl(res.file_url)}
                        className="flex items-center gap-2 truncate text-xs font-bold text-left flex-1 cursor-pointer"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] uppercase font-mono">
                          {res.file_type || 'PDF'}
                        </span>
                        <span className="truncate">{res.title}</span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0 text-xs">
                        <span className="text-[10px] text-slate-500 font-mono">{res.file_size}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(res.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Xóa slide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
          FULLSCREEN SLIDE MODAL (When speaker needs full slide display)
         ========================================================================= */}
      {isFullscreenPreview && activeSlideUrl && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
            <span className="font-bold text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              <span>Chế Độ Toàn Màn Hình: {session?.title}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreenPreview(false)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
            >
              ✕ Thu nhỏ
            </button>
          </div>
          <iframe
            title="Fullscreen Stage Slide"
            src={activeSlideUrl}
            className="w-full flex-1 border-0"
          />
        </div>
      )}
    </div>
  );
};

export default SpeakerControlCenter;
