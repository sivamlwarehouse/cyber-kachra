import React, { useState } from 'react';
import { Shield, Lock, ArrowLeft } from 'lucide-react';
import { setAdminToken } from '../utils/admin-auth';

interface AdminLoginProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function AdminLogin({ onBack, onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setAdminToken(data.token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-natural-ivory flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-natural-sand rounded-[24px] shadow-lg p-6">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] text-[#7A7872] flex items-center gap-1 mb-4 cursor-pointer hover:text-natural-heading"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to map
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-status-clean" />
          <h1 className="text-lg font-bold text-natural-heading">Admin Login</h1>
        </div>
        <p className="text-[11px] text-[#7A7872] mb-5">GHMC ward officers &amp; municipal admins only.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-[10px] font-mono font-bold uppercase text-[#A3A199]">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#A3A199] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full border border-natural-sand rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-status-clean"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-[11px] text-status-active bg-status-active-light border border-status-active/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-natural-sage hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-full text-sm cursor-pointer mt-1"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
