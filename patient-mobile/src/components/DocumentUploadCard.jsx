import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ACCESSIBILITY } from '../theme/tokens';
import { documentApi } from '../services/apiServices';
import { useSession } from '../context/SessionContext';

export const DocumentUploadCard = ({ onDocumentProcessed }) => {
  const { sessionId, documentsList, addDocument, removeDocument } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pickOrCaptureImage = async (docType, useCamera = false) => {
    setIsProcessing(true);
    setErrorMsg('');

    try {
      let result = null;

      if (useCamera) {
        try {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (permission && permission.granted) {
            result = await ImagePicker.launchCameraAsync({
              quality: 0.8,
              allowsEditing: true,
            });
          } else {
            console.log('[Camera] Camera permission denied, falling back to gallery');
          }
        } catch (camErr) {
          console.warn('[Camera] Exception launching camera, falling back to gallery:', camErr);
        }
      }

      // If camera wasn't used or failed/denied, use gallery picker
      if (!result || result.canceled) {
        try {
          const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (galleryPermission && galleryPermission.granted) {
            result = await ImagePicker.launchImageLibraryAsync({
              quality: 0.8,
              allowsEditing: true,
            });
          }
        } catch (galErr) {
          console.warn('[Gallery] Exception launching image library:', galErr);
        }
      }

      if (!result || result.canceled || !result.assets || result.assets.length === 0) {
        setIsProcessing(false);
        return;
      }

      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.fileName || `${docType}_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';

      // Perform upload to Document Service (Port 8000)
      const uploadRes = await documentApi.uploadDocument({
        fileUri,
        fileName,
        mimeType,
        sessionId,
        documentType: docType,
      });

      if (uploadRes && uploadRes.documents && uploadRes.documents.length > 0) {
        const newDoc = uploadRes.documents[0];
        addDocument(newDoc);
        if (onDocumentProcessed) onDocumentProcessed([...documentsList, newDoc]);
      } else {
        setErrorMsg('दस्तावेज़ का विश्लेषण नहीं हो सका। कृपया पुनः प्रयास करें।');
      }
    } catch (err) {
      console.warn('[ScanError] Exception in scan/upload:', err);
      setErrorMsg('स्कैनिंग प्रक्रिया में समस्या आई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveDoc = (docId) => {
    removeDocument(docId);
    if (onDocumentProcessed) {
      onDocumentProcessed(documentsList.filter((d) => d.document_id !== docId));
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>📄 पुराने मेडिकल दस्तावेज़ (Medical Documents OCR)</Text>
      <Text style={styles.subtext}>
        क्या आपके पास कोई पुरानी पर्ची (Prescription), लैब टेस्ट रिपोर्ट, या डिस्चार्ज पर्ची है?
      </Text>

      {/* Primary Camera & Gallery Options */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.uploadBtnPrimary}
          onPress={() => pickOrCaptureImage('prescription', true)}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.btnIcon}>📸</Text>
          <Text style={styles.btnText}>कैमरे से पर्ची स्कैन करें (Camera)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadBtnAlt}
          onPress={() => pickOrCaptureImage('lab_report', false)}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.btnIconAlt}>🖼️</Text>
          <Text style={styles.btnTextAlt}>गैलरी से फाइल चुनें (Gallery)</Text>
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {isProcessing && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.saffron} />
          <Text style={styles.loadingText}>OCR इंजन द्वारा दस्तावेज़ का विश्लेषण किया जा रहा है...</Text>
        </View>
      )}

      {/* Error state */}
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      {/* Uploaded Document List */}
      {documentsList.length > 0 && (
        <View style={styles.docsList}>
          <Text style={styles.listTitle}>विश्लेषित दस्तावेज़ ({documentsList.length}):</Text>
          {documentsList.map((doc) => {
            const ext = doc.extraction || {};
            const medicines = ext.medicines || [];

            return (
              <View key={doc.document_id} style={styles.docResultCard}>
                <View style={styles.docHeader}>
                  <View style={styles.docTypeBadge}>
                    <Text style={styles.docTypeBadgeText}>
                      ✓ {doc.document_type || 'दस्तावेज़'}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => handleRemoveDoc(doc.document_id)}>
                    <Text style={styles.removeBtn}>✕ हटाएं</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.filenameText}>📁 {doc.filename}</Text>

                {doc.ocr_confidence && (
                  <Text style={styles.confidenceScore}>
                    OCR गुणवत्ता: {(doc.ocr_confidence * 100).toFixed(0)}%
                  </Text>
                )}

                {medicines.length > 0 && (
                  <View style={styles.medsBox}>
                    <Text style={styles.medsTitle}>पहचानी गई दवाएं (Medicines Extracted):</Text>
                    {medicines.map((med, idx) => (
                      <Text key={idx} style={styles.medItem}>
                        • {med}
                      </Text>
                    ))}
                  </View>
                )}

                {ext.doctor_instructions && (
                  <Text style={styles.doctorNotes}>
                    💡 डॉक्टर सलाह: {ext.doctor_instructions}
                  </Text>
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primaryNavy,
    marginBottom: 4,
  },
  subtext: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  actionGrid: {
    gap: SPACING.sm,
  },
  uploadBtnPrimary: {
    minHeight: ACCESSIBILITY.minTouchSize * 1.1,
    backgroundColor: COLORS.primaryNavy,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.sm,
    ...SHADOWS.subtle,
  },
  uploadBtnAlt: {
    minHeight: ACCESSIBILITY.minTouchSize * 1.1,
    backgroundColor: COLORS.navyLight,
    borderWidth: 1.5,
    borderColor: COLORS.primaryNavy,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.sm,
  },
  btnIcon: {
    fontSize: 22,
  },
  btnIconAlt: {
    fontSize: 22,
  },
  btnText: {
    color: COLORS.textInverted,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  btnTextAlt: {
    color: COLORS.primaryNavy,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.saffronLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.saffronDark,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  errorBanner: {
    backgroundColor: COLORS.errorLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  docsList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  listTitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textSecondary,
  },
  docResultCard: {
    backgroundColor: COLORS.greenLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.healthcareGreen,
    gap: SPACING.xs,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docTypeBadge: {
    backgroundColor: COLORS.healthcareGreen,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  docTypeBadgeText: {
    color: COLORS.textInverted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  removeBtn: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '700',
  },
  filenameText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  confidenceScore: {
    fontSize: 11,
    color: COLORS.healthcareGreen,
    fontWeight: '600',
  },
  medsBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
  },
  medsTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.healthcareGreen,
  },
  medItem: {
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  doctorNotes: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
