import React, { useState } from 'react';
import { Fingerprint, UserPlus, Mic, Send, ShieldCheck, ArrowRight, ArrowLeft, PhoneCall, CheckCircle2 } from 'lucide-react';
import { t } from '../utils/translations';

export default function PatientAuthStep({
  currentLanguage = 'hi',
  patientData,
  onUpdatePatientData,
  onStartSession,
  onBack,
}) {
  const [authMethod, setAuthMethod] = useState('guest'); // 'abha' or 'guest'
  const [abhaNumber, setAbhaNumber] = useState(patientData.abhaNumber || '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const [name, setName] = useState(patientData.name || '');
  const [age, setAge] = useState(patientData.age || '35');
  const [gender, setGender] = useState(patientData.gender || 'male');
  const [mobile, setMobile] = useState(patientData.mobile || '');
  const [isListeningMic, setIsListeningMic] = useState(false);

  const handleSendOtp = () => {
    if (!abhaNumber.trim()) {
      alert('Please enter your ABHA number or linked mobile number.');
      return;
    }
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    if (otpCode.length === 6 || otpCode === '123456') {
      setOtpVerified(true);
      onUpdatePatientData({ abhaNumber, isAbhaVerified: true });
    } else {
      alert('Please enter a valid 6-digit OTP code (Demo OTP: 123456)');
    }
  };

  const handleVoiceInputName = () => {
    setIsListeningMic(true);
    setTimeout(() => {
      setName('Rajesh Sharma');
      setIsListeningMic(false);
    }, 1800);
  };

  const handleSubmitAuth = () => {
    if (authMethod === 'abha' && !otpVerified && abhaNumber) {
      alert('Please verify the OTP sent to your ABHA-linked phone number.');
      return;
    }

    if (authMethod === 'guest' && (!name.trim() || !mobile.trim())) {
      alert('Please fill in your Full Name and 10-digit Mobile Number.');
      return;
    }

    const updated = {
      name: authMethod === 'abha' ? (name || 'ABHA Verified Patient') : name,
      age: parseInt(age, 10) || 35,
      gender: gender,
      mobile: mobile || abhaNumber,
      abhaNumber: authMethod === 'abha' ? abhaNumber : null,
      authMethod,
    };

    onUpdatePatientData(updated);
    onStartSession(updated);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">
      {/* Progress & Title */}
      <div className="w-full space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#d8e7ce] text-[#5b6854] flex items-center justify-center text-xs font-bold">1</span>
            <span className="font-body text-base text-[#18241c] font-semibold">
              {t(currentLanguage, 'step2')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#737873] text-xs bg-[#f4f4f0] px-3.5 py-1 rounded-full border border-[#e6e2da] w-fit">
            <ShieldCheck size={14} className="text-[#8c9a84]" />
            <span>ABDM Digital Mission Compliant</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-[#e9e8e4] rounded-full overflow-hidden">
          <div className="h-full bg-[#8c9a84] w-1/4 rounded-full transition-all duration-500"></div>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl text-[#18241c] font-semibold">
          {t(currentLanguage, 'identifyTitle')}
        </h1>
        <p className="font-body text-base text-[#434844]">
          {t(currentLanguage, 'identifySubtitle')}
        </p>
      </div>

      {/* Auth Method Selection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Card: ABHA Path */}
        <section
          onClick={() => setAuthMethod('abha')}
          className={`lg:col-span-6 rounded-3xl p-6 lg:p-8 shadow-sm transition-all relative overflow-hidden cursor-pointer border ${authMethod === 'abha'
              ? 'bg-[#ffffff] border-[#2d3a31] ring-2 ring-[#2d3a31]'
              : 'bg-[#ffffff] border-[#e6e2da] hover:border-[#8c9a84]'
            }`}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-[#d8e7ce] text-[#5b6854] px-3 py-1 rounded-full text-xs font-semibold">
              <Fingerprint size={14} />
              Fast Track / तेज़ पर्ची
            </span>
            <span className="text-xs text-[#8c9a84] font-semibold">ABHA Card / आभा</span>
          </div>

          <h2 className="font-display text-xl text-[#18241c] font-semibold mb-2">Continue with ABHA / Ayushman Card</h2>
          <p className="font-body text-sm text-[#434844] mb-6 leading-relaxed">
            Ayushman Bharat Health Account lets the hospital fetch your past verified records automatically. Enter your 14-digit ABHA number or linked mobile.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-body text-xs font-semibold text-[#18241c] mb-1.5" htmlFor="abha-input">
                ABHA Number or Linked Mobile <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="abha-input"
                  type="text"
                  value={abhaNumber}
                  onChange={(e) => setAbhaNumber(e.target.value)}
                  placeholder="e.g. 91-4582-8921-9904"
                  className="w-full h-12 pl-4 pr-10 rounded-2xl bg-[#faf9f5] border border-[#e6e2da] text-sm text-[#18241c] focus:outline-none"
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                type="button"
                onClick={handleSendOtp}
                className="h-11 px-6 rounded-full bg-[#8c9a84] text-[#ffffff] text-xs font-semibold flex items-center gap-2 shadow-sm hover:bg-[#5b6854] transition-colors"
              >
                <Send size={14} />
                <span>Send OTP / ओटीपी भेजें</span>
              </button>
            ) : (
              <div className="p-4 bg-[#f4f4f0] rounded-2xl border border-[#e6e2da] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#18241c]">
                  <span>Enter 6-Digit OTP</span>
                  {otpVerified && <span className="text-[#5b6854] font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Verified</span>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full h-11 text-center font-display text-lg tracking-widest rounded-xl bg-[#ffffff] border border-[#e6e2da]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="h-11 px-4 rounded-xl bg-[#2d3a31] text-[#ffffff] text-xs font-semibold"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Card: Guest Path */}
        <section
          onClick={() => setAuthMethod('guest')}
          className={`lg:col-span-6 rounded-3xl p-6 lg:p-8 shadow-sm transition-all relative overflow-hidden cursor-pointer border ${authMethod === 'guest'
              ? 'bg-[#ffffff] border-[#2d3a31] ring-2 ring-[#2d3a31]'
              : 'bg-[#ffffff] border-[#e6e2da] hover:border-[#8c9a84]'
            }`}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-[#efeeea] text-[#18241c] px-3 py-1 rounded-full text-xs font-semibold">
              <UserPlus size={14} />
              Direct Check-in / नया पर्चा
            </span>
            <span className="text-xs text-[#737873] font-medium">Quick Token</span>
          </div>

          <h2 className="font-display text-xl text-[#18241c] font-semibold mb-2">Continue as Guest / New Patient</h2>
          <p className="font-body text-sm text-[#434844] mb-6 leading-relaxed">
            No health card required. Just enter your name, age, and phone number to receive your digital queue ticket and clinical pre-assessment.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-body text-xs font-semibold text-[#18241c]" htmlFor="guest-name">
                  {t(currentLanguage, 'patientName')} <span className="text-[#ba1a1a]">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleVoiceInputName}
                  className="inline-flex items-center gap-1 text-[#8c9a84] text-xs font-semibold hover:underline"
                >
                  <Mic size={14} className={isListeningMic ? 'animate-pulse text-[#c27b66]' : ''} />
                  <span>{isListeningMic ? t(currentLanguage, 'listening') : 'Speak Name'}</span>
                </button>
              </div>
              <input
                id="guest-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(currentLanguage, 'enterName')}
                className="w-full h-12 px-4 rounded-2xl bg-[#faf9f5] border border-[#e6e2da] text-sm text-[#18241c] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block font-body text-xs font-semibold text-[#18241c] mb-1.5" htmlFor="guest-age">
                  {t(currentLanguage, 'age')} <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  id="guest-age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="35"
                  className="w-full h-12 px-4 text-center rounded-2xl bg-[#faf9f5] border border-[#e6e2da] text-sm text-[#18241c]"
                />
              </div>

              <div className="sm:col-span-8">
                <span className="block font-body text-xs font-semibold text-[#18241c] mb-1.5">{t(currentLanguage, 'gender')}</span>
                <div className="flex items-center gap-1.5 h-12">
                  {['female', 'male', 'other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 h-full rounded-full text-xs font-semibold capitalize transition-colors ${gender === g
                          ? 'bg-[#2d3a31] text-[#ffffff]'
                          : 'bg-[#f4f4f0] text-[#434844] hover:bg-[#d8e7ce]'
                        }`}
                    >
                      {t(currentLanguage, g)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-body text-xs font-semibold text-[#18241c] mb-1.5" htmlFor="guest-mobile">
                {t(currentLanguage, 'mobileNumber')} <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 font-body text-xs text-[#737873] font-semibold">+91</span>
                <input
                  id="guest-mobile"
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder={t(currentLanguage, 'enterMobile')}
                  className="w-full h-12 pl-14 pr-4 rounded-2xl bg-[#faf9f5] border border-[#e6e2da] text-sm text-[#18241c]"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Sahayak Assistance Banner */}
      <div className="w-full bg-[#f4f4f0] rounded-2xl p-5 border border-[#e6e2da] flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#d8e7ce] text-[#5b6854] flex items-center justify-center shrink-0">
            <PhoneCall size={22} />
          </div>
          <div>
            <h3 className="font-display text-base text-[#18241c] font-semibold">Need assistance or finding reading difficult?</h3>
            <p className="font-body text-xs text-[#434844]">Hospital Sahayak (Patient Navigator) is standing by Kiosk Station #04 to help.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => alert('Hospital Sahayak has been notified. Staff will arrive at your kiosk within 60 seconds.')}
          className="h-11 px-5 rounded-full bg-[#ffffff] hover:bg-[#efeeea] text-[#18241c] font-body text-xs font-semibold border border-[#e6e2da] transition-colors"
        >
          Call Sahayak to Kiosk / सहायक बुलाएं
        </button>
      </div>

      {/* Action Deck */}
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
          onClick={handleSubmitAuth}
          className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#c27b66] hover:bg-[#a96552] text-[#ffffff] font-body text-base font-semibold transition-all shadow-sm flex items-center justify-center gap-3 active:translate-y-0.5"
        >
          <span>{t(currentLanguage, 'startIntake')}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
