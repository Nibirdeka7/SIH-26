import axiosClient from './axiosClient';

// Doctor identity verification (registration council / hospital ID based),
// separate from patient auth used in patient-mobile / patient-frontend.
export const authApi = {
  // step 1: doctor login with email/employee-id + password (or hospital SSO)
  login: (payload) => axiosClient.post('/doctor/auth/login', payload),

  // step 2: OTP / 2FA confirmation tied to the doctor's registered mobile,
  // needed because this portal exposes patient medical records.
  verifyOtp: (payload) => axiosClient.post('/doctor/auth/verify-otp', payload),

  // validates the doctor's medical registration/council ID at signup or
  // periodically, so only verified doctors can access patient data.
  verifyMedicalId: (payload) => axiosClient.post('/doctor/auth/verify-medical-id', payload),

  me: () => axiosClient.get('/doctor/auth/me'),

  logout: () => axiosClient.post('/doctor/auth/logout'),
};
