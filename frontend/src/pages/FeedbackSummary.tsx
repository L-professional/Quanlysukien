import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  ThumbsUp,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  Sparkles,
  TrendingUp,
  Bot,
  Star,
  MessageSquare,
  Copy,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { formatVietnameseDateTime } from '../utils/formatters';

interface FeedbackItem {
  id: number;
  user_id?: number;
  user_name: string;
  user_email?: string;
  event_id: number;
  event_title?: string;
  session_id?: number;
  session_title?: string;
  rating: number;
  comment: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  created_at: string;
}

interface AISummaryData {
  sentiment: {
    positive_percent: number;
    neutral_percent: number;
    negative_percent: number;
    total_analyzed: number;
  };
  strengths: string[];
  improvements: string[];
  executive_summary: string;
  recommendations?: string[];
}

export const FeedbackSummary: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'feedback'>('analytics');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStar, setSelectedStar] = useState<number | null>(null);

  // Data state
  const [stats, setStats] = useState<{
    total_reviews: number;
    average_rating: number;
    satisfaction_rate: number;
    star_distribution: Record<number, number>;
    sentiment_breakdown: Record<string, number>;
  }>({
    total_reviews: 0,
    average_rating: 0,
    satisfaction_rate: 0,
    star_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
  });

  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [aiSummary, setAiSummary] = useState<AISummaryData | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  // Fetch Stats & Feedback list
  const loadFeedbackData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const res = await apiService.getFeedbackStats({
        rating: selectedStar || undefined,
      });

      setStats({
        total_reviews: res.total_reviews || 0,
        average_rating: res.average_rating || 0,
        satisfaction_rate: res.satisfaction_rate || 0,
        star_distribution: res.star_distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        sentiment_breakdown: res.sentiment_breakdown || { positive: 0, neutral: 0, negative: 0 },
      });

      setFeedbackList(res.feedbacks || []);
      if (isRefresh) {
        toast.success('Đã làm mới dữ liệu đánh giá!');
      }
    } catch (err: any) {
      console.error('Failed to load feedback data:', err);
      toast.error('Không thể tải dữ liệu phản hồi.');
    } finally {
      setLoading(false);
    }
  }, [selectedStar]);

  useEffect(() => {
    loadFeedbackData();
  }, [loadFeedbackData]);

  // Trigger AI Analysis
  const handleGenerateAISummary = async () => {
    setAiLoading(true);
    try {
      const res = await apiService.getFeedbackAISummary();
      if (res.success && res.data) {
        setAiSummary(res.data);
        setAnalyzedAt(res.analyzed_at || new Date().toISOString());
        toast.success('AI đã hoàn thành phân tích tổng hợp phản hồi!');
      } else {
        toast.error('Không thể tạo báo cáo AI tổng hợp.');
      }
    } catch (err: any) {
      console.error('AI summary error:', err);
      toast.error('Lỗi khi phân tích phản hồi bằng AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // Initial AI summary fetch once on mount if null
  useEffect(() => {
    if (!aiSummary) {
      handleGenerateAISummary();
    }
  }, []);

  // Filter feedback
  const filteredFeedbacks = feedbackList.filter((item) => {
    const matchesSearch =
      item.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.session_title && item.session_title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStar = selectedStar === null || item.rating === selectedStar;
    return matchesSearch && matchesStar;
  });

  const copyExecutiveSummary = () => {
    if (aiSummary?.executive_summary) {
      navigator.clipboard.writeText(aiSummary.executive_summary);
      toast.success('Đã sao chép Tóm tắt Điều hành vào bộ nhớ tạm!');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            {t('feedback.title', 'Phản Hồi & Phân Tích Sự Kiện')}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {t('feedback.subtitle', 'Tổng hợp đánh giá 1-5 sao của người tham dự và phân tích thông minh bằng AI Concierge')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadFeedbackData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            {t('common.refresh', 'Làm mới')}
          </button>

          <button
            onClick={handleGenerateAISummary}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
            {aiLoading ? 'Đang Phân Tích...' : '✨ Phân Tích Bằng AI'}
          </button>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Rating */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Điểm Đánh Giá TB
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.average_rating ? stats.average_rating.toFixed(1) : '5.0'}
            </span>
            <span className="text-sm font-semibold text-slate-400">/ 5.0 ⭐</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= Math.round(stats.average_rating || 5)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200 fill-slate-100'
                }`}
              />
            ))}
            <span className="text-[11px] text-slate-500 font-medium ml-1.5">
              Dựa trên {stats.total_reviews} lượt
            </span>
          </div>
        </div>

        {/* Card 2: Satisfaction Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tỷ Lệ Hài Lòng
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">
              {stats.satisfaction_rate}%
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {stats.satisfaction_rate >= 80 ? 'Rất Cao' : 'Tốt'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-2">
            Khách cho điểm 4 và 5 sao
          </p>
        </div>

        {/* Card 3: Total Reviews */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng Lượt Phản Hồi
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.total_reviews}
            </span>
            <span className="text-xs font-semibold text-slate-500">lượt gửi</span>
          </div>
          <p className="text-[11px] text-indigo-600 font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác thực check-in
          </p>
        </div>

        {/* Card 4: Star Breakdown Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Phân Bổ Số Sao
            </span>
            <span className="text-[10px] font-bold text-slate-400">1 - 5 Sao</span>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => {
              const count = stats.star_distribution[s] || 0;
              const pct = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-4 font-bold text-slate-600 text-[11px]">{s}★</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        s >= 4 ? 'bg-amber-400' : s === 3 ? 'bg-slate-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-semibold text-slate-400 text-[10px]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Báo Cáo Phân Tích AI
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Danh Sách Nhận Xét ({feedbackList.length})
        </button>
      </div>

      {/* TAB 1: AI CONCIERGE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden border border-indigo-800/40">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-indigo-800/60 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <Bot className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white tracking-wide">
                        AI Executive Summary
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                        Live Analysis
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 mt-0.5">
                      Tóm tắt điều hành dành cho Ban Tổ Chức & Quản lý Sự kiện
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyExecutiveSummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-100 text-xs font-semibold backdrop-blur-sm border border-white/10 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép tóm tắt
                  </button>
                  {analyzedAt && (
                    <span className="text-[11px] text-indigo-300/80 font-mono">
                      Cập nhật: {formatVietnameseDateTime(analyzedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Executive Summary Content */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md mb-6">
                <p className="text-sm sm:text-base leading-relaxed text-indigo-100/95 font-medium">
                  {aiSummary?.executive_summary ||
                    'Đang tải tóm tắt điều hành từ AI Concierge... Hãy bấm nút [✨ Phân Tích Bằng AI] phía trên để kích hoạt.'}
                </p>
              </div>

              {/* Sentiment Breakdown Bar */}
              {aiSummary?.sentiment && (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-200 mb-2">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-300" />
                      Phân Bổ Cảm Xúc (Sentiment Analysis)
                    </span>
                    <span>{aiSummary.sentiment.total_analyzed} phản hồi đã phân tích</span>
                  </div>

                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                    <div
                      className="bg-emerald-500 rounded-l-full transition-all duration-500"
                      style={{ width: `${aiSummary.sentiment.positive_percent}%` }}
                      title={`Tích cực: ${aiSummary.sentiment.positive_percent}%`}
                    />
                    <div
                      className="bg-amber-400 transition-all duration-500"
                      style={{ width: `${aiSummary.sentiment.neutral_percent}%` }}
                      title={`Trung tính: ${aiSummary.sentiment.neutral_percent}%`}
                    />
                    <div
                      className="bg-rose-500 rounded-r-full transition-all duration-500"
                      style={{ width: `${aiSummary.sentiment.negative_percent}%` }}
                      title={`Tiêu cực: ${aiSummary.sentiment.negative_percent}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold mt-2 pt-1">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Tích cực: {aiSummary.sentiment.positive_percent}%
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Trung tính: {aiSummary.sentiment.neutral_percent}%
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      Tiêu cực: {aiSummary.sentiment.negative_percent}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3 Pillars Grid: Strengths, Improvements, Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Top 3 Strengths */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-xs relative overflow-hidden bg-gradient-to-b from-emerald-50/50 to-white">
              <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-emerald-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <ThumbsUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">
                    3 Điểm Hài Lòng Nhất
                  </h4>
                  <p className="text-[10px] text-emerald-600 font-semibold">Ưu điểm nổi bật nhất</p>
                </div>
              </div>

              <div className="space-y-3">
                {aiSummary?.strengths && aiSummary.strengths.length > 0 ? (
                  aiSummary.strengths.map((st, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-2xs flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs font-medium text-slate-800 leading-relaxed">{st}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Đang chờ dữ liệu AI...</p>
                )}
              </div>
            </div>

            {/* 2. Top 3 Improvements */}
            <div className="bg-white rounded-3xl p-6 border border-rose-200/80 shadow-xs relative overflow-hidden bg-gradient-to-b from-rose-50/50 to-white">
              <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-rose-100">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800">
                    3 Điểm Cần Cải Thiện
                  </h4>
                  <p className="text-[10px] text-rose-600 font-semibold">Vấn đề phản ánh nhiều nhất</p>
                </div>
              </div>

              <div className="space-y-3">
                {aiSummary?.improvements && aiSummary.improvements.length > 0 ? (
                  aiSummary.improvements.map((imp, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-white border border-rose-100 shadow-2xs flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs font-medium text-slate-800 leading-relaxed">{imp}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Đang chờ dữ liệu AI...</p>
                )}
              </div>
            </div>

            {/* 3. Action Recommendations */}
            <div className="bg-white rounded-3xl p-6 border border-indigo-200/80 shadow-xs relative overflow-hidden bg-gradient-to-b from-indigo-50/50 to-white">
              <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-indigo-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-800">
                    Đề Xuất Hành Động Nhanh
                  </h4>
                  <p className="text-[10px] text-indigo-600 font-semibold">Tối ưu cho sự kiện kế tiếp</p>
                </div>
              </div>

              <div className="space-y-3">
                {aiSummary?.recommendations && aiSummary.recommendations.length > 0 ? (
                  aiSummary.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-2xs flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs font-medium text-slate-800 leading-relaxed">{rec}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-2xs flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      Tiếp tục phát huy quy trình soát vé rảnh tay Auto-Scan QR và trợ lý AI Concierge.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED FEEDBACK LIST */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo người gửi, nhận xét, phiên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Star Filter Pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Lọc sao:
              </span>
              {[
                { star: null, label: 'Tất cả' },
                { star: 5, label: '5 ★' },
                { star: 4, label: '4 ★' },
                { star: 3, label: '3 ★' },
                { star: 2, label: '2 ★' },
                { star: 1, label: '1 ★' },
              ].map((pill) => (
                <button
                  key={String(pill.star)}
                  onClick={() => setSelectedStar(pill.star)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedStar === pill.star
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Người Tham Dự
                    </th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Đánh Giá
                    </th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Cảm Xúc
                    </th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Phiên / Sự Kiện
                    </th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Nội Dung Nhận Xét
                    </th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Thời Gian
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFeedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        Không tìm thấy nhận xét nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredFeedbacks.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* User Name & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                              {item.user_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{item.user_name}</p>
                              {item.user_email && (
                                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                                  {item.user_email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Star Rating */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < item.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-slate-100 text-slate-200'
                                }`}
                              />
                            ))}
                            <span className="text-xs font-bold text-slate-700 ml-1.5">
                              {item.rating}★
                            </span>
                          </div>
                        </td>

                        {/* Sentiment Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              item.sentiment === 'positive'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.sentiment === 'neutral'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {item.sentiment === 'positive'
                              ? 'Tích Cực'
                              : item.sentiment === 'neutral'
                              ? 'Trung Tính'
                              : 'Cần Lưu Ý'}
                          </span>
                        </td>

                        {/* Session / Event */}
                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1 max-w-[200px]">
                            {item.session_title || item.event_title || 'Toàn bộ sự kiện'}
                          </p>
                        </td>

                        {/* Comment Text */}
                        <td className="py-3.5 px-4 max-w-sm">
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">
                            {item.comment}
                          </p>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            {formatVietnameseDateTime(item.created_at)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackSummary;
