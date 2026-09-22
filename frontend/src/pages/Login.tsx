import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight,
  Home, Calendar, Users, Cpu, CheckSquare, Square
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const BG_IMG = "/assets/backgroud_login.webp";

const GoogleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/>
    <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/>
    <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/>
    <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/>
  </svg>
);

type AuthMode = "login" | "register";
interface FormState { fullName: string; email: string; password: string; confirmPassword: string; }

interface InputFieldProps {
  icon: React.FC<{ className?: string }>;
  name: keyof FormState;
  type?: string;
  placeholder: string;
  form: FormState;
  errors: Record<string, string>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rightIcon?: React.FC<{ className?: string }>;
  onRightIconClick?: () => void;
}

const InputField: React.FC<InputFieldProps> = ({
  icon: Icon, name, type = "text", placeholder,
  form, errors, onChange, rightIcon: RightIcon, onRightIconClick
}) => (
  <div className="mb-3">
    <div className={`flex items-center bg-white border rounded-xl px-4 h-[54px] transition-all ${
      errors[name] ? "border-red-400" : "border-gray-200 focus-within:border-[#D7193F] focus-within:shadow-sm focus-within:shadow-red-50"
    }`}>
      <Icon className="w-[18px] h-[18px] text-gray-400 shrink-0 mr-3" />
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={form[name]}
        onChange={onChange}
        className="flex-1 bg-transparent outline-none text-[14px] text-gray-800 placeholder-gray-400"
        autoComplete="off"
      />
      {RightIcon && onRightIconClick && (
        <button type="button" onClick={onRightIconClick} className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
          <RightIcon className="w-[18px] h-[18px]" />
        </button>
      )}
    </div>
    {errors[name] && <p className="text-[11px] text-red-500 mt-1 ml-1">{errors[name]}</p>}
  </div>
);

const SocialBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick} type="button"
    className="flex items-center justify-center gap-2 h-[44px] bg-white border border-gray-200 rounded-xl text-[13px] font-semibold text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all"
  >
    {children}
  </button>
);

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register: registerUser, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "register" ? "register" : "login"
  );
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    fullName: "", email: "", password: "", confirmPassword: ""
  });

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setMode(searchParams.get("mode") === "register" ? "register" : "login");
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = "Vui lòng nhập email hoặc số điện thoại";
    if (!form.password) errs.password = "Vui lòng nhập mật khẩu";
    if (mode === "register") {
      if (!form.fullName.trim()) errs.fullName = "Vui lòng nhập họ và tên";
      if (form.password.length < 6) errs.password = "Mật khẩu phải có ít nhất 6 ký tự";
      if (form.password !== form.confirmPassword) errs.confirmPassword = "Mật khẩu xác nhận không khớp";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(form.email.trim(), form.password);
        toast.success("Đăng nhập thành công!");
        navigate("/dashboard", { replace: true });
      } else {
        await registerUser(form.fullName.trim(), form.email.trim(), form.password);
        toast.success("Đăng ký thành công! Chào mừng đến với EventAI.");
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || (mode === "login" ? "Email hoặc mật khẩu không đúng" : "Đăng ký thất bại"));
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setErrors({});
    setForm({ fullName: "", email: "", password: "", confirmPassword: "" });
    setShowPw(false);
    setShowCPw(false);
  };

  return (
    <div
      className="min-h-screen w-full overflow-hidden relative"
      style={{ fontFamily: '"Be Vietnam Pro", "Plus Jakarta Sans", -apple-system, sans-serif', background: "#fff", color: "#101827" }}
    >
      {/* Global style override - force light mode for this page */}
      <style>{`
        body { background: #ffffff !important; color: #101827 !important; }
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      `}</style>
      {/* ═══ BACKGROUND ═══ */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Main background photo - convention center */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${BG_IMG})`,
            backgroundSize: "cover",
            backgroundPosition: "60% center",
          }}
        />
        {/* Subtle left gradient for text readability ONLY - not covering whole page */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.60) 32%, rgba(255,255,255,0.10) 55%, rgba(255,255,255,0) 70%)"
          }}
        />
        {/* Top header readability fade */}
        <div
          className="absolute top-0 left-0 right-0 h-24"
          style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.55), transparent)" }}
        />
        {/* Top-left: small corner accent */}
        <div className="absolute z-10 bg-[#D7193F]" style={{ width:80, height:250, top:-125, left:-60, transform:"rotate(-45deg)", opacity:0.90 }} />
        <div className="absolute z-10 bg-[#D7193F]" style={{ width:20, height:200, top:-95, left:20, transform:"rotate(-45deg)", opacity:0.60 }} />
        {/* Top-right red diagonals */}
        <div className="absolute z-10 bg-[#D7193F]" style={{ width:105, height:840, top:-120, right:-52, transform:"rotate(-45deg)", opacity:0.90 }} />
        <div className="absolute z-10 bg-[#D7193F]" style={{ width:32,  height:660, top:-70,  right:94,  transform:"rotate(-45deg)", opacity:0.68 }} />
        <div className="absolute z-10 bg-[#D7193F]" style={{ width:10,  height:520, top:-20,  right:158, transform:"rotate(-45deg)", opacity:0.22 }} />
        {/* Bottom-left: simple red triangle */}
        <div className="absolute bottom-0 left-0 z-10 pointer-events-none" style={{ width: "min(50vw, 700px)", height: "min(40vh, 350px)" }}>
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {/* Simple diagonal triangle pointing down to the right */}
            <polygon points="0,100 0,0 100,100" fill="#720B14" opacity="0.95" />
            <polygon points="0,100 0,30 70,100" fill="#8F0B18" opacity="0.8" />
            <polygon points="0,100 0,60 40,100" fill="#5A0000" opacity="0.7" />
            <polyline points="0,0 100,100" fill="none" stroke="#D7193F" strokeWidth="0.5" opacity="0.8" />
            <polyline points="0,15 85,100" fill="none" stroke="#D7193F" strokeWidth="0.2" opacity="0.4" />
          </svg>
        </div>
      </div>

      {/* ═══ HEADER ═══ */}
      <header
        className="relative z-50 h-[68px] flex items-center px-6 xl:px-12"
        style={{ background:"rgba(255,255,255,0.97)", backdropFilter:"blur(8px)", borderBottom:"1px solid rgba(0,0,0,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}
      >
        <div className="w-full max-w-[1440px] mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center">
              <div
                className="w-7 h-7 rotate-45 flex items-center justify-center"
                style={{ background:"#D7193F", boxShadow:"0 2px 6px rgba(215,25,63,0.35)" }}
              >
                <div className="w-3 h-3 bg-white" style={{ transform:"rotate(-45deg)" }} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-xl font-extrabold text-[#101827] tracking-tight">Event</span>
                <span className="text-xl font-extrabold text-[#D7193F] tracking-tight">AI</span>
              </div>
              <div className="text-[9px] font-semibold text-gray-400 tracking-[0.22em] leading-none mt-0.5">
                CONNECT · CREATE · INSPIRE
              </div>
            </div>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-[13px] font-semibold text-gray-600 hover:text-[#D7193F] transition-colors group"
          >
            <Home className="w-[15px] h-[15px]" />
            <span>Quay về trang chủ</span>
            <ArrowRight className="w-[15px] h-[15px] text-[#D7193F] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main
        className="relative z-20 flex items-center px-8 xl:px-14 py-8"
        style={{ minHeight:"calc(100vh - 72px)" }}
      >
        <div className="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row items-center lg:items-center justify-between gap-8 lg:gap-4">

          {/* LEFT – Promo Content */}
          <div className="w-full lg:w-[50%] flex flex-col justify-center z-20">
            <p className="text-[11px] font-bold text-[#D7193F] tracking-[0.22em] uppercase mb-4">
              Nền tảng quản lý sự kiện tích hợp AI
            </p>

            <h1 className="font-extrabold mb-4" style={{ lineHeight: 1.15 }}>
              <span className="block text-[#101827]" style={{ fontSize:"clamp(36px,4.8vw,60px)", textShadow:"0 1px 3px rgba(255,255,255,0.6)" }}>
                Kết nối cộng đồng
              </span>
              <span className="block text-[#D7193F]" style={{ fontSize:"clamp(36px,4.8vw,60px)", textShadow:"0 1px 3px rgba(255,255,255,0.5)" }}>
                Kiến tạo giá trị
              </span>
            </h1>

            <p className="leading-relaxed mb-8 max-w-[440px]" style={{ fontSize:"clamp(14px,1.1vw,17px)", color:"#2D3748" }}>
              Đăng nhập hoặc tạo tài khoản để tham gia,<br/>
              quản lý sự kiện và khám phá những trải nghiệm<br/>
              độc đáo cùng EventAI.
            </p>

            <div className="flex flex-wrap gap-5">
              {[
                { icon: Calendar, title: "Tham gia sự kiện",  sub: "Dễ dàng, nhanh chóng" },
                { icon: Users,    title: "Kết nối cộng đồng", sub: "Mở rộng cơ hội hợp tác" },
                { icon: Cpu,      title: "Trải nghiệm AI",    sub: "Cá nhân hóa đề xuất" },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background:"rgba(215,25,63,0.13)", border:"1.5px solid rgba(215,25,63,0.25)" }}>
                    <Icon className="w-[18px] h-[18px] text-[#D7193F]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#101827] leading-tight">{title}</p>
                    <p className="text-[11px] text-[#5F6875]">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Brand stamp */}
            <div className="mt-16 pt-2">
              <p className="text-[26px] font-bold italic text-white" style={{ fontFamily:"Georgia,serif", textShadow:"0 2px 12px rgba(0,0,0,0.5)" }}>
                EventAI
              </p>
              <p className="text-[11px] text-white/70 font-medium tracking-wide mt-1">
                Hội tụ công nghệ - Kết nối tương lai
              </p>
              <div className="w-8 h-[1.5px] mt-2.5" style={{ background:"rgba(255,255,255,0.5)" }} />
            </div>
          </div>

          {/* RIGHT – Auth Card */}
          <div className="w-full lg:w-auto flex justify-center lg:justify-end shrink-0 z-30 lg:self-center">
            <div
              className="w-full rounded-lg overflow-hidden"
              style={{
                width:"min(520px, 42vw)",
                minWidth:"420px",
                minHeight:"600px",
                background:"rgba(255,255,255,0.97)",
                backdropFilter:"blur(24px)",
                WebkitBackdropFilter:"blur(24px)",
                boxShadow:"0 16px 64px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.08)",
                border:"1px solid rgba(215,25,63,0.10)",
                display:"flex",
                flexDirection:"column",
              }}
            >
              {/* Tabs */}
              <div className="px-8 pt-7">
                <div className="flex">
                  {(["login", "register"] as AuthMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={`flex-1 pb-3 text-[14px] font-bold text-center transition-all relative ${
                        mode === m ? "text-[#D7193F]" : "text-[#6B7280] hover:text-[#101827]"
                      }`}
                    >
                      {m === "login" ? "Đăng nhập" : "Đăng ký"}
                      {mode === m && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D7193F] rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="h-px bg-gray-100" />
              </div>

              {/* Form */}
              <div className="px-8 py-5 flex-1">
                {mode === "login" ? (
                  <>
                    <div className="mb-6">
                      <h2 className="text-[22px] font-extrabold text-[#101827]">Chào mừng trở lại!</h2>
                      <p className="text-[13px] text-[#5F6875] mt-1.5">
                        Vui lòng đăng nhập để tiếp tục sử dụng EventAI.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                      <InputField icon={Mail} name="email" type="email" placeholder="Email hoặc số điện thoại" form={form} errors={errors} onChange={handleChange} />
                      <InputField icon={Lock} name="password" type={showPw ? "text" : "password"} placeholder="Mật khẩu" form={form} errors={errors} onChange={handleChange} rightIcon={showPw ? EyeOff : Eye} onRightIconClick={() => setShowPw(v => !v)} />

                      <div className="flex items-center justify-between mt-1 mb-5">
                        <button type="button" onClick={() => setRememberMe(v => !v)} className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-gray-800 transition-colors">
                          {rememberMe ? <CheckSquare className="w-4 h-4 text-[#D7193F]" /> : <Square className="w-4 h-4 text-gray-400" />}
                          Ghi nhớ đăng nhập
                        </button>
                        <button type="button" onClick={() => toast.info("Vui lòng liên hệ admin để đặt lại mật khẩu.")} className="text-[13px] font-semibold text-[#D7193F] hover:text-[#A8112A] transition-colors">
                          Quên mật khẩu?
                        </button>
                      </div>

                      <button
                        type="submit" disabled={isLoading}
                        className="w-full h-[54px] text-white font-bold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                        style={{ background:"#D7193F", boxShadow:"0 4px 20px rgba(215,25,63,0.28)" }}
                      >
                        {isLoading ? "Đang xử lý..." : <><span>Đăng nhập</span><ArrowRight className="w-4 h-4" /></>}
                      </button>
                    </form>

                    <div className="mt-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[12px] text-gray-400 whitespace-nowrap font-medium">Hoặc đăng nhập bằng</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <SocialBtn onClick={() => toast.info("Tính năng Google đang phát triển.")}><GoogleIcon />Google</SocialBtn>
                        <SocialBtn onClick={() => toast.info("Tính năng Microsoft đang phát triển.")}><MicrosoftIcon />Microsoft</SocialBtn>
                      </div>
                    </div>

                    <p className="text-center text-[13px] text-gray-500 mt-4 mb-3">
                      Chưa có tài khoản?{" "}
                      <button onClick={() => switchMode("register")} className="font-bold text-[#D7193F] hover:text-[#A8112A] transition-colors">
                        Đăng ký ngay →
                      </button>
                    </p>

                    {/* Demo accounts - Compact */}
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      <div className="w-full text-center text-[10px] text-gray-400 mb-0.5">🔑 Tài khoản demo (pw: 123456)</div>
                      {[
                        { label:"Admin", email:"admin@eventhub.ai",   color:"bg-amber-50 text-amber-600 border-amber-200" },
                        { label:"Manager", email:"manager@eventhub.ai", color:"bg-purple-50 text-purple-600 border-purple-200" },
                        { label:"Staff", email:"staff@eventhub.ai",   color:"bg-indigo-50 text-indigo-600 border-indigo-200" },
                        { label:"Speaker", email:"speaker@eventhub.ai", color:"bg-emerald-50 text-emerald-600 border-emerald-200" },
                        { label:"User",  email:"attendee@eventhub.ai",color:"bg-slate-50 text-slate-600 border-slate-200" },
                      ].map(d => (
                        <button
                          key={d.label} type="button"
                          onClick={() => { setForm(p=>({...p, email:d.email, password:"123456"})); toast.success(`Đã điền tài khoản ${d.label}`); }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors hover:opacity-80 ${d.color}`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-5">
                      <h2 className="text-[22px] font-extrabold text-[#101827]">Tạo tài khoản EventAI</h2>
                      <p className="text-[13px] text-[#5F6875] mt-1.5">Đăng ký để bắt đầu trải nghiệm EventAI.</p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                      <InputField icon={User} name="fullName" placeholder="Họ và tên" form={form} errors={errors} onChange={handleChange} />
                      <InputField icon={Mail} name="email" type="email" placeholder="Email hoặc số điện thoại" form={form} errors={errors} onChange={handleChange} />
                      <InputField icon={Lock} name="password" type={showPw ? "text" : "password"} placeholder="Mật khẩu" form={form} errors={errors} onChange={handleChange} rightIcon={showPw ? EyeOff : Eye} onRightIconClick={() => setShowPw(v => !v)} />
                      <InputField icon={Lock} name="confirmPassword" type={showCPw ? "text" : "password"} placeholder="Xác nhận mật khẩu" form={form} errors={errors} onChange={handleChange} rightIcon={showCPw ? EyeOff : Eye} onRightIconClick={() => setShowCPw(v => !v)} />

                      <button
                        type="submit" disabled={isLoading}
                        className="w-full h-[54px] text-white font-bold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-60"
                        style={{ background:"#D7193F", boxShadow:"0 4px 20px rgba(215,25,63,0.28)" }}
                      >
                        {isLoading ? "Đang xử lý..." : <><span>Đăng ký ngay</span><ArrowRight className="w-4 h-4" /></>}
                      </button>
                    </form>

                    <div className="mt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[12px] text-gray-400 whitespace-nowrap font-medium">Hoặc đăng ký bằng</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <SocialBtn onClick={() => toast.info("Tính năng Google đang phát triển.")}><GoogleIcon />Google</SocialBtn>
                        <SocialBtn onClick={() => toast.info("Tính năng Microsoft đang phát triển.")}><MicrosoftIcon />Microsoft</SocialBtn>
                      </div>
                    </div>

                    <p className="text-center text-[13px] text-gray-500 mt-4 mb-1">
                      Đã có tài khoản?{" "}
                      <button onClick={() => switchMode("login")} className="font-bold text-[#D7193F] hover:text-[#A8112A] transition-colors">
                        Đăng nhập
                      </button>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Login;
