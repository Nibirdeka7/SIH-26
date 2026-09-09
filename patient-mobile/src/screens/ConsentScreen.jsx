import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { t } from '../i18n/translations';
import { useSession } from '../context/SessionContext';

export const ConsentScreen = ({ onPlayAudioExplanation }) => {
  const { lang, giveConsent } = useSession();
  const [hasAgreed, setHasAgreed] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.consentCard}>
        <View style={styles.headerRow}>
          <Text style={styles.icon}>📋</Text>
          <Text style={styles.title}>{t(lang, 'consentTitle')}</Text>
        </View>

        {onPlayAudioExplanation && (
          <TouchableOpacity
            style={styles.audioAssistanceBtn}
            onPress={onPlayAudioExplanation}
            activeOpacity={0.8}
          >
            <Text style={styles.audioBtnText}>🔊 सहमति फॉर्म का विवरण सुनें (Listen to Consent)</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bodyBox}>
          <Text style={styles.paragraph}>
            MediKiosk आपके स्वास्थ्य से संबंधित प्रश्न पूछेगा तथा आपके द्वारा प्रदान किए गए पुराने मेडिकल पर्चे एवं जांच रिपोर्ट को प्रोसेस करेगा।
          </Text>

          <Text style={styles.paragraph}>
            यह जानकारी डिजिटल रूप से सुरक्षित रूप से संकलित की जाएगी और आपके परामर्श के दौरान डॉक्टर के कंप्यूटर पर प्रदर्शित होगी।
          </Text>

          <View style={styles.bulletsBox}>
            <Text style={styles.bulletItem}>✓ आपकी जानकारी गोपनीय और सुरक्षित है</Text>
            <Text style={styles.bulletItem}>✓ केवल आपकी सहमति से डॉक्टर को साझा की जाएगी</Text>
            <Text style={styles.bulletItem}>✓ आप किसी भी समय अपना सत्र रोक सकते हैं</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setHasAgreed(!hasAgreed)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, hasAgreed && styles.checkboxActive]}>
            {hasAgreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>{t(lang, 'giveConsent')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.continueBtn, !hasAgreed && styles.continueBtnDisabled]}
        disabled={!hasAgreed}
        onPress={giveConsent}
        activeOpacity={0.8}
      >
        <Text style={styles.continueBtnText}>► {t(lang, 'continue')}</Text>
      </TouchableOpacity>
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
    gap: SPACING.md,
  },
  consentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
  },
  audioAssistanceBtn: {
    backgroundColor: COLORS.saffronLight,
    borderWidth: 1,
    borderColor: COLORS.saffron,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  audioBtnText: {
    color: COLORS.saffronDark,
    fontSize: TYPOGRAPHY.sizes.xs + 1,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  bodyBox: {
    gap: SPACING.sm,
  },
  paragraph: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textPrimary,
    lineHeight: TYPOGRAPHY.lineHeights.md,
  },
  bulletsBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  bulletItem: {
    fontSize: TYPOGRAPHY.sizes.xs + 1,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.healthcareGreen,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.navyLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primaryNavy,
    marginTop: SPACING.xs,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primaryNavy,
  },
  checkmark: {
    color: COLORS.textInverted,
    fontWeight: '800',
    fontSize: 18,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
  },
  continueBtn: {
    minHeight: ACCESSIBILITY.minTouchSize * 1.1,
    backgroundColor: COLORS.primaryNavy,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
