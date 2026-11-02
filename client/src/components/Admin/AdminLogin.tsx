import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertTriangle, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const AdminLogin: React.FC = () => {
  const { setAdminToken, setAdminUser, setAppView } = useStore();
  const [identifier, setIdentifier] = useState('durov');
  const [password, setPassword] = useState('password123');
  const [securityPasskey, setSecurityPasskey] = useState('KLEA-ADMIN-2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          securityPasskey: securityPasskey.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Administrator authentication failed.');
      }

      setSuccess('Admin session verified. Entering management console...');
      setAdminToken(data.adminToken);
      setAdminUser(data.adminUser);
    } catch (err: any) {
      setError(err.message || 'Security verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillMasterAdmin = () => {
    setIdentifier('durov');
    setPassword('password123');
    setSecurityPasskey('KLEA-ADMIN-2026');
  };

  return (
    <div className="min-h-screen w-screen bg-[#0b1016] text-[#e1e7ec] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Return to Messenger top bar */}
      <button
        onClick={() => {
          setAppView('messenger');
          window.history.pushState({}, '', '/');
        }}
        className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#7f91a4] hover:text-white flex items-center gap-2 transition cursor-pointer border border-white/5"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Klea Messenger</span>
      </button>

      {/* Main Admin Card */}
      <div className="w-full max-w-md bg-[#131b24] border border-cyan-500/20 rounded-3xl p-8 shadow-2xl shadow-cyan-950/40 relative z-10 backdrop-blur-md">
        {/* Security Shield Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600/20 via-blue-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
            <Lock className="w-3 h-3" />
            <span>Restricted Security Console</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Klea Administration</h1>
          <p className="text-xs text-[#7f91a4] mt-1 max-w-xs leading-relaxed">
            Isolated management infrastructure. Standard employee accounts cannot log in here.
          </p>
        </div>

        {/* Security Alert Banner */}
        <div className="mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2.5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            <strong>Separated from User Accounts:</strong> All administrative logins are cryptographically isolated and audited in system security logs.
          </span>
        </div>

        {/* Quick Fill Master Admin Button */}
        <button
          type="button"
          onClick={fillMasterAdmin}
          className="w-full mt-4 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Auto-fill Demo Admin (durov / password123)</span>
        </button>

        {/* Error or Success notification */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAdminLogin} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#7f91a4] mb-1.5">
              Administrator Username or Email
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. durov"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1016] border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#7f91a4] mb-1.5">
              Administrator Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1016] border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#7f91a4] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Security Passkey / 2FA Key</span>
              </label>
              <span className="text-[10px] text-cyan-400/80">KLEA-ADMIN-2026</span>
            </div>
            <input
              type="text"
              value={securityPasskey}
              onChange={(e) => setSecurityPasskey(e.target.value)}
              placeholder="KLEA-ADMIN-2026"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1016] border border-cyan-500/20 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold tracking-wide shadow-lg shadow-cyan-600/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Authenticate Secure Admin Session'}</span>
          </button>
        </form>

        {/* Security Metadata Footer */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center text-[10px] text-[#7f91a4] flex items-center justify-center gap-4">
          <span>TLS 1.3 256-Bit Encrypted</span>
          <span>•</span>
          <span>Role RBAC Enforced</span>
          <span>•</span>
          <span>Zero User-Account Linkage</span>
        </div>
      </div>
    </div>
  );
};
