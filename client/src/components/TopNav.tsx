import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { logout } from '../api/auth';

export default function TopNav() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className="topnav">
      <div style={{ fontWeight: 700, fontSize: 18, marginRight: 8 }}>💬 ChatApp</div>
      <div style={{ flex: 1, display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link to="/" style={{ color: '#ecf0f1', fontSize: 14, opacity: 0.85 }}>Chat</Link>
        <Link to="/profile" style={{ color: '#ecf0f1', fontSize: 14, opacity: 0.85 }}>Profile</Link>
        <Link to="/sessions" style={{ color: '#ecf0f1', fontSize: 14, opacity: 0.85 }}>Sessions</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <span style={{ fontSize: 13, opacity: 0.8 }}>
            <span style={{ marginRight: 6 }}>👤</span>{user.username}
          </span>
        )}
        <button
          onClick={handleLogout}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '5px 12px', borderRadius: 4, fontSize: 13 }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
