import React, { useState } from 'react';
import { FileText, UploadCloud, CheckCircle2, AlertCircle, FileCheck, Loader2 } from 'lucide-react';
import { documentService } from '../services/document_api';
import { parseDocExtraction } from '../utils/document_parser';

export default function DocumentScanner({ sessionId, onDocumentExtracted }) {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('PRESCRIPTION');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
      setAnalysisResult(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    try {
      const result = await documentService.analyzeDocument(file, sessionId, docType);
      const firstDoc = result?.documents?.[0] || result;
      setAnalysisResult(firstDoc);
      if (onDocumentExtracted) {
        onDocumentExtracted(firstDoc);
      }
    } catch (err) {
      console.error('DocumentScanner OCR processing error:', err);
      setError('Document analysis failed. Please verify that Document Service backend (Port 8000) is running.');
    } finally {
      setAnalyzing(false);
    }
  };

  const parsed = analysisResult ? parseDocExtraction(analysisResult) : null;

  return (
    <div className="bg-[#ffffff] rounded-3xl p-6 border border-[#e6e2da] shadow-sm flex flex-col h-full space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-[#e6e2da]">
        <FileText size={20} className="text-[#5b6854]" />
        <h3 className="font-display text-base text-[#18241c] font-semibold">
          Prescription & Document Scanner
        </h3>
      </div>

      {/* Document Type Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'PRESCRIPTION', label: 'Prescription' },
          { id: 'LAB_REPORT', label: 'Lab Report' },
          { id: 'DISCHARGE_SUMMARY', label: 'Summary' },
          { id: 'OTHER', label: 'Other' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDocType(t.id)}
            className={`px-3 py-1 rounded-full text-xs font-body font-semibold transition-all border ${
              docType === t.id
                ? 'bg-[#d8e7ce] text-[#5b6854] border-[#8c9a84] shadow-xs font-bold'
                : 'bg-[#faf9f5] text-[#737873] border-[#e6e2da] hover:bg-[#e9e8e4]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-[#8c9a84] rounded-2xl p-5 text-center bg-[#faf9f5] cursor-pointer hover:border-[#2d3a31] transition-all">
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
          id="doc-scanner-input"
        />
        <label htmlFor="doc-scanner-input" className="cursor-pointer block space-y-2">
          <UploadCloud size={32} className="mx-auto text-[#8c9a84]" />
          <p className="font-display text-sm text-[#18241c] font-semibold">
            {file ? file.name : 'Click to select prescription or lab report photo/PDF'}
          </p>
          <p className="font-body text-xs text-[#737873]">
            Supports PDF, JPG, PNG (OCR automatic extraction)
          </p>
        </label>
      </div>

      {/* Image Preview & Scan Action */}
      {previewUrl && (
        <div className="space-y-3">
          <div className="max-h-36 overflow-hidden rounded-xl border border-[#e6e2da]">
            <img src={previewUrl} alt="Document Preview" className="w-full object-cover" />
          </div>

          <button
            type="button"
            onClick={handleUploadAndAnalyze}
            disabled={analyzing}
            className="w-full h-11 rounded-full bg-[#2d3a31] hover:bg-[#1c2720] text-[#ffffff] font-body text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            {analyzing ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#d8e7ce]" />
                <span>Processing Document OCR...</span>
              </>
            ) : (
              <>
                <FileCheck size={16} />
                <span>Extract Prescriptions & History</span>
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-xs font-semibold flex items-center gap-1.5 border border-[#ba1a1a]">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Extraction Results view */}
      {parsed && (
        <div className="p-3.5 rounded-2xl bg-[#d8e7ce]/40 border border-[#8c9a84] text-xs font-body space-y-2 mt-auto">
          <div className="flex items-center gap-1.5 text-[#5b6854] font-bold">
            <CheckCircle2 size={16} />
            <span>OCR Extraction Complete ({parsed.confidence}%)</span>
          </div>

          {parsed.medications.length > 0 ? (
            <div className="space-y-1">
              <strong className="block text-[#18241c]">Medicines Extracted:</strong>
              {parsed.medications.map((m, idx) => (
                <div key={idx} className="text-[#18241c]">
                  • {m.name} {m.dose} ({m.frequency})
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#18241c]">
              {parsed.notes[0] || parsed.rawText.slice(0, 100) || 'Document processed successfully.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
