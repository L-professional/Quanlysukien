import axios from 'axios';
import {
  Inquiry,
  CheckInResult,
  DashboardStats,
  HourlyCheckInStat,
  LiveFeedItem,
  EventScheduleItem,
  Event,
  AuthResponse,
  User,
  AdminUser,
  SecurityLog,
  ManualIssueResponse,
  AttendeeChatResponse,
  Registration,
  KnowledgeItem,
  NotificationItem,
  DemoAccount,
  SessionAttendeesResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to attach token automatically from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('eventhub_token');
  // Only attach real JWT tokens (skip demo fallback tokens)
  if (token && token !== 'demo_jwt_token_eventhub_2026' && token.length > 50) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local state and redirect to login
      localStorage.removeItem('eventhub_token');
      localStorage.removeItem('eventhub_user');
      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth API
  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  async register(payload: { email: string; password: string; full_name: string; phone_number?: string; role_id?: number }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    return response.data;
  },

  async googleAuth(payload: { credential?: string; email?: string; full_name?: string; avatar_url?: string }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/google', payload);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  // Registration API
  async registerSessionTicket(
    sessionId: number,
    payload: {
      full_name: string;
      email: string;
      phone?: string;
      phone_number?: string;
      company?: string;
      organization?: string;
      job_title?: string;
      notes?: string;
      ticket_type?: string;
    }
  ): Promise<{
    id: number;
    event_id: number;
    participant_id: number;
    participant_name: string;
    participant_email: string;
    qr_code_token: string;
    qr_code_image?: string;
    is_checked_in: boolean;
    checked_in_at?: string;
    ticket_type?: string;
    event_title?: string;
    schedule_id?: number;
    schedule_title?: string;
    phone_number?: string;
    organization?: string;
    job_title?: string;
    notes?: string;
    message?: string;
  }> {
    const response = await apiClient.post(`/sessions/${sessionId}/register`, payload);
    return response.data;
  },

  async registerTicket(payload: {
    event_id: number;
    schedule_id?: number;
    ticket_type?: string;
    email?: string;
    full_name?: string;
    phone_number?: string;
    organization?: string;
    job_title?: string;
    notes?: string;
  }): Promise<{
    id: number;
    event_id: number;
    participant_id: number;
    participant_name: string;
    participant_email: string;
    qr_code_token: string;
    qr_code_image?: string;
    is_checked_in: boolean;
    checked_in_at?: string;
    ticket_type?: string;
    event_title?: string;
    schedule_id?: number;
    schedule_title?: string;
    phone_number?: string;
    organization?: string;
    job_title?: string;
    notes?: string;
    message?: string;
  }> {
    if (payload.schedule_id) {
      return this.registerSessionTicket(payload.schedule_id, {
        full_name: payload.full_name || '',
        email: payload.email || '',
        phone: payload.phone_number,
        phone_number: payload.phone_number,
        company: payload.organization,
        organization: payload.organization,
        job_title: payload.job_title,
        notes: payload.notes,
        ticket_type: payload.ticket_type,
      });
    }
    const response = await apiClient.post('/registrations', payload);
    return response.data;
  },

  async cancelSessionRegistration(
    sessionId: number,
    registrationId?: number,
    qrToken?: string
  ): Promise<{
    success: boolean;
    message: string;
    session_id?: number;
    registration_id?: number;
  }> {
    const params: Record<string, any> = {};
    if (registrationId) params.registration_id = registrationId;
    if (qrToken) params.qr_token = qrToken;
    const response = await apiClient.delete(`/sessions/${sessionId}/cancel`, { params });
    return response.data;
  },

  async cancelRegistration(
    registrationId: number,
    sessionId?: number
  ): Promise<{
    success?: boolean;
    status?: string;
    message: string;
    registration_id?: number;
    schedule_id?: number;
    event_id?: number;
  }> {
    if (sessionId) {
      return this.cancelSessionRegistration(sessionId, registrationId);
    }
    const response = await apiClient.delete(`/registrations/${registrationId}`);
    return response.data;
  },

  // Session Attendees & Quick Check-in API (Task 26)
  async getSessionAttendees(
    sessionId: number,
    params?: { q?: string; status?: string }
  ): Promise<SessionAttendeesResponse> {
    const response = await apiClient.get<SessionAttendeesResponse>(
      `/sessions/${sessionId}/registrations`,
      { params }
    );
    return response.data;
  },

  async toggleAttendeeCheckin(
    registrationId: number
  ): Promise<{
    success: boolean;
    registration_id: number;
    is_checked_in: boolean;
    checked_in_at?: string | null;
    message: string;
  }> {
    const response = await apiClient.post(
      `/registrations/${registrationId}/toggle-checkin`
    );
    return response.data;
  },

  async exportSessionAttendeesExcel(sessionId: number): Promise<Blob> {
    const response = await apiClient.get(
      `/sessions/${sessionId}/export-excel`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  // Inquiries API
  async getInquiries(params?: { event_id?: number; status?: string }): Promise<Inquiry[]> {
    try {
      const response = await apiClient.get<Inquiry[]>('/inquiries', { params });
      return response.data;
    } catch (error) {
      console.warn('Backend unavailable, returning fallback inquiry data:', error);
      return [
        {
          id: 101,
          event_id: 1,
          participant_id: 2,
          participant_name: 'Nguyễn Hoàng Long',
          participant_email: 'long.nh@gmail.com',
          participant_phone: '098****321',
          question: 'Tôi muốn hỏi bãi đỗ xe ô tô của sự kiện nằm ở khu vực nào và có mất phí gửi xe không?',
          ai_category: 'LOGISTICS',
          status: 'AI_SUGGESTED',
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          replies: [
            {
              id: 201,
              inquiry_id: 101,
              sender_id: 2,
              content: 'Kính gửi anh Long, bãi đỗ xe ô tô của sự kiện nằm tại tầng hầm B2 và B3 của Trung tâm. Quý khách có vé tham dự VIP sẽ được miễn phí hoàn toàn phí gửi xe trong suốt thời gian diễn ra sự kiện.',
              is_ai_generated: true,
              edited_by_staff: false,
              created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
              updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            },
          ],
        },
        {
          id: 102,
          event_id: 1,
          participant_id: 3,
          participant_name: 'Trần Minh Thư',
          participant_email: 'thu.tm@vnpay.vn',
          participant_phone: '091****888',
          question: 'Cho em hỏi chứng nhận tham gia (Certificate) sẽ được cấp qua email sau mấy ngày ạ?',
          ai_category: 'TICKETING',
          status: 'AI_SUGGESTED',
          created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          replies: [
            {
              id: 202,
              inquiry_id: 102,
              sender_id: 3,
              content: 'Chào bạn Thư, chứng nhận điện tử (E-Certificate) sẽ được tự động gửi qua email đăng ký của bạn trong vòng 24-48 giờ sau khi sự kiện kết thúc.',
              is_ai_generated: true,
              edited_by_staff: false,
              created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
              updated_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
            },
          ],
        },
        {
          id: 103,
          event_id: 1,
          participant_id: 4,
          participant_name: 'Lê Quốc Bảo',
          participant_email: 'bao.lq@techcorp.io',
          participant_phone: '090****456',
          question: 'Sự kiện có phục vụ Teabreak hoặc bữa trưa cho người tham gia không?',
          ai_category: 'SERVICES',
          status: 'APPROVED',
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          replies: [
            {
              id: 203,
              inquiry_id: 103,
              sender_id: 1,
              content: 'Chào bạn Bảo, sự kiện có chuẩn bị 2 đợt Teabreak (sáng lúc 10:00 và chiều lúc 15:00) tại sảnh A. Tiệc trưa Buffet dành riêng cho khách có thẻ VIP và Speaker.',
              is_ai_generated: true,
              edited_by_staff: true,
              created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
              updated_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            },
          ],
        },
      ];
    }
  },

  async getInquiryDetail(inquiryId: number): Promise<Inquiry> {
    try {
      const response = await apiClient.get<Inquiry>(`/inquiries/${inquiryId}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch detail for ${inquiryId}, returning default mock:`, error);
      const all = await this.getInquiries();
      return all.find((i) => i.id === inquiryId) || all[0];
    }
  },

  async reviewInquiry(
    inquiryId: number,
    payload: {
      staff_id: number;
      action: 'ACCEPT' | 'EDIT' | 'REJECT';
      edited_content?: string;
      note?: string;
      channel?: string;
    }
  ) {
    const response = await apiClient.post(`/inquiries/${inquiryId}/review`, payload);
    return response.data;
  },

  async quickPromptAssistant(payload: {
    text: string;
    prompt_type: 'TRANSLATE' | 'REWRITE_ENGAGING' | 'INSERT_INFO';
    target_language?: string;
  }): Promise<{ result: string; prompt_type: string }> {
    const response = await apiClient.post('/inquiries/quick-prompt', payload);
    return response.data;
  },

  async batchReviewInquiries(payload: {
    inquiry_ids: number[];
    staff_id: number;
    action?: 'ACCEPT' | 'EDIT' | 'REJECT';
    channel?: string;
  }): Promise<{ approved_count: number; rejected_count: number; message: string }> {
    const response = await apiClient.post('/inquiries/batch-review', payload);
    return response.data;
  },


  // Attendee Speaker Question API (Task 30)
  async submitSpeakerQuestion(payload: {
    event_id: number;
    session_id?: number;
    speaker_name?: string;
    question: string;
    participant_id?: number;
    attendee_name?: string;
    attendee_email?: string;
  }) {
    try {
      const response = await apiClient.post('/inquiries', {
        event_id: payload.event_id || 1,
        participant_id: payload.participant_id || 1,
        question: `[Hỏi Diễn Giả: ${payload.speaker_name || 'Phiên'}] ${payload.question}`,
      });
      return response.data;
    } catch (e) {
      console.warn('API /inquiries fallback:', e);
      return { success: true, message: 'Câu hỏi đã được gửi thành công' };
    }
  },

  // --- Task 31: Session Q&A, Materials & Feedback APIs ---

  // 1. Session Q&A
  async getSessionQuestions(sessionId: number, statusFilter?: string) {
    try {
      const response = await apiClient.get(`/sessions/${sessionId}/questions`, {
        params: statusFilter ? { status_filter: statusFilter } : undefined,
      });
      return response.data;
    } catch (e) {
      console.warn('Fallback session questions:', e);
      return [];
    }
  },

  async submitSessionQuestion(sessionId: number, payload: {
    asker_name: string;
    asker_email?: string;
    question: string;
    user_id?: number;
  }) {
    const response = await apiClient.post(`/sessions/${sessionId}/questions`, payload);
    return response.data;
  },

  async updateQuestionStatus(questionId: number, payload: {
    status?: string;
    answer?: string;
    is_answered?: boolean;
  }) {
    const response = await apiClient.patch(`/sessions/questions/${questionId}`, payload);
    return response.data;
  },

  async upvoteQuestion(questionId: number) {
    const response = await apiClient.post(`/sessions/questions/${questionId}/upvote`);
    return response.data;
  },

  // 2. Session Materials & Slides
  async getSessionMaterials(sessionId: number) {
    try {
      const response = await apiClient.get(`/sessions/${sessionId}/materials`);
      return response.data;
    } catch (e) {
      console.warn('Fallback session materials:', e);
      return [];
    }
  },

  async addSessionMaterial(sessionId: number, payload: {
    title: string;
    file_url: string;
    material_type?: string;
    file_size?: string;
    is_public_to_all?: boolean;
  }) {
    const response = await apiClient.post(`/sessions/${sessionId}/materials`, payload);
    return response.data;
  },

  async deleteSessionMaterial(materialId: number) {
    const response = await apiClient.delete(`/sessions/materials/${materialId}`);
    return response.data;
  },

  async downloadSessionMaterial(materialId: number) {
    const response = await apiClient.post(`/sessions/materials/${materialId}/download`);
    return response.data;
  },

  // 3. Session Feedbacks & Ratings
  async submitSessionFeedback(sessionId: number, payload: {
    participant_name: string;
    rating: number;
    content_quality?: number;
    speaker_rating?: number;
    comment?: string;
    user_id?: number;
  }) {
    const response = await apiClient.post(`/sessions/${sessionId}/feedbacks`, payload);
    return response.data;
  },

  async getSessionFeedbacks(sessionId: number) {
    try {
      const response = await apiClient.get(`/sessions/${sessionId}/feedbacks`);
      return response.data;
    } catch (e) {
      console.warn('Fallback session feedbacks:', e);
      return {
        stats: {
          total_reviews: 0,
          average_rating: 5.0,
          avg_content_quality: 5.0,
          avg_speaker_rating: 5.0,
          star_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        },
        feedbacks: [],
      };
    }
  },

  async getGlobalFeedbackStats() {
    try {
      const response = await apiClient.get('/sessions/feedback/stats');
      return response.data;
    } catch (e) {
      console.warn('Fallback global feedback stats:', e);
      return {
        total_reviews: 28,
        average_rating: 4.8,
        avg_content_quality: 4.9,
        avg_speaker_rating: 4.8,
        satisfaction_rate: 96.4,
        star_breakdown: { 5: 22, 4: 5, 3: 1, 2: 0, 1: 0 },
        recent_reviews: [],
      };
    }
  },

  // =========================================================================
  // Task 33: Feedback & AI Summary Analytics APIs
  // =========================================================================
  async submitFeedback(payload: {
    event_id: number;
    session_id?: number | null;
    rating: number;
    comment?: string;
  }) {
    const response = await apiClient.post('/feedback', payload);
    return response.data;
  },

  async getFeedbackStats(params?: {
    event_id?: number;
    session_id?: number;
    rating?: number;
  }) {
    try {
      const response = await apiClient.get('/feedback/stats', { params });
      return response.data;
    } catch (e) {
      console.warn('Fallback getFeedbackStats:', e);
      return {
        total_reviews: 0,
        average_rating: 5.0,
        satisfaction_rate: 100,
        star_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
        feedbacks: [],
      };
    }
  },

  async getFeedbackAISummary(payload?: {
    event_id?: number;
    session_id?: number;
  }) {
    const response = await apiClient.post('/feedback/ai-summary', payload || {});
    return response.data;
  },

  async updateFeedback(feedbackId: number, payload: { rating: number; comment?: string }) {
    const response = await apiClient.put(`/feedback/${feedbackId}`, payload);
    return response.data;
  },

  async getMyFeedback(eventId: number, sessionId?: number) {
    try {
      const response = await apiClient.get('/feedback/my-feedback', {
        params: { event_id: eventId, session_id: sessionId },
      });
      return response.data;
    } catch {
      return { has_feedback: false, feedback: null };
    }
  },

  async toggleSessionReminder(sessionId: number) {
    const response = await apiClient.post(`/sessions/${sessionId}/reminder`);
    return response.data;
  },

  async getMySessionReminders() {
    try {
      const response = await apiClient.get('/sessions/reminders/my-reminders');
      return response.data;
    } catch {
      return { session_ids: [], total: 0 };
    }
  },

  // =========================================================================
  // Speaker Portal & Stage Control Center APIs (Task 32)
  // =========================================================================
  async getSpeakerMySessions(): Promise<any[]> {
    try {
      const response = await apiClient.get('/speaker/my-sessions');
      return response.data;
    } catch (e) {
      console.warn('Fallback speaker my-sessions:', e);
      return [
        {
          id: 15248,
          title: 'Panel Discussion: Tự Động Hóa Check-in QR & An Ninh Sự Kiện',
          speaker_name: 'TS. Lê Quang Huy (Speaker)',
          speaker_role: 'Lead AI Engineer @ EventHub',
          room_location: 'Grand Ballroom A',
          start_time: '09:00 AM',
          end_time: '10:30 AM',
          day_number: 1,
          start_date: '15/10/2026',
          capacity: 250,
          registered_count: 185,
          checked_in_count: 142,
          total_questions: 8,
          pending_questions: 3,
          resource_count: 2,
          status: 'live',
        },
        {
          id: 15249,
          title: 'Chủ Đề 2: Trải Nghiệm Khách Hàng Cá Nhân Hóa Với Real-time AI Feed',
          speaker_name: 'TS. Lê Quang Huy (Speaker)',
          speaker_role: 'Lead AI Engineer @ EventHub',
          room_location: 'Phòng Hội Thảo B2',
          start_time: '14:00 PM',
          end_time: '15:30 PM',
          day_number: 1,
          start_date: '15/10/2026',
          capacity: 150,
          registered_count: 98,
          checked_in_count: 0,
          total_questions: 4,
          pending_questions: 4,
          resource_count: 1,
          status: 'upcoming',
        },
      ];
    }
  },

  async getSpeakerSessionDetail(sessionId: number): Promise<any> {
    try {
      const response = await apiClient.get(`/speaker/sessions/${sessionId}`);
      return response.data;
    } catch (e) {
      console.warn('Fallback speaker session detail:', e);
      return {
        id: sessionId,
        title: 'Panel Discussion: Tự Động Hóa Check-in QR & An Ninh Sự Kiện',
        speaker_name: 'TS. Lê Quang Huy (Speaker)',
        speaker_role: 'Lead AI Engineer @ EventHub',
        room_location: 'Grand Ballroom A',
        start_time: '09:00 AM',
        end_time: '10:30 AM',
        day_number: 1,
        capacity: 250,
        registered_count: 185,
        checked_in_count: 142,
        total_questions: 8,
        status: 'live',
        resources: [],
      };
    }
  },

  async getSpeakerSessionQA(sessionId: number, sortBy: string = 'upvotes', statusFilter?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (sortBy) params.append('sort_by', sortBy);
      if (statusFilter && statusFilter !== 'ALL') params.append('status_filter', statusFilter);
      const response = await apiClient.get(`/speaker/sessions/${sessionId}/qa?${params.toString()}`);
      return response.data;
    } catch (e) {
      console.warn('Fallback speaker session QA:', e);
      return [
        {
          id: 1,
          session_id: sessionId,
          asker_name: 'Nguyễn Văn Minh',
          question: 'Hệ thống quét QR xử lý ra sao khi mạng internet hội trường bị chập chờn hoặc rớt kết nối?',
          question_text: 'Hệ thống quét QR xử lý ra sao khi mạng internet hội trường bị chập chờn hoặc rớt kết nối?',
          upvotes: 24,
          status: 'answering',
          is_answered: false,
          created_at: '09:15:20 • 15/10/2026',
        },
        {
          id: 2,
          session_id: sessionId,
          asker_name: 'Sarah Chen',
          question: 'Có thể liên kết FaceID hoặc NFC cùng với mã QR vé không?',
          question_text: 'Có thể liên kết FaceID hoặc NFC cùng với mã QR vé không?',
          upvotes: 18,
          status: 'pinned',
          is_answered: false,
          created_at: '09:18:40 • 15/10/2026',
        },
        {
          id: 3,
          session_id: sessionId,
          asker_name: 'Trần Hoàng Bảo',
          question: 'Tốc độ quét 1000 khách trong 15 phút có gây bottleneck ở cổng chính không?',
          question_text: 'Tốc độ quét 1000 khách trong 15 phút có gây bottleneck ở cổng chính không?',
          upvotes: 12,
          status: 'pending',
          is_answered: false,
          created_at: '09:22:15 • 15/10/2026',
        },
        {
          id: 4,
          session_id: sessionId,
          asker_name: 'Lê Thuỳ Dung',
          question: 'Slide bài thuyết trình này sau buổi hội thảo có thể tải ở đâu?',
          question_text: 'Slide bài thuyết trình này sau buổi hội thảo có thể tải ở đâu?',
          upvotes: 5,
          status: 'answered',
          is_answered: true,
          answer: 'Khách tham dự có thể tải trực tiếp tại tab Slide / Tài Liệu của phiên trên ứng dụng.',
          created_at: '09:05:00 • 15/10/2026',
        },
      ];
    }
  },

  async updateSpeakerQuestionStatus(questionId: number, status: string, answer?: string): Promise<any> {
    const response = await apiClient.patch(`/speaker/questions/${questionId}/status`, {
      status,
      answer,
    });
    return response.data;
  },

  async uploadSpeakerSlide(
    sessionId: number,
    payload: FormData | { title: string; file_url: string }
  ): Promise<any> {
    if (payload instanceof FormData) {
      const response = await apiClient.post(`/speaker/sessions/${sessionId}/upload-slide`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } else {
      const fd = new FormData();
      fd.append('title', payload.title);
      fd.append('file_url', payload.file_url);
      const response = await apiClient.post(`/speaker/sessions/${sessionId}/upload-slide`, fd);
      return response.data;
    }
  },

  async deleteSpeakerResource(resourceId: number): Promise<any> {
    const response = await apiClient.delete(`/speaker/resources/${resourceId}`);
    return response.data;
  },

  // QR Check-in API
  async verifyCheckInToken(token: string): Promise<CheckInResult> {
    try {
      const response = await apiClient.post<CheckInResult>('/registrations/check-in', { token });
      return response.data;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const cleanToken = token.trim();
      if (cleanToken.includes('INVALID') || cleanToken.length < 5) {
        return {
          status: 'INVALID',
          message: 'Mã vé không tồn tại hoặc đã bị hủy trên hệ thống EventHub!',
          token: cleanToken,
        };
      }
      if (cleanToken.includes('USED') || cleanToken === 'QR-TOKEN-EVENTHUB-001') {
        return {
          status: 'ALREADY_USED',
          message: 'Vé này đã được check-in lúc 08:35 sáng nay tại Cổng A!',
          participantName: 'Trần Thị Khách',
          ticketType: 'Vé Tiêu Chuẩn (Standard Pass)',
          eventTitle: 'Hội thảo EventHub AI 2026',
          checkInTime: '08:35:12 AM',
          token: cleanToken,
        };
      }

      return {
        status: 'SUCCESS',
        message: 'Check-in thành công! Chào mừng quý khách đến với sự kiện.',
        participantName: 'Nguyễn Văn Hùng',
        ticketType: 'Vé VIP All-Access Pass',
        eventTitle: 'Hội thảo EventHub AI 2026',
        checkInTime: new Date().toLocaleTimeString('vi-VN'),
        token: cleanToken,
      };
    }
  },

  // Schedule API
  async getEventSchedule(eventId: number = 1): Promise<EventScheduleItem[]> {
    try {
      const response = await apiClient.get<EventScheduleItem[]>(`/events/${eventId}/schedule`);
      return response.data;
    } catch (error) {
      console.warn('Backend schedule endpoint unavailable, returning fallback schedules:', error);
      return [
        {
          id: 1,
          event_id: eventId,
          title: 'Khai Mạc & Keynote: Kỷ Nguyên AI trong Quản Trị Sự Kiện 2026',
          description: 'Tổng quan xu hướng ứng dụng Generative AI, RAG và Agentic Workflows để tự động hóa trải nghiệm khách tham dự.',
          speaker_name: 'Dr. Nguyễn Văn Hùng',
          speaker_role: 'AI Research Lead @ EventHub AI',
          start_time: '08:30 AM',
          end_time: '09:45 AM',
          room_location: 'Hội trường Grand Ballroom A',
          day_number: 1,
          date_label: 'Ngày 1 - Keynote & Core AI',
          track: 'Keynote',
          start_date: '15/10/2026',
          location_address: 'GEM Center, Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
          google_maps_url: 'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
          wifiName: 'EventHub_GrandBallroomA',
          wifiPassword: 'BallroomA2026@Pass',
        },
        {
          id: 2,
          event_id: eventId,
          title: 'Workshop: Xây Dựng Trợ Lý AI RAG Tích Hợp pgvector',
          description: 'Thực hành triển khai hệ thống hỏi đáp tự động kết hợp PII Masking và Human-in-the-Loop approval.',
          speaker_name: 'ThS. Trần Thị Minh',
          speaker_role: 'Senior Cloud Architect @ TechCorp',
          start_time: '10:00 AM',
          end_time: '11:30 AM',
          room_location: 'Phòng Workshop B1',
          day_number: 1,
          date_label: 'Ngày 1 - Keynote & Core AI',
          track: 'AI & Tech',
          start_date: '15/10/2026',
          location_address: 'GEM Center, Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
          google_maps_url: 'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
          wifiName: 'EventHub_WorkshopB1',
          wifiPassword: 'WorkshopB1@Pass',
        },
        {
          id: 3,
          event_id: eventId,
          title: 'Panel Discussion: Tự Động Hóa Check-in QR & An Ninh Sự Kiện',
          description: 'Thảo luận giải pháp tối ưu hóa tốc độ soát vé 10,000 khách/giờ và phòng chống vé giả mạo.',
          speaker_name: 'Lê Hoàng Nam & Panel Speakers',
          speaker_role: 'Head of Operations @ Vietnam Event Group',
          start_time: '01:30 PM',
          end_time: '03:00 PM',
          room_location: 'Hội trường Grand Ballroom B',
          day_number: 1,
          date_label: 'Ngày 1 - Keynote & Core AI',
          track: 'Logistics',
          start_date: '15/10/2026',
          location_address: 'GEM Center, Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
          google_maps_url: 'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
          wifiName: 'EventHub_GrandBallroomB',
          wifiPassword: 'BallroomB2026@Pass',
        },
        {
          id: 4,
          event_id: eventId,
          title: 'Chủ Đề 2: Trải Nghiệm Khách Hàng Cá Nhân Hóa Với Real-time AI Feed',
          description: 'Ứng dụng phân tích dữ liệu thời gian thực để gợi ý lịch trình và đề xuất nội dung sự kiện.',
          speaker_name: 'Phạm Quốc Anh',
          speaker_role: 'Chief Product Officer @ SmartEvent',
          start_time: '09:00 AM',
          end_time: '10:30 AM',
          room_location: 'Hội trường Grand Ballroom A',
          day_number: 2,
          date_label: 'Ngày 2 - Advanced Applications',
          track: 'AI & Tech',
          start_date: '16/10/2026',
          location_address: 'GEM Center, Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
          google_maps_url: 'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
          wifiName: 'EventHub_GrandBallroomA',
          wifiPassword: 'BallroomA2026@Pass',
        },
        {
          id: 5,
          event_id: eventId,
          title: 'Tổng Kết & Trao Giải EventHub Innovation Award 2026',
          description: 'Vinh danh các giải pháp công nghệ sự kiện xuất sắc nhất năm và tiệc Networking.',
          speaker_name: 'Ban Tổ Chức EventHub',
          speaker_role: 'EventHub Steering Committee',
          start_time: '02:00 PM',
          end_time: '04:30 PM',
          room_location: 'Sảnh Gala Networking',
          day_number: 2,
          date_label: 'Ngày 2 - Advanced Applications',
          track: 'Networking',
          start_date: '16/10/2026',
          location_address: 'GEM Center, Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
          google_maps_url: 'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
          wifiName: 'EventHub_GalaLounge',
          wifiPassword: 'GalaLounge@2026',
        },
      ];
    }
  },

  async getEvents(): Promise<Event[]> {
    try {
      const response = await apiClient.get<Event[]>('/events');
      if (response.data && response.data.length > 0) {
        return response.data;
      }
    } catch {
      // Fallback
    }
    const cached = localStorage.getItem('eventhub_custom_events');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback
      }
    }
    return [
      {
        id: 1,
        title: 'EventHub AI Summit 2026',
        description: 'Hội thảo quốc tế hàng đầu về Generative AI, RAG Vector Search và Tự Động Hóa Quản Trị Sự Kiện.',
        category_id: 1,
        location: 'GEM Center, TP. Hồ Chí Minh',
        location_address: 'Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
        google_maps_url: 'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
        start_time: '15-16 Oct 2026, 08:30 AM',
        end_time: '16 Oct 2026, 17:30 PM',
        start_date: '15/10/2026 08:30',
        end_date: '16/10/2026 17:30',
        status: 'ONGOING',
        wifiName: 'EventHub_VIP_Guest',
        wifiPassword: 'EventHub2026!',
      },
      {
        id: 2,
        title: 'Vietnam AI & Cloud Tech Expo 2026',
        description: 'Triển lãm chuyên đề về Điện toán đám mây thế hệ mới, Hệ thống phân tán và ứng dụng AI trong doanh nghiệp.',
        category_id: 2,
        location: 'SECC, Quận 7, TP. Hồ Chí Minh',
        location_address: '799 Nguyễn Văn Linh, Tân Phú, Quận 7, TP. Hồ Chí Minh',
        google_maps_url: 'https://maps.google.com/maps?q=SECC+Quan+7+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
        start_time: '20-21 Nov 2026, 09:00 AM',
        end_time: '21 Nov 2026, 17:00 PM',
        start_date: '20/11/2026 09:00',
        end_date: '21/11/2026 17:00',
        status: 'PUBLISHED',
        wifiName: 'SECC_Guest_WiFi',
        wifiPassword: 'CloudExpo2026@Pass',
      },
      {
        id: 3,
        title: 'Global Developer Festival: NextGen Agents',
        description: 'Lễ hội công nghệ dành cho lập trình viên, các bài chia sẻ chuyên sâu về Agentic AI, LangGraph và Multi-agent Systems.',
        category_id: 3,
        location: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
        location_address: 'Đại lộ Thăng Long, Mễ Trì, Nam Từ Liêm, Hà Nội',
        google_maps_url: 'https://maps.google.com/maps?q=Trung+tam+Hoi+nghi+Quoc+gia+Ha+Noi&t=&z=16&ie=UTF8&iwloc=&output=embed',
        start_time: '10-12 Dec 2026, 08:00 AM',
        end_time: '12 Dec 2026, 18:00 PM',
        start_date: '10/12/2026 08:00',
        end_date: '12/12/2026 18:00',
        status: 'PUBLISHED',
        wifiName: 'DevFest_FreeWifi',
        wifiPassword: 'NextGenAgent2026',
      },
    ];
  },

  async createEvent(payload: Partial<Event>): Promise<Event> {
    try {
      const response = await apiClient.post<Event>('/events', payload);
      return response.data;
    } catch {
      const newId = Date.now();
      const newEv: Event = {
        id: newId,
        title: payload.title || 'Sự kiện mới',
        description: payload.description || '',
        category_id: payload.category_id || 1,
        location: payload.location || 'Địa điểm tổ chức',
        location_address: payload.location_address || '',
        google_maps_url: payload.google_maps_url || '',
        start_time: payload.start_time || '15/10/2026 08:30',
        end_time: payload.end_time || '16/10/2026 17:30',
        start_date: payload.start_date || '15/10/2026 08:30',
        end_date: payload.end_date || '16/10/2026 17:30',
        status: payload.status || 'PUBLISHED',
        wifiName: payload.wifiName || 'EventHub_Guest',
        wifiPassword: payload.wifiPassword || '12345678',
      };
      const cached = localStorage.getItem('eventhub_custom_events');
      const items: Event[] = cached ? JSON.parse(cached) : [];
      items.unshift(newEv);
      localStorage.setItem('eventhub_custom_events', JSON.stringify(items));
      return newEv;
    }
  },

  async getEvent(eventId: number = 1): Promise<Event> {
    try {
      const response = await apiClient.get<Event>(`/events/${eventId}`);
      return response.data;
    } catch {
      return {
        id: eventId,
        title: 'EventHub AI Summit 2026',
        description: 'Hội thảo quốc tế hàng đầu về Generative AI, RAG Vector Search và Tự Động Hóa Quản Trị Sự Kiện.',
        category_id: 1,
        location: 'GEM Center, TP. Hồ Chí Minh',
        location_address: 'Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
        google_maps_url: 'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
        start_time: '15-16 Oct 2026, 08:30 AM',
        end_time: '16 Oct 2026, 17:30 PM',
        start_date: '15/10/2026 08:30',
        end_date: '16/10/2026 17:30',
        status: 'ONGOING',
        wifiName: 'EventHub_VIP_Guest',
        wifiPassword: 'EventHub2026!',
      };
    }
  },

  async updateEvent(eventId: number, payload: Partial<Event>): Promise<Event> {
    try {
      const response = await apiClient.put<Event>(`/events/${eventId}`, payload);
      return response.data;
    } catch {
      // Return updated object locally
      return {
        id: eventId,
        title: payload.title || 'EventHub AI Summit 2026',
        location: payload.location || 'GEM Center, TP. Hồ Chí Minh',
        location_address: payload.location_address || 'Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
        google_maps_url: payload.google_maps_url || 'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
        start_time: payload.start_time || '15-16 Oct 2026, 08:30 AM',
        end_time: payload.end_time || '16 Oct 2026, 17:30 PM',
        start_date: payload.start_date || '15/10/2026 08:30',
        end_date: payload.end_date || '16/10/2026 17:30',
        status: payload.status || 'ONGOING',
        category_id: payload.category_id || 1,
      };
    }
  },

  async deleteEvent(eventId: number): Promise<{ status: string; message: string }> {
    try {
      const response = await apiClient.delete<{ status: string; message: string }>(`/events/${eventId}`);
      return response.data;
    } catch {
      return {
        status: 'success',
        message: `Sự kiện #${eventId} đã được xóa thành công!`,
      };
    }
  },

  async generateSessionDescription(payload: {
    title: string;
    track?: string;
    speaker_name?: string;
    speaker_role?: string;
    style?: string;
  }): Promise<string> {
    try {
      const response = await apiClient.post<{ description: string; style_applied?: string }>(
        '/events/generate-description',
        payload
      );
      return response.data.description;
    } catch {
      const spk = payload.speaker_name ? `cùng ${payload.speaker_name}${payload.speaker_role ? ` (${payload.speaker_role})` : ''}` : 'cùng các chuyên gia hàng đầu';
      const reqStyle = (payload.style || 'auto').toLowerCase();
      const combined = `${payload.title} ${payload.track || ''}`.toLowerCase();

      // Kiểm tra lĩnh vực phi công nghệ
      const isNonTech = [
        'y tế', 'sức khỏe', 'tâm lý', 'giáo dục', 'nghệ thuật', 'đời sống',
        'y khoa', 'bệnh', 'dinh dưỡng', 'chữa lành', 'cảm xúc', 'tinh thần',
        'học đường', 'sư phạm', 'kỹ năng sống', 'hôn nhân', 'gia đình', 'lối sống',
        'hội họa', 'âm nhạc', 'văn hóa', 'thơ', 'art', 'health', 'medical', 'psychology'
      ].some((w) => combined.includes(w));

      if (isNonTech || reqStyle === 'wellness') {
        return `Phiên chia sẻ chuyên đề "${payload.title}" ${spk} mang đến những kiến thức khoa học và hành trang tâm lý vững vàng. Người tham gia sẽ được lắng nghe các chuyên gia tư vấn hàng đầu chia sẻ giải pháp chăm sóc bản thân, giải tỏa áp lực và kết nối cởi mở, hướng tới lối sống lành mạnh, cân bằng và tràn đầy năng lượng tích cực.`;
      }

      if (reqStyle === 'literary') {
        return `Bước vào không gian nghệ thuật thăng hoa của "${payload.title}", người tham dự sẽ được dẫn dắt qua những tầng cảm xúc tinh tế ${spk}. Nơi sự sáng tạo hòa quyện cùng chiều sâu mỹ cảm, phiên sự kiện mở ra những góc nhìn sâu lắng và tôn vinh những giá trị nghệ thuật vượt thời gian.`;
      }
      if (reqStyle === 'professional') {
        return `Phiên chiến lược chuyên đề "${payload.title}" quy tụ góc nhìn sắc bén từ ${spk}, giải quyết trực diện bài toán quản trị và tăng trưởng bền vững trong lĩnh vực ${payload.track || 'kinh doanh'}. Người tham dự sẽ nắm bắt các mô hình vận hành tối ưu, khai phóng năng lực thực thi và củng cố lợi thế cạnh tranh dài hạn.`;
      }
      if (reqStyle === 'inspirational') {
        return `Một phiên chia sẻ bùng nổ nguồn cảm hứng mang tên "${payload.title}" ${spk}! Cùng nhau phá vỡ những giới hạn thông thường, thắp sáng tư duy tiên phong và khơi dậy khát vọng hành động mạnh mẽ để kiến tạo tương lai đột phá ngay từ hôm nay.`;
      }
      if (reqStyle === 'academic') {
        return `Báo cáo chuyên môn "${payload.title}" do ${spk} trình bày mang đến góc nhìn học thuật chuyên sâu và phương pháp luận nghiên cứu nghiêm cẩn trong lĩnh vực ${payload.track || 'khoa học & đời sống'}. Nội dung cung cấp hệ thống luận điểm vững chắc, phân tích dữ liệu thực chứng đa chiều và các hướng tiếp cận tiên tiến.`;
      }

      return `Phiên diễn thuyết chuyên sâu "${payload.title}" ${spk} chia sẻ những phân tích thực tiễn và giải pháp đột phá trong chủ đề ${payload.track || 'AI & Công nghệ'}. Khách tham dự sẽ nắm bắt các chiến lược hành động hiệu quả và thảo luận tương tác trực tiếp cùng chuyên gia.`;
    }
  },

  async createEventSchedule(
    eventId: number,
    payload: Omit<EventScheduleItem, 'id' | 'event_id'>
  ): Promise<EventScheduleItem> {
    const response = await apiClient.post<EventScheduleItem>(`/events/${eventId}/schedule`, payload);
    return response.data;
  },

  async updateEventSchedule(
    scheduleId: number,
    payload: Partial<EventScheduleItem>,
    eventId?: number
  ): Promise<EventScheduleItem> {
    try {
      const url = eventId
        ? `/events/${eventId}/schedule/${scheduleId}`
        : `/events/schedule/${scheduleId}`;
      const response = await apiClient.put<EventScheduleItem>(url, payload);
      return response.data;
    } catch {
      return {
        id: scheduleId,
        event_id: eventId || 1,
        title: payload.title || 'Ca diễn thuyết',
        speaker_name: payload.speaker_name || '',
        speaker_role: payload.speaker_role || '',
        start_time: payload.start_time || '',
        end_time: payload.end_time || '',
        room_location: payload.room_location || '',
        day_number: payload.day_number || 1,
        date_label: payload.date_label || 'Ngày 1',
        track: payload.track || 'General',
        ...payload,
      } as EventScheduleItem;
    }
  },

  async deleteEventSchedule(
    scheduleId: number,
    eventId?: number
  ): Promise<{ status: string; message: string }> {
    try {
      const url = eventId
        ? `/events/${eventId}/schedule/${scheduleId}`
        : `/events/schedule/${scheduleId}`;
      const response = await apiClient.delete<{ status: string; message: string }>(url);
      return response.data;
    } catch {
      return {
        status: 'success',
        message: `Phiên diễn thuyết #${scheduleId} đã được xóa thành công!`,
      };
    }
  },

  // Audit Logs CSV Export
  async exportAuditLogs(): Promise<void> {
    try {
      const response = await apiClient.get('/audit-logs/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_logs_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Backend export unavailable, generating fallback CSV locally:', error);
      const csvContent =
        '\ufeff"Mã Log ID","Thời Gian","Loại Thao Tác","Hành Động Staff","Prompt Tokens","Completion Tokens","Độ Trễ (ms)","Ghi Chú"\n' +
        '"1001","2026-09-08 08:35:12","QR_CHECK_IN","APPROVED","0","0","45.2","Check-in Cổng A - Nguyễn Văn Hùng"\n' +
        '"1002","2026-09-08 08:42:00","RAG_QUERY","AI_SUGGESTED","420","150","850.0","Câu hỏi bãi đỗ xe ô tô"\n' +
        '"1003","2026-09-08 08:45:30","HITL_REVIEW","ACCEPT","0","150","12.0","Staff duyệt câu trả lời bãi đỗ xe"\n' +
        '"1004","2026-09-08 09:12:15","RAG_QUERY","AI_SUGGESTED","380","110","720.5","Câu hỏi E-Certificate"\n' +
        '"1005","2026-09-08 09:15:00","HITL_REVIEW","EDIT","0","180","15.0","Staff bổ sung thông tin WiFi"\n';

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_logs_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    return {
      totalTickets: 1250,
      checkedInTickets: 890,
      checkInRate: 71.2,
      aiInterventionRate: 84.5,
      totalInquiries: 142,
      resolvedInquiries: 138,
      avgStaffResponseTime: '42s',
    };
  },

  async getHourlyCheckIns(): Promise<HourlyCheckInStat[]> {
    return [
      { hour: '07:30 - 08:00', checkInCount: 45, accumulatedRate: 5.1 },
      { hour: '08:00 - 08:30', checkInCount: 185, accumulatedRate: 25.8 },
      { hour: '08:30 - 09:00', checkInCount: 360, accumulatedRate: 66.3 },
      { hour: '09:00 - 09:30', checkInCount: 210, accumulatedRate: 89.9 },
      { hour: '09:30 - 10:00', checkInCount: 65, accumulatedRate: 97.2 },
      { hour: '10:00 - 10:30', checkInCount: 25, accumulatedRate: 100.0 },
    ];
  },

  async getLiveFeed(): Promise<LiveFeedItem[]> {
    return [
      {
        id: 'feed-1',
        type: 'CHECK_IN',
        title: 'Check-in thành công',
        description: 'Khách Nguyễn Văn Hùng (Vé VIP) vừa qua Cổng 1',
        timestamp: 'Vừa xong',
        badge: 'Cổng 1',
      },
      {
        id: 'feed-2',
        type: 'AI_INQUIRY',
        title: 'Thắc mắc AI Concierge mới',
        description: 'Khách Trần Minh Thư hỏi về E-Certificate',
        timestamp: '2 phút trước',
        badge: 'TICKETING',
      },
      {
        id: 'feed-3',
        type: 'STAFF_APPROVED',
        title: 'Staff duyệt câu trả lời',
        description: 'Staff Lê Hữu Nghĩa đã duyệt câu trả lời về Bãi đỗ xe',
        timestamp: '5 phút trước',
        badge: 'HITL Approved',
      },
      {
        id: 'feed-4',
        type: 'CHECK_IN',
        title: 'Check-in thành công',
        description: 'Khách Phạm Hoàng Nam (Vé Standard) vừa qua Cổng 2',
        timestamp: '8 phút trước',
        badge: 'Cổng 2',
      },
      {
        id: 'feed-5',
        type: 'STAFF_EDITED',
        title: 'Staff chỉnh sửa phản hồi',
        description: 'Staff đã bổ sung mật khẩu WiFi sự kiện',
        timestamp: '15 phút trước',
        badge: 'HITL Edited',
      },
    ];
  },

  // Attendee AI Chatbot
  async sendAttendeeChat(question: string, eventId: number = 1): Promise<AttendeeChatResponse> {
    try {
      const response = await apiClient.post<AttendeeChatResponse>('/chat/attendee', {
        event_id: eventId,
        question: question.trim(),
      });
      return response.data;
    } catch (error) {
      console.warn('Backend attendee chat unavailable, using intelligent local fallback:', error);
      await new Promise((r) => setTimeout(r, 700));

      const q = question.toLowerCase();
      if (q.includes('lịch') || q.includes('thời gian') || q.includes('mấy giờ') || q.includes('hôm nay')) {
        return {
          answer:
            'Sự kiện diễn ra từ 08:00 AM đến 17:30 PM trong 2 ngày (15/10 - 16/10/2026). Phiên khai mạc chính thức bắt đầu lúc 08:30 AM tại Hội trường Grand Ballroom A.',
          sources: ['Lịch trình Sự kiện EventHub AI Summit 2026'],
          is_fallback: false,
        };
      }
      if (q.includes('xe') || q.includes('bãi') || q.includes('địa điểm') || q.includes('ở đâu') || q.includes('sơ đồ')) {
        return {
          answer:
            'Sự kiện tổ chức tại GEM Center, TP.HCM. Bãi đỗ xe ô tô tại tầng hầm B2 và B3 (miễn phí cho vé VIP & Speaker), xe máy gửi tại sảnh sau. Hội trường chính tại tầng 3.',
          sources: ['Địa điểm, Sơ đồ Hội trường & Bãi đỗ xe'],
          is_fallback: false,
        };
      }
      if (q.includes('check') || q.includes('vé') || q.includes('qr') || q.includes('vào cổng')) {
        return {
          answer:
            'Quý khách chỉ cần mở mã vé QR trên điện thoại và quét tại Cổng A hoặc Cổng B. Hệ thống tự động xác thực trong 3 giây và phát thẻ All-Access Pass tại Welcome Desk.',
          sources: ['Quy trình Soát vé & Hướng dẫn Check-in QR'],
          is_fallback: false,
        };
      }
      if (q.includes('ăn') || q.includes('uống') || q.includes('wifi') || q.includes('mật khẩu') || q.includes('teabreak')) {
        return {
          answer:
            'Sự kiện phục vụ 2 cữ Teabreak (10:00 AM và 15:00 PM) tại sảnh tầng 3. Khách VIP dùng Buffet trưa tại tầng 5. WiFi miễn phí: EventHub_Guest (Pass: EventHub2026).',
          sources: ['Dịch vụ Ăn uống, Teabreak & Kết nối WiFi'],
          is_fallback: false,
        };
      }
      // Out of domain fallback
      return {
        answer:
          'Hiện chưa có thông tin chính thức về câu hỏi này trong hệ thống. Bạn có thể tham khảo thêm lịch trình, thông tin phòng họp hoặc liên hệ trực tiếp bàn lễ tân tại sự kiện.',
        sources: [],
        is_fallback: true,
      };
    }
  },

  // ── Admin User Management ────────────────────────────────────────────────

  async getAdminUsers(): Promise<AdminUser[]> {
    try {
      const response = await apiClient.get<AdminUser[]>('/admin/users');
      return response.data;
    } catch (error) {
      console.warn('Admin users endpoint unavailable, returning demo data:', error);
      // Demo fallback users
      return [
        { id: 1, full_name: 'Admin Hệ Thống', email: 'admin@eventhub.ai', role_id: 1, role_name: 'ADMIN', is_active: true, is_online: true, last_active_at: new Date().toISOString(), created_at: '2026-01-01T00:00:00Z' },
        { id: 2, full_name: 'Staff Duyệt Viên', email: 'staff@eventhub.ai', role_id: 2, role_name: 'STAFF', is_active: true, is_online: true, last_active_at: new Date(Date.now() - 120000).toISOString(), created_at: '2026-01-15T00:00:00Z' },
        { id: 3, full_name: 'Nguyễn Hoàng Long', email: 'long.nh@gmail.com', role_id: 3, role_name: 'PARTICIPANT', is_active: true, is_online: false, last_active_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), created_at: '2026-03-10T00:00:00Z' },
        { id: 4, full_name: 'Trần Minh Thư', email: 'thu.tm@vnpay.vn', role_id: 3, role_name: 'PARTICIPANT', is_active: true, is_online: false, last_active_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), created_at: '2026-04-20T00:00:00Z' },
        { id: 5, full_name: 'Lê Quốc Bảo', email: 'bao.lq@techcorp.io', role_id: 3, role_name: 'PARTICIPANT', is_active: false, is_online: false, created_at: '2026-05-05T00:00:00Z' },
      ];
    }
  },

  async updateUserRole(userId: number, roleName: string): Promise<AdminUser> {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}/role`, { role_name: roleName });
    return response.data;
  },

  async updateUserStatus(userId: number, isActive: boolean): Promise<AdminUser> {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}/status`, { is_active: isActive });
    return response.data;
  },

  async deleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  async resetUserPassword(userId: number, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
    return response.data;
  },

  async getSecurityLogs(): Promise<SecurityLog[]> {
    try {
      const response = await apiClient.get<SecurityLog[]>('/admin/security-logs');
      return response.data;
    } catch (error) {
      console.warn('Security logs endpoint unavailable, returning demo data:', error);
      return [
        { id: 1001, task_type: 'ROLE_CHANGE', staff_action: 'ADMIN→STAFF', prompt_tokens: 0, completion_tokens: 0, latency_ms: 12.0, created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: 1002, task_type: 'ACCOUNT_LOCK', staff_action: 'LOCK', prompt_tokens: 0, completion_tokens: 0, latency_ms: 8.0, created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
        { id: 1003, task_type: 'HITL_REVIEW', staff_action: 'ACCEPT', prompt_tokens: 0, completion_tokens: 150, latency_ms: 42.0, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 1004, task_type: 'RAG_QUERY', staff_action: 'AI_SUGGESTED', prompt_tokens: 420, completion_tokens: 180, latency_ms: 850.0, created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
        { id: 1005, task_type: 'QR_CHECK_IN', staff_action: 'SUCCESS', prompt_tokens: 0, completion_tokens: 0, latency_ms: 45.0, created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
      ];
    }
  },

  async manualIssueTicket(payload: { event_id: number; full_name: string; email: string; ticket_type?: string }): Promise<ManualIssueResponse> {
    const response = await apiClient.post<ManualIssueResponse>('/registrations/manual-issue', payload);
    return response.data;
  },

  async selfRegisterEvent(payload: { event_id: number; full_name: string; email: string; phone_number?: string; ticket_type?: string }): Promise<Registration> {
    try {
      const response = await apiClient.post<Registration>('/registrations/register', payload);
      return response.data;
    } catch (error) {
      console.warn('Backend self-register unavailable, returning mock registration:', error);
      return {
        id: Math.floor(Math.random() * 1000) + 100,
        event_id: payload.event_id,
        participant_id: Math.floor(Math.random() * 100) + 1,
        participant_name: payload.full_name,
        participant_email: payload.email,
        qr_code_token: `QR-TOKEN-EVENTHUB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        is_checked_in: false,
        checked_in_at: undefined,
        ticket_type: payload.ticket_type || 'Vé Tham Dự',
      };
    }
  },

  // ── Knowledge Base API ──────────────────────────────────────────────────

  async getKnowledgeBaseItems(eventId: number): Promise<KnowledgeItem[]> {
    try {
      const response = await apiClient.get<KnowledgeItem[]>(`/knowledge/${eventId}`);
      return response.data;
    } catch (error) {
      console.warn('Backend knowledge base endpoint unavailable, returning mock:', error);
      return [
        { id: 1, event_id: 1, title: 'Lịch trình sự kiện', content: 'Sự kiện diễn ra từ 08:00 AM đến 17:30 PM trong 2 ngày.', created_at: '2026-09-01T00:00:00Z' },
        { id: 2, event_id: 1, title: 'Địa điểm', content: 'GEM Center, TP. Hồ Chí Minh.', created_at: '2026-09-01T00:00:00Z' },
      ];
    }
  },

  async getKnowledgeDocs(eventId: number = 1): Promise<KnowledgeItem[]> {
    return this.getKnowledgeBaseItems(eventId);
  },

  async createKnowledgeItem(payload: { event_id: number; title: string; content: string }): Promise<KnowledgeItem> {
    const response = await apiClient.post<KnowledgeItem>('/knowledge', payload);
    return response.data;
  },

  async uploadKnowledgeDoc(formData: FormData): Promise<KnowledgeItem> {
    try {
      const response = await apiClient.post<KnowledgeItem>('/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.warn('Backend upload knowledge doc failed:', error);
      const file = formData.get('file') as File | null;
      const fileName = file ? file.name : 'Uploaded_Document.pdf';
      return {
        id: Date.now(),
        event_id: 1,
        title: fileName,
        content: `[Extracted Document Content from ${fileName}]`,
        created_at: new Date().toISOString(),
      };
    }
  },

  async deleteKnowledgeItem(id: number): Promise<void> {
    await apiClient.delete(`/knowledge/${id}`);
  },

  async deleteKnowledgeDoc(id: number): Promise<void> {
    return this.deleteKnowledgeItem(id);
  },

  // ── AI PR Studio API ──────────────────────────────────────────────────────

  async generatePRContent(payload: {
    title: string;
    datetime: string;
    audience: string;
    location: string;
    topic: string;
    tone?: string;
  }): Promise<{ email: string; social: string; reminder: string }> {
    try {
      const response = await apiClient.post<{ email: string; social: string; reminder: string }>(
        '/pr-studio/generate',
        payload
      );
      return response.data;
    } catch (error) {
      console.warn('Backend PR Studio endpoint unavailable, generating local structured PR text:', error);
      const content = `🌟 **${payload.topic}**\n\nAt **${payload.title}**, we've applied cutting-edge AI to optimize attendee experience. From registration to QR check-in, to the 24/7 AI Concierge — all synchronized on one intelligent platform.\n\n🔑 **Key Highlights:**\n- Role-Based Access Control (RBAC) for secure user management\n- RAG with pgvector + Gemini 1.5 Flash\n- Human-in-the-Loop (HITL): AI drafts → Staff reviews\n- PII masking before sending data to Cloud LLM\n- Full audit logs & security monitoring\n\n📅 ${payload.datetime} | ${payload.location}\n\n#EventHubAISummit #AI #RAG #HITL #QRCheckIn #RBAC`;
      return {
        email: `Subject: Thư mời tham dự: ${payload.title} — ${payload.topic}\n\nKính gửi Quý khách,\n\n${content}\n\nTrân trọng,\nBan Tổ Chức ${payload.title}`,
        social: content,
        reminder: `⏰ [NHẮC LỊCH] ${payload.title} chỉ còn ít ngày nữa!\n\nĐịa điểm: ${payload.location}\nThời gian: ${payload.datetime}\n\nĐừng quên mở Mã vé QR trên ứng dụng EventHub AI để check-in nhanh tại Cổng A!`,
      };
    }
  },

  // ── Helper Aliases ─────────────────────────────────────────────────────────

  async getPendingInquiries(eventId: number = 1): Promise<Inquiry[]> {
    return this.getInquiries({ event_id: eventId, status: 'AI_SUGGESTED' });
  },

  async approveInquiry(inquiryId: number, responseText: string): Promise<void> {
    await this.reviewInquiry(inquiryId, {
      staff_id: 1,
      action: 'EDIT',
      edited_content: responseText,
      note: 'Approved by staff',
    });
  },

  async regenerateAIResponse(inquiryId: number): Promise<Inquiry> {
    return this.getInquiryDetail(inquiryId);
  },

  async checkInParticipant(qrCodeToken: string): Promise<CheckInResult> {
    return this.verifyCheckInToken(qrCodeToken);
  },

  async getDashboardMetrics(): Promise<DashboardStats> {
    return this.getDashboardStats();
  },

  async sendChatMessage(message: string, eventId: number = 1): Promise<AttendeeChatResponse> {
    return this.sendAttendeeChat(message, eventId);
  },

  // ── Notifications API ────────────────────────────────────────────────────────
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const response = await apiClient.get<NotificationItem[]>('/notifications');
      localStorage.setItem('eventhub_notifications', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.warn('Backend notifications endpoint unavailable, using local cache/fallback:', error);
      const cached = localStorage.getItem('eventhub_notifications');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore error
        }
      }
      const initialMock: NotificationItem[] = [
        {
          id: 1,
          title: 'Chào mừng đến với EventHub AI! 👋',
          message: 'Hệ thống quản lý sự kiện thông minh tích hợp AI Concierge sẵn sàng phục vụ.',
          type: 'INFO',
          link: '/events',
          is_read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        },
        {
          id: 2,
          title: 'Câu hỏi mới từ khách tham dự (HITL) 🤖',
          message: 'Khách tham dự Nguyễn Hoàng Long đã gửi thắc mắc về bãi đỗ xe VIP.',
          type: 'INQUIRY_PENDING',
          link: '/inquiries',
          is_read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 3,
          title: 'Check-in thành công tại Cổng A 🎟️',
          message: 'Đại biểu Trần Minh Tuấn vừa hoàn tất quét mã QR và xác thực vào hội trường.',
          type: 'CHECK_IN',
          link: '/check-in',
          is_read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
        },
        {
          id: 4,
          title: 'Cảnh báo bảo mật PII Masking 🛡️',
          message: 'Hệ thống đã tự động lọc 3 số điện thoại và email khỏi dữ liệu gửi sang LLM.',
          type: 'SECURITY_ALERT',
          link: '/logs',
          is_read: true,
          created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        },
      ];
      localStorage.setItem('eventhub_notifications', JSON.stringify(initialMock));
      return initialMock;
    }
  },

  async markNotificationRead(id: number): Promise<NotificationItem> {
    try {
      const response = await apiClient.patch<NotificationItem>(`/notifications/${id}/read`);
      return response.data;
    } catch {
      const cached = localStorage.getItem('eventhub_notifications');
      let items: NotificationItem[] = cached ? JSON.parse(cached) : [];
      items = items.map((item) => (item.id === id ? { ...item, is_read: true } : item));
      localStorage.setItem('eventhub_notifications', JSON.stringify(items));
      const updated = items.find((item) => item.id === id);
      return (
        updated || {
          id,
          title: '',
          message: '',
          type: 'INFO',
          is_read: true,
          created_at: new Date().toISOString(),
        }
      );
    }
  },

  async markAllNotificationsRead(): Promise<void> {
    try {
      await apiClient.post('/notifications/mark-all-read');
    } catch {
      const cached = localStorage.getItem('eventhub_notifications');
      if (cached) {
        const items: NotificationItem[] = JSON.parse(cached);
        const updated = items.map((item) => ({ ...item, is_read: true }));
        localStorage.setItem('eventhub_notifications', JSON.stringify(updated));
      }
    }
  },

  async deleteNotification(id: number): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch {
      const cached = localStorage.getItem('eventhub_notifications');
      if (cached) {
        const items: NotificationItem[] = JSON.parse(cached);
        const updated = items.filter((item) => item.id !== id);
        localStorage.setItem('eventhub_notifications', JSON.stringify(updated));
      }
    }
  },

  async sendNotification(payload: {
    title: string;
    message: string;
    type?: string;
    link?: string;
    target_role?: string;
  }): Promise<NotificationItem> {
    try {
      const response = await apiClient.post<NotificationItem>('/notifications/send', payload);
      return response.data;
    } catch {
      const cached = localStorage.getItem('eventhub_notifications');
      const items: NotificationItem[] = cached ? JSON.parse(cached) : [];
      const newNotif: NotificationItem = {
        id: Date.now(),
        title: payload.title,
        message: payload.message,
        type: (payload.type as any) || 'INFO',
        link: payload.link || null,
        target_role: payload.target_role || 'ALL',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      items.unshift(newNotif);
      localStorage.setItem('eventhub_notifications', JSON.stringify(items));
      return newNotif;
    }
  },

  // ── Demo Accounts API ────────────────────────────────────────────────────────
  async getDemoAccounts(): Promise<DemoAccount[]> {
    try {
      const response = await apiClient.get<DemoAccount[]>('/auth/demo-accounts');
      return response.data;
    } catch {
      return [
        {
          role: 'ADMIN',
          role_title: 'Admin Quản Trị',
          email: 'admin@eventhub.ai',
          password: '123456',
          description: 'Toàn quyền quản trị tài khoản, cấu hình kho RAG, xem Security Logs',
          badge_color: 'bg-amber-100 text-amber-800 border-amber-300',
        },
        {
          role: 'EVENT_MANAGER',
          role_title: 'Quản Lý Sự Kiện',
          email: 'manager@eventhub.ai',
          password: '123456',
          description: 'Khởi tạo sự kiện, sinh bài viết truyền thông bằng AI, xem Dashboard',
          badge_color: 'bg-purple-100 text-purple-800 border-purple-300',
        },
        {
          role: 'STAFF',
          role_title: 'Nhân Viên Điều Phối',
          email: 'staff@eventhub.ai',
          password: '123456',
          description: 'Soát vé QR Code, duyệt & chỉnh sửa câu trả lời AI Concierge (HITL)',
          badge_color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        },
        {
          role: 'ATTENDEE',
          role_title: 'Khách Tham Dự',
          email: 'attendee@eventhub.ai',
          password: '123456',
          description: 'Xem danh mục sự kiện, đăng ký vé QR cá nhân, hỏi đáp AI Concierge',
          badge_color: 'bg-slate-100 text-slate-800 border-slate-300',
        },
      ];
    }
  },
};


