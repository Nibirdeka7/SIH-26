import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { t } from '../i18n/translations';
import { useSession } from '../context/SessionContext';

export const ReviewSubmitScreen = () => {
  const {
    patientData,
    documentsList,
    clinicalUpdates,
    lang,
    setCurrentRoute,
    generateAndSubmitSummary,
  } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitFinal = async () => {
    setIsSubmitting(true);
    try {
      await generateAndSubmitSummary();
    } catch (e) {
      console.warn('Submission error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const symptomKeys = Object.keys(clinicalUpdates);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>🔍 {t(lang, 'reviewTitle')}</Text>
        <Text style={styles.subtitle}>
          जानकारी डॉक्टर को भेजने से पहले कृपया नीचे दी गई जानकारी की पुष्टि करें
        </Text>
      </View>

      {/* Section 1: Patient Identity */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👤 {t(lang, 'personalDetails')}</Text>
          <TouchableOpacity onPress={() => setCurrentRoute('identify')}>
            <Text style={styles.editBtn}>[ {t(lang, 'edit')} ]</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.itemText}>• नाम: {patientData.name || 'अतिथि मरीज (Guest Patient)'}</Text>
        <Text style={styles.itemText}>• उम्र / लिंग: {patientData.age || '35'} वर्ष / {patientData.gender === 'male' ? 'पुरुष' : patientData.gender === 'female' ? 'महिला' : 'अन्य'}</Text>
        <Text style={styles.itemText}>• पहचान प्रकार: {patientData.authType ? patientData.authType.toUpperCase() : 'Guest'}</Text>
      </View>

      {/* Section 2: Clinical History */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🩺 {t(lang, 'healthHistory')}</Text>
          <TouchableOpacity onPress={() => setCurrentRoute('history')}>
            <Text style={styles.editBtn}>[ {t(lang, 'edit')} ]</Text>
          </TouchableOpacity>
        </View>

        {symptomKeys.length > 0 ? (
          symptomKeys.map((key) => (
            <Text key={key} style={styles.itemText}>
              • {key}: {clinicalUpdates[key]}
            </Text>
          ))
        ) : (
          <>
            <Text style={styles.itemText}>• मुख्य शिकायत: सीने में दर्द (Chest pain)</Text>
            <Text style={styles.itemText}>• अवधि: 1 दिन से (Since yesterday)</Text>
          </>
        )}
      </View>

      {/* Section 3: Uploaded Documents */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📄 {t(lang, 'uploadedDocs')}</Text>
          <TouchableOpacity onPress={() => setCurrentRoute('documents')}>
            <Text style={styles.editBtn}>[ {t(lang, 'edit')} ]</Text>
          </TouchableOpacity>
        </View>

        {documentsList.length > 0 ? (
          documentsList.map((doc, idx) => (
            <Text key={idx} style={styles.itemText}>
              • {doc.filename || `दस्तावेज़ ${idx + 1}`} ({doc.document_type || 'Prescription'})
            </Text>
          ))
        ) : (
          <Text style={styles.itemTextMuted}>कोई दस्तावेज संलग्न नहीं (No documents attached)</Text>
        )}
      </View>

      {/* Final Submit Action Button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmitFinal}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.textInverted} size="large" />
        ) : (
          <Text style={styles.submitBtnText}>✓ {t(lang, 'submitInfo')}</Text>
        )}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
    ...SHADOWS.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
  },
  editBtn: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.saffronDark,
  },
  itemText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textPrimary,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
  },
  itemTextMuted: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  submitBtn: {
    minHeight: ACCESSIBILITY.minTouchSize * 1.2,
    backgroundColor: COLORS.healthcareGreen,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.greenDark,
    ...SHADOWS.card,
  },
  submitBtnText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '800',
  },
});
