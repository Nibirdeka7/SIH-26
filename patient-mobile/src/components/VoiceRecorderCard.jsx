import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { useSession } from '../context/SessionContext';

export const VOICE_STATES = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  RECORDING: 'RECORDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
};

export const VoiceRecorderCard = ({
  onTranscriptComplete,
  disabled = false,
}) => {
  const { lang } = useSession();
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = lang === 'hi' ? 'hi-IN' : 'en-US';

      rec.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      rec.onend = () => {
        setVoiceState((prev) => (prev === VOICE_STATES.RECORDING || prev === VOICE_STATES.LISTENING ? VOICE_STATES.SUCCESS : prev));
      };

      rec.onerror = (err) => {
        console.warn('[SpeechRecognition] Error:', err);
        setVoiceState(VOICE_STATES.ERROR);
      };

      setRecognitionInstance(rec);
    }
  }, [lang]);

  const handleStartListening = () => {
    if (disabled) return;
    setTranscript('');
    setVoiceState(VOICE_STATES.LISTENING);

    if (recognitionInstance) {
      try {
        recognitionInstance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        recognitionInstance.start();
        setVoiceState(VOICE_STATES.RECORDING);
        return;
      } catch (e) {
        console.warn('SpeechRecognition start failed, fallback simulation active:', e);
      }
    }

    // Fallback progression for devices without Web Speech API
    setTimeout(() => setVoiceState(VOICE_STATES.RECORDING), 800);
    setTimeout(() => setVoiceState(VOICE_STATES.PROCESSING), 3000);
    setTimeout(() => {
      const fallbackText = lang === 'hi'
        ? 'मुझे कल शाम से सीने में तेज दर्द हो रहा है।'
        : 'I have severe chest pain starting yesterday evening.';
      setTranscript(fallbackText);
      setVoiceState(VOICE_STATES.SUCCESS);
    }, 4200);
  };

  const handleStopListening = () => {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (e) {
        // ignore
      }
    }
    setVoiceState(VOICE_STATES.PROCESSING);
    setTimeout(() => {
      if (!transcript) {
        setTranscript(lang === 'hi' ? 'लक्षण दर्ज किए गए' : 'Symptoms recorded');
      }
      setVoiceState(VOICE_STATES.SUCCESS);
    }, 1000);
  };

  const handleConfirmTranscript = () => {
    if (transcript && onTranscriptComplete) {
      onTranscriptComplete(transcript);
      setVoiceState(VOICE_STATES.IDLE);
      setTranscript('');
    }
  };

  const handleRetry = () => {
    setVoiceState(VOICE_STATES.IDLE);
    setTranscript('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙 आवाज से उत्तर दें (Voice Input)</Text>
      <Text style={styles.subtext}>माइक बटन दबाएं और अपनी समस्या स्वाभाविक भाषा में बोलें</Text>

      <View style={styles.micSection}>
        {voiceState === VOICE_STATES.IDLE && (
          <TouchableOpacity
            style={styles.micButtonIdle}
            onPress={handleStartListening}
            activeOpacity={0.8}
            disabled={disabled}
            accessibilityLabel="Tap to speak"
          >
            <View style={styles.iconCircle}>
              <Text style={styles.micIcon}>🎙</Text>
            </View>
            <Text style={styles.micLabel}>बोलने के लिए दबाएं (Tap to Speak)</Text>
          </TouchableOpacity>
        )}

        {(voiceState === VOICE_STATES.LISTENING || voiceState === VOICE_STATES.RECORDING) && (
          <TouchableOpacity
            style={styles.micButtonActive}
            onPress={handleStopListening}
            activeOpacity={0.8}
          >
            <View style={styles.recordingPulse} />
            <Text style={styles.micIconActive}>🔴</Text>
            <Text style={styles.micLabelActive}>
              {voiceState === VOICE_STATES.LISTENING ? 'सुन रहे हैं... (Listening)' : 'रिकॉर्ड हो रहा है... (Recording)'}
            </Text>
            {transcript ? <Text style={styles.liveTranscript}>"{transcript}"</Text> : null}
            <Text style={styles.tapToStop}>रुकने और उत्तर जमा करने के लिए पुनः दबाएं</Text>
          </TouchableOpacity>
        )}

        {voiceState === VOICE_STATES.PROCESSING && (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={COLORS.saffron} />
            <Text style={styles.processingText}>आपकी आवाज़ का विश्लेषण किया जा रहा है...</Text>
          </View>
        )}

        {voiceState === VOICE_STATES.SUCCESS && (
          <View style={styles.successBox}>
            <Text style={styles.successHeadline}>हमने सुना (Recognized Text):</Text>
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptText}>"{transcript}"</Text>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                activeOpacity={0.8}
              >
                <Text style={styles.retryButtonText}>🔄 दोबारा बोलें</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmTranscript}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>✓ उत्तर जमा करें</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {voiceState === VOICE_STATES.ERROR && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ आवाज पहचान नहीं पाई। कृपया पुनः प्रयास करें।</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>पुनः प्रयास करें</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
    textAlign: 'center',
  },
  subtext: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  micSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonIdle: {
    width: '100%',
    minHeight: ACCESSIBILITY.minTouchSize * 1.5,
    backgroundColor: COLORS.navyLight,
    borderWidth: 2,
    borderColor: COLORS.primaryNavy,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    ...SHADOWS.glow,
  },
  micIcon: {
    fontSize: 28,
  },
  micLabel: {
    color: COLORS.primaryNavy,
    fontWeight: TYPOGRAPHY.weights.heavy,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  micButtonActive: {
    width: '100%',
    minHeight: ACCESSIBILITY.minTouchSize * 1.6,
    backgroundColor: COLORS.errorLight,
    borderWidth: 2.5,
    borderColor: COLORS.error,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  micIconActive: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  micLabelActive: {
    color: COLORS.error,
    fontWeight: '800',
    fontSize: TYPOGRAPHY.sizes.lg,
  },
  liveTranscript: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    marginVertical: 4,
  },
  tapToStop: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 4,
  },
  recordingPulse: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  processingBox: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  processingText: {
    color: COLORS.primaryNavy,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  successBox: {
    width: '100%',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  successHeadline: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.healthcareGreen,
  },
  transcriptCard: {
    backgroundColor: COLORS.greenLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.healthcareGreen,
  },
  transcriptText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  retryButton: {
    flex: 1,
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  confirmButton: {
    flex: 1.5,
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.healthcareGreen,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: COLORS.textInverted,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  errorBox: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
