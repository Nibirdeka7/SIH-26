import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';

export const RedFlagAlertModal = ({
  visible = false,
  onAcknowledge,
  redFlags = [],
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerBox}>
            <Text style={styles.alertIcon}>🚨</Text>
            <Text style={styles.headerTitle}>महत्वपूर्ण सूचना (Important Triage Alert)</Text>
          </View>

          <View style={styles.bodyBox}>
            <Text style={styles.mainMessage}>
              आपके लक्षणों पर अस्पताल की आपातकालीन / मेडिकल टीम द्वारा तत्काल ध्यान दिए जाने की आवश्यकता है।
            </Text>
            <Text style={styles.subMessage}>
              Your answers indicate symptoms that require immediate priority attention from the OPD healthcare staff.
            </Text>

            <View style={styles.instructionBanner}>
              <Text style={styles.instructionText}>
                📍 कृपया ओपीडी प्रतीक्षा क्षेत्र के आसपास ही रहें। एक स्वास्थ्य कर्मी को आपकी स्थिति की सूचना भेज दी गई है।
              </Text>
            </View>

            {redFlags.length > 0 && (
              <View style={styles.flagList}>
                {redFlags.map((flag, idx) => (
                  <Text key={idx} style={styles.flagTag}>
                    • {flag}
                  </Text>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.ackButton}
            onPress={onAcknowledge}
            activeOpacity={0.8}
            accessibilityLabel="I Understand"
          >
            <Text style={styles.ackButtonText}>मैं समझ गया/गयी (I Understand)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    borderColor: COLORS.error,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.modal,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  alertIcon: {
    fontSize: 48,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '800',
    color: COLORS.error,
    textAlign: 'center',
  },
  bodyBox: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  mainMessage: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeights.md,
  },
  subMessage: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  instructionBanner: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
  },
  instructionText: {
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
  },
  flagList: {
    marginTop: SPACING.xs,
  },
  flagTag: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '600',
  },
  ackButton: {
    width: '100%',
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackButtonText: {
    color: COLORS.textInverted,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.md,
  },
});
