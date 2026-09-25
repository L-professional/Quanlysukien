export type UserRole = 'ADMIN' | 'STAFF' | 'ATTENDEE' | 'PARTICIPANT' | 'EVENT_MANAGER' | 'SPEAKER' | 'SUPER_ADMIN' | 'AUDITOR';

export interface User {
  id: number;
  role_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  role_name?: string;
  permissions?: string[];
  is_active?: boolean;
  avatar_url?: string;
  job_title?: string;
  is_2fa_enabled?: boolean;
  preferences?: {
    language?: 'vi' | 'en';
    theme?: 'dark' | 'light';
    [key: string]: unknown;
  };
  last_active_at?: string;
  created_at?: string;
}

export interface ActiveSession {
  id: number;
  device_name: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  location?: string;
  is_current: boolean;
  last_active_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
  is_online: boolean;
  last_active_at?: string;
  created_at?: string;
}

export interface SecurityLog {
  id: number;
  task_type: string;
  staff_action: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  created_at?: string;
}

export interface ManualIssueResponse {
  registration_id: number;
  qr_code_token: string;
  participant_name: string;
  ticket_type: string;
  issued_at: string;
  message: string;
}

export interface EventCategory {
  id: number;
  name: string;
  code: string;
}

export interface Event {
  id: number;
  title: string;
  slug?: string;
  description?: string;
  category_id: number;
  location: string;
  location_address?: string;
  google_maps_url?: string;
  start_time: string;
  end_time: string;
  start_date?: string;
  end_date?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | string;
  capacity?: number;
  registered_count?: number;
  registeredCount?: number;
  event_type?: string;
  cover_image?: string;
  homepage_visible?: boolean;
  featured?: boolean;
  homepage_order?: number;
  ticketType?: string;
  wifiName?: string;
  wifiPassword?: string;
  is_registered?: boolean;
  is_checked_in?: boolean;
  has_reviewed?: boolean;
  [key: string]: any;
}

export interface EventScheduleItem {
  id: number;
  event_id: number;
  title: string;
  description?: string;
  speaker_name: string;
  speaker_role?: string;
  start_time: string;
  end_time: string;
  room_location: string;
  day_number: number;
  date_label: string;
  track: string;
  start_date?: string;
  location_address?: string;
  google_maps_url?: string;
  capacity?: number;
  registered_count?: number;
  is_registered?: boolean;
  is_checked_in?: boolean;
  has_reviewed?: boolean;
  registration_id?: number;
  qr_code_token?: string;
  qr_code_image?: string;
  is_bookmarked?: boolean;
  wifiName?: string;
  wifiPassword?: string;
}

export interface InquiryReply {
  id: number;
  inquiry_id: number;
  sender_id: number;
  sender_name?: string;
  content: string;
  is_ai_generated: boolean;
  edited_by_staff: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: number;
  event_id: number;
  participant_id: number;
  participant_name?: string;
  participant_email?: string;
  participant_phone?: string;
  assigned_staff_id?: number;
  question: string;
  ai_category?: string;
  status: 'PENDING' | 'AI_SUGGESTED' | 'APPROVED' | 'REJECTED' | 'REPLIED';
  created_at: string;
  updated_at: string;
  replies: InquiryReply[];
}

export interface Registration {
  id: number;
  event_id: number;
  participant_id: number;
  participant_name?: string;
  participant_email?: string;
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
}

export interface CheckInResult {
  status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID' | 'INVALID_EVENT';
  message: string;
  participantName?: string;
  ticketType?: string;
  eventTitle?: string;
  checkInTime?: string;
  token?: string;
}

export interface DashboardStats {
  totalTickets: number;
  checkedInTickets: number;
  checkInRate: number; // percentage
  aiInterventionRate: number; // percentage
  totalInquiries: number;
  resolvedInquiries: number;
  avgStaffResponseTime: string;
}

export interface HourlyCheckInStat {
  hour: string;
  checkInCount: number;
  accumulatedRate: number;
}

export interface LiveFeedItem {
  id: string;
  type: 'CHECK_IN' | 'AI_INQUIRY' | 'STAFF_APPROVED' | 'STAFF_EDITED' | 'STAFF_REJECTED';
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
}

// Chatbot Types
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: string[];
  isFallback?: boolean;
}

export interface AttendeeChatResponse {
  answer: string;
  sources: string[];
  is_fallback: boolean;
  ai_category?: string;
}

export interface KnowledgeItem {
  id: number;
  event_id: number;
  title: string;
  content: string;
  embedding?: number[];
  created_at?: string;
  updated_at?: string;
}

export type NotificationType =
  | 'INFO'
  | 'CHECK_IN'
  | 'INQUIRY_PENDING'
  | 'INQUIRY_APPROVED'
  | 'EVENT_CREATED'
  | 'SECURITY_ALERT';

export interface NotificationItem {
  id: number;
  user_id?: number | null;
  target_role?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DemoAccount {
  role: UserRole;
  role_title: string;
  email: string;
  password: string;
  description: string;
  badge_color: string;
}

export interface SessionAttendee {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  ticket_type?: string;
  qr_code_token: string;
  is_checked_in: boolean;
  checked_in_at?: string | null;
  created_at?: string | null;
  notes?: string;
}

export interface SessionAttendeesResponse {
  success: boolean;
  session_id: number;
  total: number;
  checked_in_count: number;
  not_checked_in_count: number;
  data: SessionAttendee[];
}

export interface BottleneckItem {
  id: string;
  category: 'CHECK_IN_CONGESTION' | 'LOW_ATTENDANCE' | 'LOGISTICS_TECH' | string;
  aspect?: string;
  title: string;
  severity: 'CRITICAL' | 'MODERATE' | 'MINOR' | 'HIGH' | 'MEDIUM' | 'LOW';
  metric: string;
  impacted_area: string;
  description: string;
  urgency?: string;
}

export interface ActionPlanItem {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  department: string;
  estimated_impact: string;
  timeframe: string;
  status: 'proposed' | 'applied';
}

export interface RepresentativeQuote {
  id: string;
  quote: string;
  rating: number;
  aspect: string;
  severity: 'CRITICAL' | 'MODERATE' | 'MINOR' | string;
  author: string;
  user_email?: string;
  feedback_id?: number;
}

export interface AspectBreakdownItem {
  name: string;
  score: number;
  negative_count: number;
  severity: 'CRITICAL' | 'MODERATE' | 'MINOR' | string;
  status: string;
  key_issues: string[];
}

export interface AspectBreakdownData {
  infrastructure: AspectBreakdownItem;
  content: AspectBreakdownItem;
  logistics: AspectBreakdownItem;
}

export interface QualitativeInsightsData {
  summary_text: string;
  root_causes: string[];
  representative_quotes: RepresentativeQuote[];
}

export interface HistoricalBenchmarkItem {
  event_id?: number;
  title: string;
  satisfaction_score: number;
  checkin_rate: number;
  comparison_note: string;
}

export interface BenchmarkComparisonData {
  historical_avg_satisfaction: number;
  current_vs_historical_diff: number;
  status: string;
  retrieval_method: string;
  historical_events: HistoricalBenchmarkItem[];
}

export interface ApologyEmailDraft {
  subject: string;
  recipient_name: string;
  recipient_email: string;
  aspect: string;
  discount_code: string;
  compensation_offer: string;
  email_body_text: string;
  email_body_html: string;
  generated_at: string;
}

export interface AIFeedbackAnalysisData {
  satisfaction_score: number;
  average_rating: number;
  sentiment_breakdown: {
    positive_percent: number;
    neutral_percent: number;
    negative_percent: number;
    total_analyzed: number;
  };
  executive_summary: string;
  top_bottlenecks: BottleneckItem[];
  action_plan: ActionPlanItem[];
  aspect_breakdown?: AspectBreakdownData;
  qualitative_insights?: QualitativeInsightsData;
  benchmark_comparison?: BenchmarkComparisonData;
}

export interface AIFeedbackAnalysisResponse {
  success: boolean;
  analyzed_at: string;
  data: AIFeedbackAnalysisData;
}




