import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { t } from '../i18n/translations';
import { useSession } from '../context/SessionContext';

export const IdentifyScreen = () => {
  const { lang, completeIdentification } = useSession();
  const [selectedIdType, setSelectedIdType] = useState('guest');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('35');
  const [patientGender, setPatientGender] = useState('male');
  const [mobileNum, setMobileNum] = useState('');
  const [idNumber, setIdNumber] = useState('');

  // OTP state
  const [showOtp, setShowOtp] = useState(false);
  const [otpVal, setOtpVal] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendOtp = async () => {
    if (selectedIdType === 'guest') {
      setIsSubmitting(true);
      try {
        await completeIdentification({
          patientId: `p_guest_${Date.now()}`,
          name: patientName || 'अतिथि मरीज (Guest Patient)',
          age: patientAge || '35',
          gender: patientGender,
          authType: 'guest',
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!mobileNum || mobileNum.length < 10) {
      setOtpError('कृपया वैध 10-अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    setShowOtp(true);
    setOtpError('');
  };

  const handleVerifyOtp = async () => {
    if (otpVal.length < 4) {
      setOtpError('गलत OTP दर्ज किया गया है। कृपया पुनः प्रयास करें।');
      return;
    }

    setIsVerifying(true);
    try {
      await completeIdentification({
        patientId: idNumber || `p_abhamember_${Date.now()}`,
        name: patientName || 'सत्यापित मरीज',
        age: patientAge || '40',
        gender: patientGender,
        mobile: mobileNum,
        authType: selectedIdType,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>{t(lang, 'identifyTitle')}</Text>
        <Text style={styles.subtitle}>{t(lang, 'identifySubtitle')}</Text>
      </View>

      {/* ID Option Cards */}
      <View style={styles.idOptionsRow}>
        <TouchableOpacity
          style={[styles.idCard, selectedIdType === 'abha' && styles.idCardSelected]}
          onPress={() => setSelectedIdType('abha')}
          activeOpacity={0.8}
        >
          <Text style={styles.idIcon}>🆔</Text>
          <Text style={[styles.idTitle, selectedIdType === 'abha' && styles.idTextSelected]}>
            {t(lang, 'abhaId')}
          </Text>
          <Text style={styles.idDesc}>{t(lang, 'abhaDesc')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.idCard, selectedIdType === 'aadhaar' && styles.idCardSelected]}
          onPress={() => setSelectedIdType('aadhaar')}
          activeOpacity={0.8}
        >
          <Text style={styles.idIcon}>📄</Text>
          <Text style={[styles.idTitle, selectedIdType === 'aadhaar' && styles.idTextSelected]}>
            {t(lang, 'aadhaarId')}
          </Text>
          <Text style={styles.idDesc}>{t(lang, 'aadhaarDesc')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.idCard, selectedIdType === 'guest' && styles.idCardSelected]}
          onPress={() => setSelectedIdType('guest')}
          activeOpacity={0.8}
        >
          <Text style={styles.idIcon}>👤</Text>
          <Text style={[styles.idTitle, selectedIdType === 'guest' && styles.idTextSelected]}>
            {t(lang, 'guestPatient')}
          </Text>
          <Text style={styles.idDesc}>{t(lang, 'guestDesc')}</Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields Card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>मरीज का प्राथमिक विवरण (Patient Details)</Text>

        {selectedIdType !== 'guest' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {selectedIdType === 'abha' ? 'ABHA ID / नंबर:' : 'आधार नंबर:'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={selectedIdType === 'abha' ? '14-अंकों का आभा नंबर' : '12-अंकों का आधार नंबर'}
              value={idNumber}
              onChangeText={setIdNumber}
              keyboardType="number-pad"
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>मरीज का नाम (Full Name):</Text>
          <TextInput
            style={styles.input}
            placeholder="जैसे: राम प्रसाद / Sunita Sharma"
            value={patientName}
            onChangeText={setPatientName}
          />
        </View>

        <View style={styles.rowTwoCols}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>उम्र (Age):</Text>
            <TextInput
              style={styles.input}
              placeholder="35"
              value={patientAge}
              onChangeText={setPatientAge}
              keyboardType="number-pad"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1.5 }]}>
            <Text style={styles.inputLabel}>लिंग (Gender):</Text>
            <View style={styles.genderRow}>
              {['male', 'female', 'other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, patientGender === g && styles.genderBtnSelected]}
                  onPress={() => setPatientGender(g)}
                >
                  <Text style={[styles.genderBtnText, patientGender === g && styles.genderBtnTextSelected]}>
                    {g === 'male' ? 'पुरुष' : g === 'female' ? 'महिला' : 'अन्य'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {selectedIdType !== 'guest' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>मोबाइल नंबर (Mobile Number):</Text>
            <TextInput
              style={styles.input}
              placeholder="10-अंकों का नंबर"
              value={mobileNum}
              onChangeText={setMobileNum}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        )}

        {showOtp && (
          <View style={styles.otpBox}>
            <Text style={styles.otpTitle}>🔐 {t(lang, 'verifyMobile')}</Text>
            <Text style={styles.otpSub}>{mobileNum} पर सत्यापन कोड (OTP) भेजा गया है।</Text>

            <TextInput
              style={styles.otpInput}
              placeholder="• • • •"
              value={otpVal}
              onChangeText={setOtpVal}
              keyboardType="number-pad"
              maxLength={6}
            />

            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

            <TouchableOpacity
              style={styles.verifyOtpBtn}
              onPress={handleVerifyOtp}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color={COLORS.textInverted} />
              ) : (
                <Text style={styles.verifyOtpBtnText}>✓ {t(lang, 'verify')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!showOtp && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleSendOtp}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.textInverted} size="small" />
          ) : (
            <Text style={styles.continueButtonText}>
              {selectedIdType === 'guest' ? 'आगे बढ़ें (Continue)' : 'OTP प्राप्त करें (Send OTP)'} ►
            </Text>
          )}
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
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
  },
  idOptionsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  idCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.xs + 2,
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  idCardSelected: {
    backgroundColor: COLORS.navyLight,
    borderColor: COLORS.primaryNavy,
  },
  idIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  idTitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
    textAlign: 'center',
  },
  idTextSelected: {
    color: COLORS.primaryNavy,
  },
  idDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    ...SHADOWS.subtle,
  },
  formTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
  },
  input: {
    minHeight: 46,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textPrimary,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 4,
  },
  genderBtn: {
    flex: 1,
    minHeight: 44,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnSelected: {
    backgroundColor: COLORS.primaryNavy,
    borderColor: COLORS.primaryNavy,
  },
  genderBtnText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
  },
  genderBtnTextSelected: {
    color: COLORS.textInverted,
  },
  otpBox: {
    backgroundColor: COLORS.saffronLight,
    borderWidth: 1.5,
    borderColor: COLORS.saffron,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  otpTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.saffronDark,
  },
  otpSub: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  otpInput: {
    width: 160,
    height: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.saffronDark,
    borderRadius: RADIUS.md,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    marginVertical: SPACING.xs,
  },
  otpErrorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  verifyOtpBtn: {
    width: '100%',
    minHeight: ACCESSIBILITY.minTouchSize,
    backgroundColor: COLORS.saffronDark,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyOtpBtnText: {
    color: COLORS.textInverted,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  continueButton: {
    minHeight: ACCESSIBILITY.minTouchSize * 1.1,
    backgroundColor: COLORS.primaryNavy,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  continueButtonText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
