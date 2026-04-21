import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'reset'>('request');

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setToken(result.token);
      setStep('reset');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess('Password reset successfully! You can now sign in.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 style={{ marginBottom: 24, textAlign: 'center' }}>💬 ChatApp</h1>
        <h2 style={{ marginBottom: 20, fontSize: 20 }}>Forgot Password</h2>

        {step === 'request' && (
          <form onSubmit={handleForgot}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Get Reset Token'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <>
            <div style={{ background: '#f0f8ff', border: '1px solid #3498db', borderRadius: 4, padding: 12, marginBottom: 16, fontSize: 13 }}>
              <strong>Reset Token:</strong>
              <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 4 }}>{token}</div>
            </div>
            {!success ? (
              <form onSubmit={handleReset}>
                <div className="form-group">
                  <label>Reset Token</label>
                  <input
                    type="text"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            ) : (
              <div style={{ color: '#27ae60', marginBottom: 12 }}>{success}</div>
            )}
          </>
        )}

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          <Link to="/login" style={{ color: '#3498db' }}>Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
