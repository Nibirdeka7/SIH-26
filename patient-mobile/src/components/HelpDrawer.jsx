import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';

export const HelpDrawer = ({ visible = false, onClose }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>❓ सहायता एवं निर्देश (Help & Guidance)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <View style={styles.helpSection}>
              <Text style={styles.sectionHeader}>🔊 आवाज़ से उत्तर कैसे दें?</Text>
              <Text style={styles.sectionBody}>
                1. 'बोलने के लिए दबाएं' बटन पर टैप करें।{"\n"}
                2. स्वाभाविक रूप से अपनी भाषा में बोलें।{"\n"}
                3. स्क्रीन पर आपके द्वारा बोले गए शब्दों का उत्तर दिखाई देगा।
              </Text>
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.sectionHeader}>👇 टैप करके उत्तर कैसे दें?</Text>
              <Text style={styles.sectionBody}>
                आप स्क्रीन पर दिए गए विकल्पों में से किसी एक पर टैप करके आसानी से जवाब दे सकते हैं।
              </Text>
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.sectionHeader}>🌐 भाषा बदलना (Change Language)</Text>
              <Text style={styles.sectionBody}>
                ऊपर दाहिने कोने में बने 🌐 बटन पर टैप करके आप अपनी मनपसंद भाषा चुन सकते हैं।
              </Text>
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.sectionHeader}>🔒 आपकी गोपनीयता (Privacy & Security)</Text>
              <Text style={styles.sectionBody}>
                आपकी दी गई सभी जानकारी पूरी तरह सुरक्षित रखी जाती है और केवल आपके डॉक्टर के परामर्श के लिए उपयोग की जाती है।
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>समझ गया/गयी (Close)</Text>
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
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
    maxHeight: '80%',
    ...SHADOWS.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  closeText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  body: {
    marginVertical: SPACING.md,
  },
  bodyContent: {
    gap: SPACING.md,
  },
  helpSection: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  sectionHeader: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: TYPOGRAPHY.sizes.xs + 1,
    color: COLORS.textPrimary,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
  },
  doneBtn: {
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.primaryNavy,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: COLORS.textInverted,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.md,
  },
});
