import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { VoiceRecorderCard } from '../components/VoiceRecorderCard';
import { TouchOptionsGrid } from '../components/TouchOptionsGrid';
import { UnderstoodSummaryCard } from '../components/UnderstoodSummaryCard';
import { RedFlagAlertModal } from '../components/RedFlagAlertModal';
import { useSession } from '../context/SessionContext';

export const ClinicalHistoryScreen = ({
  onPlayQuestionAudio,
}) => {
  const {
    sessionId,
    lang,
    turnCount,
    currentQuestionText,
    currentQuestionModel,
    suggestedOptions,
    clinicalUpdates,
    triage,
    audioBase64,
    isSubmittingTurn,
    submitTurnAnswer,
    pauseSession,
    resumeSession,
    setCurrentRoute,
    showRedFlagModal,
    setShowRedFlagModal,
    showPauseModal,
    setShowPauseModal,
  } = useSession();

  const [inputMode, setInputMode] = useState('speak'); // 'speak' | 'tap' | 'type'
  const [typeText, setTypeText] = useState('');

  // Auto-play AI question voice audio when turn updates
  React.useEffect(() => {
    if (audioBase64) {
      try {
        const audioSrc = audioBase64.startsWith('data:') ? audioBase64 : `data:audio/mp3;base64,${audioBase64}`;
        const audio = new Audio(audioSrc);
        audio.play().catch((err) => console.warn('[ClinicalHistory] Auto-play audio notice:', err));
      } catch (e) {
        console.warn('[ClinicalHistory] Audio init notice:', e);
      }
    }
  }, [audioBase64, currentQuestionText]);

  const handlePlayAudio = () => {
    const textToSpeak = currentQuestionModel?.text_native || currentQuestionText;
    if (audioBase64) {
      try {
        const audioSrc = audioBase64.startsWith('data:') ? audioBase64 : `data:audio/mp3;base64,${audioBase64}`;
        const audio = new Audio(audioSrc);
        audio.play();
        return;
      } catch (e) {
        console.warn('Base64 audio playback failed:', e);
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    } else if (onPlayQuestionAudio) {
      onPlayQuestionAudio(textToSpeak);
    }
  };

  const handleAnswer = async ({ userText = '', selectedOption = null, audioBase64 = null }) => {
    await submitTurnAnswer({ userText, selectedOption, audioBase64 });
    setTypeText('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header Row with Turn Badge & Pause Button */}
      <View style={styles.topInfoRow}>
        <View style={styles.turnBadge}>
          <Text style={styles.turnBadgeText}>प्रश्न (Question) {turnCount} of 6</Text>
        </View>

        <TouchableOpacity
          style={styles.pauseButton}
          onPress={pauseSession}
          activeOpacity={0.8}
        >
          <Text style={styles.pauseButtonText}>⏸ रोकें (Pause)</Text>
        </TouchableOpacity>
      </View>

      {/* Main AI Question Card */}
      <View style={styles.questionCard}>
        <View style={styles.qHeader}>
          <Text style={styles.qIcon}>💬</Text>
          <Text style={styles.qLabel}>वर्तमान प्रश्न (Current Question):</Text>
          <TouchableOpacity
            onPress={handlePlayAudio}
            style={styles.audioPlayIcon}
          >
            <Text style={styles.audioPlayText}>🔊 सुनो</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.questionText}>
          {currentQuestionModel?.text_native || currentQuestionText}
        </Text>

        {currentQuestionModel?.text_english && lang !== 'en' ? (
          <Text style={styles.questionTextSub}>{currentQuestionModel.text_english}</Text>
        ) : null}
      </View>

      {/* SOCRATES / AYUSH Extracted Clinical Updates Card */}
      <UnderstoodSummaryCard extractedUpdates={clinicalUpdates} />

      {/* Input Mode Switcher */}
      <View style={styles.modeSelectorBar}>
        <Text style={styles.modeLabel}>उत्तर का माध्यम चुनें (Input Mode):</Text>
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'speak' && styles.modeTabActive]}
            onPress={() => setInputMode('speak')}
          >
            <Text style={[styles.modeTabText, inputMode === 'speak' && styles.modeTabTextActive]}>
              🎙 बोलकर
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'tap' && styles.modeTabActive]}
            onPress={() => setInputMode('tap')}
          >
            <Text style={[styles.modeTabText, inputMode === 'tap' && styles.modeTabTextActive]}>
              👇 टैप करके
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'type' && styles.modeTabActive]}
            onPress={() => setInputMode('type')}
          >
            <Text style={[styles.modeTabText, inputMode === 'type' && styles.modeTabTextActive]}>
              ⌨ टाइप करके
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Input Engine */}
      {isSubmittingTurn ? (
        <View style={styles.submittingIndicatorBox}>
          <ActivityIndicator size="large" color={COLORS.saffron} />
          <Text style={styles.submittingText}>FastAPI Conversation Engine द्वारा विश्लेषण जारी है...</Text>
        </View>
      ) : (
        <>
          {inputMode === 'speak' && (
            <VoiceRecorderCard
              onTranscriptComplete={(transcript) => handleAnswer({ userText: transcript })}
              disabled={isSubmittingTurn}
            />
          )}

          {inputMode === 'tap' && (
            <TouchOptionsGrid
              options={suggestedOptions}
              onSelectOption={(option) => handleAnswer({ selectedOption: option })}
              disabled={isSubmittingTurn}
            />
          )}

          {inputMode === 'type' && (
            <View style={styles.typeCard}>
              <Text style={styles.typeTitle}>अपना उत्तर लिखें:</Text>
              <TextInput
                style={styles.typeInput}
                placeholder="यहाँ अपने लक्षण विस्तार से लिखें..."
                value={typeText}
                onChangeText={setTypeText}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[styles.submitTextBtn, !typeText.trim() && styles.submitTextBtnDisabled]}
                disabled={!typeText.trim() || isSubmittingTurn}
                onPress={() => handleAnswer({ userText: typeText })}
              >
                <Text style={styles.submitTextBtnText}>उत्तर जमा करें (Submit) ►</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Complete Step Navigation Button */}
      <TouchableOpacity
        style={styles.nextStageBtn}
        onPress={() => setCurrentRoute('documents')}
        activeOpacity={0.8}
      >
        <Text style={styles.nextStageBtnText}>अगला चरण: दस्तावेज़ स्कैन (Next: Documents) ►</Text>
      </TouchableOpacity>

      {/* Red-Flag Critical Alert Modal */}
      <RedFlagAlertModal
        visible={showRedFlagModal}
        redFlags={triage.red_flags}
        onAcknowledge={() => setShowRedFlagModal(false)}
      />

      {/* Pause Dialog Modal */}
      <Modal visible={showPauseModal} transparent animationType="fade">
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseContent}>
            <Text style={styles.pauseTitle}>⏸ सत्र रोक दिया गया है (Session Paused)</Text>
            <Text style={styles.pauseSub}>
              आपकी दर्ज की गई जानकारी सुरक्षित सहेजी गई है। आप जब चाहें पुनः शुरू कर सकते हैं।
            </Text>

            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={resumeSession}
              activeOpacity={0.8}
            >
              <Text style={styles.resumeBtnText}>► सत्र पुनः शुरू करें (Resume Session)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  turnBadge: {
    backgroundColor: COLORS.navyLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.primaryNavy,
  },
  turnBadgeText: {
    color: COLORS.primaryNavy,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '800',
  },
  pauseButton: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  pauseButtonText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  questionCard: {
    backgroundColor: COLORS.deepNavy,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.xs,
    ...SHADOWS.card,
  },
  qHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  qIcon: {
    fontSize: 20,
  },
  qLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.saffron,
  },
  audioPlayIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  audioPlayText: {
    color: COLORS.textInverted,
    fontSize: 10,
    fontWeight: '700',
  },
  questionText: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '800',
    color: COLORS.textInverted,
    lineHeight: TYPOGRAPHY.lineHeights.xl,
  },
  questionTextSub: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#A0B2C6',
    fontStyle: 'italic',
  },
  modeSelectorBar: {
    marginTop: SPACING.xs,
    gap: 4,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textMuted,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  modeTab: {
    flex: 1,
    minHeight: 42,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    backgroundColor: COLORS.primaryNavy,
    borderColor: COLORS.primaryNavy,
  },
  modeTabText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  modeTabTextActive: {
    color: COLORS.textInverted,
  },
  submittingIndicatorBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submittingText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.primaryNavy,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  typeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    ...SHADOWS.card,
    marginVertical: SPACING.xs,
  },
  typeTitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
  },
  typeInput: {
    minHeight: 80,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  submitTextBtn: {
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.primaryNavy,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTextBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  submitTextBtnText: {
    color: COLORS.textInverted,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  nextStageBtn: {
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.primaryNavy,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  nextStageBtnText: {
    color: COLORS.primaryNavy,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  pauseOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  pauseContent: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.modal,
  },
  pauseTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '800',
    color: COLORS.primaryNavy,
    textAlign: 'center',
  },
  pauseSub: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  resumeBtn: {
    width: '100%',
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.primaryNavy,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtnText: {
    color: COLORS.textInverted,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.md,
  },
});
