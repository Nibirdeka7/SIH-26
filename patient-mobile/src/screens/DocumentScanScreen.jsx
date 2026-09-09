import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { DocumentUploadCard } from '../components/DocumentUploadCard';
import { t } from '../i18n/translations';
import { useSession } from '../context/SessionContext';

export const DocumentScanScreen = () => {
  const { lang, documentsList, completeDocuments } = useSession();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>📄 {t(lang, 'documentsTitle')}</Text>
        <Text style={styles.subtext}>{t(lang, 'documentsSub')}</Text>
      </View>

      {/* Main Document Uploader Engine Component */}
      <DocumentUploadCard />

      {/* Navigation Buttons */}
      <View style={styles.actionsBox}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => completeDocuments()}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>
            {documentsList.length > 0
              ? 'समीक्षा पृष्ठ पर जाएं (Review Details) ►'
              : 'आगे बढ़ें (Continue) ►'}
          </Text>
        </TouchableOpacity>

        {documentsList.length === 0 && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => completeDocuments([])}
            activeOpacity={0.8}
          >
            <Text style={styles.skipBtnText}>घबराएं नहीं - दस्तावेज़ के बिना आगे बढ़ें (Skip for now)</Text>
          </TouchableOpacity>
        )}
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
  headerCard: {
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
  subtext: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  actionsBox: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  primaryBtn: {
    minHeight: ACCESSIBILITY.minTouchSize * 1.1,
    backgroundColor: COLORS.primaryNavy,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  primaryBtnText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  skipBtn: {
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
