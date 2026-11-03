'use client';

import { useState } from 'react';
import BusinessLogo from "../../components/BusinessLogo";
import { business } from '../../../lib/business.mjs';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || 'Invalid password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #e0f2e9 0%, #a8e0c2 100%)',
      fontFamily: '"Inter", system-ui, sans-serif',
      overflow: 'hidden'
    }}>
      
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        right: '-10%',
        width: '60vw',
        height: '60vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(31,107,44,0.1) 0%, rgba(31,107,44,0) 70%)',
        zIndex: 0
      }}></div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '50px 40px',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
        width: '100%',
        maxWidth: '440px',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        zIndex: 1,
        transform: 'translateY(-20px)'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <BusinessLogo className="admin-login-logo" />
          <h1 style={{ 
            margin: 0, 
            color: '#1a1a1a', 
            fontSize: '2rem', 
            fontWeight: '800',
            letterSpacing: '-0.03em'
          }}>{business.shortName} Admin</h1>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '1.05rem' }}>Welcome back. Please enter your password.</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ 
              background: 'rgba(255, 59, 48, 0.1)', 
              color: '#ff3b30', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              marginBottom: '24px', 
              textAlign: 'center',
              fontSize: '0.95rem',
              fontWeight: '500',
              border: '1px solid rgba(255, 59, 48, 0.2)'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', color: '#444', fontWeight: '600', fontSize: '0.95rem' }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your admin password"
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.1)',
                background: 'rgba(255, 255, 255, 0.9)',
                boxSizing: 'border-box',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid #1f6b2c';
                e.target.style.boxShadow = '0 0 0 4px rgba(31, 107, 44, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(0,0,0,0.1)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#2c8f3e' : '#1f6b2c',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1.05rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(31, 107, 44, 0.2)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-1px)', e.target.style.boxShadow = '0 6px 16px rgba(31, 107, 44, 0.3)')}
            onMouseOut={(e) => !loading && (e.target.style.transform = 'none', e.target.style.boxShadow = '0 4px 12px rgba(31, 107, 44, 0.2)')}
            onMouseDown={(e) => !loading && (e.target.style.transform = 'translateY(1px)')}
            onMouseUp={(e) => !loading && (e.target.style.transform = 'translateY(-1px)')}
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
