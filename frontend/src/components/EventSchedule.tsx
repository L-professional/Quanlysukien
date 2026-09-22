import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Filter,
  CheckCircle2,
  Bookmark,
  Sparkles,
  LayoutGrid,
  List,
  Search,
  Users,
  X,
  Copy,
  Wifi,
  Ticket,
  ExternalLink,
  Compass,
  Eye,
  EyeOff,
  Loader2,
  Settings,
  ChevronDown,
  Edit3,
  Trash2,
  AlertTriangle,
  MoreVertical,
  MessageSquare,
  Send,
  Download,
  Star,
  ThumbsUp,
  FileText,
  Lock,
  Unlock,
} from 'lucide-react';
import { CreateEventModal } from './CreateEventModal';
import { AuthModal } from './AuthModal';
import { TicketModal, TicketData } from './TicketModal';
import { SessionRegisterModal } from './SessionRegisterModal';
import { SessionAttendeesModal } from './SessionAttendeesModal';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { useTranslation } from 'react-i18next';
import { EventScheduleItem } from '../types';
import { apiService } from '../services/api';
import { toast } from 'sonner';

/** Parse specific session's start date and time to timestamp */
export function parseSessionStartTime(item: EventScheduleItem, activeEventStartDate?: string): number {
  if (item.start_time) {
    if (item.start_time.includes('T') || (item.start_time.includes('-') && item.start_time.includes(':'))) {
      const d = new Date(item.start_time);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    const dmyMatch = item.start_time.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (dmyMatch) {
      const [, dd, mm, yyyy, hh = '00', min = '00'] = dmyMatch;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), 0).getTime();
    }
  }

  // Combine start_date + start_time
  let yyyy = 2026, mm = 10, dd = 15;
  const dateStr = item.start_date || (activeEventStartDate ? activeEventStartDate.split(' ')[0] : (item.day_number === 2 ? '16/10/2026' : '15/10/2026'));
  if (dateStr.includes('/')) {
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) {
      dd = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10);
      yyyy = parseInt(parts[2], 10);
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      yyyy = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10);
      dd = parseInt(parts[2], 10);
    }
  }

  let hh = 8, min = 30;
  if (item.start_time) {
    const ampmMatch = item.start_time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      min = parseInt(ampmMatch[2], 10);
      const ampm = ampmMatch[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hh = h;
    }
  }

  const d = new Date(yyyy, mm - 1, dd, hh, min, 0);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

/**
 * Extract actual date "DD/MM/YYYY" dynamically from a schedule item
 */
export function extractItemDate(item: EventScheduleItem, activeEventStartDate?: string): string {
  if (item.start_date) {
    if (item.start_date.includes('/')) {
      const match = item.start_date.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
      if (match) return match[0];
    }
    if (item.start_date.includes('-')) {
      const parts = item.start_date.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
    }
  }

  if (item.date_label) {
    const match = item.date_label.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
    if (match) return match[0];
  }

  if (item.start_time) {
    const match = item.start_time.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
    if (match) return match[0];
  }

  if (activeEventStartDate) {
    const match = activeEventStartDate.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
    if (match) {
      if (item.day_number && item.day_number > 1) {
        const [d, m, y] = match[0].split('/').map(Number);
        const nextDate = new Date(y, m - 1, d + (item.day_number - 1));
        return `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`;
      }
      return match[0];
    }
  }

  return item.day_number === 2 ? '16/10/2026' : '15/10/2026';
}

// Session Countdown & Progress Bar Sub-component with INDEPENDENT countdown
const SessionCountdownProgress: React.FC<{
  item: EventScheduleItem;
  now?: Date;
  activeEventStartDate?: string;
}> = ({ item, now, activeEventStartDate }) => {
  const { t } = useTranslation();
  // Independent 1-second interval ticker for this card instance
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const targetTime = parseSessionStartTime(item, activeEventStartDate);
  const currentTime = now ? now.getTime() : currentTimestamp;
  const distance = targetTime - currentTime;

  const days = Math.floor(Math.max(0, distance) / (1000 * 60 * 60 * 24));
  const hours = Math.floor((Math.max(0, distance) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((Math.max(0, distance) % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((Math.max(0, distance) % (1000 * 60)) / 1000);

  const pad = (num: number) => String(num).padStart(2, '0');

  // Real-time capacity & registered counts from DB
  const capacity = item.capacity ?? 100;
  const registered = item.registered_count ?? 0;
  const percent = Math.min(100, Math.round((registered / capacity) * 100));

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200/80">
      <div className="space-y-1.5">
        {distance <= 0 ? (
          <div className="py-2.5 px-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center gap-2 font-bold text-xs shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Sự kiện đang diễn ra</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('events.startsIn')}</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="bg-slate-50 border border-slate-100 rounded-xl py-1.5 px-1">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono leading-none">
                  {pad(days)}
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">{t('events.days')}</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl py-1.5 px-1">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono leading-none">
                  {pad(hours)}
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">{t('events.hrs')}</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl py-1.5 px-1">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono leading-none">
                  {pad(minutes)}
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">{t('events.min')}</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl py-1.5 px-1">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono leading-none">
                  {pad(seconds)}
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">{t('events.sec')}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {registered}/{capacity}
          </span>
          <span className="font-extrabold text-slate-800">{percent}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};



export const EventSchedule: React.FC = () => {
  const { t } = useTranslation();
  const { events, activeEvent, selectEventById, removeEvent, refreshEvents } = useEvent();
  const [isWifiModalOpen, setIsWifiModalOpen] = useState<boolean>(false);
  const [eventModalInitialTab, setEventModalInitialTab] = useState<'info' | 'maps'>('info');
  const [eventModalMode, setEventModalMode] = useState<'edit' | 'create'>('edit');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState<boolean>(false);

  const handleDeleteEvent = async () => {
    if (!activeEvent.id) return;
    setIsDeletingEvent(true);
    try {
      await apiService.deleteEvent(activeEvent.id);
      toast.success(`Đã xóa sự kiện "${activeEvent.title}" thành công!`);
      removeEvent(activeEvent.id);
      await refreshEvents();
      setIsDeleteConfirmModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa sự kiện';
      toast.error(msg);
    } finally {
      setIsDeletingEvent(false);
    }
  };
  const [schedules, setSchedules] = useState<EventScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string | 'ALL'>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Bookmarked IDs (Personal Agenda stored in localStorage)
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('eventhub_my_agenda');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showMyAgendaOnly, setShowMyAgendaOnly] = useState<boolean>(false);

  // Selected Session Detail Modal State
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<EventScheduleItem | null>(null);

  // Auth & RBAC Permissions
  const { isAuthenticated, user, hasRole, selectedRole } = useAuth();
  // Dynamic RBAC Permission Guard (Task 63: Staff có đầy đủ quyền bằng Manager)
  const isAttendeeOnly = selectedRole === 'ATTENDEE';
  const canManageEvent = (selectedRole ? (selectedRole === 'ORGANIZER' || selectedRole === 'ADMIN' || selectedRole === 'STAFF') : hasRole(['ADMIN', 'EVENT_MANAGER', 'STAFF'])) && !isAttendeeOnly;
  const canManageSchedule = (selectedRole ? (selectedRole === 'ORGANIZER' || selectedRole === 'ADMIN' || selectedRole === 'STAFF') : hasRole(['ADMIN', 'EVENT_MANAGER', 'STAFF'])) && !isAttendeeOnly;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [ticketModalData, setTicketModalData] = useState<TicketData | null>(null);
  const [registeringSession, setRegisteringSession] = useState<EventScheduleItem | null>(null);
  const [attendeeListSession, setAttendeeListSession] = useState<EventScheduleItem | null>(null);

  // Ask Speaker Modal State
  const [askSpeakerSession, setAskSpeakerSession] = useState<EventScheduleItem | null>(null);
  const [speakerQuestion, setSpeakerQuestion] = useState<string>('');
  const [attendeeName, setAttendeeName] = useState<string>('');
  const [attendeeEmail, setAttendeeEmail] = useState<string>('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState<boolean>(false);

  // Tab Navigation for Session Details (Task 31)
  const [sessionDetailTab, setSessionDetailTab] = useState<'overview' | 'qa' | 'materials' | 'feedback'>('overview');

  // Task 31: Session Q&A State
  const [sessionQuestions, setSessionQuestions] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [qaStatusFilter, setQaStatusFilter] = useState<string>('ALL');
  const [newQaQuestion, setNewQaQuestion] = useState<string>('');
  const [isSubmittingQa, setIsSubmittingQa] = useState<boolean>(false);
  const [answeringQuestionId, setAnsweringQuestionId] = useState<number | null>(null);
  const [questionAnswerText, setQuestionAnswerText] = useState<string>('');

  // Task 31: Session Materials State
  const [sessionMaterials, setSessionMaterials] = useState<any[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState<boolean>(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState<boolean>(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState<string>('');
  const [newMaterialUrl, setNewMaterialUrl] = useState<string>('');
  const [newMaterialType, setNewMaterialType] = useState<string>('SLIDE');
  const [newMaterialSize, setNewMaterialSize] = useState<string>('12.5 MB');
  const [newMaterialIsPublic, setNewMaterialIsPublic] = useState<boolean>(false);
  const [isSubmittingMaterial, setIsSubmittingMaterial] = useState<boolean>(false);

  // Task 31: Session Feedback State
  const [sessionFeedbacks, setSessionFeedbacks] = useState<any[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<any | null>(null);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState<boolean>(false);
  const [userRating, setUserRating] = useState<number>(5);
  const [userContentRating, setUserContentRating] = useState<number>(5);
  const [userSpeakerRating, setUserSpeakerRating] = useState<number>(5);
  const [userFeedbackComment, setUserFeedbackComment] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [isEditingFeedback, setIsEditingFeedback] = useState<boolean>(false);
  const [existingFeedbackId, setExistingFeedbackId] = useState<number | null>(null);
  const [submittedFeedbackIds, setSubmittedFeedbackIds] = useState<number[]>(() => {
    if (!user) return [];
    try {
      const saved = localStorage.getItem(`eventhub_submitted_feedback_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Synchronize user-specific submitted feedback IDs when user or schedules change
  useEffect(() => {
    if (!user) {
      setSubmittedFeedbackIds([]);
      return;
    }
    const reviewedFromSchedule = schedules
      .filter((s) => s.has_reviewed)
      .map((s) => s.id);

    let savedUserFeedback: number[] = [];
    try {
      const saved = localStorage.getItem(`eventhub_submitted_feedback_${user.id}`);
      savedUserFeedback = saved ? JSON.parse(saved) : [];
    } catch {
      savedUserFeedback = [];
    }
    const merged = Array.from(new Set([...reviewedFromSchedule, ...savedUserFeedback]));
    setSubmittedFeedbackIds(merged);
  }, [user?.id, schedules]);

  // Card Level Action Menu & Edit/Delete States
  const [openCardMenuId, setOpenCardMenuId] = useState<number | null>(null);
  const [editingScheduleItem, setEditingScheduleItem] = useState<EventScheduleItem | null>(null);
  const [deletingScheduleItem, setDeletingScheduleItem] = useState<EventScheduleItem | null>(null);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState<boolean>(false);

  // Add/Edit Session Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSpeaker, setNewSpeaker] = useState('');
  const [newSpeakerRole, setNewSpeakerRole] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00 AM');
  const [newEndTime, setNewEndTime] = useState('10:00 AM');
  const [newRoom, setNewRoom] = useState('Hội trường Grand Ballroom A');
  const [newDay, setNewDay] = useState<number>(1);
  const [newDate, setNewDate] = useState('2026-10-15');
  const [newTrack, setNewTrack] = useState('AI & Tech');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [newGoogleMapsUrl, setNewGoogleMapsUrl] = useState('');
  const [newWifiName, setNewWifiName] = useState('EventHub_GrandBallroom');
  const [newWifiPassword, setNewWifiPassword] = useState('VIP2026@Pass');
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [aiStyle, setAiStyle] = useState<'auto' | 'professional' | 'literary' | 'inspirational' | 'academic'>('auto');
  const [isAddMapPreviewOpen, setIsAddMapPreviewOpen] = useState<boolean>(true);
  const [isAiGeneratingDesc, setIsAiGeneratingDesc] = useState<boolean>(false);

  const handleOpenAddSession = () => {
    setEditingScheduleItem(null);
    setNewTitle('');
    setNewSpeaker('');
    setNewSpeakerRole('');
    setNewStartTime('09:00 AM');
    setNewEndTime('10:00 AM');
    setNewRoom('Hội trường Grand Ballroom A');
    setNewDay(1);
    setNewDate('2026-10-15');
    setNewTrack('AI & Tech');
    setNewLocationAddress('');
    setNewGoogleMapsUrl('');
    setNewWifiName('EventHub_GrandBallroom');
    setNewWifiPassword('VIP2026@Pass');
    setNewSlideUrl('');
    setNewSlideTitle('');
    setNewDesc('');
    setAiStyle('auto');
    setIsAddModalOpen(true);
  };

  const handleOpenEditSession = (item: EventScheduleItem) => {
    setEditingScheduleItem(item);
    setNewTitle(item.title);
    setNewSpeaker(item.speaker_name);
    setNewSpeakerRole(item.speaker_role || '');
    setNewStartTime(item.start_time);
    setNewEndTime(item.end_time);
    setNewRoom(item.room_location);
    setNewDay(item.day_number);

    if (item.start_date && item.start_date.includes('/')) {
      const parts = item.start_date.split(' ')[0].split('/');
      if (parts.length === 3) {
        setNewDate(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      }
    } else {
      setNewDate(item.day_number === 2 ? '2026-10-16' : '2026-10-15');
    }

    setNewTrack(item.track || 'AI & Tech');
    setNewLocationAddress(item.location_address || '');
    setNewGoogleMapsUrl(item.google_maps_url || '');
    setNewWifiName(item.wifiName || 'EventHub_GrandBallroom');
    setNewWifiPassword(item.wifiPassword || 'VIP2026@Pass');
    setNewSlideUrl('');
    setNewSlideTitle('');
    setNewDesc(item.description || '');
    setAiStyle('auto');
    setIsAddModalOpen(true);
    setOpenCardMenuId(null);
  };

  const handleConfirmDeleteSession = async () => {
    if (!deletingScheduleItem) return;
    setIsDeletingSchedule(true);
    try {
      await apiService.deleteEventSchedule(deletingScheduleItem.id, activeEvent.id);
      setSchedules((prev) => prev.filter((s) => s.id !== deletingScheduleItem.id));
      toast.success(`Đã xóa phiên "${deletingScheduleItem.title}" khỏi danh sách!`);
      setDeletingScheduleItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa phiên diễn thuyết';
      toast.error(msg);
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  const handleAiGenerateDescription = async () => {
    if (!newTitle.trim()) {
      toast.error('Vui lòng nhập Tiêu Đề Phiên trước khi AI sinh mô tả!');
      return;
    }
    setIsAiGeneratingDesc(true);
    try {
      const desc = await apiService.generateSessionDescription({
        title: newTitle.trim(),
        track: newTrack.trim() || 'AI & Tech',
        speaker_name: newSpeaker.trim(),
        speaker_role: newSpeakerRole.trim(),
        style: aiStyle,
      });
      setNewDesc(desc);
      toast.success('AI đã tự động sinh mô tả theo phong cách thành công!');
    } catch {
      toast.error('Không thể sinh mô tả AI. Vui lòng thử lại!');
    } finally {
      setIsAiGeneratingDesc(false);
    }
  };

  const handleRegisterClick = (item: EventScheduleItem) => {
    if (item.is_registered) {
      handleOpenTicket(item);
      return;
    }

    const isSoldOut = (item.registered_count ?? 0) >= (item.capacity ?? 100);
    if (isSoldOut) {
      toast.error('Phiên này đã hết vé!');
      return;
    }

    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      toast.info('Vui lòng đăng nhập để đăng ký vé tham dự phiên!');
      return;
    }

    setRegisteringSession(item);
  };

  const handleOpenTicket = (item: EventScheduleItem) => {
    setTicketModalData({
      id: item.registration_id || item.id,
      event_id: item.event_id || activeEvent.id || 1,
      participant_name: user?.full_name || 'Khách Tham Dự',
      participant_email: user?.email || '',
      qr_code_token: item.qr_code_token || `QR-SESSION-${item.id}`,
      qr_code_image: item.qr_code_image,
      ticket_type: 'Vé Tham Dự',
      event_title: activeEvent.title || 'EventHub AI Summit 2026',
      schedule_id: item.id,
      schedule_title: item.title,
      room_location: item.room_location,
      start_time: item.start_time,
      end_time: item.end_time,
      date_label: item.date_label,
      message: 'Vé tham dự phiên chính thức của bạn!',
    });
  };

  const handleRegisterSuccess = (ticketData: any, updatedSchedule: EventScheduleItem) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === updatedSchedule.id ? updatedSchedule : s))
    );
    if (selectedSessionDetail?.id === updatedSchedule.id) {
      setSelectedSessionDetail(updatedSchedule);
    }
    setTicketModalData({
      id: ticketData.id,
      event_id: ticketData.event_id,
      participant_name: ticketData.participant_name,
      participant_email: ticketData.participant_email,
      qr_code_token: ticketData.qr_code_token,
      qr_code_image: ticketData.qr_code_image,
      ticket_type: ticketData.ticket_type,
      event_title: activeEvent.title || ticketData.event_title,
      schedule_id: updatedSchedule.id,
      schedule_title: updatedSchedule.title,
      room_location: updatedSchedule.room_location,
      start_time: updatedSchedule.start_time,
      end_time: updatedSchedule.end_time,
      date_label: updatedSchedule.date_label,
      message: ticketData.message || 'Đăng ký vé thành công!',
    });
  };

  const handleCancelTicketSuccess = (ticketId: number, scheduleId?: number) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id === scheduleId || s.registration_id === ticketId) {
          return {
            ...s,
            registered_count: Math.max(0, (s.registered_count ?? 1) - 1),
            is_registered: false,
            registration_id: undefined,
            qr_code_token: undefined,
            qr_code_image: undefined,
          };
        }
        return s;
      })
    );
    if (selectedSessionDetail && (selectedSessionDetail.id === scheduleId || selectedSessionDetail.registration_id === ticketId)) {
      setSelectedSessionDetail((prev) =>
        prev
          ? {
              ...prev,
              registered_count: Math.max(0, (prev.registered_count ?? 1) - 1),
              is_registered: false,
              registration_id: undefined,
              qr_code_token: undefined,
              qr_code_image: undefined,
            }
          : null
      );
    }
  };

  const renderTicketButton = (item: EventScheduleItem, isSmall: boolean = false) => {
    const isRegistered = item.is_registered;
    const isSoldOut = !isRegistered && (item.registered_count ?? 0) >= (item.capacity ?? 100);

    if (isRegistered) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenTicket(item);
          }}
          className={`${
            isSmall ? 'px-2.5 py-2' : 'px-3.5 py-2.5'
          } min-h-[44px] rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
          title="Xem vé QR Code & thông tin chi tiết"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
          <span>✅ {item.is_checked_in ? 'Đã Check-in / Xem Vé QR' : 'Đã Đăng Ký / Xem Vé QR'}</span>
        </button>
      );
    }

    if (isSoldOut) {
      return (
        <button
          type="button"
          disabled
          className={`${
            isSmall ? 'px-2.5 py-2' : 'px-3.5 py-2.5'
          } min-h-[44px] rounded-xl text-xs font-bold bg-slate-200 text-slate-500 border border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80`}
          title="Phiên đã đạt giới hạn số lượng chỗ ngồi"
        >
          <X className="w-3.5 h-3.5" />
          <span>🚫 Đã Hết Vé</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleRegisterClick(item);
        }}
        className={`${
          isSmall ? 'px-2.5 py-2' : 'px-3.5 py-2.5'
        } min-h-[44px] rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
      >
        <Ticket className="w-3.5 h-3.5" />
        <span>🎫 Đăng Ký Vé</span>
      </button>
    );
  };

  const fetchSchedule = useCallback(async (eventId?: number) => {
    const targetId = eventId || activeEvent.id || 1;
    setLoading(true);
    try {
      const items = await apiService.getEventSchedule(targetId);
      setSchedules(items);
    } catch (err) {
      console.error('Failed to fetch event schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [activeEvent.id, user?.id]);

  useEffect(() => {
    fetchSchedule(activeEvent.id);
  }, [activeEvent.id, user?.id, fetchSchedule]);

  // Task 34: Fetch persisted session reminders from server when logged in
  useEffect(() => {
    if (user) {
      apiService.getMySessionReminders().then((res) => {
        if (res && res.session_ids && Array.isArray(res.session_ids)) {
          setBookmarkedIds((prev) => {
            const combined = Array.from(new Set([...prev, ...res.session_ids]));
            try {
              localStorage.setItem('eventhub_my_agenda', JSON.stringify(combined));
            } catch (e) {
              console.error(e);
            }
            return combined;
          });
        }
      }).catch((e) => console.warn('Could not fetch session reminders:', e));
    }
  }, [user]);

  // Personal Agenda & Bookmark Toggle with localStorage Persistence & Email Reminders (Task 34)
  const toggleBookmark = (id: number, title: string) => {
    setBookmarkedIds((prev) => {
      let updated: number[];
      if (prev.includes(id)) {
        updated = prev.filter((i) => i !== id);
        toast.info(`Đã bỏ đặt lịch: "${title}"`);
      } else {
        updated = [...prev, id];
        toast.success(`Đã thêm vào lịch cá nhân: "${title}" (Hệ thống sẽ gửi email nhắc trước 24h và 1h)`);
      }
      try {
        localStorage.setItem('eventhub_my_agenda', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist bookmark to localStorage:', e);
      }
      return updated;
    });

    // Sync with backend reminder scheduler if logged in
    if (user) {
      apiService.toggleSessionReminder(id).catch((e) => {
        console.warn('Sync session reminder error:', e);
      });
    }
  };

  // Task 35: Strict Feedback Permission Check
  const checkFeedbackPermission = (item?: EventScheduleItem | null): boolean => {
    if (canManageSchedule) return true;
    if (!item?.is_registered) {
      toast.warning('Bạn cần đăng ký sự kiện này trước khi đánh giá.');
      return false;
    }
    return true;
  };

  // Calendar Helpers (Google Calendar & RFC 5545 .ics generator)
  const formatCalendarTimes = (item: EventScheduleItem) => {
    let y = 2026, m = 10, d = 15;
    if (item.start_date && item.start_date.includes('/')) {
      const parts = item.start_date.split(' ')[0].split('/');
      if (parts.length === 3) {
        d = parseInt(parts[0], 10) || 15;
        m = parseInt(parts[1], 10) || 10;
        y = parseInt(parts[2], 10) || 2026;
      }
    } else if (item.day_number === 2) {
      d = 16;
    }

    const parseTimeToHM = (tStr?: string, defaultH = 9, defaultM = 0) => {
      if (!tStr) return { h: defaultH, m: defaultM };
      const isPM = /pm/i.test(tStr);
      const isAM = /am/i.test(tStr);
      const cleaned = tStr.replace(/[^\d:]/g, '');
      const [hStr, mStr] = cleaned.split(':');
      let h = parseInt(hStr, 10) || defaultH;
      const mn = parseInt(mStr, 10) || defaultM;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return { h, m: mn };
    };

    const startHM = parseTimeToHM(item.start_time, 9, 0);
    const endHM = parseTimeToHM(item.end_time, startHM.h + 1, startHM.m);

    const pad = (n: number) => String(n).padStart(2, '0');
    const dtStart = `${y}${pad(m)}${pad(d)}T${pad(startHM.h)}${pad(startHM.m)}00`;
    const dtEnd = `${y}${pad(m)}${pad(d)}T${pad(endHM.h)}${pad(endHM.m)}00`;

    return { dtStart, dtEnd };
  };

  const openGoogleCalendar = (item: EventScheduleItem) => {
    const { dtStart, dtEnd } = formatCalendarTimes(item);
    const title = encodeURIComponent(`[EventHub] ${item.title}`);
    const details = encodeURIComponent(
      `${item.description || ''}\n\nDiễn giả: ${item.speaker_name} (${item.speaker_role || ''})\nSự kiện: ${activeEvent.title}\nPhòng: ${item.room_location}`
    );
    const location = encodeURIComponent(`${item.room_location}, ${activeEvent.location_address || activeEvent.location || ''}`);
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${location}`;
    window.open(gcalUrl, '_blank', 'noopener,noreferrer');
    toast.success('Đang mở Google Calendar...');
  };

  const downloadSessionICS = (item: EventScheduleItem) => {
    const { dtStart, dtEnd } = formatCalendarTimes(item);
    const nowICS = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventHub AI//VN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:eventhub-session-${item.id}-${Date.now()}@eventhub.ai`,
      `DTSTAMP:${nowICS}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:[EventHub] ${item.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(item.description || '').replace(/\n/g, ' ')} - Diễn giả: ${item.speaker_name}`,
      `LOCATION:${item.room_location}, ${(activeEvent.location_address || activeEvent.location || '').replace(/\n/g, ' ')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `eventhub-session-${item.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`Đã tải file lịch .ics cho phiên: "${item.title}"`);
  };

  const handleExportAllICS = () => {
    const targets = bookmarkedIds.length > 0
      ? schedules.filter((s) => bookmarkedIds.includes(s.id))
      : schedules;

    if (targets.length === 0) {
      toast.info('Chưa có ca diễn thuyết nào để xuất file lịch!');
      return;
    }

    const nowICS = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const eventsICS = targets.map((item) => {
      const { dtStart, dtEnd } = formatCalendarTimes(item);
      return [
        'BEGIN:VEVENT',
        `UID:eventhub-session-${item.id}-${Date.now()}@eventhub.ai`,
        `DTSTAMP:${nowICS}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:[EventHub] ${item.title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${(item.description || '').replace(/\n/g, ' ')} - Diễn giả: ${item.speaker_name}`,
        `LOCATION:${item.room_location}, ${(activeEvent.location_address || activeEvent.location || '').replace(/\n/g, ' ')}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n');
    }).join('\r\n');

    const fullICS = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventHub AI//VN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      eventsICS,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([fullICS], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `eventhub-agenda-${Date.now()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`Đã tải file lịch .ics gồm ${targets.length} phiên diễn thuyết!`);
  };

  const handleOpenAskSpeaker = (item: EventScheduleItem) => {
    setAskSpeakerSession(item);
    setAttendeeName(user?.full_name || '');
    setAttendeeEmail(user?.email || '');
    setSpeakerQuestion('');
  };

  const handleSubmitSpeakerQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speakerQuestion.trim()) {
      toast.error('Vui lòng nhập nội dung câu hỏi muốn gửi!');
      return;
    }
    if (!askSpeakerSession) return;
    setIsSubmittingQuestion(true);
    try {
      await apiService.submitSpeakerQuestion({
        event_id: activeEvent.id || 1,
        session_id: askSpeakerSession.id,
        speaker_name: askSpeakerSession.speaker_name,
        question: speakerQuestion.trim(),
        participant_id: user?.id || 1,
        attendee_name: attendeeName.trim() || user?.full_name || 'Khách Tham Dự',
        attendee_email: attendeeEmail.trim() || user?.email || '',
      });
      toast.success(`Câu hỏi của bạn đã được chuyển tới diễn giả ${askSpeakerSession.speaker_name}!`);
      setAskSpeakerSession(null);
      setSpeakerQuestion('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi câu hỏi';
      toast.error(msg);
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // --- Task 31: Fetchers & Handlers for Q&A, Materials, and Feedback ---

  const fetchSessionQuestions = useCallback(async (sessionId: number, statusFilt?: string) => {
    setIsLoadingQuestions(true);
    try {
      const data = await apiService.getSessionQuestions(sessionId, statusFilt);
      setSessionQuestions(data);
    } catch (e) {
      console.error('Failed to load session questions:', e);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, []);

  const fetchSessionMaterials = useCallback(async (sessionId: number) => {
    setIsLoadingMaterials(true);
    try {
      const data = await apiService.getSessionMaterials(sessionId);
      setSessionMaterials(data);
    } catch (e) {
      console.error('Failed to load session materials:', e);
    } finally {
      setIsLoadingMaterials(false);
    }
  }, []);

  const fetchSessionFeedbacks = useCallback(async (sessionId: number) => {
    setIsLoadingFeedbacks(true);
    try {
      const data = await apiService.getSessionFeedbacks(sessionId);
      setSessionFeedbacks(data.feedbacks || []);
      setFeedbackStats(data.stats || null);
    } catch (e) {
      console.error('Failed to load session feedbacks:', e);
    } finally {
      setIsLoadingFeedbacks(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionDetail) {
      fetchSessionQuestions(selectedSessionDetail.id, qaStatusFilter);
      fetchSessionMaterials(selectedSessionDetail.id);
      fetchSessionFeedbacks(selectedSessionDetail.id);

      // Reset editing mode
      setIsEditingFeedback(false);

      // Fetch user's existing feedback for this session
      if (user) {
        apiService
          .getMyFeedback(activeEvent.id || 1, selectedSessionDetail.id)
          .then((res) => {
            if (res && res.has_feedback && res.feedback) {
              setExistingFeedbackId(res.feedback.id);
              setUserRating(res.feedback.rating || 5);
              setUserFeedbackComment(res.feedback.comment || '');
              setSubmittedFeedbackIds((prev) =>
                prev.includes(selectedSessionDetail.id) ? prev : [...prev, selectedSessionDetail.id]
              );
            } else {
              setExistingFeedbackId(null);
            }
          })
          .catch(() => {
            setExistingFeedbackId(null);
          });
      }
    }
  }, [selectedSessionDetail, qaStatusFilter, fetchSessionQuestions, fetchSessionMaterials, fetchSessionFeedbacks, user, activeEvent.id]);

  // Q&A Handlers
  const handleSendQaQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQaQuestion.trim() || !selectedSessionDetail) return;
    setIsSubmittingQa(true);
    try {
      const res = await apiService.submitSessionQuestion(selectedSessionDetail.id, {
        asker_name: user?.full_name || 'Khách Tham Dự',
        asker_email: user?.email || '',
        question: newQaQuestion.trim(),
        user_id: user?.id,
      });
      setSessionQuestions((prev) => [res, ...prev]);
      setNewQaQuestion('');
      toast.success('Đã gửi câu hỏi tới diễn giả thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi câu hỏi';
      toast.error(msg);
    } finally {
      setIsSubmittingQa(false);
    }
  };

  const handleUpvoteQuestion = async (questionId: number) => {
    try {
      const res = await apiService.upvoteQuestion(questionId);
      setSessionQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, upvotes: res.upvotes } : q))
      );
      toast.success('Đã bình chọn cho câu hỏi này!');
    } catch (e) {
      console.error('Upvote failed:', e);
    }
  };

  const handleUpdateQuestionStatus = async (
    questionId: number,
    newStatus: string,
    answerText?: string
  ) => {
    try {
      await apiService.updateQuestionStatus(questionId, {
        status: newStatus,
        answer: answerText,
        is_answered: !!(answerText && answerText.trim()),
      });
      setSessionQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                status: newStatus,
                answer: answerText !== undefined ? answerText : q.answer,
                is_answered: !!(answerText && answerText.trim()) || q.is_answered,
              }
            : q
        )
      );
      setAnsweringQuestionId(null);
      setQuestionAnswerText('');
      toast.success('Đã cập nhật trạng thái câu hỏi!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật';
      toast.error(msg);
    }
  };

  // Materials Handlers
  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialTitle.trim() || !newMaterialUrl.trim() || !selectedSessionDetail) {
      toast.error('Vui lòng nhập tên và link tài liệu!');
      return;
    }
    setIsSubmittingMaterial(true);
    try {
      const res = await apiService.addSessionMaterial(selectedSessionDetail.id, {
        title: newMaterialTitle.trim(),
        file_url: newMaterialUrl.trim(),
        material_type: newMaterialType,
        file_size: newMaterialSize || '5.0 MB',
        is_public_to_all: newMaterialIsPublic,
      });
      setSessionMaterials((prev) => [res, ...prev]);
      setNewMaterialTitle('');
      setNewMaterialUrl('');
      setIsAddMaterialModalOpen(false);
      toast.success('Đã tải lên và liên kết tài liệu vào phiên!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể thêm tài liệu';
      toast.error(msg);
    } finally {
      setIsSubmittingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    try {
      await apiService.deleteSessionMaterial(materialId);
      setSessionMaterials((prev) => prev.filter((m) => m.id !== materialId));
      toast.success('Đã xóa tài liệu!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa tài liệu';
      toast.error(msg);
    }
  };

  const handleDownloadMaterial = async (item: any) => {
    if (!item.can_download && !canManageSchedule) {
      toast.error('Tài liệu chỉ dành cho người đã đăng ký vé phiên này. Vui lòng bấm Đăng Ký Vé!');
      return;
    }
    try {
      await apiService.downloadSessionMaterial(item.id);
      setSessionMaterials((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, download_count: (m.download_count || 0) + 1 } : m))
      );
      window.open(item.file_url, '_blank', 'noopener,noreferrer');
      toast.success(`Đang mở tải tài liệu: "${item.title}"`);
    } catch {
      window.open(item.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Feedback Handlers (Task 31, 34 & 35)
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionDetail) return;
    if (!checkFeedbackPermission(selectedSessionDetail)) return;
    setIsSubmittingFeedback(true);
    try {
      // 1. Submit to global feedback table (Task 33 & 34) - Backend enforces 403 if attendee not registered
      const globalFb = await apiService.submitFeedback({
        event_id: activeEvent.id || 1,
        session_id: selectedSessionDetail.id,
        rating: userRating,
        comment: userFeedbackComment.trim(),
      });
      if (globalFb && globalFb.id) {
        setExistingFeedbackId(globalFb.id);
      }

      // 2. Submit session feedback
      try {
        await apiService.submitSessionFeedback(selectedSessionDetail.id, {
          participant_name: user?.full_name || 'Khách Tham Dự',
          rating: userRating,
          content_quality: userContentRating,
          speaker_rating: userSpeakerRating,
          comment: userFeedbackComment.trim(),
          user_id: user?.id,
        });
      } catch (e: any) {
        console.warn('Session feedback submit:', e);
      }

      // 3. Mark as submitted in state & user-scoped localStorage
      const sessId = selectedSessionDetail.id;
      setSubmittedFeedbackIds((prev) => {
        const next = prev.includes(sessId) ? prev : [...prev, sessId];
        if (user?.id) {
          try {
            localStorage.setItem(`eventhub_submitted_feedback_${user.id}`, JSON.stringify(next));
          } catch (e) {
            console.error(e);
          }
        }
        return next;
      });

      setIsEditingFeedback(false);
      toast.success('Cảm ơn bạn đã gửi đánh giá cho phiên diễn thuyết!');
      fetchSessionFeedbacks(selectedSessionDetail.id);
    } catch (err: any) {
      let msg = 'Không thể gửi đánh giá';
      if (err?.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleUpdateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionDetail) return;
    if (!checkFeedbackPermission(selectedSessionDetail)) return;
    setIsSubmittingFeedback(true);
    try {
      let fbId = existingFeedbackId;
      if (!fbId && user) {
        const myFb = await apiService.getMyFeedback(activeEvent.id || 1, selectedSessionDetail.id);
        if (myFb?.has_feedback && myFb.feedback?.id) {
          fbId = myFb.feedback.id;
          setExistingFeedbackId(fbId);
        }
      }

      if (!fbId) {
        // If not found on server, fallback to submit
        return handleSubmitFeedback(e);
      }

      await apiService.updateFeedback(fbId, {
        rating: userRating,
        comment: userFeedbackComment.trim(),
      });

      setIsEditingFeedback(false);
      toast.success('Cập nhật đánh giá thành công!');
      fetchSessionFeedbacks(selectedSessionDetail.id);
    } catch (err: any) {
      let msg = 'Không thể cập nhật đánh giá';
      if (err?.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleAddScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Vui lòng điền tiêu đề ca diễn thuyết!');
      return;
    }
    if (!newSpeaker.trim()) {
      toast.error('Vui lòng điền tên diễn giả!');
      return;
    }
    if (!newRoom.trim()) {
      toast.error('Vui lòng điền phòng họp / địa điểm!');
      return;
    }

    if (!newDate) {
      toast.error('Vui lòng chọn ngày diễn ra phiên!');
      return;
    }

    // 1. Chặn Tạo/Sửa Sự Kiện Thời Gian Trong Quá Khứ (Form Validation)
    const [dY, dM, dD] = newDate.split('-').map(Number);
    let sH = 8, sM = 0;
    if (newStartTime) {
      const ampmMatch = newStartTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (ampmMatch) {
        sH = parseInt(ampmMatch[1], 10);
        sM = parseInt(ampmMatch[2], 10);
        const ampm = ampmMatch[3]?.toUpperCase();
        if (ampm === 'PM' && sH < 12) sH += 12;
        if (ampm === 'AM' && sH === 12) sH = 0;
      }
    }
    const sessionStart = new Date(dY, dM - 1, dD, sH, sM, 0);
    if (isNaN(sessionStart.getTime()) || sessionStart.getTime() < Date.now()) {
      toast.error('Thời gian bắt đầu sự kiện không được nằm trong quá khứ');
      return;
    }

    const formattedDate = newDate
      ? `${newDate.split('-')[2]}/${newDate.split('-')[1]}/${newDate.split('-')[0]}`
      : (newDay === 2 ? '16/10/2026' : '15/10/2026');

    const itemAddress = newLocationAddress.trim() || activeEvent.location_address || 'Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh';
    const itemMapsUrl = newGoogleMapsUrl.trim() || activeEvent.google_maps_url || `https://maps.google.com/maps?q=${encodeURIComponent(itemAddress)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

    const schedulePayload = {
      title: newTitle.trim(),
      speaker_name: newSpeaker.trim(),
      speaker_role: newSpeakerRole.trim() || 'Diễn giả khách mời',
      start_time: newStartTime,
      end_time: newEndTime,
      room_location: newRoom.trim(),
      day_number: newDay,
      date_label: formattedDate,
      track: newTrack.trim() || 'AI & Tech',
      description: newDesc.trim(),
      start_date: formattedDate,
      location_address: itemAddress,
      google_maps_url: itemMapsUrl,
      wifiName: newWifiName.trim(),
      wifiPassword: newWifiPassword.trim(),
    };

    let targetSessionId: number | null = null;

    if (editingScheduleItem) {
      targetSessionId = editingScheduleItem.id;
      try {
        const updated = await apiService.updateEventSchedule(
          editingScheduleItem.id,
          schedulePayload,
          activeEvent.id
        );
        setSchedules((prev) =>
          prev.map((s) => (s.id === editingScheduleItem.id ? { ...s, ...updated } : s))
        );
        toast.success(`Đã cập nhật phiên "${updated.title}" thành công!`);
      } catch {
        const fallbackUpdated: EventScheduleItem = {
          ...editingScheduleItem,
          ...schedulePayload,
        };
        setSchedules((prev) =>
          prev.map((s) => (s.id === editingScheduleItem.id ? fallbackUpdated : s))
        );
        toast.success('Đã lưu chỉnh sửa ca diễn thuyết thành công!');
      } finally {
        setIsAddModalOpen(false);
        setEditingScheduleItem(null);
      }
    } else {
      try {
        const newItem = await apiService.createEventSchedule(activeEvent.id || 1, schedulePayload);
        targetSessionId = newItem.id;
        setSchedules((prev) => [...prev, newItem]);
        toast.success('Đã thêm phiên diễn thuyết mới thành công!');
      } catch (err) {
        const fallbackItem: EventScheduleItem = {
          id: Date.now(),
          event_id: activeEvent.id || 1,
          ...schedulePayload,
        };
        targetSessionId = fallbackItem.id;
        setSchedules((prev) => [...prev, fallbackItem]);
        toast.success('Đã lưu ca diễn thuyết mới thành công!');
      } finally {
        setIsAddModalOpen(false);
      }
    }

    if (newSlideUrl.trim() && targetSessionId) {
      try {
        await apiService.addSessionMaterial(targetSessionId, {
          title: newSlideTitle.trim() || `${newTitle.trim()} - Slide Thuyết Trình`,
          file_url: newSlideUrl.trim(),
          material_type: 'SLIDE',
          is_public_to_all: true,
        });
        toast.success('Đã tự động đính kèm slide tài liệu vào phiên!');
      } catch {
        // Non-blocking
      }
    }

    // Reset form
    setNewTitle('');
    setNewSpeaker('');
    setNewSpeakerRole('');
    setNewLocationAddress('');
    setNewGoogleMapsUrl('');
    setNewSlideUrl('');
    setNewSlideTitle('');
    setNewDesc('');
  };

  // Filtered schedules
  const filteredSchedules = schedules.filter((item) => {
    if (showMyAgendaOnly && !bookmarkedIds.includes(item.id)) {
      return false;
    }
    if (selectedDate !== 'ALL' && extractItemDate(item, activeEvent.start_date) !== selectedDate) {
      return false;
    }
    if (selectedRoom !== 'ALL' && item.room_location !== selectedRoom) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSpeaker = item.speaker_name.toLowerCase().includes(q);
      const matchTrack = item.track?.toLowerCase().includes(q) || false;
      const matchRoom = item.room_location.toLowerCase().includes(q);
      return matchTitle || matchSpeaker || matchTrack || matchRoom;
    }
    return true;
  });

  const roomsList = Array.from(new Set(schedules.map((s) => s.room_location)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-900">
      {/* Events Catalog Page Header & Active Event Hero Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wide">
                ● {t('events.validTicket')}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {activeEvent.category_id === 1 ? 'Technology & AI Conference' : 'International Summit'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeEvent.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              {activeEvent.description || t('events.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Primary & Event Actions - Only for Admin & Event Manager (Task 30) */}
            {canManageEvent && (
              <>
                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={handleOpenAddSession}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {t('events.addNewSession')}
                </button>

            {/* Event Action Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span>Thao Tác Sự Kiện</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Popover */}
              {isActionMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsActionMenuOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                    {/* Header: Event Selection List */}
                    <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        Danh Sách Sự Kiện ({events.length})
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">Chọn sự kiện</span>
                    </div>

                    {/* Scrollable Event List */}
                    <div className="max-h-48 overflow-y-auto p-1.5 space-y-1">
                      {events.map((ev) => {
                        const isSelected = ev.id === activeEvent.id;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => {
                              selectEventById(ev.id);
                              setIsActionMenuOpen(false);
                              toast.success(`Đã chọn sự kiện: "${ev.title}"`);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/90 text-indigo-950 border border-indigo-200 font-bold shadow-2xs'
                                : 'text-slate-700 hover:bg-slate-50 border border-transparent font-medium'
                            }`}
                          >
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                isSelected ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-slate-300'
                              }`}
                            />
                            <div className="truncate flex-1 min-w-0">
                              <p className="truncate text-xs font-bold leading-tight">{ev.title}</p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {ev.start_date || 'Chưa đặt ngày'} • {ev.location}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Create New Event Option */}
                    <div className="p-1.5 border-t border-slate-100 bg-slate-50/50">
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          setEventModalMode('create');
                          setEventModalInitialTab('info');
                          setIsWifiModalOpen(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer border border-indigo-100 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>➕ Tạo sự kiện mới</span>
                      </button>
                    </div>

                    {/* Section: Action on selected event */}
                    <div className="border-t border-slate-100 my-1" />
                    <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Thao tác cho sự kiện #{activeEvent.id}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        setEventModalMode('edit');
                        setEventModalInitialTab('info');
                        setIsWifiModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-semibold cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-indigo-600" />
                      <span>Chỉnh sửa sự kiện</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        setEventModalMode('edit');
                        setEventModalInitialTab('maps');
                        setIsWifiModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-semibold cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>Cấu hình & Bản đồ, WiFi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        const query = activeEvent.location_address || activeEvent.location || 'GEM Center TP Hồ Chí Minh';
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-semibold cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <span>Xem vị trí Google Maps</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        setIsDeleteConfirmModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 text-rose-600 font-bold cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>Xóa sự kiện này</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

          {/* Attendee Quick Actions: My Agenda & Export ICS */}
          <button
            type="button"
            onClick={() => setShowMyAgendaOnly(!showMyAgendaOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              showMyAgendaOnly
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 ring-2 ring-amber-200'
                : 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200'
            }`}
            title="Lọc các phiên bạn đã bấm bookmark / đặt lịch cá nhân"
          >
            <Bookmark className="w-3.5 h-3.5 fill-current" />
            <span>Lịch Của Tôi ({bookmarkedIds.length})</span>
          </button>

          <button
            type="button"
            onClick={handleExportAllICS}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Tải toàn bộ lịch sự kiện hoặc lịch cá nhân dưới dạng file .ics (iCalendar)"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tải Lịch .ics</span>
          </button>
        </div>
        </div>

        {/* Date, Location, Address Badge Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">{t('events.date')}</span>
              <p className="font-bold text-slate-900">{activeEvent.start_date || '15/10/2026 08:30'} - {activeEvent.end_date ? activeEvent.end_date.split(' ')[0] : '16/10/2026'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">{t('events.location')}</span>
              <p className="font-bold text-slate-900 truncate">{activeEvent.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="truncate flex-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">{t('events.locationAddress')}</span>
              <p className="font-medium text-slate-700 text-[11px] truncate" title={activeEvent.location_address}>
                {activeEvent.location_address || 'Số 8 Nguyễn Bỉnh Khiêm, P. Đa Kao, Q.1, TP.HCM'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <CreateEventModal
        isOpen={isWifiModalOpen}
        onClose={() => setIsWifiModalOpen(false)}
        initialTab={eventModalInitialTab}
        mode={eventModalMode}
      />

      {/* Control Toolbar: Multi-day tabs, Room Filter, Search & View Toggle */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Multi-day Filter Tabs & My Agenda Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto">
          {/* Nút "Tất cả các ngày" */}
          <button
            type="button"
            onClick={() => {
              setShowMyAgendaOnly(false);
              setSelectedDate('ALL');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              !showMyAgendaOnly && selectedDate === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            Tất cả các ngày ({schedules.length})
          </button>

          {/* Các tab ngày thực tế được trích xuất động từ danh sách sự kiện hiện có */}
          {Array.from(
            new Set(schedules.map((s) => extractItemDate(s, activeEvent.start_date)))
          )
            .sort((a, b) => {
              const parseDmy = (dStr: string) => {
                const [d, m, y] = dStr.split('/').map(Number);
                return new Date(y, m - 1, d).getTime();
              };
              return parseDmy(a) - parseDmy(b);
            })
            .map((dateStr) => {
              const count = schedules.filter(
                (s) => extractItemDate(s, activeEvent.start_date) === dateStr
              ).length;
              const isSelected = !showMyAgendaOnly && selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => {
                    setShowMyAgendaOnly(false);
                    setSelectedDate(dateStr);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {dateStr} ({count})
                </button>
              );
            })}

          {/* Dedicated My Agenda Tab */}
          <button
            type="button"
            onClick={() => setShowMyAgendaOnly(!showMyAgendaOnly)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              showMyAgendaOnly
                ? 'bg-amber-500 text-white shadow-2xs ring-2 ring-amber-200'
                : 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'
            }`}
            title="Xem danh sách các ca bạn đã lưu vào lịch cá nhân"
          >
            <Bookmark className="w-3.5 h-3.5 fill-current" />
            <span>Lịch Của Tôi ({bookmarkedIds.length})</span>
          </button>
        </div>

        {/* Room Filter & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="ALL">{t('events.allRooms')}</option>
              {roomsList.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={t('events.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active My Agenda Filter Notice */}
      {showMyAgendaOnly && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4 fill-current" />
            </div>
            <div>
              <p className="font-bold text-amber-950">Chế độ xem: Lịch Trình Cá Nhân Của Bạn</p>
              <p className="text-[11px] text-amber-800">
                Đang hiển thị <strong>{filteredSchedules.length}</strong> phiên bạn đã đánh dấu đặt lịch.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportAllICS}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              <span>Xuất Lịch Cá Nhân (.ics)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMyAgendaOnly(false)}
              className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold transition-colors cursor-pointer"
            >
              Xem Toàn Bộ Lịch
            </button>
          </div>
        </div>
      )}

      {/* Schedule Content - Light Theme Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Đang tải lịch trình sự kiện...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-400 space-y-2 shadow-xs">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Không tìm thấy ca diễn thuyết phù hợp bộ lọc!</p>
          <p className="text-xs text-slate-500">Thử thay đổi bộ lọc ngày, phòng họp hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchedules.map((item) => {
            const isBookmarked = bookmarkedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="group relative bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between text-slate-900"
              >
                <div className="space-y-3">
                  {/* Top Badges & Card Level Action Menu (⋮) */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap flex-1">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-bold text-indigo-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        {item.start_date || (item.day_number === 2 ? '16/10/2026' : '15/10/2026')}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100/90 border border-slate-200/80 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        {item.start_time} - {item.end_time}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold">
                        {item.track}
                      </span>
                    </div>

                    {/* Card ⋮ Action Menu - RBAC (ADMIN, EVENT_MANAGER, STAFF) */}
                    {canManageSchedule && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenCardMenuId(openCardMenuId === item.id ? null : item.id);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Thao tác ca diễn thuyết"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openCardMenuId === item.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenCardMenuId(null);
                              }}
                            />
                            <div
                              className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  setAttendeeListSession(item);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-indigo-50 flex items-center gap-2 text-indigo-700 font-bold cursor-pointer"
                              >
                                <Users className="w-3.5 h-3.5 text-indigo-600" />
                                <span>👥 Danh sách người đăng ký</span>
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                type="button"
                                onClick={() => handleOpenEditSession(item)}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Chỉnh sửa phiên này</span>
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  setDeletingScheduleItem(item);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-bold cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Xóa phiên này</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  {/* Location & Speaker */}
                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate font-bold text-slate-800">{item.room_location}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const query = item.location_address || activeEvent.location_address || item.room_location;
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200/60 transition-colors"
                        title="Mở Google Maps chỉ đường"
                      >
                        <ExternalLink className="w-3 h-3 text-indigo-600" />
                        <span>{t('events.openMaps')}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-slate-900">{item.speaker_name}</span>
                        {item.speaker_role && (
                          <span className="text-[11px] text-slate-500 block truncate">{item.speaker_role}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2 Features: Countdown Timer & Registration Capacity Progress */}
                  <SessionCountdownProgress item={item} now={now} />
                </div>

                {/* Bottom Interactive Bar with View Details, Register Ticket, Calendar & Bookmark */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedSessionDetail(item)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 min-h-[44px] flex items-center gap-1 group/link cursor-pointer"
                  >
                    <span>{t('events.viewDetails')}</span>
                    <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                  </button>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAskSpeaker(item);
                      }}
                      className="px-2.5 py-2 min-h-[44px] rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Gửi câu hỏi trước cho diễn giả"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                      <span className="hidden xl:inline">Hỏi Diễn Giả</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!checkFeedbackPermission(item)) {
                          return;
                        }
                        setSelectedSessionDetail(item);
                        setSessionDetailTab('feedback');
                      }}
                      className={`px-2.5 py-2 min-h-[44px] rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        !item.is_registered && !canManageSchedule
                          ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed hover:bg-slate-100'
                          : submittedFeedbackIds.includes(item.id)
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 cursor-pointer'
                      }`}
                      title={
                        !item.is_registered && !canManageSchedule
                          ? 'Bạn cần đăng ký sự kiện này trước khi đánh giá'
                          : 'Đánh giá trải nghiệm phiên'
                      }
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          !item.is_registered && !canManageSchedule
                            ? 'text-slate-300'
                            : submittedFeedbackIds.includes(item.id)
                            ? 'fill-emerald-600 text-emerald-600'
                            : 'fill-amber-500 text-amber-500'
                        }`}
                      />
                      <span className="hidden xl:inline">
                        {submittedFeedbackIds.includes(item.id) ? 'Đã Đánh Giá' : 'Đánh Giá'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGoogleCalendar(item);
                      }}
                      className="px-2.5 py-2 min-h-[44px] rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Thêm phiên này vào Google Calendar"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden xl:inline">Google Cal</span>
                    </button>

                    {renderTicketButton(item, true)}
                    <button
                      onClick={() => toggleBookmark(item.id, item.title)}
                      className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isBookmarked
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                          : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200/80 shadow-2xs'
                      }`}
                    >
                      {isBookmarked ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t('events.bookmarked')}</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{t('events.bookmark')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredSchedules.map((item) => {
            const isBookmarked = bookmarkedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-300 transition-colors shadow-xs"
              >
                <div className="flex items-start gap-4">
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center shrink-0 space-y-0.5">
                    <p className="text-[10px] font-bold text-indigo-700 flex items-center justify-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-600" />
                      {item.start_date || (item.day_number === 2 ? '16/10/2026' : '15/10/2026')}
                    </p>
                    <p className="text-xs font-bold text-slate-800 font-mono">{item.start_time}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.end_time}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {item.track}
                      </span>
                      <span className="text-xs text-slate-500">{item.date_label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const query = item.location_address || activeEvent.location_address || item.room_location;
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer bg-indigo-50/70 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-100"
                      >
                        <ExternalLink className="w-3 h-3 text-indigo-600" />
                        <span>{t('events.openMaps')}</span>
                      </button>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">{item.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {item.room_location}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        {item.speaker_name} ({item.speaker_role})
                      </span>
                    </div>

                    {/* 2 Features: Countdown Timer & Registration Capacity Progress */}
                    <div className="max-w-md mt-2">
                      <SessionCountdownProgress item={item} now={now} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => setSelectedSessionDetail(item)}
                    className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {t('events.viewDetails')} →
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAskSpeaker(item)}
                    className="px-2.5 py-2 min-h-[44px] rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Gửi câu hỏi cho diễn giả"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                    <span>Hỏi Diễn Giả</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!checkFeedbackPermission(item)) {
                        return;
                      }
                      setSelectedSessionDetail(item);
                      setSessionDetailTab('feedback');
                    }}
                    className={`px-2.5 py-2 min-h-[44px] rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                      !item.is_registered && !canManageSchedule
                        ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed hover:bg-slate-100'
                        : submittedFeedbackIds.includes(item.id)
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 cursor-pointer'
                    }`}
                    title={
                      !item.is_registered && !canManageSchedule
                        ? 'Bạn cần đăng ký sự kiện này trước khi đánh giá'
                        : 'Đánh giá trải nghiệm phiên'
                    }
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        !item.is_registered && !canManageSchedule
                          ? 'text-slate-300'
                          : submittedFeedbackIds.includes(item.id)
                          ? 'fill-emerald-600 text-emerald-600'
                          : 'fill-amber-500 text-amber-500'
                      }`}
                    />
                    <span>{submittedFeedbackIds.includes(item.id) ? 'Đã Đánh Giá' : 'Đánh Giá'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openGoogleCalendar(item)}
                    className="px-2.5 py-2 min-h-[44px] rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Thêm phiên này vào Google Calendar"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Google Cal</span>
                  </button>

                  {renderTicketButton(item, false)}
                  <button
                    onClick={() => toggleBookmark(item.id, item.title)}
                    className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isBookmarked
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-2xs'
                    }`}
                  >
                    {isBookmarked ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t('events.bookmarked')}
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        {t('events.bookmark')}
                      </>
                    )}
                  </button>

                  {/* Card ⋮ Action Menu in List View - RBAC */}
                  {canManageSchedule && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCardMenuId(openCardMenuId === item.id ? null : item.id);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                        title="Thao tác ca diễn thuyết"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openCardMenuId === item.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenCardMenuId(null);
                            }}
                          />
                          <div
                            className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                setAttendeeListSession(item);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-indigo-50 flex items-center gap-2 text-indigo-700 font-bold cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-indigo-600" />
                              <span>👥 Danh sách người đăng ký</span>
                            </button>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                              type="button"
                              onClick={() => handleOpenEditSession(item)}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Chỉnh sửa phiên này</span>
                            </button>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                setDeletingScheduleItem(item);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-bold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Xóa phiên này</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Schedule Modal with Backdrop Click to Close */}
      {isAddModalOpen && (
        <div
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95vw] sm:max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 cursor-default flex flex-col max-h-[85vh]"
          >
            {/* Fixed Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {editingScheduleItem ? (
                  <>
                    <Edit3 className="w-4 h-4 text-indigo-600" />
                    Chỉnh Sửa Ca Diễn Thuyết
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-indigo-600" />
                    Thêm Ca Diễn Thuyết / Session Mới
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingScheduleItem(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddScheduleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tiêu Đề Phiên</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tối Ưu Hóa Trải Nghiệm Khách Với AI Concierge"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tên Diễn Giả</label>
                  <input
                    type="text"
                    placeholder="TS. Nguyễn Văn A"
                    value={newSpeaker}
                    onChange={(e) => setNewSpeaker(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Chức Danh / Đơn Vị</label>
                  <input
                    type="text"
                    placeholder="AI Expert @ TechCorp"
                    value={newSpeakerRole}
                    onChange={(e) => setNewSpeakerRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Giờ Bắt Đầu</label>
                  <input
                    type="text"
                    placeholder="09:00 AM"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Giờ Kết Thúc</label>
                  <input
                    type="text"
                    placeholder="10:30 AM"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phòng Họp</label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Ngày Diễn Ra (Date)</label>
                  <input
                    type="date"
                    min={(() => {
                      const t = new Date();
                      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                    })()}
                    value={newDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewDate(val);
                      if (val.endsWith('16') || val.includes('-16')) {
                        setNewDay(2);
                      } else {
                        setNewDay(1);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 cursor-pointer focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Chủ Đề (Track)</label>
                  <input
                    type="text"
                    value={newTrack}
                    onChange={(e) => setNewTrack(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Location Address & Google Maps URL */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">{t('events.locationAddress')}</label>
                    <input
                      type="text"
                      placeholder="vd: GEM Center, Số 8 Nguyễn Bỉnh Khiêm, Q.1"
                      value={newLocationAddress}
                      onChange={(e) => setNewLocationAddress(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">{t('events.googleMapsUrl')}</label>
                    <input
                      type="text"
                      placeholder="Link Google Maps hoặc để trống lấy theo sự kiện"
                      value={newGoogleMapsUrl}
                      onChange={(e) => setNewGoogleMapsUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Map Utilities & Live Preview Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    {newLocationAddress.trim() && !newGoogleMapsUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          const autoUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(newLocationAddress.trim())}`;
                          setNewGoogleMapsUrl(autoUrl);
                          toast.success('Đã tự động tạo Link Google Maps từ địa chỉ!');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        ⚡ Tự động tạo link từ địa chỉ
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddMapPreviewOpen(!isAddMapPreviewOpen)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-colors cursor-pointer ml-auto"
                  >
                    {isAddMapPreviewOpen ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ẩn xem trước bản đồ</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Xem trước Google Maps trực tiếp</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Google Maps Iframe Preview */}
                {isAddMapPreviewOpen && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
                    <div className="px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        Xem trước vị trí: {newLocationAddress.trim() || activeEvent?.location_address || 'Vị trí sự kiện'}
                      </span>
                      {newGoogleMapsUrl && (
                        <a
                          href={newGoogleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:underline shrink-0 ml-2"
                        >
                          Mở link ngoài <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="relative w-full h-44 bg-slate-100">
                      <iframe
                        title="Google Maps Live Preview"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                          newLocationAddress.trim() ||
                          (newGoogleMapsUrl.trim().includes('query=')
                            ? decodeURIComponent(newGoogleMapsUrl.split('query=')[1] || '')
                            : newGoogleMapsUrl.trim()) ||
                          activeEvent?.location_address ||
                          'GEM Center, Ho Chi Minh City'
                        )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Session-Specific WiFi Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tên Mạng WiFi (SSID)</label>
                  <input
                    type="text"
                    placeholder="vd: EventHub_GrandBallroom"
                    value={newWifiName}
                    onChange={(e) => setNewWifiName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mật Khẩu WiFi</label>
                  <input
                    type="text"
                    placeholder="vd: VIP2026@Pass"
                    value={newWifiPassword}
                    onChange={(e) => setNewWifiPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block font-medium text-slate-700">Mô Tả Chi Tiết</label>
                  <div className="flex items-center gap-1.5">
                    {/* Menu chọn phong cách văn phong */}
                    <div className="relative">
                      <select
                        value={aiStyle}
                        onChange={(e) => setAiStyle(e.target.value as any)}
                        disabled={isAiGeneratingDesc}
                        className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs hover:border-slate-300 transition-all disabled:opacity-50"
                        title="Chọn phong cách văn phong cho AI sinh nội dung"
                      >
                        <option value="auto">🌐 Tự động (Theo chủ đề)</option>
                        <option value="professional">💼 Chuyên nghiệp & Chiến lược</option>
                        <option value="literary">🎨 Bay bổng - Văn học</option>
                        <option value="inspirational">🚀 Truyền cảm hứng</option>
                        <option value="academic">🎓 Học thuật & Nghiên cứu</option>
                      </select>
                    </div>

                    {/* Nút AI Sinh Mô Tả với Spinner */}
                    <button
                      type="button"
                      onClick={handleAiGenerateDescription}
                      disabled={isAiGeneratingDesc}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                      title="Dùng AI tự động viết mô tả hấp dẫn dựa theo Tiêu đề, Chủ đề và Phong cách đã chọn"
                    >
                      {isAiGeneratingDesc ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          <span>AI Đang Soạn Thảo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>✨ AI Sinh Mô Tả</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  placeholder="Mô tả nội dung diễn thuyết (hoặc chọn phong cách và nhấn '✨ AI Sinh Mô Tả' để AI tự động soạn thảo)..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Slide & Material Link Field (Task 31) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Slide Thuyết Trình / Tài Liệu Đính Kèm (Tùy chọn)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">PDF, Canva, Drive URL</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Tên tài liệu (vd: Slide AI Presentation.pdf)"
                    value={newSlideTitle}
                    onChange={(e) => setNewSlideTitle(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-indigo-500 focus:outline-none text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Link tài liệu (Drive, Canva, Slide URL...)"
                    value={newSlideUrl}
                    onChange={(e) => setNewSlideUrl(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:border-indigo-500 focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingScheduleItem(null);
                }}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer text-xs transition-colors flex items-center justify-center"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer text-xs transition-colors flex items-center justify-center"
              >
                {editingScheduleItem ? 'Cập Nhật Ca Diễn Thuyết' : 'Lưu Ca Diễn Thuyết'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {/* Session Details Modal */}
      {selectedSessionDetail && (
        <div
          onClick={() => setSelectedSessionDetail(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95vw] sm:max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 cursor-default flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                    {selectedSessionDetail.track}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">{selectedSessionDetail.date_label}</span>
                </div>
                <h2 className="text-base font-extrabold text-white leading-snug">{selectedSessionDetail.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Interactive Navigation Tabs (Task 31) */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50/90 px-6 pt-2 gap-1 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setSessionDetailTab('overview')}
                className={`px-3 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  sessionDetailTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>ℹ️ Tổng Quan</span>
              </button>

              <button
                type="button"
                onClick={() => setSessionDetailTab('qa')}
                className={`px-3 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  sessionDetailTab === 'qa'
                    ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Q&A Diễn Giả ({sessionQuestions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSessionDetailTab('materials')}
                className={`px-3 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  sessionDetailTab === 'materials'
                    ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Tài Liệu & Slide ({sessionMaterials.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!checkFeedbackPermission(selectedSessionDetail)) {
                    return;
                  }
                  setSessionDetailTab('feedback');
                }}
                className={`px-3 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  !selectedSessionDetail.is_registered && !canManageSchedule
                    ? 'border-transparent text-slate-400 opacity-60 cursor-not-allowed'
                    : sessionDetailTab === 'feedback'
                    ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl cursor-pointer'
                    : 'border-transparent text-slate-500 hover:text-slate-900 cursor-pointer'
                }`}
                title={
                  !selectedSessionDetail.is_registered && !canManageSchedule
                    ? 'Bạn cần đăng ký sự kiện này trước khi đánh giá'
                    : undefined
                }
              >
                <Star className={`w-3.5 h-3.5 ${!selectedSessionDetail.is_registered && !canManageSchedule ? 'text-slate-300' : 'text-amber-500 fill-amber-400'}`} />
                <span>Đánh Giá ({feedbackStats?.total_reviews ?? sessionFeedbacks.length})</span>
                {!selectedSessionDetail.is_registered && !canManageSchedule && (
                  <Lock className="w-3 h-3 text-slate-400 ml-0.5" />
                )}
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 min-h-0">
              {/* TAB 1: OVERVIEW */}
              {sessionDetailTab === 'overview' && (
                <div className="space-y-5">
                  {/* Speaker Card */}
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {selectedSessionDetail.speaker_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{selectedSessionDetail.speaker_name}</h3>
                        <span className="px-2 py-0.5 rounded bg-indigo-100/70 text-indigo-700 text-[10px] font-semibold">
                          Diễn giả
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">{selectedSessionDetail.speaker_role}</p>
                    </div>
                  </div>

                  {/* Date, Time & Room Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{t('events.date')}</span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs">
                        {selectedSessionDetail.start_date || (selectedSessionDetail.day_number === 2 ? '16/10/2026' : '15/10/2026')}
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium block">{selectedSessionDetail.date_label}</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{t('events.time')}</span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs font-mono">
                        {selectedSessionDetail.start_time} - {selectedSessionDetail.end_time}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>{t('events.room')}</span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs truncate">{selectedSessionDetail.room_location}</p>
                    </div>
                  </div>

                  {/* Location & Google Maps Interactive Preview */}
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <span>{t('events.mapPreview')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const query = selectedSessionDetail.location_address || activeEvent.location_address || selectedSessionDetail.room_location;
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-indigo-600" />
                        <span>{t('events.openMaps')}</span>
                      </button>
                    </div>

                    <p className="text-slate-600 text-xs">
                      {selectedSessionDetail.location_address || activeEvent.location_address || 'Trung tâm Hội nghị Sự kiện EventHub'}
                    </p>

                    <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                      <iframe
                        title="Session Google Map Location"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                          selectedSessionDetail.location_address || activeEvent.location_address || selectedSessionDetail.room_location
                        )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>

                  {/* WiFi Credentials Box with Copy Action */}
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                        <Wifi className="w-4 h-4 text-indigo-600" />
                        <span>Thông Tin Kết Nối WiFi Ca Diễn Thuyết</span>
                      </div>
                      <button
                        onClick={() => {
                          const text = `SSID: ${selectedSessionDetail.wifiName || 'EventHub_GrandBallroom'}\nMật khẩu: ${selectedSessionDetail.wifiPassword || 'VIP2026@Pass'}`;
                          navigator.clipboard.writeText(text);
                          toast.success('Đã sao chép thông tin mạng WiFi vào clipboard!');
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Sao chép
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono">
                      <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                        <span className="block text-[10px] text-slate-400 uppercase font-sans font-semibold">Tên mạng (SSID)</span>
                        <span className="font-bold text-slate-900 text-xs">{selectedSessionDetail.wifiName || 'EventHub_GrandBallroom'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                        <span className="block text-[10px] text-slate-400 uppercase font-sans font-semibold">Mật khẩu WiFi</span>
                        <span className="font-bold text-indigo-600 text-xs">{selectedSessionDetail.wifiPassword || 'VIP2026@Pass'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Countdown & Progress Bar */}
                  <SessionCountdownProgress item={selectedSessionDetail} now={now} />

                  {/* Description */}
                  <div className="space-y-1.5 pt-2">
                    <h4 className="font-bold text-slate-900 text-xs">Nội dung chi tiết ca diễn thuyết:</h4>
                    <p className="text-slate-600 text-xs leading-relaxed bg-slate-50 border border-slate-200/70 p-3.5 rounded-2xl whitespace-pre-wrap">
                      {selectedSessionDetail.description || 'Chương trình diễn thuyết chuyên sâu với các chuyên gia đầu ngành công nghệ và trí tuệ nhân tạo. Hãy tham gia đúng giờ để có trải nghiệm tốt nhất.'}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: Q&A DIỄN GIẢ (Task 31) */}
              {sessionDetailTab === 'qa' && (
                <div className="space-y-4">
                  {/* Q&A Submit Form */}
                  <form onSubmit={handleSendQaQuestion} className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                        Đặt câu hỏi trực tiếp cho {selectedSessionDetail.speaker_name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Gửi dưới tên: <strong>{user?.full_name || 'Khách Tham Dự'}</strong>
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      required
                      value={newQaQuestion}
                      onChange={(e) => setNewQaQuestion(e.target.value)}
                      placeholder="Nhập câu hỏi hoặc thắc mắc của bạn về nội dung phiên để diễn giả giải đáp..."
                      className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 resize-none leading-relaxed"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingQa || !newQaQuestion.trim()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmittingQa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Gửi Câu Hỏi</span>
                      </button>
                    </div>
                  </form>

                  {/* Admin Moderation Filters */}
                  {canManageSchedule && (
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-[11px]">
                      <span className="font-bold text-slate-500 px-2">Lọc Q&A:</span>
                      {['ALL', 'PENDING', 'APPROVED', 'ANSWERED', 'HIDDEN'].map((statusKey) => (
                        <button
                          key={statusKey}
                          type="button"
                          onClick={() => setQaStatusFilter(statusKey)}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            qaStatusFilter === statusKey
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          {statusKey === 'ALL' ? 'Tất Cả' : statusKey === 'PENDING' ? 'Chờ Duyệt' : statusKey === 'APPROVED' ? 'Đã Duyệt' : statusKey === 'ANSWERED' ? 'Đã Trả Lời' : 'Đã Ẩn'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Question List */}
                  {isLoadingQuestions ? (
                    <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Đang tải danh sách câu hỏi Q&A...</span>
                    </div>
                  ) : sessionQuestions.length === 0 ? (
                    <div className="py-10 text-center bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700 text-xs">Chưa có câu hỏi nào cho phiên này!</p>
                      <p className="text-[11px] text-slate-500">Hãy nhập câu hỏi đầu tiên ở khung phía trên để tương tác cùng diễn giả.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessionQuestions.map((q) => (
                        <div
                          key={q.id}
                          className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                            q.status === 'HIDDEN'
                              ? 'bg-slate-100/60 border-slate-200 opacity-60'
                              : q.status === 'PENDING'
                              ? 'bg-amber-50/50 border-amber-200'
                              : 'bg-white border-slate-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                                {q.asker_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">{q.asker_name}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {q.created_at ? new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Status Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  q.status === 'ANSWERED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : q.status === 'APPROVED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : q.status === 'HIDDEN'
                                    ? 'bg-slate-200 text-slate-600'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {q.status === 'ANSWERED' ? '✅ Đã Trả Lời' : q.status === 'APPROVED' ? '✓ Đã Duyệt' : q.status === 'HIDDEN' ? 'Đã Ẩn' : '⏳ Chờ Duyệt'}
                              </span>

                              {/* Upvote Button */}
                              <button
                                type="button"
                                onClick={() => handleUpvoteQuestion(q.id)}
                                className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="Bình chọn câu hỏi này"
                              >
                                <ThumbsUp className="w-3 h-3 text-indigo-600" />
                                <span>{q.upvotes || 0}</span>
                              </button>
                            </div>
                          </div>

                          <p className="text-slate-800 font-medium text-xs leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {q.question}
                          </p>

                          {/* Answer Box if available */}
                          {q.answer && (
                            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                              <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-[11px]">
                                <span>🎤 Phản hồi từ diễn giả ({selectedSessionDetail.speaker_name}):</span>
                              </div>
                              <p className="text-slate-700 text-xs whitespace-pre-wrap">{q.answer}</p>
                            </div>
                          )}

                          {/* Admin Moderation Controls */}
                          {canManageSchedule && (
                            <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100 flex-wrap">
                              {q.status !== 'APPROVED' && q.status !== 'ANSWERED' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuestionStatus(q.id, 'APPROVED')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition-colors cursor-pointer"
                                >
                                  ✓ Duyệt Hiển Thị
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setAnsweringQuestionId(answeringQuestionId === q.id ? null : q.id);
                                  setQuestionAnswerText(q.answer || '');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition-colors cursor-pointer"
                              >
                                {answeringQuestionId === q.id ? 'Đóng Trả Lời' : '💬 Trả Lời Q&A'}
                              </button>

                              {q.status !== 'HIDDEN' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuestionStatus(q.id, 'HIDDEN')}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-[11px] border border-slate-200 transition-colors cursor-pointer"
                                >
                                  Ẩn Câu Hỏi
                                </button>
                              )}
                            </div>
                          )}

                          {/* Inline Answer Form for Admin/Speaker */}
                          {answeringQuestionId === q.id && (
                            <div className="pt-2 space-y-2">
                              <textarea
                                rows={2}
                                value={questionAnswerText}
                                onChange={(e) => setQuestionAnswerText(e.target.value)}
                                placeholder="Nhập câu trả lời của diễn giả cho câu hỏi này..."
                                className="w-full p-2.5 bg-white border border-indigo-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setAnsweringQuestionId(null)}
                                  className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-100 text-xs"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuestionStatus(q.id, 'ANSWERED', questionAnswerText)}
                                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                                >
                                  Lưu & Xuất Bản Trả Lời
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TÀI LIỆU & SLIDE (Task 31) */}
              {sessionDetailTab === 'materials' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        Tài Liệu & Slide Đào Tạo Phiên Diễn Thuyết
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Slide bài giảng và tài liệu đính kèm chính thức từ diễn giả {selectedSessionDetail.speaker_name}.
                      </p>
                    </div>

                    {canManageSchedule && (
                      <button
                        type="button"
                        onClick={() => setIsAddMaterialModalOpen(!isAddMaterialModalOpen)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm Tài Liệu</span>
                      </button>
                    )}
                  </div>

                  {/* Admin Add Material Form */}
                  {isAddMaterialModalOpen && canManageSchedule && (
                    <form onSubmit={handleAddMaterialSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <h5 className="font-bold text-slate-900 text-xs">Đính Kèm Slide / Tài Liệu Mới</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tiêu đề tài liệu</label>
                          <input
                            type="text"
                            required
                            value={newMaterialTitle}
                            onChange={(e) => setNewMaterialTitle(e.target.value)}
                            placeholder="vd: Slide Bài Giảng AI Summit 2026.pdf"
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Đường link URL tải tài liệu (Cloud/Google Drive/PDF)</label>
                          <input
                            type="url"
                            required
                            value={newMaterialUrl}
                            onChange={(e) => setNewMaterialUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/..."
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Loại tài liệu</label>
                          <select
                            value={newMaterialType}
                            onChange={(e) => setNewMaterialType(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                          >
                            <option value="SLIDE">Slide Trình Chiếu (PPTX/Canva)</option>
                            <option value="PDF">Tài Liệu PDF</option>
                            <option value="DOCUMENT">Tài Liệu Văn Bản</option>
                            <option value="CODE">Mã Nguồn / Demo Code</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dung lượng ước tính</label>
                          <input
                            type="text"
                            value={newMaterialSize}
                            onChange={(e) => setNewMaterialSize(e.target.value)}
                            placeholder="12.5 MB"
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id="matPublic"
                            checked={newMaterialIsPublic}
                            onChange={(e) => setNewMaterialIsPublic(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                          />
                          <label htmlFor="matPublic" className="text-xs text-slate-700 font-medium cursor-pointer">
                            Công khai cho mọi khách
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddMaterialModalOpen(false)}
                          className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-200 text-xs"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingMaterial}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          Lưu & Đính Kèm
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Materials List */}
                  {isLoadingMaterials ? (
                    <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Đang tải danh sách tài liệu...</span>
                    </div>
                  ) : sessionMaterials.length === 0 ? (
                    <div className="py-10 text-center bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700 text-xs">Chưa có tài liệu hoặc slide nào được đính kèm!</p>
                      <p className="text-[11px] text-slate-500">Ban tổ chức và diễn giả sẽ cập nhật slide sau khi phiên diễn thuyết bắt đầu.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessionMaterials.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-bold text-xs text-slate-900">{item.title}</h5>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  {item.material_type}
                                </span>
                                {item.is_public_to_all ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                                    <Unlock className="w-2.5 h-2.5" />
                                    Công khai
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" />
                                    Dành cho người có vé
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Dung lượng: <strong>{item.file_size || '5.0 MB'}</strong> • Lượt tải: <strong>{item.download_count || 0}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.can_download || canManageSchedule ? (
                              <button
                                type="button"
                                onClick={() => handleDownloadMaterial(item)}
                                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải Slide / Tài Liệu</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRegisterClick(selectedSessionDetail)}
                                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-bold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                                title="Đăng ký vé tham dự phiên để mở khóa tải slide"
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                                <span>Đăng Ký Vé Để Tải</span>
                              </button>
                            )}

                            {canManageSchedule && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMaterial(item.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa tài liệu này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ĐÁNH GIÁ & FEEDBACK 1-5 SAO (Task 31) */}
              {sessionDetailTab === 'feedback' && (
                <div className="space-y-5">
                  {/* Feedback Summary Stats */}
                  <div className="p-4 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex flex-col items-center justify-center font-extrabold shadow-sm shrink-0">
                        <span className="text-xl leading-none">{feedbackStats?.average_rating ?? 5.0}</span>
                        <div className="flex items-center mt-1">
                          <Star className="w-3 h-3 fill-white text-white" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">Mức Độ Hài Lòng Chung</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Dựa trên <strong>{feedbackStats?.total_reviews ?? sessionFeedbacks.length}</strong> lượt đánh giá từ khách tham dự.
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-600 font-medium">
                          <span>Nội dung: <strong>{feedbackStats?.avg_content_quality ?? 5.0}★</strong></span>
                          <span>•</span>
                          <span>Diễn giả: <strong>{feedbackStats?.avg_speaker_rating ?? 5.0}★</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Star Breakdown Mini Bars */}
                    {feedbackStats?.star_breakdown && (
                      <div className="w-full sm:w-48 space-y-1">
                        {[5, 4, 3, 2, 1].map((s) => {
                          const count = feedbackStats.star_breakdown[s] || 0;
                          const total = feedbackStats.total_reviews || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={s} className="flex items-center gap-1.5 text-[10px]">
                              <span className="w-4 font-bold text-slate-600">{s}★</span>
                              <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-6 text-slate-400 font-mono text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Task 35: Strict feedback permission banner if not registered */}
                  {!selectedSessionDetail.is_registered && !canManageSchedule ? (
                    <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 shadow-2xs">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-amber-900">
                          Khóa Quyền Đánh Giá: Chưa Đăng Ký Sự Kiện
                        </h4>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Chỉ người đã đăng ký tham gia sự kiện mới được phép gửi hoặc chỉnh sửa đánh giá. Vui lòng bấm nút <strong>"🎫 Đăng Ký Vé"</strong> ở phiên này để tham dự và kích hoạt quyền gửi nhận xét.
                        </p>
                      </div>
                    </div>
                  ) : submittedFeedbackIds.includes(selectedSessionDetail.id) && !isEditingFeedback ? (
                    <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-2">
                            <span>Bạn đã gửi đánh giá cho phiên diễn thuyết này!</span>
                            <span className="text-amber-500 font-bold">({userRating}★)</span>
                          </h4>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            {userFeedbackComment
                              ? `"${userFeedbackComment}"`
                              : 'Cảm ơn những đóng góp quý báu của bạn giúp Ban Tổ Chức nâng cao chất lượng sự kiện.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingFeedback(true)}
                        className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="Chỉnh sửa nhận xét và số sao của bạn"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✏️ Chỉnh sửa đánh giá</span>
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={isEditingFeedback ? handleUpdateFeedback : handleSubmitFeedback}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span>{isEditingFeedback ? 'Chỉnh Sửa Đánh Giá Của Bạn' : 'Gửi Đánh Giá Của Bạn Về Phiên Diễn Thuyết'}</span>
                        </h4>
                        {isEditingFeedback && (
                          <button
                            type="button"
                            onClick={() => setIsEditingFeedback(false)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Đóng chỉnh sửa
                          </button>
                        )}
                      </div>

                      {/* Interactive Star Rating */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 font-semibold">Đánh giá chung:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setUserRating(star)}
                              className="p-1 cursor-pointer transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= userRating
                                    ? 'text-amber-500 fill-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-amber-600">
                          {userRating === 5 ? 'Tuyệt vời (5/5)' : userRating === 4 ? 'Hài lòng (4/5)' : userRating === 3 ? 'Bình thường (3/5)' : 'Chưa tốt'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chất lượng nội dung bài giảng (1-5)</label>
                          <select
                            value={userContentRating}
                            onChange={(e) => setUserContentRating(Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                          >
                            <option value={5}>5 sao - Rất hữu ích, chuyên sâu</option>
                            <option value={4}>4 sao - Hay và thực tế</option>
                            <option value={3}>3 sao - Mức độ cơ bản</option>
                            <option value={2}>2 sao - Cần cải thiện thêm</option>
                            <option value={1}>1 sao - Không phù hợp</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Khả năng truyền đạt của diễn giả (1-5)</label>
                          <select
                            value={userSpeakerRating}
                            onChange={(e) => setUserSpeakerRating(Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                          >
                            <option value={5}>5 sao - Cuốn hút, tương tác tốt</option>
                            <option value={4}>4 sao - Rõ ràng, dễ hiểu</option>
                            <option value={3}>3 sao - Bình thường</option>
                            <option value={2}>2 sao - Nói nhanh hoặc khó nghe</option>
                            <option value={1}>1 sao - Cần cải thiện</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ý kiến đóng góp & nhận xét chi tiết</label>
                        <textarea
                          rows={3}
                          value={userFeedbackComment}
                          onChange={(e) => setUserFeedbackComment(e.target.value)}
                          placeholder="Hãy chia sẻ điều bạn thích nhất hoặc điểm ban tổ chức có thể cải thiện tốt hơn ở phiên này..."
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end items-center gap-2">
                        {isEditingFeedback && (
                          <button
                            type="button"
                            onClick={() => setIsEditingFeedback(false)}
                            className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Hủy bỏ
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSubmittingFeedback}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingFeedback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5 fill-current" />}
                          <span>{isEditingFeedback ? 'Cập Nhật Đánh Giá' : 'Gửi Đánh Giá Của Bạn'}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reviews Feed */}
                  {isLoadingFeedbacks ? (
                    <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Đang tải nhận xét...</span>
                    </div>
                  ) : sessionFeedbacks.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl">
                      <p className="text-slate-500 text-xs">Chưa có nhận xét nào được gửi cho phiên này.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessionFeedbacks.map((fb) => (
                        <div key={fb.id} className="p-3.5 bg-white border border-slate-200/80 rounded-2xl space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{fb.participant_name}</span>
                              <div className="flex items-center">
                                {[...Array(fb.rating)].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-400" />
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {fb.created_at ? new Date(fb.created_at).toLocaleDateString('vi-VN') : 'Gần đây'}
                            </span>
                          </div>
                          {fb.comment && (
                            <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              "{fb.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions (Task 34: Cleaned up when on feedback tab) */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSessionDetail(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition-colors cursor-pointer text-xs"
                >
                  Đóng
                </button>

                {sessionDetailTab !== 'feedback' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenAskSpeaker(selectedSessionDetail)}
                      className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                      title="Gửi câu hỏi trước cho diễn giả"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                      <span>Hỏi Diễn Giả</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!checkFeedbackPermission(selectedSessionDetail)) {
                          return;
                        }
                        setSessionDetailTab('feedback');
                      }}
                      className={`px-3 py-2 rounded-xl font-bold border transition-colors flex items-center gap-1.5 ${
                        !selectedSessionDetail.is_registered && !canManageSchedule
                          ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed hover:bg-slate-100'
                          : submittedFeedbackIds.includes(selectedSessionDetail.id)
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 cursor-pointer'
                      }`}
                      title={
                        !selectedSessionDetail.is_registered && !canManageSchedule
                          ? 'Bạn cần đăng ký sự kiện này trước khi đánh giá'
                          : 'Chuyển đến tab đánh giá phiên'
                      }
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          !selectedSessionDetail.is_registered && !canManageSchedule
                            ? 'text-slate-300'
                            : submittedFeedbackIds.includes(selectedSessionDetail.id)
                            ? 'fill-emerald-600 text-emerald-600'
                            : 'fill-amber-500 text-amber-500'
                        }`}
                      />
                      <span>{submittedFeedbackIds.includes(selectedSessionDetail.id) ? 'Đã Đánh Giá' : 'Đánh Giá Phiên'}</span>
                      {!selectedSessionDetail.is_registered && !canManageSchedule && (
                        <Lock className="w-3 h-3 text-slate-400 ml-0.5" />
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Action Buttons: Hidden when on feedback tab to keep the interface neat and focused */}
              {sessionDetailTab !== 'feedback' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openGoogleCalendar(selectedSessionDetail)}
                    className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                    title="Thêm phiên này vào Google Calendar"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Google Calendar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadSessionICS(selectedSessionDetail)}
                    className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                    title="Tải file lịch .ics về máy"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tải .ics</span>
                  </button>

                  {renderTicketButton(selectedSessionDetail, false)}

                  <button
                    type="button"
                    onClick={() => {
                      toggleBookmark(selectedSessionDetail.id, selectedSessionDetail.title);
                    }}
                    className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      bookmarkedIds.includes(selectedSessionDetail.id)
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {bookmarkedIds.includes(selectedSessionDetail.id) ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Đã Đặt Lịch
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        Đặt Lịch
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal for Unauthenticated Users trying to Register Ticket */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="login"
      />

      {/* Session Register Modal for inputting attendee details */}
      <SessionRegisterModal
        isOpen={!!registeringSession}
        onClose={() => setRegisteringSession(null)}
        session={registeringSession}
        onSuccess={handleRegisterSuccess}
      />

      {/* Ticket Modal showing issued Ticket & QR Code with Cancel action */}
      <TicketModal
        isOpen={!!ticketModalData}
        onClose={() => setTicketModalData(null)}
        ticket={ticketModalData}
        onCancelTicket={handleCancelTicketSuccess}
      />

      {/* Session Attendees & Quick Check-in Modal (Task 26) */}
      <SessionAttendeesModal
        isOpen={!!attendeeListSession}
        onClose={() => setAttendeeListSession(null)}
        session={attendeeListSession}
      />

      {/* Delete Event Confirmation Modal */}
      {isDeleteConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-[95vw] sm:max-w-sm shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Xác Nhận Xóa Sự Kiện</h3>
                <p className="text-rose-600 text-xs font-semibold">Hành động không thể hoàn tác</p>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 min-h-0 text-xs text-slate-600">
              <p>
                Bạn có chắc chắn muốn xóa toàn bộ sự kiện này không? Toàn bộ các phiên diễn thuyết và lịch trình liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900 text-sm">{activeEvent.title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{activeEvent.location}</p>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmModalOpen(false)}
                disabled={isDeletingEvent}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={isDeletingEvent}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingEvent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {deletingScheduleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-[95vw] sm:max-w-sm shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Xác Nhận Xóa Phiên</h3>
                <p className="text-rose-600 text-xs font-semibold">Hành động không thể hoàn tác</p>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 min-h-0 text-xs text-slate-600">
              <p>
                Bạn có chắc chắn muốn xóa phiên diễn thuyết này khỏi lịch trình không?
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{deletingScheduleItem.title}</p>
                <p className="text-slate-500 text-xs">
                  {deletingScheduleItem.speaker_name} • {deletingScheduleItem.room_location}
                </p>
                <p className="text-[11px] font-mono text-indigo-600">
                  {deletingScheduleItem.start_time} - {deletingScheduleItem.end_time}
                </p>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setDeletingScheduleItem(null)}
                disabled={isDeletingSchedule}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSession}
                disabled={isDeletingSchedule}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask Speaker Modal for Attendees */}
      {askSpeakerSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl w-[95vw] sm:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Gửi Câu Hỏi Cho Diễn Giả</h3>
                  <p className="text-purple-700 text-xs font-semibold">
                    {askSpeakerSession.speaker_name} {askSpeakerSession.speaker_role ? `(${askSpeakerSession.speaker_role})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAskSpeakerSession(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitSpeakerQuestion} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Phiên diễn thuyết:</span>
                <p className="font-bold text-xs text-slate-800">{askSpeakerSession.title}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {askSpeakerSession.room_location} • {askSpeakerSession.start_time} - {askSpeakerSession.end_time}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Họ & Tên của bạn</label>
                  <input
                    type="text"
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email liên hệ</label>
                  <input
                    type="email"
                    value={attendeeEmail}
                    onChange={(e) => setAttendeeEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung câu hỏi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={speakerQuestion}
                  onChange={(e) => setSpeakerQuestion(e.target.value)}
                  placeholder="Đặt câu hỏi hoặc chủ đề bạn muốn diễn giả làm rõ trong phiên thảo luận Q&A..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAskSpeakerSession(null)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuestion}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingQuestion ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi Câu Hỏi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
