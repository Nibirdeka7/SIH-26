import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/tokens';

const STEPS = [
  { id: 1, label: 'पहचान (ID)' },
  { id: 2, label: 'इतिहास (History)' },
  { id: 3, label: 'दस्तावेज़ (Docs)' },
  { id: 4, label: 'समीक्षा (Review)' },
  { id: 5, label: 'पूर्ण (Complete)' },
];

export const ProgressTracker = ({ currentStep = 2 }) => {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <View key={step.id} style={styles.stepItem}>
              <View
                style={[
                  styles.badge,
                  isCompleted && styles.badgeCompleted,
                  isActive && styles.badgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    (isActive || isCompleted) && styles.badgeTextActive,
                  ]}
                >
                  {isCompleted ? '✓' : step.id}
                </Text>
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Progress Line */}
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  badgeActive: {
    backgroundColor: COLORS.primaryNavy,
    borderColor: COLORS.primaryNavy,
  },
  badgeCompleted: {
    backgroundColor: COLORS.healthcareGreen,
    borderColor: COLORS.healthcareGreen,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: COLORS.textInverted,
  },
  label: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  labelActive: {
    color: COLORS.primaryNavy,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  barBackground: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.saffron,
    borderRadius: RADIUS.pill,
  },
});
