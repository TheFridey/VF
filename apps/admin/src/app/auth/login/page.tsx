'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Enter credentials');
      return;
    }

    setLoading(true);
    try {
      const data = await adminApi.login(email, password);
      if (!['ADMIN', 'MODERATOR'].includes(data.user?.role)) {
        toast.error('Access denied - admin credentials required');
        return;
      }

      setUser(data.user);
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#060a12', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow', 'Segoe UI', sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(212,168,83,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.03) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 16px',
            background: 'linear-gradient(145deg, #d4a853, #b88a2a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}>
            <Shield size={24} color="#000" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#dce8f5', letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1 }}>
            VeteranFinder
          </h1>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#d4a853', letterSpacing: 3, marginTop: 4 }}>
            COMMAND CENTRE
          </p>
        </div>

        <div style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 10, padding: 28 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2.5, marginBottom: 22, textAlign: 'center' }}>
            RESTRICTED ACCESS - AUTHORISED PERSONNEL ONLY
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, display: 'block', marginBottom: 6 }}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
              placeholder="admin@veteranfinder.co.uk"
              style={{
                width: '100%', background: '#060c17', border: '1px solid #1a2636', borderRadius: 6,
                padding: '10px 12px', color: '#c8d6e5', fontSize: 13, outline: 'none',
                fontFamily: "'Barlow', sans-serif", boxSizing: 'border-box',
              }}
              onFocus={(event) => {
                event.target.style.borderColor = '#d4a853';
              }}
              onBlur={(event) => {
                event.target.style.borderColor = '#1a2636';
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, display: 'block', marginBottom: 6 }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
                placeholder="************"
                style={{
                  width: '100%', background: '#060c17', border: '1px solid #1a2636', borderRadius: 6,
                  padding: '10px 40px 10px 12px', color: '#c8d6e5', fontSize: 13, outline: 'none',
                  fontFamily: "'Barlow', sans-serif", boxSizing: 'border-box',
                }}
                onFocus={(event) => {
                  event.target.style.borderColor = '#d4a853';
                }}
                onBlur={(event) => {
                  event.target.style.borderColor = '#1a2636';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass((value) => !value)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#3a5068', cursor: 'pointer', padding: 0 }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '11px', borderRadius: 7,
              background: loading ? 'rgba(212,168,83,0.06)' : 'rgba(212,168,83,0.12)',
              border: '1px solid rgba(212,168,83,0.3)',
              color: '#d4a853', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1.5,
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={(event) => {
              if (!loading) {
                event.currentTarget.style.background = 'rgba(212,168,83,0.2)';
              }
            }}
            onMouseLeave={(event) => {
              if (!loading) {
                event.currentTarget.style.background = 'rgba(212,168,83,0.12)';
              }
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid #d4a853', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'vf-spin 0.7s linear infinite' }} />
                AUTHENTICATING
              </>
            ) : 'SIGN IN'}
          </button>
        </div>
      </div>

      <style suppressHydrationWarning>{`
        @keyframes vf-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
