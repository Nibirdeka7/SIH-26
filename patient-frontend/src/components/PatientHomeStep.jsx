import React from 'react';
import { Mic, MessageSquare, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { t } from '../utils/translations';

export default function PatientHomeStep({
  currentLanguage = 'hi',
  patientName,
  onStartVoiceIntake,
  onStartTextIntake,
  onStartDocumentScan,
  onSelectBodyRegion,
}) {
  const bodyRegions = [
    { id: 'chest', name: 'Chest / सीना', symptoms: 'Tightness, pain, palpitation' },
    { id: 'head', name: 'Head & Neck / सिर व गर्दन', symptoms: 'Headache, fever, dizziness' },
    { id: 'stomach', name: 'Stomach / पेट', symptoms: 'Acidity, pain, nausea, cramps' },
    { id: 'joints', name: 'Joints & Bones / जोड़ व हड्डी', symptoms: 'Swelling, stiffness, backache' },
    { id: 'skin', name: 'Skin & Allergy / त्वचा व एलर्जी', symptoms: 'Rash, itching, spots' },
    { id: 'general', name: 'General / सामान्य तकलीफ', symptoms: 'Weakness, fatigue, fever' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-[#f4f4f0] p-6 lg:p-8 border border-[#e6e2da] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#efeeea] text-[#5b6854] font-body text-xs font-semibold">
            <Sparkles size={14} className="text-[#8c9a84]" />
            <span>{t(currentLanguage, 'step4')}</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-[#18241c] font-semibold">
            {t(currentLanguage, 'greeting')}, {patientName || 'Patient'}!
          </h1>
          <p className="font-body text-sm text-[#434844] max-w-xl leading-relaxed">
            {t(currentLanguage, 'homeSubtitle')}
          </p>
        </div>
      </div>

      {/* Prominent Voice Start Hero Section */}
      <div className="rounded-3xl bg-[#ffffff] p-8 border border-[#e6e2da] shadow-sm text-center flex flex-col items-center gap-6">
        <div className="space-y-2">
          <span className="font-body text-xs uppercase tracking-wider text-[#8c9a84] font-bold">
            {t(currentLanguage, 'voiceAssistedIntake')}
          </span>
          <h2 className="font-display text-2xl md:text-3xl text-[#18241c] font-semibold">
            {t(currentLanguage, 'voiceIntakeTitle')}
          </h2>
          <p className="font-body text-sm text-[#737873] max-w-md mx-auto">
            {t(currentLanguage, 'voiceIntakeDesc')}
          </p>
        </div>

        {/* Big Touch-Friendly Mic Button */}
        <div className="relative group">
          <div className="absolute -inset-3 rounded-full bg-[#c27b66]/20 animate-pulse group-hover:bg-[#c27b66]/30 transition-all"></div>
          <button
            type="button"
            onClick={onStartVoiceIntake}
            className="relative w-28 h-28 rounded-full bg-[#c27b66] hover:bg-[#a96552] text-[#ffffff] flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
          >
            <Mic size={36} />
            <span className="font-body text-xs font-bold uppercase tracking-wide">
              {t(currentLanguage, 'startVoice')}
            </span>
          </button>
        </div>

        <span className="font-body text-xs text-[#5b6854] font-semibold">
          {t(currentLanguage, 'voiceAssistedDesc')}
        </span>
      </div>

      {/* Quick Body Symptom Region Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-[#18241c] font-semibold">
            {t(currentLanguage, 'bodyMapTitle')}
          </h2>
          <span className="font-body text-xs text-[#737873]">Presets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bodyRegions.map((region) => (
            <div
              key={region.id}
              onClick={() => onSelectBodyRegion(region)}
              className="p-5 rounded-2xl bg-[#ffffff] border border-[#e6e2da] hover:border-[#2d3a31] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-1">
                <span className="font-display text-base text-[#18241c] font-semibold block">{region.name}</span>
                <p className="font-body text-xs text-[#737873]">{region.symptoms}</p>
              </div>
              <div className="mt-4 flex items-center justify-end text-[#8c9a84]">
                <ArrowRight size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alternative Options Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onStartTextIntake}
          className="p-6 rounded-3xl bg-[#f4f4f0] hover:bg-[#efeeea] border border-[#e6e2da] text-left transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#2d3a31] text-[#ffffff] flex items-center justify-center shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <span className="font-display text-base text-[#18241c] font-semibold block">
              {t(currentLanguage, 'textIntakeTitle')}
            </span>
            <span className="font-body text-xs text-[#737873]">
              {t(currentLanguage, 'textIntakeDesc')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onStartDocumentScan}
          className="p-6 rounded-3xl bg-[#f4f4f0] hover:bg-[#efeeea] border border-[#e6e2da] text-left transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#5b6854] text-[#ffffff] flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <span className="font-display text-base text-[#18241c] font-semibold block">
              {t(currentLanguage, 'scanDocTitle')}
            </span>
            <span className="font-body text-xs text-[#737873]">
              {t(currentLanguage, 'scanDocDesc')}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
