import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { t } from '../i18n/translations';
import { useSession } from '../context/SessionContext';

export const WelcomeScreen = () => {
  const { lang, startTriageSession, sessionId, setCurrentRoute } = useSession();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Banner */}
      <View style={styles.heroCard}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🏥</Text>
        </View>

        <Text style={styles.title}>{t(lang, 'appName')}</Text>
        <Text style={styles.tagline}>{t(lang, 'tagline')}</Text>
        <Text style={styles.subtitle}>{t(lang, 'subtitle')}</Text>
      </View>

      {/* Feature Points */}
      <View style={styles.featuresCard}>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>🎙</Text>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>अपनी भाषा में बोलें</Text>
            <Text style={styles.featureDesc}>हिंदी, अंग्रेजी तथा 10 क्षेत्रीय भाषाओं में आसान संवाद</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>📋</Text>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>डॉक्टर के लिए पूर्व-तैयारी</Text>
            <Text style={styles.featureDesc}>ओपीडी परामर्श से पहले लक्षण स्वतः दर्ज होंगे</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>📄</Text>
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>पुराने दस्तावेज़ स्कैन करें</Text>
            <Text style={styles.featureDesc}>पर्ची और लैब रिपोर्ट आसानी से अपलोड करें</Text>
          </View>
        </View>
      </View>

      {/* Primary Action Button */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={startTriageSession}
        activeOpacity={0.8}
        accessibilityLabel="Start Triage Intake"
      >
        <Text style={styles.primaryButtonText}>► {t(lang, 'start')}</Text>
      </TouchableOpacity>

      {/* Session Recovery Button */}
      {sessionId && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => setCurrentRoute('history')}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>🔄 {t(lang, 'continueSession')}</Text>
        </TouchableOpacity>
      )}
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
    alignItems: 'stretch',
    gap: SPACING.md,
  },
  heroCard: {
    backgroundColor: COLORS.deepNavy,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.textInverted,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.saffron,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#B0C4DE',
    textAlign: 'center',
  },
  featuresCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureBullet: {
    fontSize: 24,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
  },
  featureDesc: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
  },
  primaryButton: {
    minHeight: ACCESSIBILITY.minTouchSize * 1.2,
    backgroundColor: COLORS.primaryNavy,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: COLORS.saffron,
    ...SHADOWS.card,
  },
  primaryButtonText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  continueButton: {
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.primaryNavy,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: COLORS.primaryNavy,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
