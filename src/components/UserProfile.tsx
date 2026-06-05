import React, { useEffect, useState } from 'react';
import { 
  User, Mail, Shield, Check, AlertCircle, RefreshCw, Upload, 
  KeyRound, HelpCircle, Activity, Calendar, Clock, PlusCircle, Sparkles
} from 'lucide-react';
import { Profile, MovieRequest, ActivityLog } from '../types';

interface UserProfileProps {
  token: string;
  user: Profile;
  onProfileUpdated: (updatedUser: Profile) => void;
}

export default function UserProfile({ token, user, onProfileUpdated }: UserProfileProps) {
  // Account settings state
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Email verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Movie Requests State
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newMovieYear, setNewMovieYear] = useState('');
  const [newMovieMsg, setNewMovieMsg] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [myRequests, setMyRequests] = useState<MovieRequest[]>([]);

  // Personal Activities state
  const [myActivities, setMyActivities] = useState<ActivityLog[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || '');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Lists loader
  useEffect(() => {
    fetchMyRequests();
    fetchMyActivities();
  }, [user]);

  const fetchMyRequests = async () => {
    try {
      const res = await fetch('/api/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data);
      }
    } catch (err) {
      console.error('Failed to load personal requests:', err);
    }
  };

  const fetchMyActivities = async () => {
    setActivitiesLoading(true);
    try {
      const res = await fetch('/api/profile/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyActivities(data);
      }
    } catch (err) {
      console.error('Failed to load personal logs:', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Profile fields updates
  const handleProfileFieldUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    if (newPassword && newPassword !== confirmPassword) {
      setProfileError('New passwords do not match');
      setProfileLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          email,
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setProfileSuccess('Profile preferences updated successfully!');
        onProfileUpdated(data.user);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        fetchMyActivities();
      } else {
        setProfileError(data.error || 'Failed to update user profile');
      }
    } catch (err) {
      setProfileError('Failed to query Profile Update client');
    } finally {
      setProfileLoading(false);
    }
  };

  // Image base64 builder and pusher
  const uploadAvatarImage = async (base64Payload: string, filename: string) => {
    setAvatarLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: base64Payload, filename })
      });

      const data = await res.json();
      if (res.ok) {
        setAvatarPreview(data.avatar_url);
        onProfileUpdated({ ...user, avatar_url: data.avatar_url });
        setProfileSuccess('Profile photo uploaded and processed!');
        fetchMyActivities();
      } else {
        setProfileError(data.error || 'Failed to sync image');
      }
    } catch (err) {
      setProfileError('Failed to write photo payload');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        uploadAvatarImage(reader.result as string, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        uploadAvatarImage(reader.result as string, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  // Resend codes
  const resendVerificationMail = async () => {
    setVerifyError('');
    setVerifySuccess('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      if (res.ok) {
        setVerifySuccess(data.message || 'Verification confirmation resent!');
      } else {
        setVerifyError(data.error || 'Resend process failed');
      }
    } catch (err) {
      setVerifyError('Failed to call Verification Resend');
    }
  };

  const executeEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');
    setVerifySuccess('');
    setVerifyLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: user.email, code: verificationCode })
      });
      const data = await res.json();
      if (res.ok) {
        setVerifySuccess(data.message || 'Success! Email verified.');
        onProfileUpdated({ ...user, is_verified: true });
        setVerificationCode('');
        fetchMyActivities();
      } else {
        setVerifyError(data.error || 'Incorrect confirmation code');
      }
    } catch (err) {
      setVerifyError('Failed to verify pin code');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Submit request
  const handleMovieRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');
    setRequestLoading(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newMovieTitle,
          year: newMovieYear,
          message: newMovieMsg
        })
      });

      const data = await res.json();
      if (res.ok) {
        setRequestSuccess(`Movie request "${newMovieTitle}" submitted! Staff notified.`);
        setNewMovieTitle('');
        setNewMovieYear('');
        setNewMovieMsg('');
        fetchMyRequests();
        fetchMyActivities();
      } else {
        setRequestError(data.error || 'Failed to file movie request');
      }
    } catch (err) {
      setRequestError('Failed to transmit request form');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div id="user-profile-component-root" className="max-w-4xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-100/40 dark:bg-[#1B1B2A]/60 backdrop-blur-md rounded-3xl border border-neutral-200/50 dark:border-white/5 shadow-xl">
        {/* Avatar Area */}
        <div 
          onDragEnter={handleDrag} 
          onDragLeave={handleDrag} 
          onDragOver={handleDrag} 
          onDrop={handleDrop}
          className={`relative group w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
            dragActive 
              ? 'border-brand-accent bg-brand-accent/10 scale-105' 
              : 'border-neutral-300 dark:border-white/10 hover:border-brand-accent bg-[#121223]/25 hover:bg-[#121223]/50'
          }`}
        >
          {avatarPreview ? (
            <img 
              referrerPolicy="no-referrer" 
              src={avatarPreview} 
              alt="Avatar" 
              className="w-full h-full object-cover select-none"
            />
          ) : (
            <div className="text-center">
              <Upload className="w-6 h-6 mx-auto text-neutral-400 group-hover:text-brand-accent transition-colors" />
              <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Drop avatar</span>
            </div>
          )}
          {avatarLoading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="absolute inset-0 opacity-0 cursor-pointer"
            id="avatar_file_input"
          />
        </div>

        <div className="text-center md:text-left flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <h2 className="text-2xl font-extrabold text-neutral-800 dark:text-neutral-50">{user.username}</h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider bg-brand-accent/15 text-brand-accent uppercase">
              {user.role}
            </span>
            {user.is_verified ? (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase flex items-center gap-1">
                <Check className="w-3 h-3" /> VERIFIED
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                UNVERIFIED
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 font-mono">{user.email}</p>
          <p className="text-[11px] text-neutral-500">Member since {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* VERIFICATION WARNING IF UNVERIFIED */}
      {!user.is_verified && (
        <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Email Verification Required</h4>
              <p className="text-xs text-neutral-400 mt-1 max-w-lg">
                Please verify your profile to secure download operations. Enter the code sent to your registration email.
              </p>
            </div>
          </div>
          <form onSubmit={executeEmailVerification} className="w-full md:w-auto flex items-center gap-2">
            <input 
              type="text" 
              required 
              placeholder="6-digit code" 
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-28 text-center bg-white dark:bg-[#121223] border border-neutral-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-black"
            />
            <button 
              type="submit" 
              disabled={verifyLoading}
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 transition-colors text-white rounded-xl shadow-md cursor-pointer"
            >
              Verify
            </button>
            <button 
              type="button" 
              onClick={resendVerificationMail}
              className="p-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Resend verification email code"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* SUCCESS / ERROR ALERTS */}
      {profileError && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{profileError}</span>
        </div>
      )}
      {profileSuccess && (
        <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{profileSuccess}</span>
        </div>
      )}
      {verifySuccess && (
        <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{verifySuccess}</span>
        </div>
      )}
      {verifyError && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{verifyError}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN PREFERENCES LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* TAB 1: PREFERENCES & PASSWORD SETTINGS */}
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-[#1B1B2A]/40 border border-neutral-200/50 dark:border-white/5 rounded-3xl shadow-lg space-y-4">
            <h3 className="text-md font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-3">
              <User className="w-5 h-5 text-brand-accent" /> Account Preferences
            </h3>

            <form onSubmit={handleProfileFieldUpdate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5">Subscriber Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    type="text" 
                    required 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-100/40 dark:bg-[#121223]/50 border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5">Direct Email Connection</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-100/40 dark:bg-[#121223]/50 border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-neutral-200 dark:border-white/5 space-y-4">
                <h4 className="text-xs font-extrabold text-neutral-400 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" /> Modify Password
                </h4>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5">Existing Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-slate-100/40 dark:bg-[#121223]/50 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs text-neutral-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5">New Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-100/40 dark:bg-[#121223]/50 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs text-neutral-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5">Confirm New</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-100/40 dark:bg-[#121223]/50 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs text-neutral-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={profileLoading}
                className="w-full mt-2 py-2.5 rounded-xl font-bold text-xs text-white bg-brand-accent hover:bg-brand-secondary tracking-wide uppercase transition-colors shadow-md shadow-brand-accent/20 cursor-pointer"
              >
                {profileLoading ? 'Syncing...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* TAB 2: REQUEST A MOVIE PANEL */}
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-[#1B1B2A]/40 border border-neutral-200/50 dark:border-white/5 rounded-3xl shadow-lg space-y-4">
            <h3 className="text-md font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-3">
              <PlusCircle className="w-5 h-5 text-brand-accent" /> File Movie Request
            </h3>

            {requestSuccess && (
              <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                {requestSuccess}
              </div>
            )}
            {requestError && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                {requestError}
              </div>
            )}

            <form onSubmit={handleMovieRequestSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5">Movie Title</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Inception, Titanic, etc."
                    value={newMovieTitle}
                    onChange={(e) => setNewMovieTitle(e.target.value)}
                    className="w-full bg-slate-100/40 dark:bg-[#121223]/50 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs text-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5">Release Year</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="2010"
                    value={newMovieYear}
                    onChange={(e) => setNewMovieYear(e.target.value)}
                    className="w-full bg-slate-100/40 dark:bg-[#121223]/50 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs text-neutral-800 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5">Brief Message (Resolution, Quality preferences)</label>
                <textarea 
                  rows={3}
                  placeholder="Need 1080p Atmos version please! Add posters in catalogs too."
                  value={newMovieMsg}
                  onChange={(e) => setNewMovieMsg(e.target.value)}
                  className="w-full bg-slate-100/40 dark:bg-[#121223]/50 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs text-neutral-800 dark:text-white resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={requestLoading}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-brand-accent hover:bg-brand-secondary tracking-wide uppercase transition-colors shadow-md shadow-brand-accent/20 cursor-pointer"
              >
                {requestLoading ? 'Submitting request...' : 'Validate & Submit Request'}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* TRACK REQUESTS LOG HIERARCHY */}
      <div className="p-6 bg-white dark:bg-[#1B1B2A]/40 border border-neutral-200/50 dark:border-white/5 rounded-3xl shadow-lg space-y-4">
        <h3 className="text-md font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-3">
          <HelpCircle className="w-5 h-5 text-brand-accent" /> Track My Movie Requests
        </h3>

        {myRequests.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4 text-center">You have not submitted any movie requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#000000]/10 dark:border-white/5 text-neutral-400 font-bold uppercase text-[9px] tracking-wider select-none">
                  <th className="py-2.5">Movie Name</th>
                  <th>Year</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((req) => (
                  <tr key={req.id} className="border-b border-[#000000]/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="py-3 font-semibold text-neutral-800 dark:text-emerald-400">{req.title}</td>
                    <td className="font-mono">{req.year}</td>
                    <td className="text-neutral-400 truncate max-w-xs">{req.message || '-'}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        req.status === 'uploaded' 
                          ? 'bg-emerald-500/15 text-emerald-500' 
                          : req.status === 'rejected' 
                            ? 'bg-rose-500/15 text-rose-500' 
                            : 'bg-yellow-500/15 text-yellow-500'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="text-neutral-500 font-mono text-[10px]">{new Date(req.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECENT PERSONAL SECURITY ACTIVITY LOGS LOGS */}
      <div className="p-6 bg-white dark:bg-[#1B1B2A]/40 border border-[#000000]/5 dark:border-white/5 rounded-3xl shadow-lg space-y-4">
        <h3 className="text-md font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-3">
          <Activity className="w-5 h-5 text-brand-accent" /> Security Activity History
        </h3>

        {activitiesLoading ? (
          <div className="flex justify-center items-center py-6">
            <RefreshCw className="w-5 h-5 animate-spin text-neutral-500" />
          </div>
        ) : myActivities.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4 text-center">No security metrics recorded for current access tokens.</p>
        ) : (
          <div className="space-y-3">
            {myActivities.slice(0, 10).map((act) => (
              <div 
                key={act.id} 
                className="flex items-start gap-3 p-3 bg-slate-100/30 dark:bg-[#121223]/30 rounded-2xl border border-neutral-200/20 dark:border-white/5 text-xs text-left"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-brand-accent/40 mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-neutral-800 dark:text-neutral-200 font-medium">{act.details}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-500 font-semibold font-mono">
                    <span className="uppercase text-brand-accent/80 tracking-wider">[{act.action}]</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(act.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
