import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [doctor, setDoctor] = useState(() => {
    const cached = localStorage.getItem('doctor_profile');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('doctor_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setDoctor(res.data))
      .catch(() => setDoctor(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    // returns { requiresOtp: true, tempToken } OR { token, doctor }
    const { data } = await authApi.login(credentials);
    if (data.token) {
      localStorage.setItem('doctor_token', data.token);
      localStorage.setItem('doctor_profile', JSON.stringify(data.doctor));
      setDoctor(data.doctor);
    }
    return data;
  };

  const verifyOtp = async (payload) => {
    const { data } = await authApi.verifyOtp(payload);
    localStorage.setItem('doctor_token', data.token);
    localStorage.setItem('doctor_profile', JSON.stringify(data.doctor));
    setDoctor(data.doctor);
    return data;
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('doctor_profile');
    setDoctor(null);
  };

  return (
    <AuthContext.Provider value={{ doctor, loading, login, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
