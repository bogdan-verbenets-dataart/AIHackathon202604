import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { changePassword } from '../api/auth';
import TopNav from '../components/TopNav';
import '../styles/chat.css';

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopNav />
      <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ background: 'white', borderRadius: 8, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: 24 }}>Profile</h2>
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={user?.username ?? ''} readOnly style={{ background: '#f8f9fa' }} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={user?.email ?? ''} readOnly style={{ background: '#f8f9fa' }} />
        </div>
        <div className="form-group">
          <label>Member since</label>
          <input type="text" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''} readOnly style={{ background: '#f8f9fa' }} />
        </div>

        <hr style={{ margin: '24px 0', borderColor: '#dee2e6' }} />
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Change Password</h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
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
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          {success && <div style={{ color: '#27ae60', marginBottom: 8, fontSize: 13 }}>{success}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          <Link to="/sessions" style={{ color: '#3498db' }}>Manage Sessions</Link>
        </div>
      </div>
    </div>
    </div>
  );
}
