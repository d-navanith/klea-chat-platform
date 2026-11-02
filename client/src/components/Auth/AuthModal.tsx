import React, { useState } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { initSocket } from '../../services/socket';

export const AuthModal: React.FC = () => {
  const { user, setUser, setToken, appView, setAppView, theme } = useStore();
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user || appView === 'admin') return null;

  const handleLogin = async (idVal?: string, passVal?: string) => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    const loginIdentifier = idVal || identifier;
    const loginPassword = passVal || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setUser(data.user);
      setToken(data.token);
      initSocket(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      // If pending admin approval
      if (data.isApproved === false) {
        setIsRegister(false);
        setIdentifier(username);
        setInfoMessage('Account created! Your account is waiting for Administrator approval before you can log in.');
      } else if (data.token) {
        setUser(data.user);
        setToken(data.token);
        initSocket(data.token);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors ${
        theme === 'light' ? 'bg-[#eef2f5]' : 'bg-[#0e1621]'
      }`}
    >
      <div
        className={`w-full max-w-md rounded-3xl p-8 border shadow-2xl flex flex-col items-center transition-colors ${
          theme === 'light'
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-[#17212b] border-white/10 text-white'
        }`}
      >
        {/* App Logo */}
        <div
          className={`w-20 h-20 rounded-2xl overflow-hidden shadow-xl mb-4 border ${
            theme === 'light' ? 'border-gray-200' : 'border-white/15 shadow-blue-500/20'
          }`}
        >
          <img src="/logo.png" alt="Klea Logo" className="w-full h-full object-cover" />
        </div>

        <h2 className={`text-2xl font-bold tracking-tight ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
          Klea
        </h2>
        <p className={`text-xs mt-1 text-center ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
          Secure Enterprise Web App with Private Groups & Real-Time Messaging
        </p>

        {/* Demo Fast Login Buttons for Employees */}
        <div
          className={`w-full mt-6 p-3.5 rounded-2xl border space-y-2 ${
            theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#0e1621] border-white/5'
          }`}
        >
          <div
            className={`text-[11px] font-semibold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 ${
              theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5288c1]" /> Quick Employee Sign-In (1-Click)
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleLogin('alice', 'password123')}
              className={`py-2.5 px-3 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer border ${
                theme === 'light'
                  ? 'bg-white hover:bg-gray-100 text-gray-900 border-gray-200 shadow-xs'
                  : 'bg-white/5 hover:bg-white/10 text-white border-white/5'
              }`}
            >
              <span className="text-base">👩</span>
              <div className="text-left">
                <div className="font-bold text-xs">Alice</div>
                <div className={`text-[10px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>@alice</div>
              </div>
            </button>
            <button
              onClick={() => handleLogin('bob', 'password123')}
              className={`py-2.5 px-3 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer border ${
                theme === 'light'
                  ? 'bg-white hover:bg-gray-100 text-gray-900 border-gray-200 shadow-xs'
                  : 'bg-white/5 hover:bg-white/10 text-white border-white/5'
              }`}
            >
              <span className="text-base">👨</span>
              <div className="text-left">
                <div className="font-bold text-xs">Bob</div>
                <div className={`text-[10px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>@bob</div>
              </div>
            </button>
          </div>
        </div>

        {infoMessage && (
          <div className="w-full mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs text-center leading-relaxed font-medium">
            ⏳ {infoMessage}
          </div>
        )}

        {error && (
          <div className="w-full mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs text-center leading-relaxed">
            {error}
          </div>
        )}

        {/* Form Inputs */}
        <div className="w-full mt-6 space-y-3">
          {isRegister ? (
            <>
              <div>
                <label className={`text-[11px] font-medium mb-1 block ${theme === 'light' ? 'text-gray-600' : 'text-[#7f91a4]'}`}>
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                    theme === 'light'
                      ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                      : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[11px] font-medium mb-1 block ${theme === 'light' ? 'text-gray-600' : 'text-[#7f91a4]'}`}>
                  Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                    theme === 'light'
                      ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                      : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[11px] font-medium mb-1 block ${theme === 'light' ? 'text-gray-600' : 'text-[#7f91a4]'}`}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                    theme === 'light'
                      ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                      : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                  }`}
                />
              </div>
            </>
          ) : (
            <div>
              <label className={`text-[11px] font-medium mb-1 block ${theme === 'light' ? 'text-gray-600' : 'text-[#7f91a4]'}`}>
                Username or Email
              </label>
              <input
                type="text"
                placeholder="e.g. durov or durov@telegram.org"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                  theme === 'light'
                    ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                    : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                }`}
              />
            </div>
          )}

          <div>
            <label className={`text-[11px] font-medium mb-1 block ${theme === 'light' ? 'text-gray-600' : 'text-[#7f91a4]'}`}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] border ${
                theme === 'light'
                  ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-white/30'
              }`}
            />
          </div>

          <button
            onClick={isRegister ? handleRegister : () => handleLogin()}
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-[#5288c1] hover:bg-[#5d9ad8] text-white text-xs font-bold transition shadow-md cursor-pointer"
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Log In'}
          </button>
        </div>

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
          className="mt-4 text-xs text-[#5288c1] hover:underline cursor-pointer"
        >
          {isRegister ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </button>

        {/* Separated Admin Portal Access Link */}
        <div className={`w-full mt-6 pt-4 border-t flex items-center justify-center ${theme === 'light' ? 'border-gray-200' : 'border-white/5'}`}>
          <button
            onClick={() => {
              setAppView('admin');
              window.history.pushState({}, '', '/admin');
            }}
            className={`text-[11px] hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1.5 transition cursor-pointer ${
              theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Infrastructure Administrator? Access Admin Console</span>
          </button>
        </div>
      </div>
    </div>
  );
};
