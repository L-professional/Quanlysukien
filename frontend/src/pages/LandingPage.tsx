import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Building2,
  Star,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Search,
  Bot,
  BarChart3,
  Phone,
  Mail,
  X,
  QrCode,
  Check,
  Ticket,
  Clock,
  Sparkles,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface DisplayEvent {
  id: number;
  title: string;
  date: string;
  location: string;
  description: string;
  tag: string;
  tagColor: string;
  image: string;
}

const DEFAULT_FEATURED_EVENTS: DisplayEvent[] = [
  {
    id: 1,
    title: 'Hội nghị Công nghệ AI 2026',
    date: '15 Thg 4, 2026',
    location: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
    description: 'Cập nhật xu hướng công nghệ AI mới nhất cùng các chuyên gia hàng đầu.',
    tag: 'Công nghệ',
    tagColor: 'bg-blue-100 text-blue-700',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 2,
    title: 'Diễn đàn Kinh doanh & Đổi mới',
    date: '22 Thg 4, 2026',
    location: 'Khách sạn Melia, Hà Nội',
    description: 'Kết nối doanh nghiệp, chia sẻ chiến lược phát triển bền vững.',
    tag: 'Doanh nghiệp',
    tagColor: 'bg-indigo-100 text-indigo-700',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 3,
    title: 'Hội thảo Y tế & Chăm sóc sức khỏe',
    date: '05 Thg 5, 2026',
    location: 'Trung tâm Hội nghị Gem Center, TPHCM',
    description: 'Cập nhật kiến thức y khoa và công nghệ chăm sóc sức khỏe hiện đại.',
    tag: 'Y tế',
    tagColor: 'bg-teal-100 text-teal-700',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 4,
    title: 'Workshop Sáng tạo & Công nghệ',
    date: '18 Thg 5, 2026',
    location: 'The ADORA Center, TPHCM',
    description: 'Truyền cảm hứng, kết nối cộng đồng sáng tạo trẻ.',
    tag: 'Sáng tạo',
    tagColor: 'bg-amber-100 text-amber-700',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80',
  },
];

const TESTIMONIALS = [
  {
    name: 'Nguyễn Thị Lan Anh',
    role: 'Giám đốc Marketing · TechWorld',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    comment:
      'EventAI giúp chúng tôi tổ chức sự kiện rất chuyên nghiệp, tiết kiệm thời gian và chi phí. Đội ngũ hỗ trợ nhiệt tình, luôn sẵn sàng 24/7.',
  },
  {
    name: 'Trần Minh Đức',
    role: 'CEO · BlueOcean Group',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    comment:
      'Giao diện thân thiện, dễ sử dụng và nhiều tính năng hữu ích. EventAI thực sự là giải pháp tuyệt vời cho các sự kiện hiện đại.',
  },
  {
    name: 'Lê Hà My',
    role: 'Trưởng phòng Sự kiện · GoldenEvent',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    comment:
      'Tôi rất hài lòng với chất lượng dịch vụ và sự chuyên nghiệp của EventAI. Chắc chắn sẽ tiếp tục đồng hành trong các sự kiện sắp tới.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Search state in Sticky Header
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active section for Navbar link highlighting
  const [activeSection, setActiveSection] = useState<string>('hero');

  // Mobile drawer toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Resolved user full name for greeting
  const currentUserName = user?.full_name || (() => {
    try {
      const stored = localStorage.getItem('eventhub_user');
      return stored ? JSON.parse(stored)?.full_name : null;
    } catch {
      return null;
    }
  })();

  // Events state
  const [eventsList, setEventsList] = useState<DisplayEvent[]>(DEFAULT_FEATURED_EVENTS);

  // Registration Modal State
  const [registeringEvent, setRegisteringEvent] = useState<DisplayEvent | null>(null);
  const [ticketType, setTicketType] = useState<'standard' | 'vip'>('standard');
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [isSubmittingReg, setIsSubmittingReg] = useState<boolean>(false);
  const [registeredTicketInfo, setRegisteredTicketInfo] = useState<{
    ticketCode: string;
    qrToken: string;
    eventTitle: string;
  } | null>(null);

  // Consultation Contact Modal State
  const [showConsultModal, setShowConsultModal] = useState<boolean>(false);
  const [consultName, setConsultName] = useState<string>('');
  const [consultPhone, setConsultPhone] = useState<string>('');
  const [consultCompany, setConsultCompany] = useState<string>('');

  // Load backend events on mount if available
  useEffect(() => {
    const fetchBackendEvents = async () => {
      try {
        const data = await apiService.getEvents();
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: DisplayEvent[] = data.slice(0, 4).map((item, idx) => ({
            id: item.id || idx + 1,
            title: item.title,
            date: item.start_date || '15 Thg 10, 2026',
            location: item.location || 'GEM Center, TP. Hồ Chí Minh',
            description: item.description || 'Sự kiện công nghệ hàng đầu tích hợp AI.',
            tag: idx % 2 === 0 ? 'Công nghệ' : 'Kinh doanh',
            tagColor: idx % 2 === 0 ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700',
            image:
              DEFAULT_FEATURED_EVENTS[idx % DEFAULT_FEATURED_EVENTS.length]?.image ||
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80',
          }));
          if (mapped.length >= 4) {
            setEventsList(mapped);
          }
        }
      } catch (err) {
        console.warn('Using default featured events fallback:', err);
      }
    };
    fetchBackendEvents();
  }, []);

  // Track active section for Navbar links
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ['hero', 'features', 'events', 'solutions', 'pricing', 'news', 'footer'];
      const scrollPos = window.scrollY + 140;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter events based on search input
  const filteredEvents = eventsList.filter((e) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      e.title.toLowerCase().includes(term) ||
      e.location.toLowerCase().includes(term) ||
      e.description.toLowerCase().includes(term) ||
      e.tag.toLowerCase().includes(term)
    );
  });

  // Smooth scroll handler for Anchor links & logo
  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    if (sectionId === 'hero' || sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToEvents = () => scrollToSection('events');
  const scrollToFeatures = () => scrollToSection('features');

  // Navigation Items Specification
  const NAV_ITEMS = [
    { label: 'Trang chủ', id: 'hero' },
    { label: 'Sự kiện', id: 'events' },
    { label: 'Tính năng', id: 'features' },
    { label: 'Giải pháp', id: 'solutions' },
    { label: 'Bảng giá', id: 'pricing' },
    { label: 'Tin tức', id: 'news' },
    { label: 'Liên hệ', id: 'footer' },
  ];

  const handleRegisterClick = (evt: DisplayEvent) => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để đăng ký vé tham dự sự kiện!');
      navigate(`/login?redirect=${encodeURIComponent('/')}&event=${encodeURIComponent(evt.title)}`);
      return;
    }

    // Prefill user information
    setRegFullName(user?.full_name || '');
    setRegEmail(user?.email || '');
    setRegPhone(user?.phone_number || '0987654321');
    setTicketType('standard');
    setRegisteredTicketInfo(null);
    setRegisteringEvent(evt);
  };

  const handleConfirmRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim()) {
      toast.error('Vui lòng điền đầy đủ Họ tên và Email!');
      return;
    }

    setIsSubmittingReg(true);
    try {
      // Simulate backend ticket registration call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockTicketCode = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      const mockQr = `QR_${mockTicketCode}_${Date.now()}`;

      setRegisteredTicketInfo({
        ticketCode: mockTicketCode,
        qrToken: mockQr,
        eventTitle: registeringEvent?.title || 'Sự kiện EventAI',
      });
      toast.success(`Đăng ký vé thành công cho ${registeringEvent?.title}!`);
    } catch {
      toast.error('Không thể hoàn tất đăng ký vé. Vui lòng thử lại!');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultName.trim() || !consultPhone.trim()) {
      toast.error('Vui lòng nhập tên và số điện thoại liên hệ!');
      return;
    }
    toast.success('Yêu cầu tư vấn đã được gửi! Đội ngũ EventAI sẽ liên hệ trong 15 phút.');
    setShowConsultModal(false);
    setConsultName('');
    setConsultPhone('');
    setConsultCompany('');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. TOP STICKY NAVBAR (Task 55: Interactive Navbar & Dynamic Auth Header) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo Brand: Click rolls smoothly to top (#hero) */}
          <div
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-3 cursor-pointer select-none group"
            title="Cuộn lên đầu trang"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 group-hover:bg-blue-700 transition-colors flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1">
                Event<span className="text-blue-600">AI</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-tight">
                Kết nối sự kiện - Kiến tạo giá trị
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-semibold text-slate-600">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`transition-colors cursor-pointer py-1 relative ${
                  activeSection === item.id
                    ? 'text-blue-600 font-bold'
                    : 'hover:text-blue-600'
                }`}
              >
                <span>{item.label}</span>
                {activeSection === item.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* Search Bar + Auth Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search Input */}
            <div className="relative hidden md:block w-44 lg:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') scrollToSection('events');
                }}
                placeholder="Tìm sự kiện, địa điểm..."
                className="w-full pl-8 pr-7 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs border border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Language Switcher [VN | EN] */}
            <LanguageSwitcher />

            {/* Dynamic Auth Actions */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden lg:inline text-xs font-semibold text-slate-700">
                  Hi, <strong className="font-bold text-slate-900">{currentUserName || 'Nguyễn Văn Quản Trị'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>Vào Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-3 sm:px-4 py-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login?mode=register')}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  Đăng ký
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-lg">
            {/* Mobile Search Input */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') scrollToSection('events');
                }}
                placeholder="Tìm sự kiện, địa điểm..."
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-100 focus:bg-white text-xs border border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Mobile Menu Links */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Mobile Auth Greeting / Actions */}
            {isAuthenticated && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Hi, <strong className="font-bold text-slate-900">{currentUserName || 'Nguyễn Văn Quản Trị'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/dashboard');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
                >
                  Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (Dark Navy Banner Khớp Visual Mockup 100%) */}
      {/* ========================================================================= */}
      <section id="hero" className="relative bg-[#0A1128] text-white py-16 sm:py-24 overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.25),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left 6 Cols: Hero Headline & CTAs */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-bold tracking-wide uppercase">
                NỀN TẢNG QUẢN LÝ SỰ KIỆN THÔNG MINH
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Tạo nên những sự kiện đáng nhớ với{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                  EventAI
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                Giải pháp quản lý sự kiện toàn diện, tích hợp trí tuệ nhân tạo, giúp bạn tổ chức sự kiện chuyên nghiệp, tối ưu chi phí và mang lại trải nghiệm tuyệt vời cho người tham dự.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={scrollToEvents}
                  className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <span>Khám phá sự kiện</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={scrollToFeatures}
                  className="px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white border border-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Tìm hiểu thêm
                </button>
              </div>
            </div>

            {/* Right Visual: Stage Auditorium Photo + 2 Floating Badges */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700/50">
                <img
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80"
                  alt="Event Stage Auditorium"
                  className="w-full h-80 sm:h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128]/80 via-transparent to-transparent" />
              </div>

              {/* Floating Badge 1: Top Right - AI hỗ trợ tổ chức */}
              <div className="absolute -top-4 -right-2 sm:-right-4 bg-slate-900/95 border border-blue-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md max-w-xs flex items-start gap-3 z-20">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/40">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">AI hỗ trợ tổ chức</p>
                  <p className="text-[10px] text-slate-300 leading-snug mt-0.5">
                    Tối ưu lịch trình, phân tích dữ liệu và gợi ý cá nhân hóa
                  </p>
                </div>
              </div>

              {/* Floating Badge 2: Bottom Right - Sự kiện chuyên nghiệp */}
              <div className="absolute -bottom-5 sm:-bottom-6 right-2 sm:right-0 bg-white text-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-200/90 max-w-xs z-20 space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-slate-900">Sự kiện chuyên nghiệp</p>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Tạo sự kiện nhanh chóng</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Quản trị người tham dự</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Báo cáo thời gian thực</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. STATS BAR (4 Thẻ Chỉ Số Vuông Vắn Căn Giữa) */}
      {/* ========================================================================= */}
      <section className="bg-white py-10 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">500+</p>
                <p className="text-xs text-slate-500 font-medium">Sự kiện đã tổ chức</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">50.000+</p>
                <p className="text-xs text-slate-500 font-medium">Người tham dự</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">200+</p>
                <p className="text-xs text-slate-500 font-medium">Doanh nghiệp tin tưởng</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">99.9%</p>
                <p className="text-xs text-slate-500 font-medium">Độ ổn định hệ thống</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. VÌ SAO CHỌN EVENTAI? (Khối 2 Cột + Mockup Laptop / App) */}
      {/* ========================================================================= */}
      <section id="features" className="py-20 bg-white">
        <span id="vi-sao-chon-eventai" className="hidden" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left 5 Cols: Information Checklist */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                GIẢI PHÁP TOÀN DIỆN
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Vì sao chọn <span className="text-blue-600">EventAI?</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                EventAI mang đến giải pháp quản lý sự kiện hiện đại, linh hoạt và dễ sử dụng. Từ khâu lên ý tưởng, tổ chức đến đánh giá sau sự kiện, tất cả đều được tích hợp trên một nền tảng duy nhất.
              </p>

              <div className="space-y-3 pt-1">
                {[
                  'Tiết kiệm thời gian và chi phí',
                  'Tối ưu quy trình tổ chức',
                  'Trải nghiệm người tham dự vượt trội',
                  'Báo cáo chi tiết, chính xác',
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">{text}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={scrollToEvents}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Khám phá tính năng
                </button>
              </div>
            </div>

            {/* Right 7 Cols: Mockup Laptop Dashboard + Mobile Screen + 4 Badges */}
            <div className="lg:col-span-7 relative flex items-center justify-center">
              <div className="relative w-full max-w-xl bg-slate-900 rounded-2xl p-3 shadow-2xl border border-slate-800">
                <div className="h-6 flex items-center gap-1.5 px-3 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                {/* Mockup Dashboard Preview Image */}
                <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                  <img
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80"
                    alt="EventAI Dashboard System"
                    className="w-full h-72 sm:h-80 object-cover object-top"
                  />
                </div>
              </div>

              {/* 4 Surrounding Floating Badges */}
              <div className="absolute -top-4 left-4 bg-white rounded-xl p-2.5 shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-800">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Quản lý sự kiện thông minh</span>
              </div>

              <div className="absolute -top-4 right-4 bg-white rounded-xl p-2.5 shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-800">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span>AI phân tích dữ liệu</span>
              </div>

              <div className="absolute -bottom-4 left-6 bg-white rounded-xl p-2.5 shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-800">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Tối ưu trải nghiệm người tham dự</span>
              </div>

              <div className="absolute -bottom-4 right-6 bg-white rounded-xl p-2.5 shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-800">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Báo cáo thời gian thực</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SỰ KIỆN NỔI BẬT (4 Cột Chuẩn Mẫu + Modal Đăng Ký) */}
      {/* ========================================================================= */}
      <section id="events" className="py-20 bg-slate-50/70 border-y border-slate-200/80">
        <span id="su-kien-noi-bat" className="hidden" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">
                ĐỪNG BỎ LỠ
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Sự kiện nổi bật
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {searchQuery ? (
                  <span className="font-semibold text-blue-600">
                    Kết quả tìm kiếm cho "{searchQuery}" ({filteredEvents.length} sự kiện phù hợp)
                  </span>
                ) : (
                  'Khám phá các sự kiện hấp dẫn sắp diễn ra và đăng ký ngay để không bỏ lỡ!'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/events')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Xem tất cả sự kiện</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grid 4 Event Cards */}
          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-3">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                Không tìm thấy sự kiện phù hợp với từ khóa "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Xem tất cả
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Thumbnail with category tag */}
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={evt.image}
                        alt={evt.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span
                        className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${evt.tagColor} shadow-xs`}
                      >
                        {evt.tag}
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{evt.date}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                        {evt.title}
                      </h3>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      type="button"
                      onClick={() => handleRegisterClick(evt)}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <span>Đăng ký ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CTA BANNER (Tổ chức sự kiện chuyên nghiệp cùng EventAI - Solutions) */}
      {/* ========================================================================= */}
      <section id="solutions" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-50/80 rounded-3xl p-8 sm:p-12 border border-slate-200">
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                SẴN SÀNG CHO SỰ KIỆN TIẾP THEO
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                Tổ chức sự kiện chuyên nghiệp cùng{' '}
                <span className="text-blue-600">EventAI</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Trải nghiệm nền tảng quản lý sự kiện thông minh với công nghệ AI hàng đầu. Dễ dàng tạo, quản lý và theo dõi mọi sự kiện của bạn.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={scrollToEvents}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Đăng ký ngay
                </button>
                <button
                  type="button"
                  onClick={() => setShowConsultModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Liên hệ tư vấn
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
              <img
                src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
                alt="Professional Event Management"
                className="w-full h-56 object-cover"
              />
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Hỗ trợ 24/7</p>
                  <p className="text-[11px] text-slate-500">Luôn đồng hành cùng bạn</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Bảo mật tuyệt đối</p>
                  <p className="text-[11px] text-slate-500">An toàn dữ liệu người dùng</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                  <SlidersIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Tùy chỉnh linh hoạt</p>
                  <p className="text-[11px] text-slate-500">Phù hợp mọi loại sự kiện</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6.5. BẢNG GIÁ DỊCH VỤ (Pricing Section - Task 55) */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 bg-slate-50/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">
              BẢNG GIÁ DỊCH VỤ LINH HOẠT
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Lựa chọn gói giải pháp tối ưu cho sự kiện
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Minh bạch chi phí, nâng cấp hoặc tùy biến theo quy mô tổ chức của bạn bất cứ lúc nào
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Tier 1: Khởi tạo (Starter) */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900">Gói Khởi Tạo</h3>
                  <p className="text-xs text-slate-500">Dành cho câu lạc bộ, sự kiện nhỏ hoặc cộng đồng</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">0đ</span>
                  <span className="text-xs text-slate-500 font-medium">/ sự kiện</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-5">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Quy mô tối đa 100 khách tham dự</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Trang đăng ký & phát hành vé QR điện tử</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Check-in qua camera điện thoại cơ bản</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Báo cáo số lượng tham gia tổng quan</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login?mode=register')}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Bắt đầu miễn phí
                </button>
              </div>
            </div>

            {/* Tier 2: Chuyên nghiệp (Pro) - Highlight */}
            <div className="bg-gradient-to-b from-blue-900 to-indigo-950 text-white rounded-3xl p-7 border-2 border-blue-500 shadow-xl relative flex flex-col justify-between transform md:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                ĐƯỢC LỰA CHỌN NHIỀU NHẤT
              </div>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">Gói Chuyên Nghiệp</h3>
                  <p className="text-xs text-blue-200">Cho hội thảo, diễn đàn doanh nghiệp & workshop</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-white">499.000đ</span>
                  <span className="text-xs text-blue-300 font-medium">/ sự kiện</span>
                </div>
                <ul className="space-y-3 text-xs text-blue-100 border-t border-blue-800/80 pt-5">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Lên tới 1.000 khách tham dự</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>AI Concierge giải đáp khách tham dự 24/7</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>AI PR Studio tự động sinh bài truyền thông</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Cổng điều khiển diễn giả & Live Q&A</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Phân tích dữ liệu & phản hồi sau sự kiện</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login?mode=register')}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/40 transition-all cursor-pointer text-center"
                >
                  Trải nghiệm gói Pro
                </button>
              </div>
            </div>

            {/* Tier 3: Doanh nghiệp (Enterprise) */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900">Gói Doanh Nghiệp</h3>
                  <p className="text-xs text-slate-500">Tập đoàn, hội nghị quy mô lớn & quốc tế</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">Liên hệ</span>
                  <span className="text-xs text-slate-500 font-medium">/ giải pháp tùy biến</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-5">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Không giới hạn số lượng khách tham dự</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kho tri thức RAG riêng biệt & bảo mật</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tùy biến tên miền, thương hiệu & giao diện</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Đội ngũ kỹ thuật hỗ trợ On-site & SLA 99.9%</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => setShowConsultModal(true)}
                  className="w-full py-3 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Liên hệ tư vấn
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6.7. TIN TỨC & BÀI VIẾT NỔI BẬT (News Section - Task 55) */}
      {/* ========================================================================= */}
      <section id="news" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">
                TIN TỨC & XU HƯỚNG
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Cập nhật công nghệ sự kiện 2026
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Khám phá các bài viết chuyên sâu, kinh nghiệm tổ chức và xu hướng công nghệ mới nhất
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/events')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Xem tất cả tin tức</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-200 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="relative h-44 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80"
                    alt="AI in event check-in"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-600 text-white">
                    Công nghệ AI
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <span className="text-[11px] text-slate-500">12 Thg 4, 2026 • 5 phút đọc</span>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    Tối ưu hóa quy trình check-in bằng mã QR và AI nhận diện tự động
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    Giảm thời gian xếp hàng tới 80% với giải pháp quét mã thông minh đa nền tảng.
                  </p>
                </div>
              </div>
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Đọc tiếp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-200 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="relative h-44 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&q=80"
                    alt="Hybrid event tips"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                    Kinh nghiệm tổ chức
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <span className="text-[11px] text-slate-500">08 Thg 4, 2026 • 4 phút đọc</span>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    Bí quyết tăng 200% tỷ lệ tương tác người tham gia trong hội nghị Hybrid
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    Cách thức kết nối khán giả trực tuyến và trực tiếp qua hệ thống Live Q&A và khảo sát thời gian thực.
                  </p>
                </div>
              </div>
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Đọc tiếp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-200 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="relative h-44 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80"
                    alt="Speaker control center"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-600 text-white">
                    Xu hướng 2026
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <span className="text-[11px] text-slate-500">01 Thg 4, 2026 • 6 phút đọc</span>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    Xu hướng thiết kế sân khấu số và kiểm soát diễn giả thời gian thực
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    Giải pháp Studio sân khấu hỗ trợ diễn giả tương tác trực quan với khán phòng và điều phối viên.
                  </p>
                </div>
              </div>
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Đọc tiếp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. ĐÁNH GIÁ KHÁCH HÀNG (Testimonials 3 Thẻ) */}
      {/* ========================================================================= */}
      <section className="py-20 bg-slate-50/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">
              KHÁCH HÀNG NÓI GÌ VỀ CHÚNG TÔI
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Trải nghiệm thực tế từ khách hàng
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Hàng nghìn tổ chức, doanh nghiệp đã tin tưởng và lựa chọn EventAI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{t.name}</p>
                      <p className="text-[10px] text-slate-500">{t.role}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{t.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FOOTER CHUẨN MOCKUP */}
      {/* ========================================================================= */}
      <footer id="footer" className="bg-[#0A1128] text-slate-400 text-xs py-14">
        <span id="lien-he" className="hidden" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-800">
            {/* Col 1: Logo & Slogan */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-lg font-black text-white tracking-tight">
                  Event<span className="text-blue-400">AI</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Kết nối sự kiện - Kiến tạo giá trị</p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm pt-1">
                Hệ thống quản lý sự kiện thông minh tích hợp trí tuệ nhân tạo, tối ưu hoá mọi quy trình từ khởi tạo, bán vé đến báo cáo toàn diện.
              </p>
            </div>

            {/* Col 2: Liên kết nhanh */}
            <div className="space-y-3">
              <p className="font-bold text-white text-xs uppercase tracking-wider">Liên kết nhanh</p>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => scrollToSection('hero')} className="hover:text-white transition-colors cursor-pointer">
                    Trang chủ
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('events')} className="hover:text-white transition-colors cursor-pointer">
                    Sự kiện
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">
                    Tính năng
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('solutions')} className="hover:text-white transition-colors cursor-pointer">
                    Giải pháp
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Bảng giá & Tin tức */}
            <div className="space-y-3">
              <p className="font-bold text-white text-xs uppercase tracking-wider">Thông tin</p>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors cursor-pointer">
                    Bảng giá
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('news')} className="hover:text-white transition-colors cursor-pointer">
                    Tin tức
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowConsultModal(true)} className="hover:text-white transition-colors cursor-pointer">
                    Liên hệ tư vấn
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Thông tin liên hệ */}
            <div className="space-y-3">
              <p className="font-bold text-white text-xs uppercase tracking-wider">Thông tin liên hệ</p>
              <ul className="space-y-2 text-[11px] text-slate-400">
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>Số 123 Nguyễn Văn Cừ, Long Biên, Hà Nội</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Hotline: 1900 1234</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Email: support@eventai.vn</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2026 EventAI. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <span className="hover:text-slate-400 cursor-pointer">Chính sách bảo mật</span>
              <span>•</span>
              <span className="hover:text-slate-400 cursor-pointer">Điều khoản sử dụng</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 9. MODAL XÁC NHẬN ĐĂNG KÝ SỰ KIỆN (Modal Registration Popup) */}
      {/* ========================================================================= */}
      {registeringEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header with Event Banner */}
            <div className="relative h-32 overflow-hidden bg-slate-900">
              <img
                src={registeringEvent.image}
                alt={registeringEvent.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <button
                type="button"
                onClick={() => setRegisteringEvent(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                  {registeringEvent.tag}
                </span>
                <h3 className="text-sm sm:text-base font-black truncate mt-1">
                  {registeringEvent.title}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {registeredTicketInfo ? (
                /* Success View with QR Code */
                <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <Check className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900">Đăng ký vé thành công!</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Mã vé điện tử của bạn đã sẵn sàng và được đồng bộ vào hệ thống.
                    </p>
                  </div>

                  {/* QR Code Container */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 inline-block space-y-2">
                    <div className="w-36 h-36 bg-white rounded-xl border border-slate-300 p-2 mx-auto flex flex-col items-center justify-center shadow-xs">
                      <QrCode className="w-24 h-24 text-blue-600" />
                      <span className="text-[9px] font-mono font-bold text-slate-600 mt-1">
                        {registeredTicketInfo.ticketCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium">
                      <span>Loại vé: </span>
                      <strong className="text-blue-600 uppercase">
                        {ticketType === 'vip' ? '👑 VIP Pass' : '🎟️ Tiêu chuẩn'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegisteringEvent(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegisteringEvent(null);
                        navigate('/dashboard');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <span>Xem trong Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Registration Form */
                <form onSubmit={handleConfirmRegistration} className="space-y-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{registeringEvent.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="truncate max-w-[180px]">{registeringEvent.location}</span>
                    </div>
                  </div>

                  {/* Ticket Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Chọn loại vé tham dự</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTicketType('standard')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          ticketType === 'standard'
                            ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Vé Tiêu Chuẩn</span>
                          <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Miễn phí
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Tham gia các phiên chính & tài liệu số
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTicketType('vip')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          ticketType === 'vip'
                            ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Vé VIP Pass</span>
                          <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            500.000đ
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Hàng ghế đầu & tiệc Networking
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Registrant Form Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Họ và tên người tham dự *
                      </label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Email nhận vé điện tử *
                        </label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="example@eventai.vn"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Số điện thoại liên hệ
                        </label>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="0987654321"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingReg}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmittingReg ? (
                        <span>Đang xử lý đăng ký vé...</span>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4" />
                          <span>Xác nhận đăng ký tham dự</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL LIÊN HỆ TƯ VẤN (Consultation Modal) */}
      {/* ========================================================================= */}
      {showConsultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900">Liên hệ tư vấn giải pháp</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConsultModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Để lại thông tin để chuyên gia tư vấn của EventAI đồng hành xây dựng kế hoạch sự kiện tối ưu nhất cho bạn.
            </p>

            <form onSubmit={handleConsultSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Họ và tên của bạn *
                </label>
                <input
                  type="text"
                  required
                  value={consultName}
                  onChange={(e) => setConsultName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  required
                  value={consultPhone}
                  onChange={(e) => setConsultPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tên tổ chức / Doanh nghiệp
                </label>
                <input
                  type="text"
                  value={consultCompany}
                  onChange={(e) => setConsultCompany(e.target.value)}
                  placeholder="Công ty TNHH Giải pháp..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Gửi yêu cầu tư vấn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SlidersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export default LandingPage;
