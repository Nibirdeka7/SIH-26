import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckSquare, Square, ArrowRight, ArrowLeft } from 'lucide-react';
import { t } from '../utils/translations';

export default function PrivacyConsentStep({
  currentLanguage = 'hi',
  onAcceptConsent,
  onBack,
}) {
  const [consentDoctor, setConsentDoctor] = useState(true);
  const [consentVoice, setConsentVoice] = useState(true);
  const [consentStorage, setConsentStorage] = useState(true);

  const handleAccept = () => {
    if (!consentDoctor || !consentVoice) {
      alert('Please accept essential consent terms for clinical record sharing and voice intake to proceed.');
      return;
    }
    onAcceptConsent({ consentDoctor, consentVoice, consentStorage });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">
      {/* Progress & Title */}
      <div className="w-full space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#d8e7ce] text-[#5b6854] flex items-center justify-center text-xs font-bold">2</span>
            <span className="font-body text-base text-[#18241c] font-semibold">
              {t(currentLanguage, 'step3')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#737873] text-xs bg-[#f4f4f0] px-3.5 py-1 rounded-full border border-[#e6e2da] w-fit">
            <ShieldCheck size={14} className="text-[#8c9a84]" />
            <span>DPDP Act 2023 Compliant</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-[#e9e8e4] rounded-full overflow-hidden">
          <div className="h-full bg-[#8c9a84] w-2/4 rounded-full transition-all duration-500"></div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-[#18241c] font-semibold">
              {t(currentLanguage, 'consentTitle')}
            </h1>
            <p className="font-body text-base text-[#434844] mt-1">
              {t(currentLanguage, 'consentSubtitle')}
            </p>
          </div>

          {/* Audio Explanation Button */}
          <button
            type="button"
            onClick={() => {
              if ('speechSynthesis' in window) {
                if (window.speechSynthesis.speaking) {
                  window.speechSynthesis.cancel();
                } else {
                  const text = t(currentLanguage, 'consentItem1');
                  const utter = new SpeechSynthesisUtterance(text);
                  utter.rate = 0.9;
                  window.speechSynthesis.speak(utter);
                }
              }
            }}
            className="shrink-0 h-11 px-4 rounded-full bg-[#d8e7ce] text-[#5b6854] hover:bg-[#c6dab8] font-body text-xs font-bold flex items-center gap-2 transition-all border border-[#8c9a84]"
          >
            <span>🔊 {t(currentLanguage, 'voiceAssistedIntake')}</span>
          </button>
        </div>
      </div>

      {/* Consent Cards Box */}
      <div className="bg-[#ffffff] rounded-3xl p-6 lg:p-8 border border-[#e6e2da] shadow-sm space-y-6">
        <div className="flex items-center gap-3 p-4 bg-[#f4f4f0] rounded-2xl border border-[#e6e2da]">
          <Lock size={22} className="text-[#8c9a84] shrink-0" />
          <p className="font-body text-xs text-[#434844] leading-relaxed">
            <strong>{t(currentLanguage, 'consentBoxTitle')}:</strong> {t(currentLanguage, 'consentItem1')}
          </p>
        </div>

        <div className="space-y-4">
          {/* Item 1 */}
          <div
            onClick={() => setConsentDoctor(!consentDoctor)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
              consentDoctor ? 'bg-[#d8e7ce]/20 border-[#2d3a31]' : 'bg-[#faf9f5] border-[#e6e2da]'
            }`}
          >
            <div className="mt-0.5 text-[#2d3a31]">
              {consentDoctor ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>
            <div className="space-y-1">
              <span className="font-display text-base text-[#18241c] font-semibold block">
                1. {t(currentLanguage, 'consentItem1')}
              </span>
              <p className="font-body text-xs text-[#434844]">
                {t(currentLanguage, 'consentItem2')}
              </p>
            </div>
          </div>

          {/* Item 2 */}
          <div
            onClick={() => setConsentVoice(!consentVoice)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
              consentVoice ? 'bg-[#d8e7ce]/20 border-[#2d3a31]' : 'bg-[#faf9f5] border-[#e6e2da]'
            }`}
          >
            <div className="mt-0.5 text-[#2d3a31]">
              {consentVoice ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>
            <div className="space-y-1">
              <span className="font-display text-base text-[#18241c] font-semibold block">
                2. {t(currentLanguage, 'voiceAssistedIntake')}
              </span>
              <p className="font-body text-xs text-[#434844]">
                {t(currentLanguage, 'voiceAssistedDesc')}
              </p>
            </div>
          </div>

          {/* Item 3 */}
          <div
            onClick={() => setConsentStorage(!consentStorage)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
              consentStorage ? 'bg-[#d8e7ce]/20 border-[#2d3a31]' : 'bg-[#faf9f5] border-[#e6e2da]'
            }`}
          >
            <div className="mt-0.5 text-[#2d3a31]">
              {consentStorage ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>
            <div className="space-y-1">
              <span className="font-display text-base text-[#18241c] font-semibold block">
                3. {t(currentLanguage, 'consentItem3')}
              </span>
              <p className="font-body text-xs text-[#434844]">
                {t(currentLanguage, 'encrypted')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#e6e2da]">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-6 rounded-full bg-transparent hover:bg-[#f4f4f0] text-[#434844] font-body text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span>{t(currentLanguage, 'back')}</span>
        </button>

        <button
          type="button"
          onClick={handleAccept}
          className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#c27b66] hover:bg-[#a96552] text-[#ffffff] font-body text-base font-semibold transition-all shadow-sm flex items-center justify-center gap-3 active:translate-y-0.5"
        >
          <span>{t(currentLanguage, 'acceptConsent')}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
