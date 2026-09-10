import axios from 'axios';

// Single axios instance for the whole doctor portal.
// Wire VITE_API_BASE_URL to the `backend/` service in the SIH-26 repo.
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach doctor's auth token to every request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('doctor_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Central 401 handling -> force re-login
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('doctor_token');
      localStorage.removeItem('doctor_profile');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default axiosClient;
