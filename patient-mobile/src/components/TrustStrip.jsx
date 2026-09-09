import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';

export const TrustStrip = ({ message = 'सुरक्षित डिजिटल स्वास्थ्य इतिहास संग्रह | Secure Clinical Intake Portal' }) => {
  return (
    <View style={styles.stripContainer}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  stripContainer: {
    backgroundColor: COLORS.navyLight,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  icon: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  text: {
    color: COLORS.primaryNavy,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textAlign: 'center',
  },
});
