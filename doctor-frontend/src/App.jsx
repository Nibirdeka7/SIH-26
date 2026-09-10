import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PatientDetailPage from './pages/PatientDetailPage.jsx';
import CheckedInHistoryPage from './pages/CheckedInHistoryPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/lookup" element={<Navigate to="/" replace />} />
          <Route path="/patient/:patientId" element={<PatientDetailPage />} />
          <Route path="/history" element={<CheckedInHistoryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
