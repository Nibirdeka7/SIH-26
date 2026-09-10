import React from 'react';
import { HeartPulse, Globe, Volume2, Type, AlertTriangle, ShieldAlert, Sparkles, User } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../config/api_config';

export default function Header({
  activeStepIndex,
  onNavigateStep,
  currentLanguage,
  onLanguageChange,
  audioGuideOn,
  onToggleAudioGuide,
  textSize,
  onCycleTextSize,
  onTriggerEmergency,
  triagePriority,
}) {
  const journeyPhases = [
    { key: 'identify', label: '1. Identify', stepIndices: [0, 1, 2], targetStep: 0 },
    { key: 'history', label: '2. History', stepIndices: [3, 4], targetStep: 4 },
    { key: 'documents', label: '3. Documents', stepIndices: [5], targetStep: 5 },
    { key: 'review', label: '4. Review', stepIndices: [6], targetStep: 6 },
    { key: 'done', label: '5. Done', stepIndices: [7], targetStep: 7 },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#faf9f5]/90 backdrop-blur-md border-b border-[#e6e2da] shadow-sm">
      <div className="h-20 max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => onNavigateStep && onNavigateStep(0)}>
          <div className="w-10 h-10 rounded-2xl bg-[#2d3a31] text-[#ffffff] flex items-center justify-center shadow-sm">
            <HeartPulse size={22} className="text-[#8c9a84]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl text-[#18241c] font-semibold tracking-tight">MediKiosk</span>
            <span className="font-body text-xs text-[#737873] uppercase tracking-wider font-medium">Patient Intake Portal</span>
          </div>
        </div>

        {/* 5-Step Continuous Journey Navigation Bar */}
        {onNavigateStep && (
          <nav className="hidden lg:flex items-center gap-1.5 bg-[#efeeea] px-3 py-1.5 rounded-full">
            {journeyPhases.map((phase) => {
              const isActive = phase.stepIndices.includes(activeStepIndex);
              return (
                <button
                  key={phase.key}
                  onClick={() => onNavigateStep(phase.targetStep)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#2d3a31] text-[#ffffff] shadow-sm font-bold scale-105'
                      : 'text-[#434844] hover:text-[#18241c] hover:bg-[#e9e8e4]'
                  }`}
                >
                  {phase.label}
                </button>
              );
            })}
          </nav>
        )}


        {/* Header Right Actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Triage Priority Badge */}
          {triagePriority && (
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                triagePriority === 'P1_CRITICAL' || triagePriority === 'CRITICAL_EMERGENCY'
                  ? 'bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a] animate-pulse'
                  : triagePriority === 'P2_URGENT'
                  ? 'bg-[#fef3c7] text-[#92400e] border border-[#f59e0b]'
                  : 'bg-[#d8e7ce] text-[#5b6854] border border-[#8c9a84]'
              }`}
            >
              {(triagePriority === 'P1_CRITICAL' || triagePriority === 'CRITICAL_EMERGENCY') && (
                <AlertTriangle size={14} />
              )}
              <span>{triagePriority.replace('_', ' ')}</span>
            </div>
          )}

          {/* Language Selector */}
          <div className="relative flex items-center bg-[#f4f4f0] rounded-full px-2.5 py-1 border border-[#e6e2da]">
            <Globe size={18} className="text-[#8c9a84] mr-1.5" />
            <select
              value={currentLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent font-body text-xs font-semibold text-[#18241c] focus:outline-none cursor-pointer pr-1"
              aria-label="Select Language"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.englishName})
                </option>
              ))}
            </select>
          </div>

          {/* Audio Guide Toggle Button */}
          <button
            type="button"
            onClick={onToggleAudioGuide}
            className={`hidden md:flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold transition-colors border ${
              audioGuideOn
                ? 'bg-[#d8e7ce] text-[#5b6854] border-[#8c9a84]'
                : 'bg-[#f4f4f0] text-[#434844] border-[#e6e2da] hover:bg-[#e9e8e4]'
            }`}
          >
            <Volume2 size={16} className="text-[#8c9a84]" />
            <span>Audio: {audioGuideOn ? 'ON' : 'OFF'}</span>
          </button>

          {/* Text Size Scale Toggle */}
          <div className="flex items-center bg-[#f4f4f0] rounded-full p-0.5 border border-[#e6e2da]">
            <button
              type="button"
              onClick={onCycleTextSize}
              className="px-2.5 py-1 rounded-full text-xs font-bold text-[#18241c] hover:bg-[#e9e8e4] transition-colors"
              title="Toggle Text Size"
            >
              <Type size={14} className="inline mr-1" />
              <span>{textSize.toUpperCase()}</span>
            </button>
          </div>

          {/* Emergency SOS Button */}
          <button
            type="button"
            onClick={onTriggerEmergency}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#5b2818] hover:bg-[#401306] text-[#ffffff] transition-colors font-semibold text-xs shadow-sm"
          >
            <ShieldAlert size={16} />
            <span className="hidden sm:inline">Emergency Staff</span>
          </button>
        </div>
      </div>
    </header>
  );
}

