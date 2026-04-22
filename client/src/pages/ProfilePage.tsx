import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { changePassword, deleteAccount } from '../api/auth';
import '../styles/chat.css';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteAccount();
      setUser(null);
      navigate('/login');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setDeleteError(e.response?.data?.error ?? 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
    }
  };

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
    <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={{ color: '#3498db', fontSize: 14 }}>← Back to Chat</Link>
      </div>
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

        <hr style={{ margin: '24px 0', borderColor: '#dee2e6' }} />
        <h3 style={{ marginBottom: 8, fontSize: 16, color: '#c0392b' }}>Danger Zone</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          Permanently delete your account, all rooms you own, and their messages and files. This action cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: 'transparent',
              color: '#c0392b',
              border: '1px solid #c0392b',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Delete Account
          </button>
        ) : (
          <div style={{ border: '1px solid #f5c6cb', borderRadius: 6, padding: 16, background: '#fff5f5' }}>
            <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 12, fontWeight: 500 }}>
              Are you sure? This will permanently delete your account and all data owned by you.
            </p>
            {deleteError && <div className="error-msg">{deleteError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                style={{
                  background: '#c0392b',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: deleteLoading ? 0.7 : 1,
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, delete my account'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                disabled={deleteLoading}
                style={{
                  background: 'transparent',
                  color: '#555',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
