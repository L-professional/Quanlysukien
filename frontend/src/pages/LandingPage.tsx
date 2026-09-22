import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  useEffect(() => {
    // Header scroll effect
    const header = document.getElementById('header');
    
    const handleScroll = () => {
        if (header) {
            if (window.scrollY > 20) {
                header.classList.add('glass-header');
                header.classList.replace('border-transparent', 'border-event-border');
            } else {
                header.classList.remove('glass-header');
                header.classList.replace('border-event-border', 'border-transparent');
            }
        }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const icon = mobileMenuBtn.querySelector('i');
            if(icon) {
                if(mobileMenu.classList.contains('hidden')) {
                    icon.classList.replace('ph-x', 'ph-list');
                } else {
                    icon.classList.replace('ph-list', 'ph-x');
                }
            }
        });

        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                const icon = mobileMenuBtn.querySelector('i');
                if(icon) icon.classList.replace('ph-x', 'ph-list');
            });
        });
    }

    // Active Navigation Highlighting
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const handleNavScroll = () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = (section as HTMLElement).offsetTop;
            if (scrollY >= (sectionTop - 150)) {
                current = section.getAttribute('id') || '';
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active-nav');
            if (link.getAttribute('href')?.includes(current)) {
                link.classList.add('active-nav');
            }
        });
    };
    window.addEventListener('scroll', handleNavScroll);

    // Scroll Animation Observer (Fade up)
    const fadeElements = document.querySelectorAll('.fade-up');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    fadeElements.forEach(el => observer.observe(el));
    
    return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('scroll', handleNavScroll);
    };
  }, []);

  return (
    <div className="landing-page-wrapper bg-white text-event-text min-h-screen">
      <style>{`
        body { color: #182230; background-color: #FFFFFF; }
        
        .glass-header { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        
        .active-nav { color: #C8102E; position: relative; }
        .active-nav::after { content: ''; position: absolute; bottom: -24px; left: 0; width: 100%; height: 2px; background-color: #C8102E; }
        .nav-link:hover { color: #C8102E; }
        
        .hero-bg { background: linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(244,245,247,0.8) 100%); position: relative; overflow: hidden; }
        .geo-accent { position: absolute; background: #C8102E; opacity: 0.03; transform: rotate(-45deg); z-index: 0; }
        
        .fade-up { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .fade-up.visible { opacity: 1; transform: translateY(0); }

        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.08); }
        
        .image-zoom { transition: transform 0.5s ease; }
        .card-hover:hover .image-zoom { transform: scale(1.05); }
        
        .btn-primary { background-color: #C8102E; color: #FFFFFF; transition: all 0.3s ease; }
        .btn-primary:hover { background-color: #A80722; transform: translateY(-1px); }
        .btn-secondary { background-color: transparent; border: 1px solid #C8102E; color: #C8102E; transition: all 0.3s ease; }
        .btn-secondary:hover { background-color: #F8E8EB; }

        .feature-icon-wrapper { transition: all 0.3s ease; }
        .feature-block:hover .feature-icon-wrapper { background-color: #C8102E; color: white; }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #F4F5F7; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
    `}</style>
      
    
    {/* HEADER */}
    <header id="header" className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent bg-white h-[72px] flex items-center">
        <div className="container mx-auto px-6 xl:px-12 w-full max-w-[1440px] flex justify-between items-center">
            
            <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center">
                    <div className="w-8 h-8 flex justify-center items-center">
                        <div className="w-6 h-6 bg-event-red rotate-45 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-white -rotate-45"></div>
                        </div>
                    </div>
                    <span className="text-2xl font-bold ml-2 tracking-tight">
                        <span className="text-event-navy">Event</span><span className="text-event-red">AI</span>
                    </span>
                </div>
                <div className="hidden lg:block h-6 w-px bg-event-border mx-2"></div>
                <span className="hidden lg:block text-[10px] font-semibold text-event-text-sec tracking-[0.2em] leading-[1.3] mt-1">
                    CONNECT · CREATE<br />INSPIRE
                </span>
            </div>

            <nav className="hidden xl:flex items-center gap-8 text-[14px] font-semibold text-event-text h-full">
                <a href="#home" className="nav-link active-nav h-full flex items-center">Trang chủ</a>
                <a href="#featured-events" className="nav-link h-full flex items-center">Sự kiện</a>
                <a href="#services" className="nav-link h-full flex items-center">Dịch vụ</a>
                <a href="#features" className="nav-link h-full flex items-center">Tính năng</a>
                <a href="#about" className="nav-link h-full flex items-center">Về chúng tôi</a>
                <a href="#news" className="nav-link h-full flex items-center">Tin tức</a>
                <a href="#reviews" className="nav-link h-full flex items-center">Đánh giá</a>
                <a href="#contact" className="nav-link h-full flex items-center">Liên hệ</a>
            </nav>

            <div className="hidden lg:flex items-center gap-5 shrink-0">
                <button className="text-event-text hover:text-event-red transition-colors" aria-label="Search">
                    <i className="ph ph-magnifying-glass text-xl"></i>
                </button>
                <div className="h-4 w-px bg-event-border"></div>
                <Link to="/login" className="text-[14px] font-semibold text-event-text hover:text-event-red transition-colors flex items-center gap-2">
                    <i className="ph ph-user text-lg"></i>
                    Đăng nhập
                </Link>
                <Link to="/login?mode=register" className="btn-primary px-6 py-2.5 rounded-md text-[14px] font-semibold flex items-center gap-2">
                    Bắt đầu
                </Link>
            </div>

            <button className="xl:hidden text-2xl text-event-navy" id="mobile-menu-btn">
                <i className="ph ph-list"></i>
            </button>
        </div>
    </header>

    {/* Mobile Menu Overlay */}
    <div id="mobile-menu" className="fixed inset-0 bg-white z-40 hidden pt-[72px] px-6">
        <div className="flex flex-col gap-6 pt-8 pb-12 overflow-y-auto h-full text-lg font-semibold">
            <a href="#home" className="mobile-link text-event-red">Trang chủ</a>
            <a href="#featured-events" className="mobile-link text-event-text">Sự kiện</a>
            <a href="#services" className="mobile-link text-event-text">Dịch vụ</a>
            <a href="#features" className="mobile-link text-event-text">Tính năng</a>
            <a href="#about" className="mobile-link text-event-text">Về chúng tôi</a>
            <a href="#news" className="mobile-link text-event-text">Tin tức</a>
            <a href="#reviews" className="mobile-link text-event-text">Đánh giá</a>
            <a href="#contact" className="mobile-link text-event-text">Liên hệ</a>
            <div className="h-px bg-event-border w-full my-2"></div>
            <a href="#home" className="text-event-text flex items-center gap-2">
                <i className="ph ph-user"></i> Đăng nhập
            </a>
            <a href="#home" className="bg-event-red text-white py-3 rounded-md text-center">Bắt đầu</a>
        </div>
    </div>

    <main className="pt-[72px]">
        
        {/* HERO SECTION */}
        <section id="home" className="relative min-h-[650px] lg:h-[750px] flex items-center border-b border-event-border/50 overflow-hidden bg-white">
            
            {/* Full background image */}
            <div className="absolute inset-0 w-full h-full z-0">
                <img src="assets/backgroud_trangchu.webp" alt="Background" className="w-full h-full object-cover object-right lg:object-[85%_30%]" />
            </div>
            
            {/* Diagonal geometric accents (mockup matching) - Reduced size */}
            <div className="absolute z-0 bg-event-red transform -rotate-45" style={{ width: '250px', height: '1000px', top: '-400px', right: '-200px', opacity: '0.9' }}></div>
            <div className="absolute z-0 bg-event-red transform -rotate-45" style={{ width: '40px', height: '1000px', top: '-300px', right: '80px', opacity: '0.9' }}></div>
            
            {/* Left geometric accents - Reduced */}
            <div className="absolute z-0 bg-event-red transform -rotate-45 hidden lg:block" style={{ width: '150px', height: '600px', bottom: '-300px', left: '-100px', opacity: '0.04' }}></div>
            <div className="absolute z-0 bg-event-red transform -rotate-45 hidden lg:block" style={{ width: '20px', height: '600px', bottom: '-200px', left: '80px', opacity: '0.04' }}></div>

            {/* White gradient overlay for text readability */}
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-white via-white/95 lg:via-white/80 to-transparent lg:w-3/4"></div>
            
            {/* Additional gradient for bottom fading */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent z-0"></div>

            <div className="container mx-auto px-6 xl:px-12 w-full max-w-[1440px] relative z-10 h-full flex flex-col justify-center pt-24 lg:pt-0">
                
                <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-center fade-up pb-12 lg:pb-0">
                    <div className="inline-block px-3 py-1 bg-event-light-red text-event-red text-xs font-bold tracking-wider rounded-sm mb-6 uppercase w-max border border-event-red/10">
                        Hệ thống quản lý sự kiện tích hợp AI
                    </div>
                    
                    <h1 className="text-[42px] sm:text-[52px] xl:text-[60px] leading-[1.3] font-extrabold tracking-tight mb-5 text-event-navy">
                        Kiến tạo những<br />
                        <span className="text-event-red">sự kiện đẳng cấp</span>
                    </h1>
                    
                    <p className="text-event-text-sec text-[16px] sm:text-[18px] leading-relaxed mb-10 max-w-lg">
                        Từ ý tưởng, tổ chức đến vận hành và phân tích hiệu quả – EventAI mang đến nền tảng quản lý sự kiện thông minh, tích hợp AI trong một hệ sinh thái thống nhất.
                    </p>
                    
                    <div className="bg-white p-2 rounded-lg shadow-premium border border-event-border flex flex-col sm:flex-row gap-2 max-w-xl">
                        <div className="flex-1 flex items-center px-4 py-2 text-event-text-sec">
                            <i className="ph ph-magnifying-glass text-xl mr-3 text-event-red"></i>
                            <input type="text" placeholder="Tìm kiếm sự kiện, địa điểm, dịch vụ..." className="w-full bg-transparent outline-none text-[15px] text-event-navy placeholder-event-text-sec/60" />
                        </div>
                        <button className="btn-primary py-3 px-8 rounded-md font-semibold shrink-0">
                            Tìm kiếm
                        </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-8 gap-y-6 mt-12 pt-8 border-t border-event-border/60">
                        <div className="flex items-start gap-3">
                            <div className="text-event-red text-2xl mt-0.5"><i className="ph ph-calendar-check"></i></div>
                            <div>
                                <div className="text-2xl font-bold text-event-navy">1,200+</div>
                                <div className="text-xs text-event-text-sec font-medium uppercase tracking-wider mt-1">Sự kiện tổ chức</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="text-event-red text-2xl mt-0.5"><i className="ph ph-users"></i></div>
                            <div>
                                <div className="text-2xl font-bold text-event-navy">100K+</div>
                                <div className="text-xs text-event-text-sec font-medium uppercase tracking-wider mt-1">Người tham dự</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 hidden sm:flex">
                            <div className="text-event-red text-2xl mt-0.5"><i className="ph ph-star"></i></div>
                            <div>
                                <div className="text-2xl font-bold text-event-navy">96%</div>
                                <div className="text-xs text-event-text-sec font-medium uppercase tracking-wider mt-1">Khách hài lòng</div>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        </section>

        {/* WHY EVENTAI SECTION */}
        <section className="py-20 lg:py-24 bg-white relative">
            <div className="container mx-auto px-6 xl:px-12 max-w-[1440px]">
                
                <div className="text-center mb-16 fade-up">
                    <h2 className="text-[36px] lg:text-[42px] font-bold text-event-navy mb-4">Vì sao chọn EventAI?</h2>
                    <p className="text-event-text-sec text-[16px] max-w-2xl mx-auto">Mọi công cụ bạn cần để lên kế hoạch, quản lý và tối ưu hóa các sự kiện hiện đại, được tích hợp sức mạnh từ Trí tuệ nhân tạo.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    
                    <div className="feature-block border border-event-border p-8 rounded-lg card-hover fade-up bg-event-gray/30">
                        <div className="feature-icon-wrapper w-12 h-12 rounded-full bg-event-light-red text-event-red flex items-center justify-center text-2xl mb-6">
                            <i className="ph ph-calendar-plus"></i>
                        </div>
                        <h3 className="text-[20px] font-bold text-event-navy mb-3">Quản lý sự kiện thông minh</h3>
                        <p className="text-event-text-sec text-[15px] leading-relaxed">Từ việc lên lịch, phân bổ ngân sách đến điều phối nhân sự, tất cả đều được tự động hóa và quản lý tập trung.</p>
                    </div>

                    <div className="feature-block border border-event-border p-8 rounded-lg card-hover fade-up bg-event-gray/30" style={{ transitionDelay: '100ms' }}>
                        <div className="feature-icon-wrapper w-12 h-12 rounded-full bg-event-light-red text-event-red flex items-center justify-center text-2xl mb-6">
                            <i className="ph ph-brain"></i>
                        </div>
                        <h3 className="text-[20px] font-bold text-event-navy mb-3">Phân tích bằng AI</h3>
                        <p className="text-event-text-sec text-[15px] leading-relaxed">Hệ thống AI dự báo xu hướng tham dự, tối ưu hóa không gian và đưa ra các đề xuất cải thiện hiệu quả sự kiện.</p>
                    </div>

                    <div className="feature-block border border-event-border p-8 rounded-lg card-hover fade-up bg-event-gray/30" style={{ transitionDelay: '200ms' }}>
                        <div className="feature-icon-wrapper w-12 h-12 rounded-full bg-event-light-red text-event-red flex items-center justify-center text-2xl mb-6">
                            <i className="ph ph-scan"></i>
                        </div>
                        <h3 className="text-[20px] font-bold text-event-navy mb-3">Check-in mượt mà</h3>
                        <p className="text-event-text-sec text-[15px] leading-relaxed">Giải pháp nhận diện khuôn mặt và QR code tốc độ cao giúp giảm thiểu thời gian chờ đợi, nâng tầm trải nghiệm khách mời.</p>
                    </div>

                    <div className="feature-block border border-event-border p-8 rounded-lg card-hover fade-up bg-event-gray/30" style={{ transitionDelay: '300ms' }}>
                        <div className="feature-icon-wrapper w-12 h-12 rounded-full bg-event-light-red text-event-red flex items-center justify-center text-2xl mb-6">
                            <i className="ph ph-chart-line-up"></i>
                        </div>
                        <h3 className="text-[20px] font-bold text-event-navy mb-3">Báo cáo theo thời gian thực</h3>
                        <p className="text-event-text-sec text-[15px] leading-relaxed">Theo dõi doanh thu, số lượng khách tham dự và phản hồi trực tiếp qua một dashboard trực quan, chi tiết.</p>
                    </div>

                    <div className="feature-block border border-event-border p-8 rounded-lg card-hover fade-up bg-event-gray/30" style={{ transitionDelay: '400ms' }}>
                        <div className="feature-icon-wrapper w-12 h-12 rounded-full bg-event-light-red text-event-red flex items-center justify-center text-2xl mb-6">
                            <i className="ph ph-shield-check"></i>
                        </div>
                        <h3 className="text-[20px] font-bold text-event-navy mb-3">Bảo mật dữ liệu tuyệt đối</h3>
                        <p className="text-event-text-sec text-[15px] leading-relaxed">Mọi thông tin sự kiện và dữ liệu khách hàng đều được mã hóa theo tiêu chuẩn bảo mật quốc tế cao nhất.</p>
                    </div>

                    <div className="feature-block border border-event-border p-8 rounded-lg card-hover fade-up bg-event-gray/30" style={{ transitionDelay: '500ms' }}>
                        <div className="feature-icon-wrapper w-12 h-12 rounded-full bg-event-light-red text-event-red flex items-center justify-center text-2xl mb-6">
                            <i className="ph ph-headset"></i>
                        </div>
                        <h3 className="text-[20px] font-bold text-event-navy mb-3">Hỗ trợ chuyên gia 24/7</h3>
                        <p className="text-event-text-sec text-[15px] leading-relaxed">Đội ngũ hỗ trợ sự kiện của chúng tôi luôn sẵn sàng đồng hành cùng bạn xử lý mọi tình huống phát sinh.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* FEATURED EVENTS SECTION */}
        <section id="featured-events" className="py-24 bg-event-gray/50 border-t border-b border-event-border">
            <div className="container mx-auto px-6 xl:px-12 max-w-[1440px]">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 fade-up">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-event-red"></div>
                            <span className="text-event-red font-semibold text-sm tracking-wider uppercase">Khám phá</span>
                        </div>
                        <h2 className="text-[36px] lg:text-[42px] font-bold text-event-navy leading-[1.3]">Sự kiện nổi bật</h2>
                        <p className="text-event-text-sec text-[16px] mt-3">Khám phá những sự kiện sắp diễn ra được tổ chức và quản lý bởi nền tảng EventAI.</p>
                    </div>
                    <div className="mt-6 md:mt-0">
                        <a href="#home" className="text-event-navy font-semibold text-[15px] flex items-center gap-2 hover:text-event-red transition-colors group">
                            Xem tất cả sự kiện 
                            <i className="ph ph-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                        </a>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
                    
                    <div className="bg-white rounded-lg border border-event-border overflow-hidden card-hover fade-up">
                        <div className="aspect-video relative overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur text-event-navy text-xs font-bold px-3 py-1 rounded-sm shadow-sm">Công nghệ</div>
                            <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?ixlib=rb-4.0.3&auto=format&fit=crop&w=1112&q=80" alt="AI Technology Summit" className="w-full h-full object-cover image-zoom" />
                        </div>
                        <div className="p-6 flex flex-col h-[220px]">
                            <div className="flex items-center justify-between text-xs font-semibold text-event-text-sec mb-3">
                                <span className="flex items-center gap-1.5"><i className="ph ph-calendar-blank text-event-red text-sm"></i> 24.10.2025</span>
                                <span className="flex items-center gap-1.5"><i className="ph ph-map-pin text-event-red text-sm"></i> Hà Nội</span>
                            </div>
                            <h3 className="text-[18px] font-bold text-event-navy mb-2 line-clamp-2 hover:text-event-red transition-colors cursor-pointer">AI Technology Summit 2025</h3>
                            <p className="text-event-text-sec text-[14px] line-clamp-2 mb-4">Hội nghị công nghệ AI lớn nhất khu vực với sự tham gia của các chuyên gia hàng đầu thế giới.</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-xs font-semibold text-event-navy flex items-center gap-1.5"><i className="ph ph-users text-event-text-sec text-sm"></i> 2,500+</span>
                                <a href="#home" className="btn-secondary px-4 py-1.5 rounded text-sm font-semibold">Đăng ký ngay</a>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-event-border overflow-hidden card-hover fade-up" style={{ transitionDelay: '100ms' }}>
                        <div className="aspect-video relative overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur text-event-navy text-xs font-bold px-3 py-1 rounded-sm shadow-sm">Kinh doanh</div>
                            <img src="https://images.unsplash.com/photo-1544531586-fde5298cdd40?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80" alt="Future Business Conference" className="w-full h-full object-cover image-zoom" />
                        </div>
                        <div className="p-6 flex flex-col h-[220px]">
                            <div className="flex items-center justify-between text-xs font-semibold text-event-text-sec mb-3">
                                <span className="flex items-center gap-1.5"><i className="ph ph-calendar-blank text-event-red text-sm"></i> 12.11.2025</span>
                                <span className="flex items-center gap-1.5"><i className="ph ph-map-pin text-event-red text-sm"></i> TP.HCM</span>
                            </div>
                            <h3 className="text-[18px] font-bold text-event-navy mb-2 line-clamp-2 hover:text-event-red transition-colors cursor-pointer">Future Business Conference</h3>
                            <p className="text-event-text-sec text-[14px] line-clamp-2 mb-4">Định hình tương lai doanh nghiệp với các chiến lược chuyển đổi số toàn diện và bền vững.</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-xs font-semibold text-event-navy flex items-center gap-1.5"><i className="ph ph-users text-event-text-sec text-sm"></i> 1,200+</span>
                                <a href="#home" className="btn-secondary px-4 py-1.5 rounded text-sm font-semibold">Đăng ký ngay</a>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-event-border overflow-hidden card-hover fade-up" style={{ transitionDelay: '200ms' }}>
                        <div className="aspect-video relative overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur text-event-navy text-xs font-bold px-3 py-1 rounded-sm shadow-sm">Triển lãm</div>
                            <img src="https://images.unsplash.com/photo-1531058020387-3be344556be6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80" alt="Innovation Expo 2025" className="w-full h-full object-cover image-zoom" />
                        </div>
                        <div className="p-6 flex flex-col h-[220px]">
                            <div className="flex items-center justify-between text-xs font-semibold text-event-text-sec mb-3">
                                <span className="flex items-center gap-1.5"><i className="ph ph-calendar-blank text-event-red text-sm"></i> 05.12.2025</span>
                                <span className="flex items-center gap-1.5"><i className="ph ph-map-pin text-event-red text-sm"></i> Đà Nẵng</span>
                            </div>
                            <h3 className="text-[18px] font-bold text-event-navy mb-2 line-clamp-2 hover:text-event-red transition-colors cursor-pointer">Innovation Expo 2025</h3>
                            <p className="text-event-text-sec text-[14px] line-clamp-2 mb-4">Trải nghiệm những phát minh và giải pháp sáng tạo mới nhất từ hàng trăm doanh nghiệp.</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-xs font-semibold text-event-navy flex items-center gap-1.5"><i className="ph ph-users text-event-text-sec text-sm"></i> 5,000+</span>
                                <a href="#home" className="btn-secondary px-4 py-1.5 rounded text-sm font-semibold">Đăng ký ngay</a>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-event-border overflow-hidden card-hover fade-up" style={{ transitionDelay: '300ms' }}>
                        <div className="aspect-video relative overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur text-event-navy text-xs font-bold px-3 py-1 rounded-sm shadow-sm">Giải trí</div>
                            <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80" alt="The Horizon Music Night" className="w-full h-full object-cover image-zoom" />
                        </div>
                        <div className="p-6 flex flex-col h-[220px]">
                            <div className="flex items-center justify-between text-xs font-semibold text-event-text-sec mb-3">
                                <span className="flex items-center gap-1.5"><i className="ph ph-calendar-blank text-event-red text-sm"></i> 20.12.2025</span>
                                <span className="flex items-center gap-1.5"><i className="ph ph-map-pin text-event-red text-sm"></i> Hà Nội</span>
                            </div>
                            <h3 className="text-[18px] font-bold text-event-navy mb-2 line-clamp-2 hover:text-event-red transition-colors cursor-pointer">The Horizon Music Night</h3>
                            <p className="text-event-text-sec text-[14px] line-clamp-2 mb-4">Đêm nhạc hoành tráng kết hợp nghệ thuật ánh sáng và âm thanh không gian đa chiều.</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-xs font-semibold text-event-navy flex items-center gap-1.5"><i className="ph ph-users text-event-text-sec text-sm"></i> 10,000+</span>
                                <a href="#home" className="btn-secondary px-4 py-1.5 rounded text-sm font-semibold">Mua vé</a>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>

        {/* AI EVENT CONCIERGE */}
        <section className="py-24 bg-white relative overflow-hidden">
            {/* Background element */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-[#FFF7F8] rounded-l-full -mr-20 z-0"></div>
            
            <div className="container mx-auto px-6 xl:px-12 max-w-[1440px] relative z-10">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
                    
                    <div className="w-full lg:w-1/2 fade-up">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-event-red/10 flex items-center justify-center">
                                <i className="ph ph-robot text-event-red text-xl"></i>
                            </div>
                            <span className="text-event-red font-bold text-sm tracking-wider uppercase">Công nghệ tiên phong</span>
                        </div>
                        <h2 className="text-[36px] lg:text-[46px] font-bold text-event-navy leading-[1.3] mb-6">AI Event Concierge</h2>
                        <p className="text-event-text-sec text-[18px] mb-8 max-w-lg">
                            Trợ lý AI thông minh đồng hành cùng mọi sự kiện. Tự động đề xuất ý tưởng, tương tác và hỗ trợ khách mời, phân tích dữ liệu chuyên sâu để mang lại hiệu suất tối đa.
                        </p>
                        
                        <div className="space-y-6 mb-10">
                            <div className="flex items-start gap-4">
                                <div className="mt-1 w-6 h-6 rounded-full bg-event-red text-white flex items-center justify-center shrink-0 text-sm">
                                    <i className="ph ph-check"></i>
                                </div>
                                <div>
                                    <h4 className="text-[16px] font-bold text-event-navy">Gợi ý sự kiện thông minh</h4>
                                    <p className="text-event-text-sec text-[14px] mt-1">Cá nhân hóa trải nghiệm tham dự dựa trên sở thích và hành vi của khách mời.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="mt-1 w-6 h-6 rounded-full bg-event-red text-white flex items-center justify-center shrink-0 text-sm">
                                    <i className="ph ph-check"></i>
                                </div>
                                <div>
                                    <h4 className="text-[16px] font-bold text-event-navy">Hỗ trợ tự động lên lịch trình</h4>
                                    <p className="text-event-text-sec text-[14px] mt-1">Sắp xếp thời gian, không gian và nguồn lực tối ưu nhất thông qua thuật toán.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="mt-1 w-6 h-6 rounded-full bg-event-red text-white flex items-center justify-center shrink-0 text-sm">
                                    <i className="ph ph-check"></i>
                                </div>
                                <div>
                                    <h4 className="text-[16px] font-bold text-event-navy">Tương tác và hỗ trợ 24/7</h4>
                                    <p className="text-event-text-sec text-[14px] mt-1">Giải đáp tức thì các thắc mắc của khách mời thông qua chatbot đa ngôn ngữ.</p>
                                </div>
                            </div>
                        </div>
                        
                        <a href="#home" className="btn-primary px-8 py-3 rounded-md font-semibold inline-flex items-center gap-2">
                            <i className="ph ph-chat-circle-text text-lg"></i>
                            Trò chuyện với AI
                        </a>
                    </div>
                    
                    <div className="w-full lg:w-1/2 fade-up" style={{ transitionDelay: '200ms' }}>
                        <div className="bg-[#FFF7F8] border border-event-red/10 rounded-2xl p-6 lg:p-8 shadow-ai relative max-w-lg mx-auto">
                            {/* Chat Interface Mockup */}
                            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-event-red/10">
                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-event-border">
                                    <i className="ph ph-robot text-event-red text-2xl"></i>
                                </div>
                                <div>
                                    <h4 className="font-bold text-event-navy">EventAI Assistant</h4>
                                    <p className="text-xs text-event-text-sec flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Trực tuyến
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-5 mb-8">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-event-red text-white flex flex-shrink-0 items-center justify-center text-sm shadow-sm mt-1"><i className="ph ph-robot"></i></div>
                                    <div className="bg-white border border-event-border rounded-2xl rounded-tl-none p-4 shadow-sm">
                                        <p className="text-[14px] text-event-navy leading-relaxed">Xin chào! Tôi là Trợ lý AI của EventAI. Bạn đang muốn tổ chức hội nghị công nghệ vào tháng tới. Dựa trên quy mô 500 người, tôi đề xuất 3 địa điểm tốt nhất sau đây:</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-event-navy text-white flex flex-shrink-0 items-center justify-center text-sm shadow-sm mt-1"><i className="ph ph-user"></i></div>
                                    <div className="bg-event-navy text-white rounded-2xl rounded-tr-none p-4 shadow-sm">
                                        <p className="text-[14px] leading-relaxed">Tuyệt vời. Hãy tạo cho tôi một bản nháp lịch trình chi tiết trong 2 ngày nhé.</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-event-red text-white flex flex-shrink-0 items-center justify-center text-sm shadow-sm mt-1"><i className="ph ph-robot"></i></div>
                                    <div className="bg-white border border-event-border rounded-2xl rounded-tl-none p-4 shadow-sm w-full">
                                        <p className="text-[14px] text-event-navy leading-relaxed mb-3">Đã xong! Tôi đã tạo lịch trình mẫu. Bạn có thể xem và tùy chỉnh tại đây:</p>
                                        <div className="border border-event-border rounded-lg p-3 bg-event-gray flex items-center justify-between cursor-pointer hover:bg-event-border/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <i className="ph ph-file-text text-event-red text-xl"></i>
                                                <div>
                                                    <div className="text-xs font-bold text-event-navy">Lịch trình AI Tech 2025</div>
                                                    <div className="text-[10px] text-event-text-sec">Tạo cách đây 1 phút</div>
                                                </div>
                                            </div>
                                            <i className="ph ph-arrow-right text-event-text-sec"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <input type="text" placeholder="Nhập yêu cầu của bạn..." className="w-full bg-white border border-event-border rounded-full py-3 pl-5 pr-12 text-sm text-event-navy outline-none focus:border-event-red/50 shadow-sm" />
                                <button className="absolute right-2 top-1.5 w-8 h-8 bg-event-red text-white rounded-full flex items-center justify-center hover:bg-event-dark-red transition-colors">
                                    <i className="ph ph-paper-plane-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </section>

        {/* SERVICES SECTION */}
        <section id="services" className="py-24 bg-event-gray/30 border-t border-event-border">
            <div className="container mx-auto px-6 xl:px-12 max-w-[1440px]">
                
                <div className="text-center mb-16 fade-up">
                    <h2 className="text-[36px] lg:text-[42px] font-bold text-event-navy mb-4">Dịch vụ</h2>
                    <p className="text-event-text-sec text-[16px] max-w-2xl mx-auto">Giải pháp toàn diện và chuyên nghiệp cho mọi loại hình sự kiện, từ quy mô nhỏ đến các siêu sự kiện quốc tế.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8">
                    
                    <div className="group cursor-pointer fade-up">
                        <div className="flex items-end gap-4 mb-4 pb-4 border-b border-event-border group-hover:border-event-red transition-colors">
                            <span className="text-3xl font-extrabold text-event-text-sec/20 group-hover:text-event-red transition-colors">01</span>
                            <h3 className="text-[20px] font-bold text-event-navy">Tư vấn & Lên ý tưởng</h3>
                        </div>
                        <p className="text-event-text-sec text-[15px] mb-4 h-[72px]">Xây dựng concept sáng tạo, độc đáo và định hướng chiến lược sự kiện phù hợp với mục tiêu thương hiệu của bạn.</p>
                        <a href="#home" className="text-event-red font-semibold text-[14px] flex items-center gap-1 group-hover:gap-2 transition-all">Khám phá <i className="ph ph-arrow-right"></i></a>
                    </div>
                    
                    <div className="group cursor-pointer fade-up" style={{ transitionDelay: '100ms' }}>
                        <div className="flex items-end gap-4 mb-4 pb-4 border-b border-event-border group-hover:border-event-red transition-colors">
                            <span className="text-3xl font-extrabold text-event-text-sec/20 group-hover:text-event-red transition-colors">02</span>
                            <h3 className="text-[20px] font-bold text-event-navy">Thiết kế & Dàn dựng</h3>
                        </div>
                        <p className="text-event-text-sec text-[15px] mb-4 h-[72px]">Thiết kế sân khấu, không gian 3D, hệ thống âm thanh ánh sáng chuyên nghiệp và thi công hạng mục chất lượng cao.</p>
                        <a href="#home" className="text-event-red font-semibold text-[14px] flex items-center gap-1 group-hover:gap-2 transition-all">Khám phá <i className="ph ph-arrow-right"></i></a>
                    </div>
                    
                    <div className="group cursor-pointer fade-up" style={{ transitionDelay: '200ms' }}>
                        <div className="flex items-end gap-4 mb-4 pb-4 border-b border-event-border group-hover:border-event-red transition-colors">
                            <span className="text-3xl font-extrabold text-event-text-sec/20 group-hover:text-event-red transition-colors">03</span>
                            <h3 className="text-[20px] font-bold text-event-navy">Truyền thông & Marketing</h3>
                        </div>
                        <p className="text-event-text-sec text-[15px] mb-4 h-[72px]">Quảng bá đa kênh, thu hút đối tượng mục tiêu và tạo độ lan tỏa mạnh mẽ trước, trong và sau sự kiện.</p>
                        <a href="#home" className="text-event-red font-semibold text-[14px] flex items-center gap-1 group-hover:gap-2 transition-all">Khám phá <i className="ph ph-arrow-right"></i></a>
                    </div>
                    
                    <div className="group cursor-pointer fade-up" style={{ transitionDelay: '300ms' }}>
                        <div className="flex items-end gap-4 mb-4 pb-4 border-b border-event-border group-hover:border-event-red transition-colors">
                            <span className="text-3xl font-extrabold text-event-text-sec/20 group-hover:text-event-red transition-colors">04</span>
                            <h3 className="text-[20px] font-bold text-event-navy">Quản lý Đăng ký & Khách mời</h3>
                        </div>
                        <p className="text-event-text-sec text-[15px] mb-4 h-[72px]">Hệ thống check-in thông minh, quản lý danh sách khách mời, gửi thiệp mời tự động và cá nhân hóa trải nghiệm.</p>
                        <a href="#home" className="text-event-red font-semibold text-[14px] flex items-center gap-1 group-hover:gap-2 transition-all">Khám phá <i className="ph ph-arrow-right"></i></a>
                    </div>
                    
                    <div className="group cursor-pointer fade-up" style={{ transitionDelay: '400ms' }}>
                        <div className="flex items-end gap-4 mb-4 pb-4 border-b border-event-border group-hover:border-event-red transition-colors">
                            <span className="text-3xl font-extrabold text-event-text-sec/20 group-hover:text-event-red transition-colors">05</span>
                            <h3 className="text-[20px] font-bold text-event-navy">Vận hành Sự kiện</h3>
                        </div>
                        <p className="text-event-text-sec text-[15px] mb-4 h-[72px]">Đội ngũ điều phối chuyên nghiệp, quản lý rủi ro, đảm bảo mọi hoạt động diễn ra suôn sẻ theo đúng timeline.</p>
                        <a href="#home" className="text-event-red font-semibold text-[14px] flex items-center gap-1 group-hover:gap-2 transition-all">Khám phá <i className="ph ph-arrow-right"></i></a>
                    </div>
                    
                    <div className="group cursor-pointer fade-up" style={{ transitionDelay: '500ms' }}>
                        <div className="flex items-end gap-4 mb-4 pb-4 border-b border-event-border group-hover:border-event-red transition-colors">
                            <span className="text-3xl font-extrabold text-event-text-sec/20 group-hover:text-event-red transition-colors">06</span>
                            <h3 className="text-[20px] font-bold text-event-navy">Báo cáo & Phân tích AI</h3>
                        </div>
                        <p className="text-event-text-sec text-[15px] mb-4 h-[72px]">Đánh giá hiệu quả (ROI), phân tích dữ liệu hành vi và đề xuất các giải pháp cải thiện cho các sự kiện tương lai.</p>
                        <a href="#home" className="text-event-red font-semibold text-[14px] flex items-center gap-1 group-hover:gap-2 transition-all">Khám phá <i className="ph ph-arrow-right"></i></a>
                    </div>
                    
                </div>
            </div>
        </section>

        {/* FEATURES (RED SECTION) */}
        <section id="features" className="py-24 relative overflow-hidden bg-event-dark-red">
            {/* Background Image overlay */}
            <div className="absolute inset-0 opacity-10">
                <img src="https://images.unsplash.com/photo-1551818255-e6e10975bc17?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Event Background" className="w-full h-full object-cover mix-blend-overlay" />
            </div>
            {/* Geometric accents */}
            <div className="absolute w-[600px] h-[600px] bg-white opacity-5 transform rotate-45 -right-[200px] -top-[300px]"></div>
            <div className="absolute w-[400px] h-[400px] bg-event-red transform -rotate-12 -left-[100px] -bottom-[200px]"></div>
            
            <div className="container mx-auto px-6 xl:px-12 max-w-[1440px] relative z-10">
                
                <div className="text-center mb-16 fade-up">
                    <h2 className="text-[36px] lg:text-[46px] font-bold text-white mb-4 uppercase tracking-wider">CÔNG NGHỆ KIẾN TẠO TƯƠNG LAI SỰ KIỆN</h2>
                    <div className="w-20 h-1 bg-white mx-auto mt-6"></div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-center text-white">
                    
                    <div className="fade-up" style={{ transitionDelay: '100ms' }}>
                        <div className="w-16 h-16 mx-auto rounded-full border border-white/30 flex items-center justify-center text-3xl mb-4 hover:bg-white hover:text-event-dark-red transition-all cursor-pointer">
                            <i className="ph ph-calendar-check"></i>
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">QUẢN LÝ SỰ KIỆN</h4>
                    </div>
                    
                    <div className="fade-up" style={{ transitionDelay: '200ms' }}>
                        <div className="w-16 h-16 mx-auto rounded-full border border-white/30 flex items-center justify-center text-3xl mb-4 hover:bg-white hover:text-event-dark-red transition-all cursor-pointer">
                            <i className="ph ph-users-three"></i>
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">QUẢN LÝ KHÁCH MỜI</h4>
                    </div>
                    
                    <div className="fade-up" style={{ transitionDelay: '300ms' }}>
                        <div className="w-16 h-16 mx-auto rounded-full border border-white/30 flex items-center justify-center text-3xl mb-4 hover:bg-white hover:text-event-dark-red transition-all cursor-pointer">
                            <i className="ph ph-qr-code"></i>
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">QR CHECK-IN</h4>
                    </div>
                    
                    <div className="fade-up" style={{ transitionDelay: '400ms' }}>
                        <div className="w-16 h-16 mx-auto rounded-full border border-white/30 flex items-center justify-center text-3xl mb-4 hover:bg-white hover:text-event-dark-red transition-all cursor-pointer">
                            <i className="ph ph-brain"></i>
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">AI ANALYTICS</h4>
                    </div>
                    
                    <div className="fade-up" style={{ transitionDelay: '500ms' }}>
                        <div className="w-16 h-16 mx-auto rounded-full border border-white/30 flex items-center justify-center text-3xl mb-4 hover:bg-white hover:text-event-dark-red transition-all cursor-pointer">
                            <i className="ph ph-pulse"></i>
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">REAL-TIME MONITORING</h4>
                    </div>
                    
                    <div className="fade-up" style={{ transitionDelay: '600ms' }}>
                        <div className="w-16 h-16 mx-auto rounded-full border border-white/30 flex items-center justify-center text-3xl mb-4 hover:bg-white hover:text-event-dark-red transition-all cursor-pointer">
                            <i className="ph ph-shield-check"></i>
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">DATA SECURITY</h4>
                    </div>
                    
                </div>
            </div>
        </section>

        {/* ABOUT US */}
        <section id="about" className="py-24 bg-white">
            <div className="container mx-auto px-6 xl:px-12 max-w-[1440px]">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    
                    <div className="w-full lg:w-1/2 relative fade-up">
                        <div className="aspect-video rounded-lg overflow-hidden shadow-2xl relative z-10">
                            <video 
                                className="w-full h-full object-cover" 
                                controls
                                src="/assets/YTSave_YouTube_SON-TUNG-MTP-RA-MAT-DAI-SU-THUONG-HIEU_Media_PGQj28VZobE_001_1080p.mp4"
                            >
                                Trình duyệt của bạn không hỗ trợ thẻ video.
                            </video>
                        </div>
                        <div className="mt-3 relative z-10">
                            <p className="text-[13px] text-event-text-sec italic font-medium">
                                Nguồn: SƠN TÙNG MTP RA MẮT ĐẠI SỨ THƯƠNG HIỆU - MSPACE MEDIA
                            </p>
                        </div>
                        <div className="absolute -bottom-8 -right-8 w-2/3 h-2/3 bg-event-red/5 rounded-lg z-0 hidden lg:block"></div>
                    </div>
                    
                    <div className="w-full lg:w-1/2 fade-up" style={{ transitionDelay: '200ms' }}>
                        <h3 className="text-event-red font-bold uppercase tracking-wider text-sm mb-4">Về EventAI</h3>
                        <h2 className="text-[32px] lg:text-[40px] font-bold text-event-navy leading-[1.3] mb-6">Công nghệ thay đổi cách sự kiện được kiến tạo.</h2>
                        <p className="text-event-text-sec text-[16px] leading-relaxed mb-8">
                            EventAI là nền tảng quản lý sự kiện thông minh được thiết kế để đơn giản hóa quá trình lập kế hoạch, vận hành, quản lý khách mời, tạo nội dung và phân tích hiệu suất. Chúng tôi tin rằng công nghệ không chỉ tối ưu hóa quy trình, mà còn giải phóng sự sáng tạo để con người có thể tập trung vào việc mang lại những trải nghiệm cảm xúc và kết nối chân thực nhất.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-6 mb-10">
                            <div>
                                <div className="text-[32px] font-bold text-event-navy mb-1">3+</div>
                                <div className="text-[13px] text-event-text-sec uppercase font-semibold">Năm Đổi mới</div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-event-navy mb-1">1,200+</div>
                                <div className="text-[13px] text-event-text-sec uppercase font-semibold">Sự kiện thành công</div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-event-navy mb-1">500+</div>
                                <div className="text-[13px] text-event-text-sec uppercase font-semibold">Đối tác chiến lược</div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-event-navy mb-1">100K+</div>
                                <div className="text-[13px] text-event-text-sec uppercase font-semibold">Người tham dự</div>
                            </div>
                        </div>
                        
                        <a href="#home" className="btn-primary px-8 py-3 rounded-md font-semibold inline-flex items-center gap-2">
                            Tìm hiểu thêm <i className="ph ph-arrow-right"></i>
                        </a>
                    </div>
                    
                </div>
            </div>
        </section>

        {/* CUSTOMER REVIEWS */}
        <section id="reviews" className="py-24 bg-event-gray/50 border-t border-event-border">
            <div className="container mx-auto px-6 xl:px-12 max-w-[1440px]">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 fade-up">
                    <div className="max-w-2xl">
                        <h2 className="text-[36px] lg:text-[42px] font-bold text-event-navy mb-4">Đánh giá khách hàng</h2>
                        <p className="text-event-text-sec text-[16px]">Khám phá lý do tại sao hàng trăm doanh nghiệp tin tưởng lựa chọn EventAI cho các sự kiện quan trọng của họ.</p>
                    </div>
                    <div className="mt-6 md:mt-0 text-right">
                        <div className="flex items-center gap-2 text-2xl text-yellow-400 justify-end mb-1">
                            <i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star-half fill"></i>
                        </div>
                        <div className="font-bold text-event-navy text-xl">4.9 / 5</div>
                        <div className="text-sm text-event-text-sec">Dựa trên 500+ đánh giá</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    <div className="bg-white p-8 rounded-lg shadow-sm border border-event-border card-hover fade-up">
                        <div className="text-yellow-400 flex gap-1 text-sm mb-6">
                            <i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i>
                        </div>
                        <p className="text-event-text-sec text-[15px] italic mb-8 flex-1 leading-relaxed">
                            "EventAI đã giúp chúng tôi tổ chức thành công hội nghị cấp cao với 2000 khách mời. Hệ thống QR check-in siêu tốc và phân tích dữ liệu AI thực sự là một bước đột phá."
                        </p>
                        <div className="flex items-center gap-4 mt-auto">
                            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                            <div>
                                <h4 className="font-bold text-event-navy text-[15px]">Nguyễn Phương Thảo</h4>
                                <p className="text-event-text-sec text-xs">Giám đốc Marketing, TechCorp</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-lg shadow-sm border border-event-border card-hover fade-up" style={{ transitionDelay: '100ms' }}>
                        <div className="text-yellow-400 flex gap-1 text-sm mb-6">
                            <i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i>
                        </div>
                        <p className="text-event-text-sec text-[15px] italic mb-8 flex-1 leading-relaxed">
                            "Giao diện trực quan, dễ sử dụng. Trợ lý AI Event Concierge đã hỗ trợ cực kỳ đắc lực trong việc phản hồi thắc mắc của hàng ngàn khách tham dự cùng lúc."
                        </p>
                        <div className="flex items-center gap-4 mt-auto">
                            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                            <div>
                                <h4 className="font-bold text-event-navy text-[15px]">Trần Văn Hùng</h4>
                                <p className="text-event-text-sec text-xs">Trưởng ban Tổ chức, Global Expo</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-lg shadow-sm border border-event-border card-hover fade-up" style={{ transitionDelay: '200ms' }}>
                        <div className="text-yellow-400 flex gap-1 text-sm mb-6">
                            <i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i>
                        </div>
                        <p className="text-event-text-sec text-[15px] italic mb-8 flex-1 leading-relaxed">
                            "Tính năng quản lý ngân sách và báo cáo thời gian thực giúp tôi kiểm soát hoàn toàn sự kiện. Khách hàng của chúng tôi rất ấn tượng với sự chuyên nghiệp này."
                        </p>
                        <div className="flex items-center gap-4 mt-auto">
                            <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                            <div>
                                <h4 className="font-bold text-event-navy text-[15px]">Lê Mai Anh</h4>
                                <p className="text-event-text-sec text-xs">CEO, Apex Events</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-lg shadow-sm border border-event-border card-hover fade-up" style={{ transitionDelay: '300ms' }}>
                        <div className="text-yellow-400 flex gap-1 text-sm mb-6">
                            <i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star fill"></i><i className="ph ph-star-half fill"></i>
                        </div>
                        <p className="text-event-text-sec text-[15px] italic mb-8 flex-1 leading-relaxed">
                            "Công nghệ AI thực sự tạo nên sự khác biệt. Giúp chúng tôi tối ưu chi phí, nâng cao trải nghiệm khách tham dự và đem lại một sự kiện hoàn hảo chưa từng có."
                        </p>
                        <div className="flex items-center gap-4 mt-auto">
                            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                            <div>
                                <h4 className="font-bold text-event-navy text-[15px]">Phạm Quang Duy</h4>
                                <p className="text-event-text-sec text-xs">Cofounder, FutureTech VN</p>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </section>

        {/* NEWS SECTION */}
        <section id="news" className="py-24 bg-white border-t border-event-border">
            <div className="container mx-auto px-6 xl:px-12 max-w-[1440px]">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 fade-up">
                    <div className="max-w-2xl">
                        <h2 className="text-[36px] lg:text-[42px] font-bold text-event-navy mb-4">Tin tức & Bài viết</h2>
                        <p className="text-event-text-sec text-[16px]">Cập nhật xu hướng, kiến thức công nghệ và những câu chuyện truyền cảm hứng trong ngành tổ chức sự kiện.</p>
                    </div>
                    <div className="mt-6 md:mt-0">
                        <a href="#home" className="text-event-navy font-semibold text-[15px] flex items-center gap-2 hover:text-event-red transition-colors">
                            Xem tất cả bài viết 
                            <i className="ph ph-arrow-right"></i>
                        </a>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    
                    <div className="group cursor-pointer fade-up">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden mb-5">
                            <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="flex gap-4 text-xs font-semibold text-event-text-sec mb-3">
                            <span className="text-event-red">Công nghệ</span>
                            <span>28.09.2025</span>
                        </div>
                        <h3 className="text-[18px] font-bold text-event-navy mb-3 group-hover:text-event-red transition-colors line-clamp-2">Xu hướng công nghệ sự kiện 2026: AI và trải nghiệm cá nhân hóa</h3>
                        <p className="text-event-text-sec text-[14px] line-clamp-2 mb-4">Khám phá cách AI đang định hình lại ngành tổ chức sự kiện trong thập kỷ mới.</p>
                        <div className="flex items-center gap-2 text-xs font-semibold text-event-navy">
                            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&w=30&h=30&fit=crop" className="w-6 h-6 rounded-full" alt="Author" />
                            Nguyễn Thị Mai
                        </div>
                    </div>

                    <div className="group cursor-pointer fade-up" style={{ transitionDelay: '100ms' }}>
                        <div className="aspect-[4/3] rounded-lg overflow-hidden mb-5">
                            <img src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="flex gap-4 text-xs font-semibold text-event-text-sec mb-3">
                            <span className="text-event-red">Sự kiện</span>
                            <span>25.09.2025</span>
                        </div>
                        <h3 className="text-[18px] font-bold text-event-navy mb-3 group-hover:text-event-red transition-colors line-clamp-2">Tổ chức sự kiện xanh – Xu hướng tất yếu của tương lai</h3>
                        <p className="text-event-text-sec text-[14px] line-clamp-2 mb-4">Các giải pháp bền vững và cách giảm thiểu tác động môi trường khi tổ chức sự kiện quy mô lớn.</p>
                        <div className="flex items-center gap-2 text-xs font-semibold text-event-navy">
                            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&w=30&h=30&fit=crop" className="w-6 h-6 rounded-full" alt="Author" />
                            Đào Văn Hùng
                        </div>
                    </div>

                    <div className="group cursor-pointer fade-up" style={{ transitionDelay: '200ms' }}>
                        <div className="aspect-[4/3] rounded-lg overflow-hidden mb-5">
                            <img src="https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="flex gap-4 text-xs font-semibold text-event-text-sec mb-3">
                            <span className="text-event-red">Kinh doanh</span>
                            <span>15.09.2025</span>
                        </div>
                        <h3 className="text-[18px] font-bold text-event-navy mb-3 group-hover:text-event-red transition-colors line-clamp-2">5 bước xây dựng kịch bản sự kiện chuyên nghiệp và thu hút</h3>
                        <p className="text-event-text-sec text-[14px] line-clamp-2 mb-4">Bí quyết từ các chuyên gia để tạo nên một kịch bản mượt mà, ấn tượng và không thể rời mắt.</p>
                        <div className="flex items-center gap-2 text-xs font-semibold text-event-navy">
                            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=30&h=30&fit=crop" className="w-6 h-6 rounded-full" alt="Author" />
                            Phạm Quang Duy
                        </div>
                    </div>

                    <div className="group cursor-pointer fade-up" style={{ transitionDelay: '300ms' }}>
                        <div className="aspect-[4/3] rounded-lg overflow-hidden mb-5">
                            <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="flex gap-4 text-xs font-semibold text-event-text-sec mb-3">
                            <span className="text-event-red">Tin tức</span>
                            <span>10.09.2025</span>
                        </div>
                        <h3 className="text-[18px] font-bold text-event-navy mb-3 group-hover:text-event-red transition-colors line-clamp-2">EventAI chính thức ra mắt phiên bản 2.0 với nhiều tính năng đột phá</h3>
                        <p className="text-event-text-sec text-[14px] line-clamp-2 mb-4">Tìm hiểu về những nâng cấp mới nhất giúp nền tảng EventAI trở nên mạnh mẽ hơn bao giờ hết.</p>
                        <div className="flex items-center gap-2 text-xs font-semibold text-event-navy">
                            <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&w=30&h=30&fit=crop" className="w-6 h-6 rounded-full" alt="Author" />
                            Lê Mai Anh
                        </div>
                    </div>

                </div>
            </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-24 bg-event-dark-red relative overflow-hidden text-center text-white">
            <div className="absolute inset-0 opacity-10">
                <img src="https://images.unsplash.com/photo-1551818255-e6e10975bc17?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Background" className="w-full h-full object-cover mix-blend-overlay" />
            </div>
            
            <div className="container mx-auto px-6 max-w-4xl relative z-10 fade-up">
                <h2 className="text-[36px] sm:text-[46px] lg:text-[56px] font-extrabold leading-[1.3] mb-6">SẴN SÀNG TẠO NÊN MỘT SỰ KIỆN KHÁC BIỆT?</h2>
                <p className="text-[18px] text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                    Hãy để EventAI giúp bạn chuyển hóa ý tưởng thành một sự kiện đẳng cấp, chuyên nghiệp và mang lại trải nghiệm không thể quên.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a href="#home" className="w-full sm:w-auto bg-white text-event-red font-bold px-8 py-4 rounded-md hover:bg-event-light-red transition-colors text-[15px]">
                        Bắt đầu ngay
                    </a>
                    <a href="#contact" className="w-full sm:w-auto bg-transparent border-2 border-white text-white font-bold px-8 py-4 rounded-md hover:bg-white/10 transition-colors text-[15px]">
                        Liên hệ tư vấn
                    </a>
                </div>
            </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="py-24 bg-event-gray/30">
            <div className="container mx-auto px-6 xl:px-12 max-w-[1440px]">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    
                    <div className="fade-up">
                        <div className="inline-block px-3 py-1 bg-event-red/10 text-event-red text-xs font-bold tracking-wider rounded-sm mb-4 uppercase">Hỗ trợ 24/7</div>
                        <h2 className="text-[36px] lg:text-[42px] font-bold text-event-navy mb-6">Liên hệ với chúng tôi</h2>
                        <p className="text-event-text-sec text-[16px] mb-10 max-w-lg">
                            Đội ngũ chuyên gia của EventAI luôn sẵn sàng lắng nghe và cung cấp giải pháp tối ưu nhất cho sự kiện sắp tới của bạn.
                        </p>
                        
                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white border border-event-border rounded-full flex items-center justify-center text-event-red text-xl shrink-0">
                                    <i className="ph ph-map-pin"></i>
                                </div>
                                <div>
                                    <h4 className="font-bold text-event-navy text-[16px]">Văn phòng chính</h4>
                                    <p className="text-event-text-sec text-[15px] mt-1">Tòa nhà TechTower, 123 Đường Tôn Dật Tiên, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white border border-event-border rounded-full flex items-center justify-center text-event-red text-xl shrink-0">
                                    <i className="ph ph-phone"></i>
                                </div>
                                <div>
                                    <h4 className="font-bold text-event-navy text-[16px]">Điện thoại</h4>
                                    <p className="text-event-text-sec text-[15px] mt-1">1900 1234 5678 (Hotline)<br />+84 28 3456 7890 (Office)</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white border border-event-border rounded-full flex items-center justify-center text-event-red text-xl shrink-0">
                                    <i className="ph ph-envelope"></i>
                                </div>
                                <div>
                                    <h4 className="font-bold text-event-navy text-[16px]">Email</h4>
                                    <p className="text-event-text-sec text-[15px] mt-1">hello@eventai.vn<br />support@eventai.vn</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-12 pt-8 border-t border-event-border flex items-center gap-4">
                            <span className="font-bold text-event-navy text-[15px]">Kết nối:</span>
                            <a href="#home" className="w-10 h-10 bg-white border border-event-border rounded-full flex items-center justify-center text-event-text-sec hover:text-event-red hover:border-event-red transition-all"><i className="ph ph-facebook-logo text-lg"></i></a>
                            <a href="#home" className="w-10 h-10 bg-white border border-event-border rounded-full flex items-center justify-center text-event-text-sec hover:text-event-red hover:border-event-red transition-all"><i className="ph ph-linkedin-logo text-lg"></i></a>
                            <a href="#home" className="w-10 h-10 bg-white border border-event-border rounded-full flex items-center justify-center text-event-text-sec hover:text-event-red hover:border-event-red transition-all"><i className="ph ph-instagram-logo text-lg"></i></a>
                            <a href="#home" className="w-10 h-10 bg-white border border-event-border rounded-full flex items-center justify-center text-event-text-sec hover:text-event-red hover:border-event-red transition-all"><i className="ph ph-youtube-logo text-lg"></i></a>
                        </div>
                    </div>
                    
                    <div className="bg-white p-8 lg:p-10 rounded-2xl shadow-premium border border-event-border fade-up" style={{ transitionDelay: '200ms' }}>
                        <h3 className="text-[24px] font-bold text-event-navy mb-6">Gửi yêu cầu tư vấn</h3>
                        <form className="space-y-5" onsubmit="event.preventDefault(); alert('Cảm ơn bạn! Yêu cầu đã được gửi thành công.');">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-event-navy mb-2">Họ và tên *</label>
                                    <input type="text" required className="w-full border border-event-border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-event-red focus:ring-1 focus:ring-event-red transition-all bg-event-gray/30 placeholder-event-text-sec/50" placeholder="Nhập họ và tên" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-event-navy mb-2">Số điện thoại *</label>
                                    <input type="tel" required className="w-full border border-event-border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-event-red focus:ring-1 focus:ring-event-red transition-all bg-event-gray/30 placeholder-event-text-sec/50" placeholder="Nhập số điện thoại" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-event-navy mb-2">Email *</label>
                                <input type="email" required className="w-full border border-event-border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-event-red focus:ring-1 focus:ring-event-red transition-all bg-event-gray/30 placeholder-event-text-sec/50" placeholder="Địa chỉ email của bạn" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-event-navy mb-2">Chủ đề</label>
                                <select className="w-full border border-event-border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-event-red focus:ring-1 focus:ring-event-red transition-all bg-event-gray/30">
                                    <option>Tư vấn tổ chức sự kiện</option>
                                    <option>Báo giá dịch vụ nền tảng</option>
                                    <option>Hỗ trợ kỹ thuật</option>
                                    <option>Khác</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-event-navy mb-2">Nội dung chi tiết *</label>
                                <textarea rows="4" required className="w-full border border-event-border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-event-red focus:ring-1 focus:ring-event-red transition-all bg-event-gray/30 placeholder-event-text-sec/50" placeholder="Hãy mô tả ngắn gọn về sự kiện hoặc yêu cầu của bạn..."></textarea>
                            </div>
                            
                            <button type="submit" className="w-full btn-primary font-bold py-4 rounded-md mt-2 flex items-center justify-center gap-2 text-[15px]">
                                Gửi yêu cầu <i className="ph ph-arrow-right"></i>
                            </button>
                        </form>
                    </div>
                    
                </div>
            </div>
        </section>

    </main>

    {/* FOOTER */}
    <footer className="bg-event-navy text-white pt-20 pb-8 border-t-4 border-event-red">
        <div className="container mx-auto px-6 xl:px-12 max-w-[1440px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
                
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 flex justify-center items-center">
                            <div className="w-6 h-6 bg-event-red rotate-45 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 bg-event-navy -rotate-45"></div>
                            </div>
                        </div>
                        <span className="text-2xl font-bold ml-2 tracking-tight">
                            <span className="text-white">Event</span><span className="text-event-red">AI</span>
                        </span>
                    </div>
                    <p className="text-event-text-sec text-[15px] mb-8 max-w-sm leading-relaxed">
                        Nền tảng quản lý sự kiện AI hàng đầu. Tích hợp mọi công cụ bạn cần để kiến tạo những trải nghiệm đẳng cấp và tối ưu hóa hiệu suất đầu tư.
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="h-px w-8 bg-event-text-sec/50"></div>
                        <span className="text-[10px] font-bold text-event-text-sec tracking-[0.2em] uppercase">
                            CONNECT · CREATE · INSPIRE
                        </span>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-bold text-[16px] mb-6 uppercase tracking-wider text-white">EventAI</h4>
                    <ul className="space-y-4 text-[14px] text-event-text-sec font-medium">
                        <li><a href="#about" className="hover:text-event-red transition-colors">Về chúng tôi</a></li>
                        <li><a href="#services" className="hover:text-event-red transition-colors">Dịch vụ</a></li>
                        <li><a href="#features" className="hover:text-event-red transition-colors">Tính năng AI</a></li>
                        <li><a href="#reviews" className="hover:text-event-red transition-colors">Khách hàng</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-bold text-[16px] mb-6 uppercase tracking-wider text-white">Sự kiện</h4>
                    <ul className="space-y-4 text-[14px] text-event-text-sec font-medium">
                        <li><a href="#featured-events" className="hover:text-event-red transition-colors">Sự kiện nổi bật</a></li>
                        <li><a href="#home" className="hover:text-event-red transition-colors">Sự kiện sắp diễn ra</a></li>
                        <li><a href="#home" className="hover:text-event-red transition-colors">Hội thảo công nghệ</a></li>
                        <li><a href="#home" className="hover:text-event-red transition-colors">Triển lãm & Expo</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-bold text-[16px] mb-6 uppercase tracking-wider text-white">Hỗ trợ</h4>
                    <ul className="space-y-4 text-[14px] text-event-text-sec font-medium">
                        <li><a href="#contact" className="hover:text-event-red transition-colors">Liên hệ</a></li>
                        <li><a href="#home" className="hover:text-event-red transition-colors">Trung tâm trợ giúp</a></li>
                        <li><a href="#home" className="hover:text-event-red transition-colors">Chính sách bảo mật</a></li>
                        <li><a href="#home" className="hover:text-event-red transition-colors">Điều khoản dịch vụ</a></li>
                    </ul>
                </div>
                
            </div>
            
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-event-text-sec text-[13px]">
                    &copy; 2025 EventAI. Tất cả quyền được bảo lưu.
                </p>
                <div className="flex items-center gap-6 text-[13px] text-event-text-sec font-medium">
                    <a href="#home" className="hover:text-white transition-colors">Quy định</a>
                    <a href="#home" className="hover:text-white transition-colors">Cookies</a>
                    <div className="flex items-center gap-3">
                        <i className="ph ph-globe text-lg"></i>
                        <span>Tiếng Việt (VN)</span>
                    </div>
                </div>
            </div>
        </div>
    </footer>

    {/* Interactive Scripts */}
    
    </div>
  );
};

export { LandingPage };
