import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Bot,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Save,
  Globe,
  Mail,
  Share2,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiService } from '../services/api';

interface EventMetadata {
  title: string;
  datetime: string;
  audience: string;
  location: string;
}

export const AIPRStudio: React.FC = () => {
  const { t } = useTranslation();
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'professional' | 'engaging' | 'casual'>('engaging');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedResults, setGeneratedResults] = useState<{ email: string; social: string; reminder: string } | null>(null);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'email' | 'social' | 'reminder'>('email');
  const [metadata, setMetadata] = useState<EventMetadata>({
    title: 'EventHub AI Summit 2026',
    datetime: '15-16 Oct 2026',
    audience: 'Tech Leaders & AI Enthusiasts',
    location: 'GEM Center, Ho Chi Minh City',
  });

  const samplePrompts = [
    'AI technology in event management',
    'EventHub AI Summit 2026 benefits',
    'QR Check-in automation',
  ];

  const TONE_OPTIONS: Array<{ value: 'professional' | 'engaging' | 'casual'; label: string }> = [
    { value: 'professional', label: t('prStudio.professional') },
    { value: 'engaging', label: t('prStudio.engaging') },
    { value: 'casual', label: t('prStudio.casual') },
  ];

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error(t('prStudio.topicPlaceholder'));
      return;
    }
    setIsGenerating(true);

    try {
      const res = await apiService.generatePRContent({
        title: metadata.title,
        datetime: metadata.datetime,
        audience: metadata.audience,
        location: metadata.location,
        topic: topic.trim(),
        tone: tone,
      });
      setGeneratedResults(res);
      toast.success(t('common.success'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const getActiveTabContent = (): string => {
    if (!generatedResults) return '';
    return generatedResults[activeTab] || '';
  };

  const copyToClipboard = () => {
    const textToCopy = getActiveTabContent();
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    toast.success(t('prStudio.copied'));
  };

  const TABS = [
    { id: 'email', label: t('prStudio.emailTab'), icon: Mail },
    { id: 'social', label: t('prStudio.socialTab'), icon: Share2 },
    { id: 'reminder', label: t('prStudio.reminderTab'), icon: Bell },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            {t('prStudio.title')}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">{t('prStudio.subtitle')}</p>
        </div>
        {getActiveTabContent() && (
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            {t('prStudio.copyContent')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            {/* Event Metadata */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                {t('events.title')}
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('events.title')}</label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('events.time')}</label>
                  <input
                    type="text"
                    value={metadata.datetime}
                    onChange={(e) => setMetadata({ ...metadata, datetime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('users.colUser')}</label>
                  <input
                    type="text"
                    value={metadata.audience}
                    onChange={(e) => setMetadata({ ...metadata, audience: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('events.room')}</label>
                  <input
                    type="text"
                    value={metadata.location}
                    onChange={(e) => setMetadata({ ...metadata, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">{t('prStudio.contentTopic')}</label>
              <input
                type="text"
                placeholder={t('prStudio.topicPlaceholder')}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">{t('prStudio.toneStyle')}:</label>
              <div className="flex gap-1.5">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      tone === t.value
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample Prompts */}
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setTopic(prompt)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t('prStudio.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t('prStudio.generateBtn')}
                </>
              )}
            </button>
          </div>

          {/* Advanced Options */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
                Advanced Options
              </span>
              {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showOptions && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <select className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-indigo-500">
                    <option>Vietnamese</option>
                    <option>English</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Length:</span>
                  <select className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-indigo-500">
                    <option>Medium (300-600 words)</option>
                    <option>Short (150-300 words)</option>
                    <option>Long (600+ words)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded bg-slate-100 border-slate-300 text-indigo-600" />
                  Include hashtags
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Workspace with Tabs */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 border-b border-slate-200">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'email' | 'social' | 'reminder')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {isGenerating ? (
                <div className="text-center py-16 space-y-4">
                  <Bot className="w-12 h-12 mx-auto text-indigo-600 animate-bounce" />
                  <p className="text-sm font-bold text-slate-900">{t('prStudio.generating')}</p>
                </div>
              ) : getActiveTabContent() ? (
                <div className="space-y-4">
                  <pre className="whitespace-pre-wrap text-xs text-slate-800 leading-relaxed font-mono bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[400px] overflow-y-auto">
                    {getActiveTabContent()}
                  </pre>
                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {t('prStudio.copyContent')}
                    </button>
                    <button
                      onClick={() => setGeneratedResults(null)}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 space-y-3 text-slate-500">
                  <Sparkles className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">{t('prStudio.topicPlaceholder')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPRStudio;
