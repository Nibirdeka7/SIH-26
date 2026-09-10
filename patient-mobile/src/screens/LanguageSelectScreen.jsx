import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { LANGUAGES } from '../i18n/translations';
import { useSession } from '../context/SessionContext';

export const LanguageSelectScreen = () => {
  const { lang: selectedLang, selectLanguage } = useSession();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>🌐 अपनी भाषा चुनें (Choose Your Language)</Text>
        <Text style={styles.subtitle}>
          परामर्श के लिए अपनी पसंदीदा भाषा पर टैप करें
        </Text>
      </View>

      <View style={styles.grid}>
        {LANGUAGES.map((langObj) => {
          const isSelected = selectedLang === langObj.code;

          return (
            <TouchableOpacity
              key={langObj.code}
              style={[
                styles.langCard,
                isSelected && styles.langCardSelected,
              ]}
              onPress={() => selectLanguage(langObj.code)}
              activeOpacity={0.7}
              accessibilityLabel={`Select language ${langObj.englishName}`}
            >
              <Text
                style={[
                  styles.nativeName,
                  isSelected && styles.textSelected,
                ]}
              >
                {langObj.name}
              </Text>
              <Text
                style={[
                  styles.englishName,
                  isSelected && styles.textSelectedMuted,
                ]}
              >
                {langObj.englishName} ({langObj.script})
              </Text>

              {isSelected && <View style={styles.checkBadge}><Text style={styles.checkText}>✓ Selected</Text></View>}
            </TouchableOpacity>
          );
        })}
      </View>
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
  headerBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  grid: {
    gap: SPACING.sm,
  },
  langCard: {
    minHeight: ACCESSIBILITY.minTouchSize * 1.2,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  langCardSelected: {
    backgroundColor: COLORS.primaryNavy,
    borderColor: COLORS.primaryNavy,
  },
  nativeName: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  englishName: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  textSelected: {
    color: COLORS.textInverted,
  },
  textSelectedMuted: {
    color: COLORS.saffron,
  },
  checkBadge: {
    position: 'absolute',
    right: 12,
    top: 14,
    backgroundColor: COLORS.saffron,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  checkText: {
    color: COLORS.textInverted,
    fontSize: 10,
    fontWeight: '700',
  },
});
