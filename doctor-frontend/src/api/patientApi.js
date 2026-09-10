import axiosClient from './axiosClient';
import { DUMMY_CHECKED_IN_HISTORY } from '../data/dummyPatients';

// A patient (per patient-mobile) can be logged in / registered under any of
// three identity types. The doctor portal must resolve a patient by
// whichever one the front-desk / doctor has on hand.
export const IDENTIFIER_TYPES = {
  ABHA: 'abha_id',
  MOBILE: 'linked_mobile',
  AADHAAR: 'aadhaar_number',
};

export const patientApi = {
  // payload: { type: 'abha_id' | 'linked_mobile' | 'aadhaar_number', value: string, consentToken? }
  lookup: (payload) => axiosClient.post('/patients/lookup', payload),

  getProfile: (patientId) => axiosClient.get(`/patients/${patientId}`),

  getReports: (patientId) => axiosClient.get(`/patients/${patientId}/reports`),

  getPrescriptions: (patientId) => axiosClient.get(`/patients/${patientId}/prescriptions`),

  // AI-generated summary from the voice interview + document analysis pipeline
  getAiSummary: (patientId) => axiosClient.get(`/patients/${patientId}/ai-summary`),

  // doctor edits/annotates the AI summary before it's finalized
  updateAiSummary: (patientId, payload) =>
    axiosClient.put(`/patients/${patientId}/ai-summary`, payload),

  addDoctorRemark: (patientId, payload) =>
    axiosClient.post(`/patients/${patientId}/remarks`, payload),

  // marks the visit as checked-in/seen with a server-side timestamp
  checkIn: (patientId, payload) =>
    axiosClient.post(`/patients/${patientId}/check-in`, payload),

  getVisitHistory: (patientId) => axiosClient.get(`/patients/${patientId}/visits`),

  // Retrieve all patients checked in by the doctor till now (supports pagination of 25)
  getCheckedInHistory: async ({ page = 1, limit = 25, search = '' } = {}) => {
    try {
      const response = await axiosClient.get('/doctor/visits/history', {
        params: { page, limit, search },
      });
      return response.data;
    } catch {
      const query = (search || '').trim().toLowerCase();
      let filtered = [...DUMMY_CHECKED_IN_HISTORY];
      if (query) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.reason.toLowerCase().includes(query) ||
            (p.identifierValue && p.identifierValue.toLowerCase().includes(query)) ||
            (p.id && p.id.toLowerCase().includes(query))
        );
      }
      filtered.sort(
        (a, b) =>
          new Date(b.checkedInAt || b.completedAt) -
          new Date(a.checkedInAt || a.completedAt)
      );

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const currentPage = Math.max(1, Math.min(page, totalPages));
      const startIndex = (currentPage - 1) * limit;
      const items = filtered.slice(startIndex, startIndex + limit);

      return {
        data: items,
        total,
        page: currentPage,
        limit,
        totalPages,
      };
    }
  },
};
