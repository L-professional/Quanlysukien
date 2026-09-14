import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { FloatingChatbot } from '../AI/FloatingChatbot';
import { AuthModal } from '../AuthModal';

interface MainLayoutProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const pathToTab: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/events': 'schedule',
  '/check-in': 'scanner',
  '/inquiries': 'inquiries',
  '/content-studio': 'content-studio',
  '/knowledge-base': 'knowledge-base',
  '/feedback': 'feedback',
  '/users': 'users',
  '/logs': 'logs',
  '/speaker/dashboard': 'speaker',
};

const tabToPath: Record<string, string> = {
  dashboard: '/dashboard',
  schedule: '/events',
  scanner: '/check-in',
  inquiries: '/inquiries',
  'content-studio': '/content-studio',
  'knowledge-base': '/knowledge-base',
  feedback: '/feedback',
  users: '/users',
  logs: '/logs',
  speaker: '/speaker/dashboard',
};

export const MainLayout: React.FC<MainLayoutProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const pendingCount = 5;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  const currentTab = propActiveTab || (location.pathname.startsWith('/speaker') ? 'speaker' : pathToTab[location.pathname]) || 'dashboard';

  const handleTabChange = (tab: string) => {
    if (propSetActiveTab) {
      propSetActiveTab(tab);
    } else {
      const targetPath = tabToPath[tab] || '/dashboard';
      navigate(targetPath);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-500 selection:text-white relative">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="login"
      />

      {/* Desktop Sidebar Navigation - Hidden on Mobile (< 1024px) */}
      <div className="hidden lg:block shrink-0">
        <Sidebar
          activeTab={currentTab}
          setActiveTab={handleTabChange}
          pendingCount={pendingCount}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {/* Mobile Drawer (Slide-out Hamburger Menu for screens < 1024px) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isMobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />

        {/* Sliding Drawer Container */}
        <div
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0B0F19] text-slate-200 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col justify-between ${
            isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            activeTab={currentTab}
            setActiveTab={(tab) => {
              handleTabChange(tab);
              setIsMobileDrawerOpen(false);
            }}
            pendingCount={pendingCount}
            isCollapsed={false}
            isMobileDrawer={true}
            onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header - Persistent */}
        <Header
          activeTab={currentTab}
          setActiveTab={handleTabChange}
          pendingCount={pendingCount}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-3 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <FloatingChatbot />
    </div>
  );
};

export default MainLayout;
