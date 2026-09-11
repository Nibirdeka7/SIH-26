import axiosClient from './axiosClient';
import { DUMMY_CHECKED_IN_HISTORY } from '../data/dummyPatients';

const SUMMARY_BASE_URL = 'http://localhost:8002/api/v1';
const DOCUMENT_BASE_URL = 'http://localhost:8000/api/v1';

export const IDENTIFIER_TYPES = {
  ABHA: 'abha_id',
  MOBILE: 'linked_mobile',
  AADHAAR: 'aadhaar_number',
};

export const patientApi = {
  lookup: async (payload) => {
    try {
      return await axiosClient.post('/patients/lookup', payload);
    } catch {
      // Local fallback lookup
      const val = (payload.value || '').trim().toLowerCase();
      const match = DUMMY_CHECKED_IN_HISTORY.find(
        (p) =>
          p.id.toLowerCase() === val ||
          (p.identifierValue && p.identifierValue.toLowerCase().includes(val)) ||
          p.name.toLowerCase().includes(val)
      ) || DUMMY_CHECKED_IN_HISTORY[0];

      return {
        data: {
          id: match.id,
          name: match.name,
          age: match.age,
          gender: match.gender,
          identifierType: match.identifierType,
          identifierValue: match.identifierValue,
        },
      };
    }
  },

  getProfile: async (patientId) => {
    try {
      return await axiosClient.get(`/patients/${patientId}`);
    } catch {
      const match = DUMMY_CHECKED_IN_HISTORY.find((p) => p.id === patientId) || DUMMY_CHECKED_IN_HISTORY[0];
      return {
        data: {
          id: match.id,
          name: match.name,
          age: match.age,
          gender: match.gender === 'M' ? 'male' : 'female',
          mobile: match.identifierValue || '9876543210',
          abhaNumber: match.identifierType === 'abha_id' ? match.identifierValue : '91-8273-4920-11',
          currentVisitCheckedInAt: match.checkedInAt,
        },
      };
    }
  },

  getReports: async (patientId) => {
    try {
      const res = await fetch(`${DOCUMENT_BASE_URL}/documents?session_id=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        return { data: data.documents || [] };
      }
    } catch (e) {
      console.warn('Reports endpoint offline notice:', e);
    }
    return {
      data: [
        {
          id: 'rep_101',
          title: 'Complete Blood Count (CBC)',
          date: '2026-09-08',
          type: 'LAB_REPORT',
          status: 'Normal',
        },
        {
          id: 'rep_102',
          title: '12-Lead ECG Report',
          date: '2026-09-10',
          type: 'DIAGNOSTIC',
          status: 'Needs Doctor Review',
        },
      ],
    };
  },

  getPrescriptions: async (patientId) => {
    try {
      return await axiosClient.get(`/patients/${patientId}/prescriptions`);
    } catch {
      return {
        data: [
          {
            id: 'rx_201',
            date: '2026-08-15',
            doctorName: 'Dr. V. Roy',
            medicines: ['Tab. Metformin 500mg BD', 'Tab. Telmisartan 40mg OD'],
          },
        ],
      };
    }
  },

  // AI-generated summary from the voice interview + document analysis pipeline
  getAiSummary: async (patientId) => {
    try {
      const res = await fetch(`${SUMMARY_BASE_URL}/summary/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        return { data };
      }
    } catch (e) {
      console.warn('AI summary fetch notice:', e);
    }

    try {
      const genRes = await fetch(`${SUMMARY_BASE_URL}/summary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: patientId, include_documents: true }),
      });
      if (genRes.ok) {
        const data = await genRes.json();
        return { data };
      }
    } catch (_) {}

    return {
      data: {
        summary_id: `sum_${patientId}`,
        session_id: patientId,
        patient_id: patientId,
        patient_name: 'Rajesh Sharma',
        chief_complaint: 'Substernal chest pain and exertional dyspnea',
        suggested_specialty: 'Cardiology OPD',
        hpi_socrates: {
          site: 'Substernal chest',
          onset: '1 day ago',
          character: 'Crushing tightness',
          radiation: 'Left arm & jaw',
          associations: ['Diaphoresis', 'Shortness of breath'],
          severity: 8,
        },
        triage_assessment: {
          triage_level: 'CRITICAL_EMERGENCY',
          priority_score: 9,
          is_critical: true,
          red_flags: ['Suspected Acute Coronary Syndrome'],
        },
        bilingual_recap_native: 'मरीज ने सीने में भारीपन और बाएं हाथ में दर्द की शिकायत की है।',
      },
    };
  },

  updateAiSummary: (patientId, payload) =>
    axiosClient.put(`/patients/${patientId}/ai-summary`, payload),

  addDoctorRemark: (patientId, payload) =>
    axiosClient.post(`/patients/${patientId}/remarks`, payload),

  checkIn: (patientId, payload) =>
    axiosClient.post(`/patients/${patientId}/check-in`, payload),

  getVisitHistory: async (patientId) => {
    try {
      return await axiosClient.get(`/patients/${patientId}/visits`);
    } catch {
      return {
        data: [
          {
            id: 'v_901',
            date: '2026-08-15',
            department: 'General Medicine',
            doctor: 'Dr. V. Roy',
            diagnosis: 'Type 2 Diabetes Mellitus',
          },
        ],
      };
    }
  },

  // Retrieve all patients checked in by the doctor till now
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
