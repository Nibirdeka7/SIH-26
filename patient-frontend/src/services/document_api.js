import { API_BASE_URLS } from '../config/api_config';

/**
 * Service to handle prescription/lab report photo upload & OCR processing (Port 8000)
 */
export const documentService = {
  /**
   * Check health status of Document Service backend
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URLS.DOCUMENT}/health`);
      if (!response.ok) return { status: 'error', service: 'document-service' };
      return await response.json();
    } catch (err) {
      console.warn('Document service health check failed:', err);
      return { status: 'unreachable', service: 'document-service' };
    }
  },

  /**
   * Upload a single image file for medical document OCR extraction
   */
  async analyzeDocument(file, sessionId = null, documentType = null) {
    return this.uploadMultipleDocuments([file], sessionId, documentType);
  },

  /**
   * Upload one or more medical documents (prescriptions, lab reports, discharge summaries)
   */
  async uploadMultipleDocuments(files, sessionId = null, documentType = null) {
    const formData = new FormData();

    const fileList = Array.isArray(files) ? files : [files];
    fileList.forEach((file) => {
      if (file) {
        formData.append('files', file);
      }
    });

    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    if (documentType) {
      formData.append('document_type', documentType);
    }

    try {
      const response = await fetch(`${API_BASE_URLS.DOCUMENT}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Document Service error (${response.status}): ${errorText || response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Connection failed: Please ensure Document Service backend is running on http://localhost:8000.');
      }
      throw err;
    }
  },
};

