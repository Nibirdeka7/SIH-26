import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/tokens';
import { LANGUAGES } from '../i18n/translations';
import { useSession } from '../context/SessionContext';

export const Header = ({
  onSelectLanguage,
  onToggleSpeech,
  onOpenHelp,
}) => {
  const { lang, isSpeaking, setShowLangModal, setShowHelpModal } = useSession();
  const selectedLangObj = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  const handleLangPress = onSelectLanguage || (() => setShowLangModal(true));
  const handleHelpPress = onOpenHelp || (() => setShowHelpModal(true));

  return (
    <View style={styles.headerContainer}>
      <View style={styles.brandingSection}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>M</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>MediKiosk</Text>
          <Text style={styles.brandSubtitle}>स्वास्थ्य सहायता पोर्टल (ABDM)</Text>
        </View>
      </View>

      <View style={styles.controlsSection}>
        {/* Language selector badge */}
        <TouchableOpacity
          style={styles.langButton}
          onPress={handleLangPress}
          activeOpacity={0.7}
          accessibilityLabel="Change Language"
        >
          <Text style={styles.langButtonText}>🌐 {selectedLangObj.name}</Text>
        </TouchableOpacity>

        {/* Audio TTS toggle */}
        {onToggleSpeech && (
          <TouchableOpacity
            style={[styles.audioButton, isSpeaking && styles.audioButtonActive]}
            onPress={onToggleSpeech}
            activeOpacity={0.7}
            accessibilityLabel="Audio Assistance"
          >
            <Text style={styles.audioButtonText}>{isSpeaking ? '⏸' : '🔊'}</Text>
          </TouchableOpacity>
        )}

        {/* Help button */}
        <TouchableOpacity
          style={styles.helpButton}
          onPress={handleHelpPress}
          activeOpacity={0.7}
          accessibilityLabel="Get Help"
        >
          <Text style={styles.helpButtonText}>?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.deepNavy,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 3,
    borderBottomColor: COLORS.saffron,
    ...SHADOWS.card,
  },
  brandingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  logoBadgeText: {
    color: COLORS.textInverted,
    fontWeight: '800',
    fontSize: TYPOGRAPHY.sizes.xl,
  },
  brandTitle: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: '#A0B2C6',
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  langButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  langButtonText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  audioButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioButtonActive: {
    backgroundColor: COLORS.saffron,
  },
  audioButtonText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
  },
});
