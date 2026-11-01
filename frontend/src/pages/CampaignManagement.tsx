import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Send,
  Calendar,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  Plus,
  Play,
  X,
  Eye,
  Smartphone,
  Monitor,
  ShieldCheck,
  TrendingUp,
  Ban,
  Upload,
  FileSpreadsheet,
  UserPlus,
  Check,
  Layers,
  FileText,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import {
  EmailCampaign,
  AudiencePreview,
  CampaignRecipientLog,
  CampaignAnalyticsOverview,
  Event,
} from '../types';

export const CampaignManagement: React.FC = () => {
  const { t: _t } = useTranslation();
  const location = useLocation();
  const { user, userRole: contextRole } = useAuth();
  const { events } = useEvent();

  const userRole = (contextRole || user?.role_name || 'ADMIN').toUpperCase();
  const canManage = userRole !== 'ATTENDEE' && userRole !== 'PARTICIPANT';

  // Analytics & List states
  const [analytics, setAnalytics] = useState<CampaignAnalyticsOverview | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isSendConfirmModalOpen, setIsSendConfirmModalOpen] = useState<boolean>(false);

  // Selected Campaign for action
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [recipientLogs, setRecipientLogs] = useState<CampaignRecipientLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Form State for Create/Edit
  const [formCampaignName, setFormCampaignName] = useState<string>('');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formBody, setFormBody] = useState<string>('');
  const [formCTA, setFormCTA] = useState<string>('Đăng Ký Tham Dự Ngay');
  const [formEventId, setFormEventId] = useState<number | undefined>(undefined);
  const [formAudience, setFormAudience] = useState<string>('ALL_SUBSCRIBED');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [isLoadingAudience, setIsLoadingAudience] = useState<boolean>(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState<boolean>(false);

  // Recipient Selection Mode & Manual Input state
  const [recipientMode, setRecipientMode] = useState<'DATABASE' | 'MANUAL' | 'COMBINED'>('DATABASE');
  const [manualInputText, setManualInputText] = useState<string>('');
  const [manualRecipients, setManualRecipients] = useState<Array<{ email: string; name?: string }>>([]);
  const [manualStats, setManualStats] = useState<{
    total: number;
    valid: number;
    duplicates: number;
    invalid: string[];
  }>({ total: 0, valid: 0, duplicates: 0, invalid: [] });

  // CSV Import Modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvPreviewList, setCsvPreviewList] = useState<
    Array<{ email: string; name?: string; status: 'VALID' | 'DUPLICATE' | 'INVALID'; reason?: string }>
  >([]);
  const [isParsingCsv, setIsParsingCsv] = useState<boolean>(false);

  // Regex to validate email
  const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

  // Helper to parse manual email input string
  const parseManualEmailInput = (rawText: string) => {
    const rawTokens = rawText
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const validMap = new Map<string, { email: string; name?: string }>();
    const invalidItems: string[] = [];
    let duplicatesCount = 0;

    for (const token of rawTokens) {
      let email = token;
      let name: string | undefined = undefined;

      const angleMatch = token.match(/^(.*?)\s*<([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)>\s*$/);
      if (angleMatch) {
        name = angleMatch[1].trim().replace(/^["']|["']$/g, '');
        email = angleMatch[2].trim().toLowerCase();
      } else {
        email = email.toLowerCase();
      }

      if (!EMAIL_REGEX.test(email)) {
        invalidItems.push(token);
        continue;
      }

      if (validMap.has(email)) {
        duplicatesCount++;
      } else {
        validMap.set(email, { email, name });
      }
    }

    const validRecipients = Array.from(validMap.values());
    return {
      total: rawTokens.length,
      validRecipients,
      duplicates: duplicatesCount,
      invalid: invalidItems,
    };
  };

  const handleManualTextChange = (text: string) => {
    setManualInputText(text);
    const parsed = parseManualEmailInput(text);
    setManualRecipients(parsed.validRecipients);
    setManualStats({
      total: parsed.total,
      valid: parsed.validRecipients.length,
      duplicates: parsed.duplicates,
      invalid: parsed.invalid,
    });
  };

  const handleRemoveManualRecipient = (emailToRemove: string) => {
    const normalized = emailToRemove.trim().toLowerCase();
    const remaining = manualRecipients.filter((r) => r.email !== normalized);
    const updatedText = remaining
      .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
      .join('\n');
    handleManualTextChange(updatedText);
  };

  const handleCleanInvalidEmails = () => {
    const cleanText = manualRecipients
      .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
      .join('\n');
    handleManualTextChange(cleanText);
    toast.success('Đã xóa tất cả địa chỉ email sai cú pháp.');
  };

  const handleCleanDuplicates = () => {
    const cleanText = manualRecipients
      .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
      .join('\n');
    handleManualTextChange(cleanText);
    toast.success('Đã lọc và loại bỏ các địa chỉ email trùng lặp.');
  };

  const handleClearAllManual = () => {
    setManualInputText('');
    setManualRecipients([]);
    setManualStats({ total: 0, valid: 0, duplicates: 0, invalid: [] });
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setIsParsingCsv(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || '';
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length === 0) {
          toast.error('Tập tin CSV rỗng.');
          setIsParsingCsv(false);
          return;
        }

        const firstLine = lines[0];
        let sep = ',';
        if (firstLine.includes(';') && !firstLine.includes(',')) sep = ';';
        else if (firstLine.includes('\t')) sep = '\t';

        const parseLine = (l: string) => l.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));

        const firstRowCells = parseLine(firstLine).map((c) => c.toLowerCase());
        let emailIdx = -1;
        let nameIdx = -1;

        firstRowCells.forEach((col, idx) => {
          if (col.includes('email') || col.includes('mail') || col === 'e-mail') emailIdx = idx;
          if (col.includes('name') || col.includes('ten') || col.includes('họ') || col.includes('nguoi')) nameIdx = idx;
        });

        const startIdx = emailIdx !== -1 ? 1 : 0;
        if (emailIdx === -1) emailIdx = 0;
        if (nameIdx === -1 && parseLine(firstLine).length > 1 && emailIdx === 0) nameIdx = 1;

        const seenEmails = new Set<string>();
        const parsedRows: Array<{ email: string; name?: string; status: 'VALID' | 'DUPLICATE' | 'INVALID'; reason?: string }> = [];

        for (let i = startIdx; i < lines.length; i++) {
          const cells = parseLine(lines[i]);
          const rawEmail = (cells[emailIdx] || '').trim().toLowerCase();
          const rawName = nameIdx !== -1 && cells[nameIdx] ? cells[nameIdx].trim() : undefined;

          if (!rawEmail) continue;

          if (!EMAIL_REGEX.test(rawEmail)) {
            parsedRows.push({
              email: rawEmail,
              name: rawName,
              status: 'INVALID',
              reason: 'Sai định dạng email',
            });
          } else if (seenEmails.has(rawEmail)) {
            parsedRows.push({
              email: rawEmail,
              name: rawName,
              status: 'DUPLICATE',
              reason: 'Trùng lặp trong tập tin',
            });
          } else {
            seenEmails.add(rawEmail);
            parsedRows.push({
              email: rawEmail,
              name: rawName,
              status: 'VALID',
            });
          }
        }

        setCsvPreviewList(parsedRows);
        toast.info(`Đã đọc ${parsedRows.length} dòng từ ${file.name}.`);
      } catch (err) {
        console.error('Error reading CSV:', err);
        toast.error('Không thể đọc định dạng tập tin CSV.');
      } finally {
        setIsParsingCsv(false);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyCsvRecipients = () => {
    const validRows = csvPreviewList.filter((r) => r.status === 'VALID');
    if (validRows.length === 0) {
      toast.error('Không tìm thấy địa chỉ email hợp lệ nào trong tập tin.');
      return;
    }

    const currentMap = new Map<string, string | undefined>();
    manualRecipients.forEach((r) => currentMap.set(r.email.toLowerCase(), r.name));

    let addedCount = 0;
    validRows.forEach((r) => {
      const em = r.email.toLowerCase();
      if (!currentMap.has(em)) {
        currentMap.set(em, r.name);
        addedCount++;
      }
    });

    const combinedList = Array.from(currentMap.entries()).map(([email, name]) =>
      name ? `${name} <${email}>` : email
    );

    handleManualTextChange(combinedList.join('\n'));
    setIsCsvModalOpen(false);
    setCsvPreviewList([]);
    setCsvFileName('');
    toast.success(`Đã thêm ${addedCount} địa chỉ email từ tập tin CSV vào danh sách gửi!`);
  };

  // Test Email state
  const [testEmailAddress, setTestEmailAddress] = useState<string>(user?.email || 'admin@eventhub.ai');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  // Schedule Send state
  const [scheduleDateTime, setScheduleDateTime] = useState<string>('');
  const [isScheduling, setIsScheduling] = useState<boolean>(false);

  // Send Now state
  const [isSendingNow, setIsSendingNow] = useState<boolean>(false);

  // Fetch initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, campaignsData] = await Promise.all([
        apiService.getCampaignAnalyticsOverview(),
        apiService.getCampaigns({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: searchQuery || undefined,
        }),
      ]);
      setAnalytics(overviewData);
      setCampaigns(campaignsData.items || []);
    } catch (err) {
      console.error('Failed to load campaigns data:', err);
      toast.error('Không thể tải danh sách chiến dịch email.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh every 20 seconds to update progress
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [statusFilter, searchQuery]);

  // Auto-select and notify if directed from AI PR Studio
  useEffect(() => {
    const targetId = (location.state as any)?.selectedCampaignId;
    if (targetId && campaigns.length > 0) {
      const camp = campaigns.find((c) => c.id === targetId);
      if (camp) {
        setSelectedCampaign(camp);
        toast.info(`Đã mở chiến dịch AI: "${camp.campaign_name}". Bạn có thể gửi thử nghiệm hoặc duyệt gửi ngay!`);
      }
    }
  }, [campaigns, location.state]);

  // Handle event selection inside create modal
  const handleSelectEventInModal = (eventIdStr: string) => {
    if (!eventIdStr || eventIdStr === 'none') {
      setFormEventId(undefined);
      return;
    }
    const eId = parseInt(eventIdStr, 10);
    setFormEventId(eId);
    const ev = events.find((e) => e.id === eId);
    if (ev) {
      if (!formCampaignName) setFormCampaignName(`Quảng Bá: ${ev.title}`);
      if (!formSubject) setFormSubject(`Thư Mời Tham Dự: ${ev.title}`);
      if (!formBody) {
        setFormBody(
          `Trân trọng kính mời quý khách tham dự sự kiện "${ev.title}". Sự kiện sẽ quy tụ các chuyên gia hàng đầu cùng những thông tin đột phá trong ngành công nghệ và đổi mới sáng tạo.`
        );
      }
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCampaignId(null);
    setFormCampaignName('');
    setFormSubject('');
    setFormBody('');
    setFormCTA('Đăng Ký Tham Dự Ngay');
    setFormEventId(events.length > 0 ? events[0].id : undefined);
    setFormAudience('ALL_SUBSCRIBED');
    setRecipientMode('DATABASE');
    setManualInputText('');
    setManualRecipients([]);
    setManualStats({ total: 0, valid: 0, duplicates: 0, invalid: [] });
    setAudiencePreview(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal for Draft / Pending Campaign
  const handleOpenEditModal = async (camp: EmailCampaign) => {
    setEditingCampaignId(camp.id);
    setFormCampaignName(camp.campaign_name);
    setFormSubject(camp.subject);
    setFormBody(camp.ai_email_body || camp.plain_text_content || '');
    setFormCTA(camp.ai_email_cta || 'Đăng Ký Tham Dự Ngay');
    setFormEventId(camp.event_id);
    setFormAudience(camp.target_audience || 'ALL_SUBSCRIBED');
    setRecipientMode(camp.recipient_mode || 'DATABASE');
    setAudiencePreview(null);

    // If campaign has manual recipients, load them into text input
    if (camp.recipient_mode === 'MANUAL' || camp.recipient_mode === 'COMBINED') {
      try {
        const logs = await apiService.getCampaignRecipients(camp.id);
        const manualItems = logs
          .filter((l) => l.source === 'MANUAL')
          .map((l) => ({ email: l.email, name: l.full_name || undefined }));
        if (manualItems.length > 0) {
          const text = manualItems
            .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
            .join('\n');
          handleManualTextChange(text);
        } else {
          setManualInputText('');
          setManualRecipients([]);
          setManualStats({ total: 0, valid: 0, duplicates: 0, invalid: [] });
        }
      } catch (e) {
        console.error('Failed to load recipients for editing:', e);
      }
    } else {
      setManualInputText('');
      setManualRecipients([]);
      setManualStats({ total: 0, valid: 0, duplicates: 0, invalid: [] });
    }

    setIsCreateModalOpen(true);
  };

  // Calculate live audience preview
  const handleCalculateAudience = async () => {
    setIsLoadingAudience(true);
    try {
      const preview = await apiService.calculateAudiencePreview({
        event_id: formEventId,
        target_audience: formAudience,
        recipient_mode: recipientMode,
        manual_recipients: recipientMode !== 'DATABASE' ? manualRecipients : undefined,
      });
      setAudiencePreview(preview);
    } catch (err: any) {
      console.error('Failed to preview audience:', err);
      toast.error(err.response?.data?.detail || 'Không thể tính toán tệp người nhận.');
    } finally {
      setIsLoadingAudience(false);
    }
  };

  // Save Campaign (Create or Update Draft)
  const handleSaveCampaign = async () => {
    if (!formCampaignName.trim()) {
      toast.error('Vui lòng nhập tên chiến dịch.');
      return;
    }
    if (!formSubject.trim()) {
      toast.error('Vui lòng nhập tiêu đề thư email.');
      return;
    }
    if (recipientMode === 'MANUAL' && manualRecipients.length === 0) {
      toast.error('Vui lòng nhập ít nhất một địa chỉ email người nhận hợp lệ.');
      return;
    }

    setIsSavingCampaign(true);
    try {
      if (editingCampaignId) {
        await apiService.updateCampaign(editingCampaignId, {
          campaign_name: formCampaignName.trim(),
          subject: formSubject.trim(),
          ai_email_body: formBody.trim(),
          ai_email_cta: formCTA.trim(),
          event_id: formEventId,
          target_audience: formAudience,
          recipient_mode: recipientMode,
          manual_recipients: recipientMode !== 'DATABASE' ? manualRecipients : undefined,
        });
        toast.success(`Đã cập nhật chiến dịch "${formCampaignName.trim()}" thành công!`);
      } else {
        await apiService.createCampaign({
          campaign_name: formCampaignName.trim(),
          subject: formSubject.trim(),
          ai_email_body: formBody.trim(),
          ai_email_cta: formCTA.trim(),
          event_id: formEventId,
          target_audience: formAudience,
          recipient_mode: recipientMode,
          manual_recipients: recipientMode !== 'DATABASE' ? manualRecipients : undefined,
          send_immediately: true,
        });
        toast.success('Đã tạo chiến dịch email mới thành công!');
      }
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Không thể lưu chiến dịch.');
    } finally {
      setIsSavingCampaign(false);
    }
  };

  // Approve Campaign
  const handleApprove = async (camp: EmailCampaign) => {
    try {
      await apiService.approveCampaign(camp.id);
      toast.success(`Đã duyệt chiến dịch "${camp.campaign_name}" thành công!`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Không thể duyệt chiến dịch.');
    }
  };

  // Launch Send Now
  const handleConfirmSendNow = async () => {
    if (!selectedCampaign) return;
    setIsSendingNow(true);
    try {
      await apiService.sendCampaign(selectedCampaign.id);
      toast.success(`Đang thực hiện gửi chiến dịch "${selectedCampaign.campaign_name}" trong nền!`);
      setIsSendConfirmModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Không thể gửi chiến dịch.');
    } finally {
      setIsSendingNow(false);
    }
  };

  // Schedule Send
  const handleConfirmSchedule = async () => {
    if (!selectedCampaign || !scheduleDateTime) {
      toast.error('Vui lòng chọn thời gian lên lịch gửi.');
      return;
    }
    setIsScheduling(true);
    try {
      const isoTime = new Date(scheduleDateTime).toISOString();
      await apiService.scheduleCampaign(selectedCampaign.id, isoTime);
      toast.success(`Đã lên lịch gửi chiến dịch vào ${new Date(scheduleDateTime).toLocaleString('vi-VN')}!`);
      setIsScheduleModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Lên lịch gửi thất bại.');
    } finally {
      setIsScheduling(false);
    }
  };

  // Cancel Campaign
  const handleCancelCampaign = async (camp: EmailCampaign) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy chiến dịch "${camp.campaign_name}"?`)) return;
    try {
      await apiService.cancelCampaign(camp.id);
      toast.success(`Đã hủy chiến dịch "${camp.campaign_name}".`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Không thể hủy chiến dịch.');
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!selectedCampaign || !testEmailAddress) {
      toast.error('Vui lòng nhập địa chỉ email nhận thư thử nghiệm.');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await apiService.sendCampaignTestEmail(selectedCampaign.id, {
        test_email: testEmailAddress,
      });
      if (res.is_simulated) {
        toast.info(`[Chế độ xem trước] Đã tạo email thử nghiệm đến ${testEmailAddress} (ID: ${res.provider_message_id})`);
      } else {
        toast.success(`Đã gửi email thử nghiệm kèm vé QR đến ${testEmailAddress} thành công!`);
      }
      setIsTestEmailModalOpen(false);
    } catch (err: any) {
      const errMsg =
        err.response?.data?.detail ||
        (err.code === 'ECONNABORTED'
          ? 'Thời gian chờ gửi thư quá lâu (Timeout). Vui lòng thử lại.'
          : err.message || 'Gửi email thử nghiệm thất bại.');
      toast.error(errMsg);
    } finally {
      setIsSendingTest(false);
    }
  };

  // View Delivery Logs
  const handleOpenLogs = async (camp: EmailCampaign) => {
    setSelectedCampaign(camp);
    setIsLogsModalOpen(true);
    setIsLoadingLogs(true);
    try {
      const logs = await apiService.getCampaignRecipients(camp.id);
      setRecipientLogs(logs || []);
    } catch (err) {
      console.error('Failed to load recipient logs:', err);
      toast.error('Không thể tải nhật ký phân phối.');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Bản nháp
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Đã duyệt
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Đã lên lịch
          </span>
        );
      case 'SENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" /> Đang gửi
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Hoàn tất
          </span>
        );
      case 'PARTIALLY_FAILED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Lỗi một phần
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Thất bại
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
            <Ban className="w-3 h-3" /> Đã hủy
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            Chiến Dịch Email & Tự Động Hóa
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Hệ thống phân phối thư điện tử qua cổng Resend, quản lý sự đồng ý của khách hàng và phân tích phân phối theo thời gian thực.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tạo Chiến Dịch Mới (Nhập Email / CSV)
        </button>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng chiến dịch</span>
          <p className="text-xl font-black text-slate-900 mt-1">
            {analytics?.total_campaigns ?? 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Đã gửi (Thư)</span>
          <p className="text-xl font-black text-indigo-600 mt-1">
            {analytics?.total_sent ?? 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Tỷ lệ gửi thành công</span>
          <p className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {analytics?.delivery_rate_pct ?? 0}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Tỷ lệ mở thư</span>
          <p className="text-xl font-black text-blue-600 mt-1">
            {analytics?.open_rate_pct ?? 0}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Bị trả lại (Bounced)</span>
          <p className="text-xl font-black text-amber-600 mt-1">
            {analytics?.total_bounced ?? 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Đã hủy nhận tin</span>
          <p className="text-xl font-black text-slate-600 mt-1">
            {analytics?.total_unsubscribed ?? 0}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'DRAFT', label: 'Bản nháp' },
            { id: 'APPROVED', label: 'Đã duyệt' },
            { id: 'SCHEDULED', label: 'Đã lên lịch' },
            { id: 'SENDING', label: 'Đang gửi' },
            { id: 'COMPLETED', label: 'Hoàn tất' },
            { id: 'CANCELLED', label: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên chiến dịch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 font-medium transition-all"
          />
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang tải danh sách chiến dịch...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Mail className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Chưa có chiến dịch nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Bấm nút [Tạo Chiến Dịch Mới] hoặc tạo bài viết truyền thông từ AI PR Studio để khởi chạy chiến dịch email đầu tiên.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {campaigns.map((camp) => {
              const progressPct =
                camp.total_recipients > 0
                  ? Math.min(100, Math.round((camp.sent_count / camp.total_recipients) * 100))
                  : 0;

              return (
                <div key={camp.id} className="p-5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {camp.campaign_name}
                        </h3>
                        {renderStatusBadge(camp.status)}
                        {camp.recipient_mode === 'MANUAL' ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                            Nhập Thủ Công
                          </span>
                        ) : camp.recipient_mode === 'COMBINED' ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                            Kết Hợp (CSDL & Thủ Công)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                            Cơ Sở Dữ Liệu
                          </span>
                        )}
                        {camp.recipient_mode !== 'MANUAL' && (
                          camp.target_audience === 'EVENT_REGISTERED' ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                              Khách Đăng Ký Sự Kiện
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              Tất Cả Khách Hàng Có Đồng Ý
                            </span>
                          )
                        )}
                      </div>

                      <p className="text-xs text-slate-600 flex items-center gap-2">
                        <span className="font-semibold text-slate-800">Tiêu đề thư:</span>
                        <span className="truncate">{camp.subject}</span>
                      </p>

                      {/* Scheduled Time info if applicable */}
                      {camp.status === 'SCHEDULED' && camp.scheduled_at && (
                        <p className="text-xs text-purple-700 font-semibold flex items-center gap-1.5 bg-purple-50/70 px-2.5 py-1 rounded-lg border border-purple-200 w-fit">
                          <Calendar className="w-3.5 h-3.5" />
                          Lên lịch gửi: {new Date(camp.scheduled_at).toLocaleString('vi-VN')}
                        </p>
                      )}

                      {/* Progress Bar when Sending or Completed */}
                      {['SENDING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED'].includes(camp.status) && (
                        <div className="pt-2 max-w-md">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                            <span>Tiến độ gửi: {camp.sent_count} / {camp.total_recipients} người nhận</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                camp.status === 'COMPLETED'
                                  ? 'bg-emerald-500'
                                  : camp.status === 'PARTIALLY_FAILED'
                                  ? 'bg-amber-500'
                                  : camp.status === 'FAILED'
                                  ? 'bg-red-500'
                                  : 'bg-indigo-600'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Test Send Button */}
                      <button
                        onClick={() => {
                          setSelectedCampaign(camp);
                          setIsTestEmailModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        title="Gửi thử nghiệm vào hòm thư cá nhân"
                      >
                        Gửi Thử Nghiệm
                      </button>

                      {/* Edit Campaign Button (if draft or pending approval) */}
                      {['DRAFT', 'PENDING_APPROVAL'].includes(camp.status) && (
                        <button
                          onClick={() => handleOpenEditModal(camp)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Chỉnh sửa nội dung hoặc thay đổi danh sách người nhận (CSDL / Nhập thủ công / CSV)"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Chỉnh Sửa
                        </button>
                      )}

                      {/* View Logs Button */}
                      <button
                        onClick={() => handleOpenLogs(camp)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Nhật Ký
                      </button>

                      {/* Approve Button (if draft) */}
                      {canManage && (camp.status === 'DRAFT' || camp.status === 'PENDING_APPROVAL') && (
                        <button
                          onClick={() => handleApprove(camp)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Duyệt
                        </button>
                      )}

                      {/* Schedule Button (if draft or approved) */}
                      {canManage && ['DRAFT', 'APPROVED'].includes(camp.status) && (
                        <button
                          onClick={() => {
                            setSelectedCampaign(camp);
                            setIsScheduleModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Lên Lịch Gửi
                        </button>
                      )}

                      {/* Send Now Button (if draft or approved) */}
                      {canManage && ['DRAFT', 'APPROVED'].includes(camp.status) && (
                        <button
                          onClick={() => {
                            setSelectedCampaign(camp);
                            setIsSendConfirmModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Gửi Ngay
                        </button>
                      )}

                      {/* Cancel Button (if scheduled or sending) */}
                      {canManage && ['SCHEDULED', 'SENDING'].includes(camp.status) && (
                        <button
                          onClick={() => handleCancelCampaign(camp)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors cursor-pointer"
                        >
                          Hủy Gửi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 1: Create / Edit Campaign
         ───────────────────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingCampaignId ? `Chỉnh Sửa Chiến Dịch: ${formCampaignName || '#' + editingCampaignId}` : 'Tạo Chiến Dịch Email Mới (Hỗ trợ Nhập Email / CSV)'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campaign Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tên Chiến Dịch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCampaignName}
                    onChange={(e) => setFormCampaignName(e.target.value)}
                    placeholder="VD: Bản tin chào đón AI Summit 2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Event Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Sự Kiện Liên Kết
                  </label>
                  <select
                    value={formEventId?.toString() || 'none'}
                    onChange={(e) => handleSelectEventInModal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="none">-- Không liên kết sự kiện --</option>
                    {events.map((ev: Event) => (
                      <option key={ev.id} value={ev.id.toString()}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tiêu Đề Thư Điện Tử <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="VD: [Thư Mời] Cơ hội nhận vé VIP tham dự EventHub AI Summit"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Content Editor & Device Preview Toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Nội Dung Bài Viết Truyền Thông (Nội Dung AI)
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-2 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 transition-all ${
                        previewDevice === 'desktop'
                          ? 'bg-white text-indigo-600 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" /> Máy tính
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-2 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 transition-all ${
                        previewDevice === 'mobile'
                          ? 'bg-white text-indigo-600 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Điện thoại
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Editor Column */}
                  <div className="space-y-3">
                    <textarea
                      rows={9}
                      value={formBody}
                      onChange={(e) => setFormBody(e.target.value)}
                      placeholder="Nhập nội dung quảng bá hoặc dán bài viết sinh ra từ AI PR Studio..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none leading-relaxed font-sans"
                    />

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nút kêu gọi hành động (CTA):
                      </label>
                      <input
                        type="text"
                        value={formCTA}
                        onChange={(e) => setFormCTA(e.target.value)}
                        placeholder="VD: Đăng Ký Tham Dự Ngay"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* HTML Live Mockup Preview Column */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-100 flex flex-col justify-between overflow-hidden">
                    <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center justify-between">
                      <span>Bản Xem Trước Thư Điện Tử HTML:</span>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {previewDevice === 'desktop' ? 'Chuẩn máy tính' : 'Chuẩn điện thoại'}
                      </span>
                    </div>

                    <div
                      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm mx-auto overflow-y-auto max-h-[300px] text-xs transition-all ${
                        previewDevice === 'mobile' ? 'max-w-[320px] text-[11px]' : 'w-full'
                      }`}
                    >
                      <div className="bg-indigo-600 text-white p-3 rounded-lg text-center mb-3">
                        <h4 className="font-bold text-sm">EventHub AI</h4>
                        <p className="text-[10px] opacity-90">Bản Tin Sự Kiện Thông Minh</p>
                      </div>
                      <p className="font-bold text-slate-800 mb-2">Kính gửi Quý khách,</p>
                      <p className="text-slate-600 leading-relaxed mb-3 whitespace-pre-wrap">
                        {formBody || 'Nội dung email sẽ hiển thị tại đây...'}
                      </p>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 mb-3 text-[11px]">
                        <strong>Sự kiện:</strong>{' '}
                        {events.find((e) => e.id === formEventId)?.title || 'Sự kiện EventHub'}<br />
                        <strong>Thời gian:</strong> 15-16 Tháng 10, 2026<br />
                        <strong>Địa điểm:</strong> Hội trường EventHub AI
                      </div>
                      <div className="text-center my-2">
                        <span className="inline-block bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-xs">
                          {formCTA || 'Đăng Ký Tham Dự Ngay'} &rarr;
                        </span>
                      </div>
                      <div className="mt-4 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                        <p>Hệ thống EventHub AI © 2026</p>
                        <p className="underline mt-0.5">Hủy đăng ký nhận tin</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipient Targeting Mode & Configuration */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Chế Độ Chọn Người Nhận
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Lựa chọn gửi đến danh sách khách hàng có sẵn trong cơ sở dữ liệu, tự nhập địa chỉ email, hoặc kết hợp cả hai.
                  </p>

                  {/* 3 Mode Tabs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRecipientMode('DATABASE')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        recipientMode === 'DATABASE'
                          ? 'bg-indigo-50 border-indigo-500 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Users className={`w-4 h-4 ${recipientMode === 'DATABASE' ? 'text-indigo-600' : 'text-slate-500'}`} />
                        <span className={`text-xs font-bold ${recipientMode === 'DATABASE' ? 'text-indigo-900' : 'text-slate-800'}`}>
                          Cơ Sở Dữ Liệu
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">Khách hàng từ hệ thống đã đồng ý nhận tin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecipientMode('MANUAL')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        recipientMode === 'MANUAL'
                          ? 'bg-purple-50 border-purple-500 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <UserPlus className={`w-4 h-4 ${recipientMode === 'MANUAL' ? 'text-purple-600' : 'text-slate-500'}`} />
                        <span className={`text-xs font-bold ${recipientMode === 'MANUAL' ? 'text-purple-900' : 'text-slate-800'}`}>
                          Nhập Thủ Công
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">Nhập danh sách email hoặc tải lên từ CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecipientMode('COMBINED')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        recipientMode === 'COMBINED'
                          ? 'bg-amber-50 border-amber-500 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Layers className={`w-4 h-4 ${recipientMode === 'COMBINED' ? 'text-amber-600' : 'text-slate-500'}`} />
                        <span className={`text-xs font-bold ${recipientMode === 'COMBINED' ? 'text-amber-900' : 'text-slate-800'}`}>
                          Kết Hợp CSDL & Thủ Công
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">Gộp cả khách hàng CSDL và email nhập ngoài</span>
                    </button>
                  </div>
                </div>

                {/* Database Options (shown if DATABASE or COMBINED) */}
                {(recipientMode === 'DATABASE' || recipientMode === 'COMBINED') && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Phân Đoạn Khách Hàng Cơ Sở Dữ Liệu:
                    </label>
                    <select
                      value={formAudience}
                      onChange={(e) => setFormAudience(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="ALL_SUBSCRIBED">Tất cả khách hàng đã đồng ý nhận tin</option>
                      <option value="EVENT_REGISTERED">Khách hàng đã đăng ký sự kiện này</option>
                    </select>
                  </div>
                )}

                {/* Manual Input UI (shown if MANUAL or COMBINED) */}
                {(recipientMode === 'MANUAL' || recipientMode === 'COMBINED') && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-800">
                          Danh Sách Email Người Nhận Thủ Công <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[10px] text-slate-500">
                          Hỗ trợ xuống dòng, dấu phẩy (,), dấu chấm phẩy (;). Định dạng: email hoặc Tên &lt;email&gt;.
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIsCsvModalOpen(true)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Nhập CSV
                        </button>
                        {manualStats.duplicates > 0 && (
                          <button
                            type="button"
                            onClick={handleCleanDuplicates}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                            title="Xóa các địa chỉ trùng lặp"
                          >
                            Lọc trùng
                          </button>
                        )}
                        {manualStats.invalid.length > 0 && (
                          <button
                            type="button"
                            onClick={handleCleanInvalidEmails}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                            title="Xóa các địa chỉ sai định dạng"
                          >
                            Xóa email lỗi
                          </button>
                        )}
                        {manualInputText && (
                          <button
                            type="button"
                            onClick={handleClearAllManual}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          >
                            Xóa hết
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Counter chips */}
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        Tổng nhập: <strong>{manualStats.total}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        Hợp lệ: <strong>{manualStats.valid}</strong>
                      </span>
                      {manualStats.duplicates > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                          Trùng lặp: <strong>{manualStats.duplicates}</strong>
                        </span>
                      )}
                      {manualStats.invalid.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200">
                          Sai cú pháp: <strong>{manualStats.invalid.length}</strong>
                        </span>
                      )}
                    </div>

                    {/* Textarea */}
                    <textarea
                      rows={5}
                      value={manualInputText}
                      onChange={(e) => handleManualTextChange(e.target.value)}
                      placeholder={`Ví dụ:\nkhachhang1@example.com\nNguyễn Văn A <nguyenvana@gmail.com>; le.thi.b@company.vn, giamdoc@techcorp.io`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500 focus:outline-none leading-relaxed"
                    />

                    {/* Invalid emails warning alert */}
                    {manualStats.invalid.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-800 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          Phát hiện {manualStats.invalid.length} địa chỉ không hợp lệ:
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                          {manualStats.invalid.map((inv, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-red-100 rounded text-red-700 font-mono text-[10px]">
                              {inv}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Valid Recipient Tag Chips Preview */}
                    {manualRecipients.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Các địa chỉ email hợp lệ ({manualRecipients.length}):</span>
                        </div>
                        <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                          {manualRecipients.slice(0, 50).map((r, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] shadow-2xs"
                            >
                              <span className="font-medium text-slate-800">
                                {r.name ? `${r.name} (${r.email})` : r.email}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveManualRecipient(r.email)}
                                className="text-slate-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {manualRecipients.length > 50 && (
                            <span className="text-[11px] text-slate-400 self-center pl-1">
                              +{manualRecipients.length - 50} địa chỉ khác...
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Calculate Audience Button & Preview Stats */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    Bấm kiểm tra để hệ thống phân tích tệp người nhận thực tế theo quy tắc đồng ý và danh sách chặn.
                  </div>
                  <button
                    type="button"
                    onClick={handleCalculateAudience}
                    disabled={isLoadingAudience || (recipientMode === 'MANUAL' && manualRecipients.length === 0)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    {isLoadingAudience ? 'Đang tính...' : 'Kiểm tra tệp gửi'}
                  </button>
                </div>

                {audiencePreview && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70 text-center">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Tổng được chọn</span>
                      <strong className="text-sm text-slate-800">{audiencePreview.total_selected}</strong>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-semibold block">Hợp lệ (Sẽ gửi)</span>
                      <strong className="text-sm text-emerald-800">{audiencePreview.eligible}</strong>
                    </div>
                    <div className="bg-slate-100 p-2 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-600 block">Đã Hủy / Bị Chặn</span>
                      <strong className="text-sm text-slate-700">{(audiencePreview.unsubscribed || 0) + (audiencePreview.suppressed || 0)}</strong>
                    </div>
                    <div className="bg-red-50 p-2 rounded-xl border border-red-200">
                      <span className="text-[10px] text-red-600 block">Email Sai Cú Pháp</span>
                      <strong className="text-sm text-red-700">{audiencePreview.invalid}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveCampaign}
                disabled={isSavingCampaign}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingCampaign ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                  </>
                ) : editingCampaignId ? (
                  'Lưu Cập Nhật Chiến Dịch'
                ) : (
                  'Lưu Thành Bản Nháp'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 2: Send Now Confirmation
         ───────────────────────────────────────────────────────────────────────── */}
      {isSendConfirmModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Xác Nhận Khởi Chạy Gửi Email
              </h3>
              <p className="text-xs text-slate-500">
                Chiến dịch: <strong className="text-slate-800">{selectedCampaign.campaign_name}</strong>
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Đối tượng nhận:</span>
                <strong className="text-slate-900">{selectedCampaign.target_audience}</strong>
              </div>
              <div className="flex justify-between">
                <span>Tiêu đề email:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[200px]">{selectedCampaign.subject}</span>
              </div>
              <div className="flex justify-between">
                <span>Chế độ gửi:</span>
                <span className="text-emerald-700 font-bold">Cổng Resend Chính Thức</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsSendConfirmModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmSendNow}
                disabled={isSendingNow}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingNow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {isSendingNow ? 'Đang kích hoạt...' : 'Bắt Đầu Gửi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 3: Schedule Send Modal
         ───────────────────────────────────────────────────────────────────────── */}
      {isScheduleModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 mx-auto">
              <Clock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Lên Lịch Gửi Tự Động
              </h3>
              <p className="text-xs text-slate-500">
                Chọn thời điểm hệ thống sẽ tự động kích hoạt gửi chiến dịch.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Thời gian gửi (Giờ Việt Nam - UTC+7):
              </label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmSchedule}
                disabled={isScheduling || !scheduleDateTime}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isScheduling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                {isScheduling ? 'Đang lưu...' : 'Lưu Lịch Gửi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 4: Send Test Email Preview
         ───────────────────────────────────────────────────────────────────────── */}
      {isTestEmailModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 mx-auto">
              <Mail className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Gửi Thử Nghiệm Thư Điện Tử
              </h3>
              <p className="text-xs text-slate-500">
                Thử nghiệm giao diện hiển thị thực tế trên Gmail hoặc Outlook trước khi gửi toàn bộ khách hàng.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Địa chỉ email người nhận thử nghiệm:
              </label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="VD: giachien616@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
              />

              {/* SMTP active notice */}
              <div className="mt-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Đã kết nối Gmail SMTP &amp; Cấp vé QR tự động:</span>
                </div>
                <p className="leading-relaxed text-emerald-700">
                  Hệ thống hỗ trợ gửi thử nghiệm đến <strong>bất kỳ địa chỉ email nào</strong> (Gmail, Outlook, Edu...). Mỗi email gửi đi đều được tự động tạo vé QR hợp lệ quét được tại cổng soát vé.
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setTestEmailAddress('giachien616@gmail.com')}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-emerald-900 font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    👉 Bấm để điền nhanh: giachien616@gmail.com
                  </button>
                </div>
              </div>

              {/* Hint about manual recipients vs test preview */}
              <div className="mt-2 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[10px] text-indigo-800 leading-relaxed">
                💡 <strong>Lưu ý:</strong> Để nhập danh sách nhiều email gửi chiến dịch thật hoặc tải tập tin CSV, hãy đóng cửa sổ này và bấm nút <strong>[+ Tạo Chiến Dịch Mới]</strong> hoặc <strong>[Chỉnh Sửa]</strong> trên bảng điều khiển.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsTestEmailModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingTest || !testEmailAddress.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {isSendingTest ? 'Đang gửi...' : 'Gửi Thử Ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 5: Delivery Logs & Recipient Status Drawer
         ───────────────────────────────────────────────────────────────────────── */}
      {isLogsModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Nhật Ký Phân Phối Chiến Dịch: {selectedCampaign.campaign_name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dữ liệu đồng bộ trực tiếp từ Resend Webhook và hệ thống hàng đợi nền.
                </p>
              </div>
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingLogs ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Đang tải nhật ký từng người nhận...</p>
                </div>
              ) : recipientLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Chưa có bản ghi người nhận nào trong chiến dịch này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                        <th className="py-2.5 px-3">Người Nhận</th>
                        <th className="py-2.5 px-3">Nguồn</th>
                        <th className="py-2.5 px-3">Trạng Thái</th>
                        <th className="py-2.5 px-3">Mã Tin Nhắn Cổng Gửi</th>
                        <th className="py-2.5 px-3">Thời Gian Gửi</th>
                        <th className="py-2.5 px-3">Lỗi / Chi Tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recipientLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{log.email}</span>
                            <span className="text-[11px] text-slate-500">{log.full_name || 'Khách Hàng'}</span>
                          </td>
                          <td className="py-3 px-3">
                            {log.source === 'MANUAL' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Nhập Thủ Công
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Cơ Sở Dữ Liệu
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {renderStatusBadge(log.status)}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                            {log.provider_message_id || '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            {log.sent_at ? new Date(log.sent_at).toLocaleTimeString('vi-VN') : 'Chưa gửi'}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-red-600 max-w-[200px] truncate">
                            {log.error_message || 'Không có lỗi'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 6: Import CSV Recipients Modal
         ───────────────────────────────────────────────────────────────────────── */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nhập Danh Sách Email Từ Tập Tin CSV
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tải lên danh sách người nhận định dạng .csv hoặc .txt để bổ sung vào chiến dịch.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvPreviewList([]);
                  setCsvFileName('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* File Upload Zone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="csvFileInput"
                  accept=".csv,.txt"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csvFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    {isParsingCsv ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                      {isParsingCsv ? 'Đang đọc dữ liệu tập tin CSV...' : 'Chọn tập tin CSV'}
                    </span>{' '}
                    {!isParsingCsv && <span className="text-xs text-slate-500">hoặc kéo thả vào đây</span>}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Định dạng hỗ trợ: Cột "email" và tùy chọn cột "name" (hoặc họ tên). Phân tách bằng dấu phẩy (,) hoặc chấm phẩy (;).
                  </p>
                </label>
              </div>

              {csvFileName && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800">{csvFileName}</span>
                    <span className="text-[11px] text-slate-500">
                      ({csvPreviewList.length} dòng đọc được)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCsvFileName('');
                      setCsvPreviewList([]);
                    }}
                    className="text-slate-400 hover:text-red-500 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Xóa chọn
                  </button>
                </div>
              )}

              {/* Preview Table */}
              {csvPreviewList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Xem trước dữ liệu ({csvPreviewList.length} dòng):</span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        {csvPreviewList.filter((r) => r.status === 'VALID').length} Hợp lệ
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        {csvPreviewList.filter((r) => r.status === 'DUPLICATE').length} Trùng lặp
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200">
                        {csvPreviewList.filter((r) => r.status === 'INVALID').length} Sai định dạng
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                          <th className="py-2 px-3">Địa Chỉ Email</th>
                          <th className="py-2 px-3">Họ Tên</th>
                          <th className="py-2 px-3">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvPreviewList.slice(0, 30).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-800">
                              {row.email}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {row.name || '—'}
                            </td>
                            <td className="py-2 px-3">
                              {row.status === 'VALID' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Hợp lệ
                                </span>
                              ) : row.status === 'DUPLICATE' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Trùng lặp
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200" title={row.reason}>
                                  Sai định dạng
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreviewList.length > 30 && (
                    <p className="text-[10px] text-slate-400 text-center">
                      Đang hiển thị 30 dòng đầu tiên trên tổng số {csvPreviewList.length} dòng.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvPreviewList([]);
                  setCsvFileName('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyCsvRecipients}
                disabled={csvPreviewList.filter((r) => r.status === 'VALID').length === 0}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Thêm Vào Danh Sách Người Nhận ({csvPreviewList.filter((r) => r.status === 'VALID').length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManagement;
