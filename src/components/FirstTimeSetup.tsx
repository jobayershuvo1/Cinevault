import React, { useState } from 'react';
import { Shield, Sparkles, AlertCircle, KeyRound, Mail, UserPlus, CheckCircle } from 'lucide-react';

interface FirstTimeSetupProps {
  onComplete: (user: any, token: string) => void;
}

export default function FirstTimeSetup({ onComplete }: FirstTimeSetupProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !email || !password || !confirmPassword) {
      setError('Please complete all initialization fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must feature at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/setup/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server initialized, but registration failed.');
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete(data.user, data.token);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'System boot error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="first-time-setup-wizard" className="fixed inset-0 z-50 flex items-center justify-center bg-[#07070F] text-neutral-100 p-4 overflow-y-auto">
      {/* Dynamic glowing background circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-[130px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-rose-600/10 blur-[130px]" />

      <main className="relative w-full max-w-xl bg-[#121225] border border-violet-500/15 rounded-3xl p-6 md:p-8 shadow-2xl shadow-violet-950/20 max-h-[90vh] overflow-y-auto">
        
        {success ? (
          <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-neutral-50">CineVault Initiated!</h2>
            <p className="text-sm text-neutral-400 max-w-md">
              Congratulations! Your Super Admin profile has been generated. Loading CineVault Dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Header Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400 mb-2">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center justify-center gap-2 bg-gradient-to-r from-neutral-50 to-neutral-300 text-transparent bg-clip-text">
                CineVault Setup Wizard <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
              </h2>
              <p className="text-sm text-neutral-400 max-w-md mx-auto">
                First-time deployment detected. Complete the form below to create the core **Super Admin** account. All future registrations will be normal subscribers.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Fields Grid */}
            <div className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Super Admin Username</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    id="setup_username_input"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. system_root"
                    className="w-full bg-[#18182E] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Super Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    id="setup_email_input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@cinevault.domain"
                    className="w-full bg-[#18182E] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Root Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      id="setup_password_input"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#18182E] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Confirm Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      id="setup_password_confirm_input"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#18182E] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Information warning box */}
            <div className="p-4 rounded-2xl bg-violet-600/5 border border-violet-500/10 text-xs text-neutral-400 space-y-1 leading-relaxed">
              <span className="font-semibold text-neutral-200">🔒 System Permissions Privilege Note:</span>
              <p>
                As Super Admin, you hold unilateral override privileges. You can manage admins, modify default platforms, configure branding profiles, draft and publish categorized custom movies, and bind premium third-party download redirections. Ensure this credential is kept strictly secured.
              </p>
            </div>

            <button
              id="setup_submit_btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/10 transition-all duration-200 active:scale-98 disabled:opacity-50 cursor-pointer text-center"
            >
              {loading ? "Booting System Core..." : "Initiate & Bind Super Admin"}
            </button>

          </form>
        )}

      </main>
    </div>
  );
}
