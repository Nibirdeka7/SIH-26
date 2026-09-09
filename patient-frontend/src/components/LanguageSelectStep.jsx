import React, { useState } from 'react';
import { Volume2, Sparkles, Check, ArrowRight, ShieldCheck, Clock, Lock, Ear, HelpCircle } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../config/api_config';

export default function LanguageSelectStep({
  selectedLanguage,
  onSelectLanguage,
  onContinue,
}) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const langCards = [
    { code: 'en', native: 'English', label: 'Continue in English', cta: 'Continue in English' },
    { code: 'hi', native: 'हिन्दी', label: 'Hindi', cta: 'आगे बढ़ें (Continue in Hindi)' },
    { code: 'bn', native: 'বাংলা', label: 'Bengali', cta: 'এগিয়ে যান (Continue in Bengali)' },
    { code: 'ta', native: 'தமிழ்', label: 'Tamil', cta: 'தொடரவும் (Continue in Tamil)' },
    { code: 'te', native: 'తెలుగు', label: 'Telugu', cta: 'కొనసాగండి (Continue in Telugu)' },
    { code: 'mr', native: 'मराठी', label: 'Marathi', cta: 'पुढे जा (Continue in Marathi)' },
    { code: 'gu', native: 'ગુજરાતી', label: 'Gujarati', cta: 'આગળ વધો (Continue in Gujarati)' },
    { code: 'kn', native: 'ಕನ್ನಡ', label: 'Kannada', cta: 'ಮುಂದುವರಿಯಿರಿ (Continue in Kannada)' },
    { code: 'ml', native: 'മലയാളം', label: 'Malayalam', cta: 'തുടരുക (Continue in Malayalam)' },
    { code: 'as', native: 'অসমীয়া', label: 'Assamese', cta: 'আগলৈ যাওক (Continue in Assamese)' },
  ];

  const handleCardClick = (langCode) => {
    onSelectLanguage(langCode);
  };

  const handlePlaySampleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech audio is not supported in this browser.');
      return;
    }

    if (isPlayingAudio || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const sampleTexts = {
      en: 'Hello! Welcome to MediKiosk. Please select your language to begin.',
      hi: 'नमस्ते! मेडीकियोस्क में आपका स्वागत है। आगे बढ़ने के लिए अपनी भाषा चुनें।',
      bn: 'নমস্কার! মেদিকিয়োস্কে আপনাকে স্বাগতম। এগিয়ে যেতে ভাষা বেছে নিন।',
      ta: 'வணக்கம்! மெடிகியோஸ்கிற்கு வரவேற்கிறோம். தொடர உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்.',
      te: 'నమస్కారం! మెడికియోస్క్‌కి స్వాగతం. కొనసాగడానికి మీ భాషను ఎంచుకోండి.',
      mr: 'नमस्कार! मेडीकिऑस्क मध्ये आपले स्वागत आहे. पुढे जाण्यासाठी तुमची भाषा निवडा.',
      gu: 'નમસ્તે! મેડીકિયોસ્કમાં તમારું સ્વાગત છે. આગળ વધવા માટે તમારી ભાષા પસંદ કરો.',
      kn: 'ನಮಸ್ಕಾರ! ಮೆಡಿಕಿಯೊಸ್ಕ್‌ಗೆ ಸ್ವಾಗತ. ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
      ml: 'നമസ്കാരം! മെഡികിയോസ്കിലേക്ക് സ്വാഗതം. തുടരാൻ നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക.',
      as: 'নমস্কাৰ! মেদিকিয়স্কলৈ স্বাগতম। আগলৈ যাবলৈ আপোনাৰ ভাষা বাছনি কৰক।',
    };

    const langVoiceMap = {
      en: 'en-US', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN',
      mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', as: 'as-IN',
    };

    const textToSpeak = sampleTexts[selectedLanguage] || sampleTexts.en;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langVoiceMap[selectedLanguage] || 'en-US';
    utterance.rate = 0.9;

    utterance.onend = () => {
      setIsPlayingAudio(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsPlayingAudio(false);
    };

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const currentCard = langCards.find((c) => c.code === selectedLanguage) || langCards[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">
      {/* Stage Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#f4f4f0] p-6 lg:p-8 shadow-sm border border-[#e6e2da]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#efeeea] text-[#5b6854] font-body text-xs font-semibold">
              <Sparkles size={14} className="text-[#8c9a84]" />
              <span>Step 1: Language & Comfort</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-[#18241c] font-semibold leading-tight">
              स्वागतम् <span className="font-display text-2xl md:text-3xl text-[#55624f] font-normal italic">• Welcome</span>
            </h1>
            <p className="font-body text-base md:text-lg text-[#434844] leading-relaxed">
              Let us understand your health before your consultation. We will prepare a clear, private summary for your doctor so you do not have to repeat everything.
            </p>
          </div>

          {/* Voice Guide Pill */}
          <div className="shrink-0 bg-[#ffffff] p-4 rounded-2xl shadow-sm border border-[#e6e2da] max-w-xs space-y-2">
            <div className="flex items-center gap-2 text-[#18241c] font-semibold text-sm">
              <Volume2 size={18} className="text-[#c27b66]" />
              <span>Voice-Guided Kiosk</span>
            </div>
            <p className="font-body text-xs text-[#434844]">
              All screens can speak aloud in your mother tongue. Tap any speaker icon to hear the audio preview.
            </p>
          </div>
        </div>
      </div>

      {/* OPD Flow Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 rounded-2xl overflow-hidden relative shadow-sm h-48 bg-[#2d3a31] p-6 text-[#ffffff] flex flex-col justify-end">
          <span className="font-body text-xs uppercase tracking-wider text-[#d8e7ce] mb-1 font-semibold">
            Your Dignity & Privacy First
          </span>
          <p className="font-display text-2xl font-semibold max-w-md leading-snug">
            Take your time. No rush, no paperwork queues.
          </p>
        </div>

        <div className="lg:col-span-4 h-48 rounded-2xl bg-[#ffffff] p-5 shadow-sm border border-[#e6e2da] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-body text-xs text-[#737873] uppercase tracking-wider font-semibold">OPD Flow Status</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#d8e7ce] text-[#5b6854] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#8c9a84] animate-pulse"></span>
              Active & Ready
            </span>
          </div>
          <div className="space-y-1">
            <div className="font-display text-3xl text-[#18241c] font-bold">
              3–5 <span className="font-body text-sm text-[#737873] font-normal">mins typical</span>
            </div>
            <p className="font-body text-xs text-[#434844]">
              Simple pictorial questions about symptoms, medications, and previous reports.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2 text-[#737873] text-xs font-medium">
            <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-[#8c9a84]" /> ABDM Linked</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Lock size={14} className="text-[#8c9a84]" /> 100% Encrypted</span>
          </div>
        </div>
      </div>

      {/* Language Selection Grid Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          <Volume2 size={20} className="text-[#8c9a84]" />
          <h2 className="font-display text-xl text-[#18241c] font-semibold">अपनी भाषा चुनें • Select Your Language</h2>
        </div>
        <span className="font-body text-xs text-[#737873]">10 Languages Supported with Voice Readout</span>
      </div>

      {/* 10 Multilingual Ceramic Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {langCards.map((card) => {
          const isSelected = selectedLanguage === card.code;
          return (
            <button
              key={card.code}
              type="button"
              onClick={() => handleCardClick(card.code)}
              className={`p-5 rounded-2xl text-left transition-all duration-200 shadow-sm flex flex-col justify-between min-h-[140px] border ${
                isSelected
                  ? 'bg-[#d8e7ce]/30 border-[#2d3a31] ring-2 ring-[#2d3a31]'
                  : 'bg-[#ffffff] border-[#e6e2da] hover:border-[#8c9a84] hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between w-full">
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                  isSelected ? 'bg-[#2d3a31] text-[#ffffff]' : 'bg-[#efeeea] text-[#434844]'
                }`}>
                  {card.code}
                </span>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-[#2d3a31] text-[#ffffff] flex items-center justify-center">
                    <Check size={14} />
                  </div>
                )}
              </div>
              <div className="mt-3">
                <span className="block font-display text-xl text-[#18241c] font-semibold">{card.native}</span>
                <span className="block font-body text-xs text-[#737873] mt-0.5">{card.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Audio Guidance Banner */}
      <div className="rounded-2xl bg-[#f4f4f0] p-5 border border-[#e6e2da] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#d8e7ce] text-[#5b6854] flex items-center justify-center shrink-0">
            <Ear size={24} />
          </div>
          <div>
            <h3 className="font-display text-lg text-[#18241c] font-semibold">Voice-Assisted Intake / बोलकर जवाब दें</h3>
            <p className="font-body text-sm text-[#434844]">
              Cannot read comfortably? Tap anywhere to hear questions read out, or speak directly to answer.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handlePlaySampleAudio}
          className={`h-11 px-5 rounded-full font-body text-xs font-semibold flex items-center gap-2 transition-all ${
            isPlayingAudio
              ? 'bg-[#d8e7ce] text-[#5b6854] border border-[#8c9a84]'
              : 'bg-[#ffffff] hover:bg-[#efeeea] text-[#18241c] border border-[#e6e2da]'
          }`}
        >
          <Volume2 size={16} className={isPlayingAudio ? 'animate-pulse' : ''} />
          <span>{isPlayingAudio ? 'Playing Audio Demo...' : 'Sample Voice Demo'}</span>
        </button>
      </div>

      {/* Action Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#e6e2da]">
        <div className="flex items-center gap-2 text-[#737873] text-xs font-medium">
          <span>Tap your choice to select • Touch-friendly ergonomic buttons</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 sm:flex-initial h-13 min-w-[240px] px-8 rounded-full bg-[#c27b66] hover:bg-[#a96552] text-[#ffffff] font-body text-base font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-3 active:translate-y-0.5"
          >
            <span>{currentCard.cta}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
