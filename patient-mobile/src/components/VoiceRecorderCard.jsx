import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
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

const LANG_CODE_MAP = {
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

export const VoiceRecorderCard = ({
  onTranscriptComplete,
  disabled = false,
}) => {
  const { lang } = useSession();
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [manualText, setManualText] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState(null);

  useEffect(() => {
    // Check if Web Speech API is supported in browser/webview
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SpeechRecognition) {
      setIsSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = LANG_CODE_MAP[lang] || 'hi-IN';

      rec.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      rec.onend = () => {
        setVoiceState((prev) => {
          if (prev === VOICE_STATES.RECORDING || prev === VOICE_STATES.LISTENING) {
            return VOICE_STATES.SUCCESS;
          }
          return prev;
        });
      };

      rec.onerror = (err) => {
        console.warn('[SpeechRecognition] Error:', err);
        setVoiceState(VOICE_STATES.ERROR);
      };

      setRecognitionInstance(rec);

      return () => {
        try {
          rec.abort();
        } catch (_) {}
      };
    } else {
      setIsSupported(false);
    }
  }, [lang]);

  const handleStartListening = async () => {
    if (disabled) return;
    setTranscript('');
    setVoiceState(VOICE_STATES.LISTENING);

    // Request explicit device microphone access from the browser/device
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop temporary stream tracks once permission is confirmed
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr) {
        console.warn('[Microphone Permission] User denied or error requesting mic:', permErr);
        alert('माइक्रोफ़ोन एक्सेस (Microphone Access) की अनुमति नहीं मिली। कृपया अपने ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।');
        setVoiceState(VOICE_STATES.ERROR);
        return;
      }
    }

    if (recognitionInstance) {
      try {
        recognitionInstance.lang = LANG_CODE_MAP[lang] || 'hi-IN';
        recognitionInstance.start();
        setVoiceState(VOICE_STATES.RECORDING);
        return;
      } catch (e) {
        console.warn('SpeechRecognition start notice:', e);
        // If recognition was already running or starting, transition to RECORDING anyway
        setVoiceState(VOICE_STATES.RECORDING);
        return;
      }
    }

    // Speech recognition not supported on this specific environment
    setVoiceState(VOICE_STATES.ERROR);
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
      setVoiceState(VOICE_STATES.SUCCESS);
    }, 600);
  };

  const handleConfirmTranscript = () => {
    const textToSubmit = transcript.trim() || manualText.trim();
    if (textToSubmit && onTranscriptComplete) {
      onTranscriptComplete(textToSubmit);
      setVoiceState(VOICE_STATES.IDLE);
      setTranscript('');
      setManualText('');
    }
  };

  const handleRetry = () => {
    setVoiceState(VOICE_STATES.IDLE);
    setTranscript('');
    setManualText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙 आवाज से उत्तर दें (Voice Input)</Text>
      <Text style={styles.subtext}>माइक बटन दबाएं और अपने लक्षण स्वाभाविक भाषा में बोलें</Text>

      <View style={styles.micSection}>
        {!isSupported ? (
          <View style={styles.unsupportedCard}>
            <Text style={styles.unsupportedTitle}>⚠️ इस डिवाइस पर लाइव वॉइस स्पीच उपलब्ध नहीं है</Text>
            <Text style={styles.unsupportedDesc}>
              आप नीचे बॉक्स में लिखकर या प्रश्नों के विकल्पों पर टैप करके उत्तर दर्ज कर सकते हैं:
            </Text>

            <TextInput
              style={styles.unsupportedInput}
              placeholder="यहाँ अपनी समस्या विस्तार से लिखें..."
              value={manualText}
              onChangeText={setManualText}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.confirmButton, !manualText.trim() && styles.disabledButton]}
              onPress={handleConfirmTranscript}
              disabled={!manualText.trim() || disabled}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>✓ उत्तर जमा करें (Submit)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
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
                {transcript ? <Text style={styles.liveTranscript}>"{transcript}"</Text> : <Text style={styles.listeningHint}>बोलिए, हम सुन रहे हैं...</Text>}
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
                {transcript ? (
                  <>
                    <Text style={styles.successHeadline}>हमने सुना (Recognized Text):</Text>
                    <View style={styles.transcriptCard}>
                      <Text style={styles.transcriptText}>"{transcript}"</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.noSpeechCard}>
                    <Text style={styles.noSpeechText}>⚠️ कोई आवाज़ पहचान नहीं पाई। कृपया दोबारा बोलें या नीचे दर्ज करें:</Text>
                    <TextInput
                      style={styles.unsupportedInput}
                      placeholder="या यहाँ अपने लक्षण लिखें..."
                      value={manualText}
                      onChangeText={setManualText}
                    />
                  </View>
                )}

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetry}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retryButtonText}>🔄 दोबारा बोलें</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmButton, (!transcript.trim() && !manualText.trim()) && styles.disabledButton]}
                    onPress={handleConfirmTranscript}
                    disabled={!transcript.trim() && !manualText.trim()}
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
          </>
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
  disabledButton: {
    backgroundColor: COLORS.border,
    borderColor: COLORS.border,
  },
  listeningHint: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.saffronDark,
    fontStyle: 'italic',
  },
  unsupportedCard: {
    width: '100%',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  unsupportedTitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.saffronDark,
  },
  unsupportedDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  unsupportedInput: {
    minHeight: 70,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  noSpeechCard: {
    backgroundColor: COLORS.saffronLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  noSpeechText: {
    fontSize: 11,
    color: COLORS.saffronDark,
    fontWeight: TYPOGRAPHY.weights.semibold,
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
