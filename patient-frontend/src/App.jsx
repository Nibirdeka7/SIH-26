import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import LanguageSelectStep from './components/LanguageSelectStep';
import PatientAuthStep from './components/PatientAuthStep';
import PrivacyConsentStep from './components/PrivacyConsentStep';
import PatientHomeStep from './components/PatientHomeStep';
import SymptomIntakeStep from './components/SymptomIntakeStep';
import DocumentScanStep from './components/DocumentScanStep';
import SummaryReviewStep from './components/SummaryReviewStep';
import QueueTicketStep from './components/QueueTicketStep';
import CriticalAlertModal from './components/CriticalAlertModal';

import { conversationService } from './services/conversation_api';
import { summaryService } from './services/summary_api';
import { sharedDbService } from './services/sharedDbService';

export default function App() {
  // Accessibility & System Preferences
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('medikiosk_language') || 'hi';
  });
  const [textSize, setTextSize] = useState('md'); // 'md', 'lg', 'xl'
  const [audioGuideOn, setAudioGuideOn] = useState(true);

  // Persist language selection
  const handleSetLanguage = (lang) => {
    setCurrentLanguage(lang);
    localStorage.setItem('medikiosk_language', lang);
  };

  // Workflow Navigation Step Index (0 through 7)
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Patient & Clinical Session State
  const [sessionId, setSessionId] = useState(null);
  const [patientData, setPatientData] = useState({
    name: 'Rajesh Sharma',
    age: '42',
    gender: 'male',
    mobile: '9876543210',
    abhaNumber: null,
  });

  const [ayushMode, setAyushMode] = useState(false);
  const [triagePriority, setTriagePriority] = useState(null);
  const [isCritical, setIsCritical] = useState(false);
  const [redFlags, setRedFlags] = useState([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Conversation Stream State
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [suggestedOptions, setSuggestedOptions] = useState([]);
  const [audioBase64, setAudioBase64] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Document OCR & Clinical Summary
  const [extractedDocs, setExtractedDocs] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [ticketData, setTicketData] = useState(null);

  // Speech Recognition API Reference
  const recognitionRef = useRef(null);
  // Keep a ref to the latest handleSendMessage so speech callbacks don't stale-close over it
  const sendMessageRef = useRef(null);

  // Synchronize Text Size to Document Element
  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize);
  }, [textSize]);

  // Session Recovery on Mount / Page Refresh
  useEffect(() => {
    const savedSessionId = localStorage.getItem('medikiosk_session_id');
    if (savedSessionId && !sessionId) {
      conversationService.getSessionDetails(savedSessionId)
        .then((state) => {
          setSessionId(state.session_id);
          if (state.current_question) setCurrentQuestion(state.current_question);
          if (state.triage) setTriagePriority(state.triage.triage_level);
          if (state.turns && state.turns.length > 0) {
            const restoredMsgs = [];
            state.turns.forEach((t) => {
              restoredMsgs.push({ sender: 'user', text: t.text_native || t.text_english });
            });
            if (state.current_question) {
              restoredMsgs.push({ sender: 'bot', text: state.current_question.text_native || state.current_question.text_english });
            }
            setMessages(restoredMsgs);
          }
        })
        .catch((err) => {
          console.warn('Session recovery notice:', err);
        });
    }
  }, []);


  // Setup Web Speech API for Browser Voice Input — only once on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      if (transcript && sendMessageRef.current) {
        sendMessageRef.current(transcript);
      }
    };

    rec.onerror = (err) => {
      console.warn('Speech recognition error:', err);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try { rec.abort(); } catch (_) {}
    };
  // Only run once on mount — lang changes handled in handleToggleListening
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle Voice Recognition Listening
  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported on this browser. Please type your response.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      const langCodeMap = {
        hi: 'hi-IN',
        en: 'en-US',
        bn: 'bn-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        mr: 'mr-IN',
        gu: 'gu-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
        as: 'as-IN',
      };
      recognitionRef.current.lang = langCodeMap[currentLanguage] || 'hi-IN';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Start Real Session with Conversation Service
  const handleStartSession = async (customPatientData = patientData) => {
    try {
      const result = await conversationService.startSession({
        patientId: customPatientData.mobile || `p_${Date.now()}`,
        name: customPatientData.name,
        age: customPatientData.age,
        gender: customPatientData.gender,
        preferredLanguage: currentLanguage,
      });

      setSessionId(result.session_id);
      localStorage.setItem('medikiosk_session_id', result.session_id);
      if (result.current_question) setCurrentQuestion(result.current_question);

      if (result.suggested_options) setSuggestedOptions(result.suggested_options);
      if (result.audio_base64) setAudioBase64(result.audio_base64);

      sharedDbService.broadcast('NEW_SESSION', {
        session_id: result.session_id,
        patient_name: customPatientData.name,
        age: customPatientData.age,
        gender: customPatientData.gender,
        language: currentLanguage,
        chief_complaint: 'Patient check-in initiated',
      });

      const greeting = result.question || 'Hello, what health symptoms are you experiencing today?';
      setMessages([{ sender: 'bot', text: greeting }]);
    } catch (err) {
      console.warn('Session start error:', err);
      const fallbackId = `sess_${Date.now()}`;
      setSessionId(fallbackId);
      setMessages([
        {
          sender: 'bot',
          text: 'नमस्ते! MediKiosk स्वास्थ्य सहायक में आपका स्वागत है। अपनी तकलीफ विस्तार से बताएं। (Hello! Welcome to MediKiosk Health. Please describe your symptoms.)',
        },
      ]);
    }
  };

  // Ensure valid backend session exists
  const ensureActiveSession = async () => {
    if (sessionId) return sessionId;
    try {
      const result = await conversationService.startSession({
        patientId: patientData.mobile || `p_${Date.now()}`,
        name: patientData.name,
        age: patientData.age,
        gender: patientData.gender,
        preferredLanguage: currentLanguage,
      });
      setSessionId(result.session_id);
      localStorage.setItem('medikiosk_session_id', result.session_id);
      if (result.current_question) setCurrentQuestion(result.current_question);
      if (result.suggested_options) setSuggestedOptions(result.suggested_options);
      if (result.audio_base64) setAudioBase64(result.audio_base64);
      return result.session_id;
    } catch (err) {
      console.warn('Auto start session error:', err);
      const fallbackId = `sess_${Date.now()}`;
      setSessionId(fallbackId);
      return fallbackId;
    }
  };

  // Process Dialogue Turn (Voice, Touch Option, or Text)
  const handleSendMessage = async (text, selectedOption = null) => {
    // Keep ref up-to-date for speech recognition callback
    sendMessageRef.current = handleSendMessage;
    const userText = text || selectedOption;
    if (!userText) return;

    const activeSessId = await ensureActiveSession();
    const userMsg = { sender: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      let response;
      try {
        response = await conversationService.submitTurn({
          sessionId: activeSessId,
          text: text || '',
          selectedOption: selectedOption || null,
          language: currentLanguage,
        });
      } catch (firstErr) {
        console.warn('First turn submit failed, re-starting session and retrying:', firstErr);
        // Session likely missing on backend db, re-create session & retry
        const freshSessId = await conversationService.startSession({
          patientId: patientData.mobile || `p_${Date.now()}`,
          name: patientData.name,
          age: patientData.age,
          gender: patientData.gender,
          preferredLanguage: currentLanguage,
        }).then((res) => {
          setSessionId(res.session_id);
          localStorage.setItem('medikiosk_session_id', res.session_id);
          return res.session_id;
        });

        response = await conversationService.submitTurn({
          sessionId: freshSessId,
          text: text || '',
          selectedOption: selectedOption || null,
          language: currentLanguage,
        });
      }

      if (response.triage_priority) setTriagePriority(response.triage_priority);
      if (response.is_critical) {
        setIsCritical(true);
        setRedFlags(response.red_flags || ['Acute Emergency Red Flag Triggered']);
        setShowEmergencyModal(true);
      }

      if (response.current_question) setCurrentQuestion(response.current_question);
      if (response.suggested_options) setSuggestedOptions(response.suggested_options);
      if (response.audio_base64) setAudioBase64(response.audio_base64);

      const botMsg = {
        sender: 'bot',
        text: response.question || 'Thank you. Please describe your symptoms further.',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Turn processing final error:', err);
      const botMsg = {
        sender: 'bot',
        text: 'System connection error. Please try typing your response again.',
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectOption = (optionLabel) => {
    handleSendMessage(null, optionLabel);
  };

  // Body Map Selection
  const handleSelectBodyRegion = (region) => {
    const text = `I feel discomfort in my ${region.name} (${region.quickSymptoms || 'pain & discomfort'}).`;
    setActiveStepIndex(4);
    handleSendMessage(text);
  };


  // Generate Summary with Summary Service
  const handleFinishIntake = async () => {
    setIsProcessing(true);
    const activeSessId = sessionId || `sess_${Date.now()}`;
    try {
      const summary = await summaryService.generateSummary(activeSessId, currentLanguage);
      setSummaryData(summary);
      setActiveStepIndex(6);
    } catch (err) {
      console.warn('Summary generation fallback (backend may be offline):', err.message);
      const userMessages = messages.filter((m) => m.sender === 'user').map((m) => m.text);
      setSummaryData({
        summary_id: activeSessId,
        session_id: activeSessId,
        chief_complaint: userMessages.join('; ') || 'Symptoms described during interview',
        suggested_specialty: triagePriority === 'P1_CRITICAL' ? 'Emergency Medicine' : 'General Medicine OPD',
        recommended_specialty: triagePriority === 'P1_CRITICAL' ? 'Emergency Medicine' : 'General Medicine OPD',
        unverified_medications: [],
        triage_category: triagePriority || 'P2_URGENT',
        triage_assessment: {
          triage_level: triagePriority || 'ROUTINE',
          is_critical: isCritical,
          red_flags: redFlags,
        },
        bilingual_recap_native: userMessages.length > 0
          ? `मरीज ने बताया: ${userMessages.slice(0, 2).join('; ')}`
          : 'लक्षण दर्ज किए गए।',
        is_confirmed_by_doctor: false,
      });
      setActiveStepIndex(6);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm Summary & Issue Digital Queue Ticket
  const handleConfirmAndGenerateTicket = async (finalSummary) => {
    try {
      if (summaryData && summaryData.summary_id) {
        await summaryService.confirmSummary(summaryData.summary_id, true, 'Confirmed by patient');
      }
    } catch (err) {
      console.warn('Confirm summary API warning:', err);
    }

    setTicketData({
      ticket_number: `OPD-${Math.floor(1000 + Math.random() * 9000)}`,
      specialty: finalSummary.suggested_specialty || finalSummary.recommended_specialty || 'General Medicine',
      room_number: 'Room 104 (Block B)',
      estimated_wait: triagePriority === 'P1_CRITICAL' ? '0 Mins (Immediate ER)' : '10 - 15 Mins',
      priority: triagePriority || 'P2_URGENT',
    });
    setActiveStepIndex(7);
  };

  const handleCycleTextSize = () => {
    if (textSize === 'md') setTextSize('lg');
    else if (textSize === 'lg') setTextSize('xl');
    else setTextSize('md');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5]">
      {/* Botanical Header */}
      <Header
        activeStepIndex={activeStepIndex}
        onNavigateStep={(stepIdx) => setActiveStepIndex(stepIdx)}
        currentLanguage={currentLanguage}
        onLanguageChange={handleSetLanguage}
        audioGuideOn={audioGuideOn}
        onToggleAudioGuide={() => setAudioGuideOn(!audioGuideOn)}
        textSize={textSize}
        onCycleTextSize={handleCycleTextSize}
        onTriggerEmergency={() => setShowEmergencyModal(true)}
        triagePriority={triagePriority}
      />

      {/* Main Workflow View Routing */}
      <main className="flex-1 pt-24 pb-12">
        {/* Step 0: Welcome & Language Selection */}
        {activeStepIndex === 0 && (
          <LanguageSelectStep
            selectedLanguage={currentLanguage}
            onSelectLanguage={handleSetLanguage}
            onContinue={() => setActiveStepIndex(1)}
          />
        )}

        {/* Step 1: Patient Identity / ABHA Check-In & Guest Login */}
        {activeStepIndex === 1 && (
          <PatientAuthStep
            currentLanguage={currentLanguage}
            patientData={patientData}
            onUpdatePatientData={setPatientData}
            onStartSession={(updatedData) => {
              handleStartSession(updatedData);
              setActiveStepIndex(2);
            }}
            onBack={() => setActiveStepIndex(0)}
          />
        )}

        {/* Step 2: Privacy & DPDP Digital Consent */}
        {activeStepIndex === 2 && (
          <PrivacyConsentStep
            currentLanguage={currentLanguage}
            onAcceptConsent={() => setActiveStepIndex(3)}
            onBack={() => setActiveStepIndex(1)}
          />
        )}

        {/* Step 3: Patient Home Dashboard */}
        {activeStepIndex === 3 && (
          <PatientHomeStep
            currentLanguage={currentLanguage}
            patientName={patientData.name}
            onStartVoiceIntake={() => {
              setActiveStepIndex(4);
              handleToggleListening();
            }}
            onStartTextIntake={() => setActiveStepIndex(4)}
            onStartDocumentScan={() => setActiveStepIndex(5)}
            onSelectBodyRegion={handleSelectBodyRegion}
          />
        )}

        {/* Step 4: Symptom Intake & Dynamic Interview */}
        {activeStepIndex === 4 && (
          <SymptomIntakeStep
            sessionId={sessionId}
            messages={messages}
            currentQuestion={currentQuestion}
            suggestedOptions={suggestedOptions}
            audioBase64={audioBase64}
            onSendMessage={handleSendMessage}
            onSelectOption={handleSelectOption}
            isListening={isListening}
            onToggleListening={handleToggleListening}
            isProcessing={isProcessing}
            currentLanguage={currentLanguage}
            ayushMode={ayushMode}
            onToggleAyushMode={() => setAyushMode(!ayushMode)}
            onFinishIntake={handleFinishIntake}
            onSelectBodyRegion={handleSelectBodyRegion}
          />
        )}

        {/* Step 5: Document Scanner & OCR Upload */}
        {activeStepIndex === 5 && (
          <DocumentScanStep
            currentLanguage={currentLanguage}
            sessionId={sessionId}
            extractedDocs={extractedDocs}
            onDocumentExtracted={(doc) => setExtractedDocs((prev) => [...prev, doc])}
            onRemoveDocument={(docId) =>
              setExtractedDocs((prev) =>
                prev.filter((d, i) =>
                  typeof docId === 'number' ? i !== docId : d.document_id !== docId
                )
              )
            }
            onProceedToReview={handleFinishIntake}
            onBack={() => setActiveStepIndex(4)}
          />
        )}

        {/* Step 6: Doctor Summary Review */}
        {activeStepIndex === 6 && (
          <SummaryReviewStep
            currentLanguage={currentLanguage}
            summaryData={summaryData}
            patientData={patientData}
            extractedDocs={extractedDocs}
            onConfirmAndGenerateTicket={handleConfirmAndGenerateTicket}
            onBack={() => setActiveStepIndex(4)}
          />
        )}

        {/* Step 7: Digital Queue Ticket & Live Status */}
        {activeStepIndex === 7 && (
          <QueueTicketStep
            currentLanguage={currentLanguage}
            ticketData={ticketData}
            patientData={patientData}
            onNewSession={() => {
              setSessionId(null);
              setMessages([]);
              setExtractedDocs([]);
              setSummaryData(null);
              setTicketData(null);
              setTriagePriority(null);
              setIsCritical(false);
              setActiveStepIndex(0);
            }}
          />
        )}
      </main>

      {/* Critical Emergency Modal Alert */}
      <CriticalAlertModal
        isOpen={showEmergencyModal}
        redFlags={redFlags}
        onClose={() => setShowEmergencyModal(false)}
      />
    </div>
  );
}
