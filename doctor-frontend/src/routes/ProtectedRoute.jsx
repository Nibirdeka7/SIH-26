import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Blocks the whole app behind verified doctor auth. Every patient-data
// route in this portal should sit under this.
export default function ProtectedRoute() {
  const { doctor, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem' }}>Loading…</div>;
  if (doctor) return <Navigate to="/login" replace />;
  return <Outlet />;
}
