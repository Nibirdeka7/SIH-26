import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { t } from '../i18n/translations';
import { useSession } from '../context/SessionContext';

export const ConfirmationScreen = () => {
  const { submittedToken, lang, resetSession, triage, clinicalSummary } = useSession();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.successCard}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>

        <Text style={styles.title}>{t(lang, 'submittedTitle')}</Text>
        <Text style={styles.subtitle}>
          आपकी स्वास्थ्य जानकारी डॉक्टर के ओपीडी कंप्यूटर पर तैयार कर दी गई है।
        </Text>

        {/* Token Badge */}
        <View style={styles.tokenBox}>
          <Text style={styles.tokenLabel}>{t(lang, 'tokenLabel')}</Text>
          <Text style={styles.tokenNumber}>{submittedToken}</Text>
        </View>

        {triage.triage_level && (
          <View style={[
            styles.triageBadge,
            triage.triage_level === 'CRITICAL_EMERGENCY' ? styles.triageCritical : styles.triageRoutine
          ]}>
            <Text style={styles.triageText}>
              ट्राइएज स्तर (Triage Status): {triage.triage_level}
            </Text>
          </View>
        )}

        {clinicalSummary?.bilingual_recap_native ? (
          <View style={styles.recapCard}>
            <Text style={styles.recapTitle}>समीक्षा सारांश (Clinical Recap):</Text>
            <Text style={styles.recapText}>{clinicalSummary.bilingual_recap_native}</Text>
          </View>
        ) : null}

        <View style={styles.instructionBanner}>
          <Text style={styles.instructionIcon}>📢</Text>
          <Text style={styles.instructionText}>
            {t(lang, 'waitConsultation')}
          </Text>
        </View>
      </View>

      {/* Kiosk Privacy Reset Action */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetSession}
        activeOpacity={0.8}
      >
        <Text style={styles.resetButtonText}>🔄 {t(lang, 'newSession')}</Text>
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
    alignItems: 'stretch',
  },
  successCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.healthcareGreen,
    gap: SPACING.sm,
    ...SHADOWS.card,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.healthcareGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  checkIcon: {
    fontSize: 40,
    color: COLORS.textInverted,
    fontWeight: '800',
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '800',
    color: COLORS.primaryNavy,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  tokenBox: {
    backgroundColor: COLORS.navyLight,
    borderWidth: 2,
    borderColor: COLORS.primaryNavy,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginVertical: SPACING.xs,
    width: '100%',
  },
  tokenLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tokenNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primaryNavy,
    letterSpacing: 2,
  },
  triageBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginVertical: 2,
  },
  triageRoutine: {
    backgroundColor: COLORS.greenLight,
  },
  triageCritical: {
    backgroundColor: COLORS.errorLight,
  },
  triageText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '800',
    color: COLORS.primaryNavy,
  },
  recapCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '100%',
    gap: 4,
  },
  recapTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
  },
  recapText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textPrimary,
  },
  instructionBanner: {
    backgroundColor: COLORS.saffronLight,
    borderWidth: 1,
    borderColor: COLORS.saffron,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    width: '100%',
  },
  instructionIcon: {
    fontSize: 24,
  },
  instructionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.saffronDark,
  },
  resetButton: {
    minHeight: ACCESSIBILITY.minTouchSize * 1.1,
    backgroundColor: COLORS.primaryNavy,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  resetButtonText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
