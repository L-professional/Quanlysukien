import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';

  const toggleLanguage = () => {
    const nextLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggleLanguage}
        title={currentLang === 'vi' ? 'Chuyển sang Tiếng Anh (Switch to English)' : 'Switch to Vietnamese (Chuyển sang Tiếng Việt)'}
        className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-xs font-bold text-slate-200 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-md group"
      >
        <Globe className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform" />
        <span className="flex items-center gap-1">
          {currentLang === 'vi' ? (
            <>
              <span className="text-sm leading-none">🇻🇳</span>
              <span className="text-slate-300">VI</span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="text-slate-500 hover:text-slate-400 font-medium">EN</span>
            </>
          ) : (
            <>
              <span className="text-sm leading-none">🇺🇸</span>
              <span className="text-slate-500 hover:text-slate-400 font-medium">VI</span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="text-slate-300">EN</span>
            </>
          )}
        </span>
      </button>
    </div>
  );
};
