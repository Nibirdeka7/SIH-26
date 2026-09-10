import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Two-step doctor login:
// 1) employee/registration ID + password
// 2) OTP sent to the doctor's registered mobile
// This is deliberately separate from patient auth (ABHA/mobile/Aadhaar)
// since a doctor's identity is verified against the medical council, not ABDM.
export default function LoginPage() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ employeeId: '', password: '' });
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form);
      if (data.requiresOtp) {
        setTempToken(data.tempToken);
        setStep(2);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp({ tempToken, otp });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={step === 1 ? handleLogin : handleVerifyOtp} className="panel" style={{ width: 380 }}>
        <h2 style={{ marginTop: 0 }}>Doctor Portal Login</h2>

        {step === 1 && (
          <>
            <label>Employee / Registration ID</label>
            <input
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              style={{ width: '100%', padding: '0.6rem', margin: '0.4rem 0 1rem', borderRadius: 8, border: '1px solid var(--border)' }}
              required
            />
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: '100%', padding: '0.6rem', margin: '0.4rem 0 1rem', borderRadius: 8, border: '1px solid var(--border)' }}
              required
            />
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ color: 'var(--muted)' }}>Enter the OTP sent to your registered mobile.</p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              style={{ width: '100%', padding: '0.6rem', margin: '0.4rem 0 1rem', borderRadius: 8, border: '1px solid var(--border)' }}
              required
            />
          </>
        )}

        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

        <button className="btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Please wait…' : step === 1 ? 'Continue' : 'Verify & Login'}
        </button>
      </form>
    </div>
  );
}
