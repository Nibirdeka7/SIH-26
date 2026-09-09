import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';

export const TouchOptionsGrid = ({
  options = [],
  selectedOption = null,
  onSelectOption,
  disabled = false,
}) => {
  if (!options || options.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>👇 विकल्प चुनकर उत्तर दें (Tap Answer)</Text>

      <View style={styles.gridContainer}>
        {options.map((option, index) => {
          const isSelected = selectedOption === option;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => onSelectOption(option)}
              activeOpacity={0.7}
              disabled={disabled}
              accessibilityLabel={`Select option: ${option}`}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  sectionHeader: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridContainer: {
    gap: SPACING.sm,
  },
  optionButton: {
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.subtle,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primaryNavy,
    borderColor: COLORS.primaryNavy,
  },
  optionText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  optionTextSelected: {
    color: COLORS.textInverted,
  },
  checkmark: {
    color: COLORS.saffron,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '800',
    marginLeft: SPACING.xs,
  },
});
