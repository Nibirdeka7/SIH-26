import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Pill,
  Stethoscope,
  Activity,
  Trash2,
  X,
  FileCheck,
} from 'lucide-react';
import { documentService } from '../services/document_api';
import { parseDocExtraction } from '../utils/document_parser';
import { t } from '../utils/translations';

const DOCUMENT_TYPES = [
  { id: 'PRESCRIPTION', label: 'पर्ची / Prescription', icon: Pill, color: 'bg-[#d8e7ce] text-[#5b6854] border-[#8c9a84]' },
  { id: 'LAB_REPORT', label: 'लैब रिपोर्ट / Lab Report', icon: Activity, color: 'bg-[#e0e9f5] text-[#2d527c] border-[#7da0ca]' },
  { id: 'DISCHARGE_SUMMARY', label: 'डिस्चार्ज समरी / Summary', icon: Stethoscope, color: 'bg-[#f7e8db] text-[#8c4a27] border-[#c27b66]' },
  { id: 'OTHER', label: 'अन्य / Other Record', icon: FileText, color: 'bg-[#efeeea] text-[#434844] border-[#b0ad9e]' },
];

export default function DocumentScanStep({
  currentLanguage = 'hi',
  sessionId,
  extractedDocs = [],
  onDocumentExtracted,
  onRemoveDocument,
  onProceedToReview,
  onBack,
}) {
  const [selectedDocType, setSelectedDocType] = useState('PRESCRIPTION');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [serviceStatus, setServiceStatus] = useState('checking');
  const [selectedDocDetail, setSelectedDocDetail] = useState(null);

  // Check document service backend health on mount
  useEffect(() => {
    documentService
      .checkHealth()
      .then((res) => {
        if (res && res.status === 'ok') {
          setServiceStatus('online');
        } else {
          setServiceStatus('offline');
        }
      })
      .catch(() => setServiceStatus('offline'));
  }, []);

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await documentService.uploadMultipleDocuments(
        selectedFiles,
        sessionId,
        selectedDocType
      );

      if (res && res.documents && res.documents.length > 0) {
        let hasSuccess = false;
        res.documents.forEach((docResult) => {
          if (docResult.status === 'FAILED') {
            setUploadError(docResult.error || 'Failed to process document OCR.');
          } else {
            hasSuccess = true;
            onDocumentExtracted(docResult);
          }
        });
        if (!hasSuccess && res.documents.length === 1 && res.documents[0].error) {
          setUploadError(res.documents[0].error);
        }
      } else {
        throw new Error('No extracted document results returned from Document Service');
      }
    } catch (err) {
      console.error('Document OCR processing error:', err);
      setUploadError(
        err.message || 'Unable to connect to Document Service. Please check if service (Port 8000) is running.'
      );
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">
      {/* Step Header */}
      <div className="w-full space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#d8e7ce] text-[#5b6854] flex items-center justify-center text-xs font-bold">
              4
            </span>
            <span className="font-body text-base text-[#18241c] font-semibold">
              {t(currentLanguage, 'step6')}
            </span>
          </div>

          {/* Backend Service Health Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4f4f0] border border-[#e6e2da] text-xs font-body">
            <span
              className={`w-2 h-2 rounded-full ${
                serviceStatus === 'online'
                  ? 'bg-[#5b6854] animate-pulse'
                  : 'bg-[#c27b66]'
              }`}
            />
            <span className="font-semibold text-[#434844]">
              {serviceStatus === 'online'
                ? 'Document OCR Engine: Active (Port 8000)'
                : 'Document Service: Offline / Standby'}
            </span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-[#e9e8e4] rounded-full overflow-hidden">
          <div className="h-full bg-[#8c9a84] w-3/4 rounded-full transition-all duration-500"></div>
        </div>
      </div>

      {/* Hero Title */}
      <div className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl text-[#18241c] font-semibold">
          {t(currentLanguage, 'scanTitle')}
        </h1>
        <p className="font-body text-base text-[#434844] max-w-2xl leading-relaxed">
          {t(currentLanguage, 'scanSubtitle')}
        </p>
      </div>

      {/* Document Type Selector Deck */}
      <div className="space-y-3">
        <span className="font-body text-xs uppercase tracking-wider text-[#737873] font-bold block">
          Select Document Category / प्रकार चुनें:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DOCUMENT_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedDocType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedDocType(type.id)}
                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 text-center transition-all ${
                  isSelected
                    ? `${type.color} ring-2 ring-offset-1 ring-[#5b6854] shadow-sm font-bold scale-[1.02]`
                    : 'bg-[#ffffff] text-[#434844] border-[#e6e2da] hover:bg-[#faf9f5]'
                }`}
              >
                <Icon size={20} />
                <span className="font-body text-xs font-semibold">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* File Drag-and-Drop / Upload Box */}
      <div className="bg-[#ffffff] rounded-3xl p-8 border-2 border-dashed border-[#8c9a84] text-center flex flex-col items-center gap-4 shadow-sm relative hover:border-[#2d3a31] transition-all">
        <div className="w-16 h-16 rounded-full bg-[#f4f4f0] text-[#5b6854] flex items-center justify-center">
          <UploadCloud size={32} />
        </div>
        <div className="space-y-1 max-w-md">
          <span className="font-display text-lg text-[#18241c] font-semibold block">
            {t(currentLanguage, 'uploadFile')}
          </span>
          <p className="font-body text-xs text-[#737873]">
            Supports PDF, PNG, JPG, JPEG (Select one or multiple files)
          </p>
        </div>

        <label className="h-12 px-6 rounded-full bg-[#2d3a31] hover:bg-[#1c2720] text-[#ffffff] font-body text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95">
          <FileCheck size={18} />
          <span>{t(currentLanguage, 'uploadFile')}</span>
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {isUploading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8c9a84] mt-2">
            <RefreshCw size={16} className="animate-spin text-[#c27b66]" />
            <span>{t(currentLanguage, 'extracting')}</span>
          </div>
        )}

        {uploadError && (
          <div className="p-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-xs font-semibold flex items-center gap-2 mt-2 border border-[#ba1a1a]">
            <AlertCircle size={16} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Extracted Documents List */}
      {extractedDocs && extractedDocs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-[#18241c] font-semibold">
              {t(currentLanguage, 'extractedRecords')} ({extractedDocs.length})
            </h2>
            <span className="font-body text-xs text-[#737873]">
              Synchronized with Document Pipeline
            </span>
          </div>

          <div className="space-y-4">
            {extractedDocs.map((doc, idx) => {
              const parsed = parseDocExtraction(doc);
              const isNeedsReview = parsed.status === 'NEEDS_REVIEW';

              return (
                <div
                  key={doc.document_id || idx}
                  className="p-5 rounded-3xl bg-[#ffffff] border border-[#e6e2da] shadow-sm space-y-4 hover:border-[#8c9a84] transition-all"
                >
                  {/* Card Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e6e2da] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#d8e7ce] text-[#5b6854] flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <span className="font-display text-base text-[#18241c] font-semibold block">
                          {parsed.filename}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#737873] font-body">
                          <span>Type: <strong>{parsed.documentType}</strong></span>
                          <span>•</span>
                          <span>OCR Confidence: <strong>{parsed.confidence}%</strong></span>
                          {parsed.provider?.facility_name && (
                            <>
                              <span>•</span>
                              <span>Facility: <strong>{parsed.provider.facility_name}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                          isNeedsReview
                            ? 'bg-[#fff4e5] text-[#b45309] border border-[#fcd34d]'
                            : 'bg-[#d8e7ce] text-[#5b6854] border border-[#8c9a84]'
                        }`}
                      >
                        {isNeedsReview ? (
                          <>
                            <AlertCircle size={14} /> Needs Review
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} /> Verified OCR
                          </>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedDocDetail(doc)}
                        className="p-2 rounded-full hover:bg-[#f4f4f0] text-[#5b6854] transition-all"
                        title="View Detailed Extraction"
                      >
                        <Eye size={18} />
                      </button>

                      {onRemoveDocument && (
                        <button
                          type="button"
                          onClick={() => onRemoveDocument(doc.document_id || idx)}
                          className="p-2 rounded-full hover:bg-[#ffdad6] text-[#ba1a1a] transition-all"
                          title="Remove Document"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Extracted Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-body">
                    {/* Medications Section */}
                    <div className="bg-[#faf9f5] p-3.5 rounded-2xl border border-[#e6e2da] space-y-2">
                      <div className="flex items-center gap-1.5 text-[#2d3a31] font-semibold">
                        <Pill size={14} className="text-[#8c9a84]" />
                        <span>{t(currentLanguage, 'medicine')} ({parsed.medications.length}):</span>
                      </div>
                      {parsed.medications.length > 0 ? (
                        <div className="space-y-1.5">
                          {parsed.medications.map((m, mIdx) => (
                            <div key={mIdx} className="flex justify-between items-center bg-[#ffffff] p-2.5 rounded-xl border border-[#e6e2da]">
                              <span className="font-semibold text-[#18241c]">{m.name}</span>
                              <span className="text-[#737873] font-medium">{m.dose} {m.frequency ? `(${m.frequency})` : ''}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#737873] italic">No active medications detected in text.</span>
                      )}
                    </div>

                    {/* Diagnoses & Lab Results Section */}
                    <div className="bg-[#faf9f5] p-3.5 rounded-2xl border border-[#e6e2da] space-y-2">
                      <div className="flex items-center gap-1.5 text-[#2d3a31] font-semibold">
                        <Stethoscope size={14} className="text-[#8c9a84]" />
                        <span>{t(currentLanguage, 'diagnosis')}:</span>
                      </div>
                      {parsed.diagnoses.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {parsed.diagnoses.map((d, dIdx) => (
                            <span key={dIdx} className="px-2.5 py-1 rounded-lg bg-[#ffffff] border border-[#e6e2da] font-medium text-[#18241c]">
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : parsed.labResults.length > 0 ? (
                        <div className="space-y-1">
                          {parsed.labResults.map((l, lIdx) => (
                            <div key={lIdx} className="flex justify-between bg-[#ffffff] p-2 rounded-xl border border-[#e6e2da]">
                              <span className="font-semibold">{l.test_name}</span>
                              <span>{l.value} {l.unit}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#737873] italic">Medical record processed cleanly.</span>
                      )}

                      {parsed.notes.length > 0 && (
                        <div className="text-[#434844] italic pt-1.5 border-t border-[#e6e2da] space-y-1">
                          {parsed.notes.map((note, nIdx) => (
                            <p key={nIdx}>"{note}"</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDocDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-[#e6e2da]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e2da]">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-[#5b6854]" />
                <h3 className="font-display text-lg text-[#18241c] font-semibold">
                  OCR Pipeline Metadata & Full JSON
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocDetail(null)}
                className="p-2 rounded-full hover:bg-[#f4f4f0] text-[#737873]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-body max-h-[400px] overflow-y-auto pr-1">
              <div className="p-3.5 rounded-2xl bg-[#faf9f5] border border-[#e6e2da] space-y-1.5">
                <div><strong>Filename:</strong> {selectedDocDetail.filename}</div>
                <div><strong>Document ID:</strong> {selectedDocDetail.document_id}</div>
                <div><strong>Document Type:</strong> {selectedDocDetail.document_type}</div>
                <div><strong>Status:</strong> {selectedDocDetail.status}</div>
                <div><strong>OCR Confidence Score:</strong> {parseDocExtraction(selectedDocDetail).confidence}%</div>
              </div>

              <div className="space-y-1">
                <strong className="block text-[#18241c]">Canonical Extraction Output:</strong>
                <pre className="p-3 rounded-2xl bg-[#18241c] text-[#d8e7ce] text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedDocDetail.extraction || selectedDocDetail, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDocDetail(null)}
                className="px-6 py-2 rounded-full bg-[#2d3a31] text-[#ffffff] text-xs font-semibold hover:bg-[#1c2720]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#e6e2da]">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-6 rounded-full bg-transparent hover:bg-[#f4f4f0] text-[#434844] font-body text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span>{t(currentLanguage, 'back')}</span>
        </button>

        <button
          type="button"
          onClick={onProceedToReview}
          className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#c27b66] hover:bg-[#a96552] text-[#ffffff] font-body text-base font-semibold transition-all shadow-sm flex items-center justify-center gap-3 active:translate-y-0.5"
        >
          <span>{t(currentLanguage, 'proceedToReview')}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
