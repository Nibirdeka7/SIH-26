import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, Sparkles, ArrowRight, RefreshCw, Feather, CheckCircle2 } from 'lucide-react';
import SymptomBodyMap from './SymptomBodyMap';
import { t } from '../utils/translations';

export default function SymptomIntakeStep({
  sessionId,
  messages,
  currentQuestion,
  suggestedOptions = [],
  onSendMessage,
  onSelectOption,
  isListening,
  onToggleListening,
  isProcessing,
  currentLanguage = 'hi',
  ayushMode,
  onToggleAyushMode,
  onFinishIntake,
  onSelectBodyRegion,
  audioBase64,
}) {
  const [inputText, setInputText] = useState('');
  const [showBodyMapModal, setShowBodyMapModal] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const chatEndRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Audio Playback for TTS
  useEffect(() => {
    if (audioBase64) {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audioSrc = audioBase64.startsWith('data:') ? audioBase64 : `data:audio/mp3;base64,${audioBase64}`;
        audioRef.current = new Audio(audioSrc);
        audioRef.current.onended = () => setIsPlayingAudio(false);
        audioRef.current.onerror = () => setIsPlayingAudio(false);
        setIsPlayingAudio(true);
        audioRef.current.play().catch((err) => {
          console.warn('Auto audio play failed:', err);
          setIsPlayingAudio(false);
        });
      } catch (err) {
        console.warn('Audio TTS init error:', err);
      }
    }
  }, [audioBase64]);

  const toggleTTSPlayback = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleTouchOption = (optionLabel) => {
    if (onSelectOption) {
      onSelectOption(optionLabel);
    } else {
      onSendMessage(optionLabel);
    }
  };

  // Extract touch options from current_question or fallback options
  const rawOptions = currentQuestion?.options || [];
  const touchOptions = rawOptions.length > 0
    ? rawOptions.map((opt) => opt.label_native || opt.label_english || opt.value)
    : (suggestedOptions.length > 0 ? suggestedOptions : (
        ayushMode
          ? ['Mandagni (Slow Digestion)', 'Vishama (Irregular)', 'Constipated (Koshtha)', 'Sama (Normal)']
          : ['Today', '2-3 days ago', 'Sharp pain', 'Moderate (5/10)', 'Severe (8/10)', 'Yes, radiates']
      ));

  const progress = currentQuestion?.progress || { percentage: 20, completed: 1, estimated_total: 6 };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
      {/* Step Header & Clinical Progress Bar */}
      <div className="flex flex-col gap-3 pb-3 border-b border-[#e6e2da]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#d8e7ce] text-[#5b6854] flex items-center justify-center text-xs font-bold">3</span>
              <h1 className="font-display text-2xl text-[#18241c] font-semibold">
                {t(currentLanguage, 'intakeTitle')}
              </h1>
            </div>
            <p className="font-body text-xs text-[#737873]">
              {t(currentLanguage, 'voiceAssistedDesc')}
            </p>
          </div>

          {/* AYUSH Mode Toggle Pill */}
          <button
            type="button"
            onClick={onToggleAyushMode}
            className={`px-4 py-2 rounded-full font-body text-xs font-semibold flex items-center gap-2 transition-all border ${
              ayushMode
                ? 'bg-[#d8e7ce] text-[#5b6854] border-[#8c9a84] shadow-sm font-bold'
                : 'bg-[#f4f4f0] text-[#434844] border-[#e6e2da] hover:bg-[#e9e8e4]'
            }`}
          >
            <Feather size={16} />
            <span>{t(currentLanguage, 'ayushMode')}: {ayushMode ? 'ACTIVE' : 'OFF'}</span>
          </button>
        </div>

        {/* Progress Bar Indicator */}
        <div className="w-full bg-[#f4f4f0] rounded-full h-3 border border-[#e6e2da] overflow-hidden flex items-center">
          <div
            className="bg-[#8c9a84] h-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, progress.percentage || 10)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-[#737873] font-body">
          <span>Section: <strong className="capitalize text-[#18241c]">{currentQuestion?.section || 'Symptom Assessment'}</strong></span>
          <span>{progress.completed || 1} of {progress.estimated_total || 6} Questions Answered ({progress.percentage || 15}%)</span>
        </div>
      </div>

      {/* Main Dual Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Chat Loop */}
        <div className="lg:col-span-8 bg-[#ffffff] rounded-3xl p-5 border border-[#e6e2da] shadow-sm flex flex-col h-[600px]">
          {/* Status Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e6e2da] mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-[#c27b66] animate-ping' : 'bg-[#8c9a84]'}`}></span>
              <span className="font-body text-xs font-semibold text-[#18241c]">
                {isListening ? t(currentLanguage, 'listening') : isProcessing ? t(currentLanguage, 'processing') : t(currentLanguage, 'voiceAssistedIntake')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {audioBase64 && (
                <button
                  type="button"
                  onClick={toggleTTSPlayback}
                  className={`p-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isPlayingAudio ? 'bg-[#c27b66] text-white animate-pulse' : 'bg-[#f4f4f0] text-[#18241c] hover:bg-[#e9e8e4]'
                  }`}
                  title="Listen to question"
                >
                  <Volume2 size={14} />
                  <span>{isPlayingAudio ? 'Speaking...' : 'Listen'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowBodyMapModal(!showBodyMapModal)}
                className="text-xs text-[#8c9a84] font-semibold hover:underline"
              >
                {showBodyMapModal ? 'Hide Body Map' : 'Show Body Map'}
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed font-body ${
                      isUser
                        ? 'bg-[#2d3a31] text-[#ffffff] rounded-br-none shadow-sm'
                        : 'bg-[#f4f4f0] text-[#18241c] rounded-bl-none border border-[#e6e2da]'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between gap-1.5 mb-1.5 text-[#5b6854] font-display text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={14} className="text-[#8c9a84]" />
                          <span>MediKiosk AI</span>
                        </div>
                      </div>
                    )}
                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-[#f4f4f0] p-4 rounded-2xl border border-[#e6e2da] text-xs font-semibold text-[#737873] flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-[#8c9a84]" />
                  <span>{t(currentLanguage, 'processing')}</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Touch-based Options Pills */}
          <div className="pt-3 border-t border-[#e6e2da] flex flex-col gap-2">
            <span className="font-body text-xs text-[#737873] font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} className="text-[#8c9a84]" />
              <span>{t(currentLanguage, 'quickOptions')}</span>
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {touchOptions.map((optLabel, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleTouchOption(optLabel)}
                  className="px-3.5 py-1.5 rounded-full bg-[#FAF9F5] hover:bg-[#d8e7ce] text-[#18241c] text-xs font-semibold shrink-0 border border-[#8c9a84] shadow-2xs hover:scale-105 transition-all"
                >
                  {optLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Form Input Deck (Text & Voice) */}
          <form onSubmit={handleSend} className="pt-2 flex items-center gap-2">
            {/* Mic Toggle Button */}
            <div className="relative">
              {isListening && <div className="mic-pulse-ring"></div>}
              <button
                type="button"
                onClick={onToggleListening}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-[#c27b66] text-[#ffffff] shadow-md'
                    : 'bg-[#f4f4f0] hover:bg-[#e9e8e4] text-[#18241c] border border-[#e6e2da]'
                }`}
                title={t(currentLanguage, 'clickToSpeak')}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>

            {/* Input Field */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t(currentLanguage, 'typePlaceholder')}
              className="flex-1 h-12 px-4 rounded-2xl bg-[#faf9f5] border border-[#e6e2da] text-sm text-[#18241c] focus:outline-none"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-12 h-12 rounded-full bg-[#2d3a31] hover:bg-[#1c2720] disabled:opacity-50 text-[#ffffff] flex items-center justify-center transition-all"
            >
              <Send size={18} />
            </button>
          </form>
        </div>

        {/* Right Column: Body Map Drawer or Guidance Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#ffffff] rounded-3xl p-4 border border-[#e6e2da] shadow-sm">
            <h3 className="font-display text-base text-[#18241c] font-semibold mb-3">
              {t(currentLanguage, 'bodyMapTitle')}
            </h3>
            <SymptomBodyMap onSelectSymptomRegion={onSelectBodyRegion} />
          </div>

          <button
            type="button"
            onClick={onFinishIntake}
            className="w-full h-14 rounded-full bg-[#c27b66] hover:bg-[#a96552] text-[#ffffff] font-body text-base font-semibold transition-all shadow-sm flex items-center justify-center gap-3 active:translate-y-0.5"
          >
            <span>{t(currentLanguage, 'finishIntake')}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
