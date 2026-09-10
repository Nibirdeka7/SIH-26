import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Modal } from 'react-native';
import { Header } from './src/components/Header';
import { TrustStrip } from './src/components/TrustStrip';
import { ProgressTracker } from './src/components/ProgressTracker';
import { HelpDrawer } from './src/components/HelpDrawer';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { LanguageSelectScreen } from './src/screens/LanguageSelectScreen';
import { IdentifyScreen } from './src/screens/IdentifyScreen';
import { ConsentScreen } from './src/screens/ConsentScreen';
import { ClinicalHistoryScreen } from './src/screens/ClinicalHistoryScreen';
import { DocumentScanScreen } from './src/screens/DocumentScanScreen';
import { ReviewSubmitScreen } from './src/screens/ReviewSubmitScreen';
import { ConfirmationScreen } from './src/screens/ConfirmationScreen';
import { COLORS } from './src/theme/tokens';
import { SessionProvider, useSession } from './src/context/SessionContext';

/**
 * Inner Application Shell utilizing global SessionContext state
 */
function MainAppContent() {
  const {
    currentRoute,
    lang,
    showHelpModal,
    setShowHelpModal,
    showLangModal,
    setShowLangModal,
    isSpeaking,
    setIsSpeaking,
  } = useSession();

  // Step indicator mapping (1-5)
  const getStepNumber = () => {
    switch (currentRoute) {
      case 'identify':
      case 'consent':
      case 'language':
        return 1;
      case 'history':
        return 2;
      case 'documents':
        return 3;
      case 'review':
        return 4;
      case 'submitted':
        return 5;
      default:
        return 1;
    }
  };

  // Cross-platform Audio Text-To-Speech handler
  const handleToggleSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const textToSpeak = lang === 'hi'
          ? 'MediKiosk स्वास्थ्य पोर्टल में आपका स्वागत है। बोलकर या टैप करके उत्तर दें।'
          : 'Welcome to MediKiosk health portal. Please speak or tap to answer questions.';
        const msg = new SpeechSynthesisUtterance(textToSpeak);
        msg.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        msg.onend = () => setIsSpeaking(false);
        msg.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(msg);
      }
    }
  };

  // Speak question audio handler
  const handlePlayQuestionAudio = (qText) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(qText);
      u.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.deepNavy} barStyle="light-content" />

      {/* Global Header Banner */}
      <Header
        onToggleSpeech={handleToggleSpeech}
        onSelectLanguage={() => setShowLangModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
      />

      {/* Trust Strip */}
      <TrustStrip />

      {/* Step Progress Tracker */}
      {currentRoute !== 'welcome' && (
        <ProgressTracker currentStep={getStepNumber()} />
      )}

      {/* Route Views Container */}
      <View style={styles.screenContainer}>
        {currentRoute === 'welcome' && <WelcomeScreen />}
        {currentRoute === 'language' && <LanguageSelectScreen />}
        {currentRoute === 'identify' && <IdentifyScreen />}
        {currentRoute === 'consent' && (
          <ConsentScreen onPlayAudioExplanation={handleToggleSpeech} />
        )}
        {currentRoute === 'history' && (
          <ClinicalHistoryScreen onPlayQuestionAudio={handlePlayQuestionAudio} />
        )}
        {currentRoute === 'documents' && <DocumentScanScreen />}
        {currentRoute === 'review' && <ReviewSubmitScreen />}
        {currentRoute === 'submitted' && <ConfirmationScreen />}
      </View>

      {/* Language Modal */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LanguageSelectScreen />
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <HelpDrawer
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </SafeAreaView>
  );
}

/**
 * Root Application Entry point wrapping with SessionProvider
 */
export default function App() {
  return (
    <SessionProvider>
      <MainAppContent />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayBackground,
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    maxHeight: '85%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
