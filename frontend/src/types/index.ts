export type UserRole = 'ADMIN' | 'STAFF' | 'ATTENDEE' | 'PARTICIPANT' | 'EVENT_MANAGER' | 'SPEAKER';

export interface User {
  id: number;
  role_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  role_name?: string;
  is_active?: boolean;
  last_active_at?: string;
  created_at?: string;
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
  description?: string;
  category_id: number;
  location: string;
  location_address?: string;
  google_maps_url?: string;
  start_time: string;
  end_time: string;
  start_date?: string;
  end_date?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  wifiName?: string;
  wifiPassword?: string;
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
  status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID';
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


