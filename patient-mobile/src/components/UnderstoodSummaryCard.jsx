import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/tokens';

export const UnderstoodSummaryCard = ({ extractedUpdates = {}, onEditItem }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const keys = Object.keys(extractedUpdates);
  if (keys.length === 0) return null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.titleWithIcon}>
          <Text style={styles.icon}>📋</Text>
          <Text style={styles.title}>हमने अब तक क्या समझा (What we've understood)</Text>
        </View>
        <Text style={styles.expandToggle}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.badgeContainer}>
          {keys.map((key) => {
            const val = extractedUpdates[key];
            return (
              <View key={key} style={styles.badge}>
                <Text style={styles.check}>✓</Text>
                <Text style={styles.badgeKey}>{key}: </Text>
                <Text style={styles.badgeVal}>{val}</Text>

                {onEditItem && (
                  <TouchableOpacity
                    onPress={() => onEditItem(key)}
                    style={styles.editIconBtn}
                  >
                    <Text style={styles.editIconText}>✎</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  icon: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xs + 1,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
  },
  expandToggle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs + 2,
  },
  badge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.healthcareGreen,
    flexDirection: 'row',
    alignItems: 'center',
  },
  check: {
    color: COLORS.healthcareGreen,
    fontWeight: '800',
    fontSize: 12,
    marginRight: 4,
  },
  badgeKey: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  badgeVal: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  editIconBtn: {
    marginLeft: 6,
    paddingHorizontal: 2,
  },
  editIconText: {
    fontSize: 12,
    color: COLORS.saffronDark,
  },
});
