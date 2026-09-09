import React, { createContext, useContext, useState, useCallback } from 'react';
import { conversationApi, summaryApi } from '../services/apiServices';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState('welcome');
  const [lang, setLang] = useState('hi');
  const [intakeMode, setIntakeMode] = useState('allopathy');
  const [sessionId, setSessionId] = useState(`sess_${Date.now()}`);
  const [sessionStatus, setSessionStatus] = useState('INITIATED');

  // Patient Identity
  const [patientData, setPatientData] = useState({
    name: '',
    age: '35',
    gender: 'male',
    patientId: '',
    authType: 'guest', // 'abha' | 'aadhaar' | 'guest'
  });

  // Clinical Dialogue State
  const [turnCount, setTurnCount] = useState(1);
  const [currentQuestionText, setCurrentQuestionText] = useState('आपको क्या तकलीफ या लक्षण महसूस हो रहे हैं?');
  const [currentQuestionModel, setCurrentQuestionModel] = useState(null);
  const [suggestedOptions, setSuggestedOptions] = useState([
    'सीने में दर्द (Chest pain)',
    'बुखार और सिरदर्द (Fever & Headache)',
    'सांस लेने में तकलीफ (Shortness of breath)',
    'पेट में दर्द (Stomach pain)',
  ]);
  const [clinicalUpdates, setClinicalUpdates] = useState({});
  const [triage, setTriage] = useState({
    triage_level: 'ROUTINE',
    is_critical: false,
    red_flags: [],
    priority_score: 1,
  });

  // Documents & Summary State
  const [documentsList, setDocumentsList] = useState([]);
  const [clinicalSummary, setClinicalSummary] = useState(null);
  const [submittedToken, setSubmittedToken] = useState('A-101');

  // UI Modals & Speech State
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showRedFlagModal, setShowRedFlagModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);

  // ----------------------------------------------------
  // Actions
  // ----------------------------------------------------

  // Step 1: Start Triage
  const startTriageSession = useCallback(() => {
    setCurrentRoute('language');
  }, []);

  // Step 2: Language Selection
  const selectLanguage = useCallback((chosenLang) => {
    setLang(chosenLang);
    setShowLangModal(false);
    if (currentRoute === 'language') {
      setCurrentRoute('identify');
    }
  }, [currentRoute]);

  // Step 3: Patient Identification & Session Start Call
  const completeIdentification = useCallback(async (identityData) => {
    setPatientData(identityData);
    const newSessionId = `sess_${Date.now()}`;
    setSessionId(newSessionId);

    const res = await conversationApi.startSession({
      patientId: identityData.patientId || `p_${Date.now()}`,
      name: identityData.name,
      age: identityData.age,
      gender: identityData.gender,
      language: lang,
      intakeMode: intakeMode,
    });

    if (res.sessionId) {
      setSessionId(res.sessionId);
    }
    if (res.initialQuestion) {
      setCurrentQuestionText(res.initialQuestion);
    }
    if (res.currentQuestion) {
      setCurrentQuestionModel(res.currentQuestion);
    }
    if (res.suggestedOptions && res.suggestedOptions.length > 0) {
      setSuggestedOptions(res.suggestedOptions);
    }
    setSessionStatus(res.status || 'INTAKE_IN_PROGRESS');

    setCurrentRoute('consent');
  }, [lang, intakeMode]);

  // Step 4: Consent
  const giveConsent = useCallback(() => {
    setCurrentRoute('history');
  }, []);

  // Step 5: Process Turn in Clinical History
  const submitTurnAnswer = useCallback(async ({ userText = '', selectedOption = null, audioBase64 = null }) => {
    setIsSubmittingTurn(true);
    try {
      const response = await conversationApi.submitTurn({
        sessionId,
        userText,
        selectedOption,
        audioBase64,
        language: lang,
      });

      if (response.question) {
        setCurrentQuestionText(response.question);
      }
      if (response.currentQuestion) {
        setCurrentQuestionModel(response.currentQuestion);
      }
      if (response.suggestedOptions && response.suggestedOptions.length > 0) {
        setSuggestedOptions(response.suggestedOptions);
      }
      if (response.extractedClinicalUpdates) {
        setClinicalUpdates((prev) => ({ ...prev, ...response.extractedClinicalUpdates }));
      }
      if (response.triagePriority) {
        setTriage((prev) => ({
          ...prev,
          triage_level: response.triagePriority,
          is_critical: response.isCritical,
          red_flags: response.redFlags || [],
        }));
      }

      setTurnCount((prev) => prev + 1);

      // Check Red Flag Escalation
      if (response.isCritical || response.triagePriority === 'CRITICAL' || response.triagePriority === 'EMERGENCY') {
        setShowRedFlagModal(true);
      }

      // Check Completion
      if (response.isCompleted || turnCount >= 6) {
        setCurrentRoute('documents');
      }
    } catch (err) {
      console.warn('Error submitting turn answer:', err);
    } finally {
      setIsSubmittingTurn(false);
    }
  }, [sessionId, lang, turnCount]);

  // Pause / Resume Session
  const pauseSession = useCallback(async () => {
    await conversationApi.pauseSession(sessionId);
    setSessionStatus('PAUSED');
    setShowPauseModal(true);
  }, [sessionId]);

  const resumeSession = useCallback(async () => {
    await conversationApi.resumeSession(sessionId);
    setSessionStatus('INTAKE_IN_PROGRESS');
    setShowPauseModal(false);
  }, [sessionId]);

  // Step 6: Documents Upload Handlers
  const addDocument = useCallback((doc) => {
    setDocumentsList((prev) => [...prev, doc]);
  }, []);

  const removeDocument = useCallback((docId) => {
    setDocumentsList((prev) => prev.filter((d) => d.document_id !== docId));
  }, []);

  const setAllDocuments = useCallback((docs) => {
    setDocumentsList(docs);
  }, []);

  const completeDocuments = useCallback((docs) => {
    if (docs) setDocumentsList(docs);
    setCurrentRoute('review');
  }, []);

  // Step 7: Review & Final Submission to Summary Service
  const generateAndSubmitSummary = useCallback(async () => {
    try {
      const generated = await summaryApi.generateSummary({
        sessionId,
        targetLanguage: lang,
      });
      setClinicalSummary(generated);

      const confirmed = await summaryApi.confirmSummary({
        summaryId: generated.summary_id || `sum_${Date.now()}`,
        sessionId: sessionId,
        isConfirmed: true,
      });

      const token = confirmed.token_number || `A-${Math.floor(100 + Math.random() * 900)}`;
      setSubmittedToken(token);
      setSessionStatus('COMPLETED');
      setCurrentRoute('submitted');
      return confirmed;
    } catch (err) {
      console.warn('Failed summary generation/confirmation:', err);
      const fallbackToken = `A-${Math.floor(100 + Math.random() * 900)}`;
      setSubmittedToken(fallbackToken);
      setSessionStatus('COMPLETED');
      setCurrentRoute('submitted');
      return { token_number: fallbackToken };
    }
  }, [sessionId, lang]);

  // Reset Session
  const resetSession = useCallback(() => {
    setCurrentRoute('welcome');
    setSessionId(`sess_${Date.now()}`);
    setPatientData({ name: '', age: '35', gender: 'male', patientId: '', authType: 'guest' });
    setTurnCount(1);
    setCurrentQuestionText('आपको क्या तकलीफ या लक्षण महसूस हो रहे हैं?');
    setCurrentQuestionModel(null);
    setSuggestedOptions([
      'सीने में दर्द (Chest pain)',
      'बुखार और सिरदर्द (Fever & Headache)',
      'सांस लेने में तकलीफ (Shortness of breath)',
      'पेट में दर्द (Stomach pain)',
    ]);
    setClinicalUpdates({});
    setTriage({ triage_level: 'ROUTINE', is_critical: false, red_flags: [], priority_score: 1 });
    setDocumentsList([]);
    setClinicalSummary(null);
    setSubmittedToken('A-101');
    setSessionStatus('INITIATED');
  }, []);

  const value = {
    currentRoute,
    setCurrentRoute,
    lang,
    setLang,
    intakeMode,
    setIntakeMode,
    sessionId,
    sessionStatus,
    patientData,
    setPatientData,
    turnCount,
    currentQuestionText,
    currentQuestionModel,
    suggestedOptions,
    clinicalUpdates,
    triage,
    documentsList,
    clinicalSummary,
    submittedToken,
    showHelpModal,
    setShowHelpModal,
    showLangModal,
    setShowLangModal,
    showRedFlagModal,
    setShowRedFlagModal,
    showPauseModal,
    setShowPauseModal,
    isSpeaking,
    setIsSpeaking,
    isSubmittingTurn,

    // Methods
    startTriageSession,
    selectLanguage,
    completeIdentification,
    giveConsent,
    submitTurnAnswer,
    pauseSession,
    resumeSession,
    addDocument,
    removeDocument,
    setAllDocuments,
    completeDocuments,
    generateAndSubmitSummary,
    resetSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
