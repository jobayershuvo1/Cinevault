import React, { useEffect, useState } from 'react';
import { Users, Shield, Check, Trash2, ShieldCheck, UserMinus, AlertCircle, RefreshCw, Slash, CircleDot } from 'lucide-react';
import { Profile } from '../types';

interface AdminUsersProps {
  token: string;
  currentUser: Profile;
}

export default function AdminUsers({ token, currentUser }: AdminUsersProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [confirmState, setConfirmState] = useState<{ id: string, type: 'role' | 'status' | 'delete', username: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'User list sync failed');
      }
      setUsers(data);
      // Dispatch real-time statistics update trigger
      window.dispatchEvent(new Event('users_changed'));
    } catch (err: any) {
      setError(err.message || 'Error fetching user portal data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string, username: string) => {
    let targetRole = 'user';
    if (currentRole === 'user') targetRole = 'moderator';
    else if (currentRole === 'moderator') targetRole = 'admin';
    else targetRole = 'user';
    
    setError('');
    setSuccess('');
    setConfirmState(null);

    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: targetRole })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update privileges.');
      }
      setSuccess(`Role updated for ${username}.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Role promotion update error.');
    }
  };

  const handleStatusChange = async (userId: string, currentStatus: string, username: string) => {
    const targetStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    
    setError('');
    setSuccess('');
    setConfirmState(null);

    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update account status.');
      }
      setSuccess(`Status updated for ${username} to: ${targetStatus}.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Status modification error.');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    setError('');
    setSuccess('');
    setConfirmState(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Deletion failed.');
      }
      setSuccess(`Profile for "${username}" permanently purged from database.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Purging user profile error.');
    }
  };

  return (
    <div id="admin-user-management" className="space-y-6">
      
      {/* Header Info */}
      <div className="border-b border-[#000000]/5 dark:border-white/5 pb-5 select-none">
        <h2 className="text-2xl font-extrabold text-neutral-800 dark:text-neutral-50 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-rose-500 dark:text-violet-400" /> Users & Privileges Console
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Set administrative overrides, audit subscriptions, suspend problematic access pipelines, or purge profiles.
        </p>
      </div>

      {error && (
        <div id="users-error-banner" className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="users-success-banner" className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <Check className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Users table */}
      <div className="bg-slate-100/50 dark:bg-[#1B1B2A]/70 backdrop-blur-md border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden shadow">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 select-none">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-rose-500 dark:text-violet-500" />
            <span>Syncing CineVault user registrations...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 select-none">
            <Users className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
            <h4 className="text-md font-bold text-neutral-800 dark:text-neutral-300">No subscribers detected</h4>
          </div>
        ) : (
          <div className="overflow-x-auto min-w-full">
            <table id="users-control-table" className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-white/5 text-left text-neutral-550 uppercase tracking-wider text-[11px] font-black select-none">
                  <th className="px-5 py-4">Username & Email</th>
                  <th className="px-5 py-4">Register Date</th>
                  <th className="px-5 py-4">Assigned Role</th>
                  <th className="px-5 py-4">Profile Status</th>
                  <th className="px-5 py-4 text-center">Security Access Overrides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-white/5">
                {users.map(user => {
                  const isCurrent = user.id === currentUser.id;
                  const isSuper = user.role === 'super_admin';
                  const isSuspended = user.status === 'suspended';

                  return (
                    <tr key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700 font-bold text-neutral-600 dark:text-neutral-300 flex items-center justify-center uppercase shadow-sm shrink-0">
                          {user.username.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-800 dark:text-neutral-100 truncate flex items-center gap-1.5">
                            {user.username}
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 text-[8px] tracking-wider rounded bg-rose-500/10 text-rose-500 dark:bg-violet-400/10 dark:text-violet-300 uppercase font-black">
                                Current You
                              </span>
                            )}
                          </p>
                          <span className="text-[10px] text-neutral-400 block truncate">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-neutral-500 font-mono text-[11px] select-none">
                        {new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="px-5 py-4 select-none">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wide border ${
                          isSuper 
                            ? 'bg-gradient-to-r from-rose-500/10 to-fuchsia-500/10 dark:from-violet-500/10 dark:to-fuchsia-500/10 border-rose-300 dark:border-violet-500 text-rose-600 dark:text-violet-300'
                            : user.role === 'admin'
                              ? 'bg-orange-500/5 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400'
                              : user.role === 'moderator'
                                ? 'bg-blue-500/5 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400'
                                : 'bg-black/5 dark:bg-white/5 border-neutral-200 dark:border-white/5 text-neutral-500 dark:text-neutral-400'
                        }`}>
                          <Shield className="w-3.5 h-3.5" />
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 uppercase font-black text-[10px] tracking-wider select-none">
                        {isSuspended ? (
                          <span className="text-red-500 flex items-center gap-1">
                            <CircleDot className="w-3.5 h-3.5" /> Suspended
                          </span>
                        ) : (
                          <span className="text-emerald-500 flex items-center gap-1">
                            <CircleDot className="w-3.5 h-3.5" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 select-none">
                        {confirmState?.id === user.id ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] text-rose-500 font-bold uppercase">Are you sure?</span>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  if (confirmState.type === 'role') handleRoleChange(user.id, user.role, user.username);
                                  if (confirmState.type === 'status') handleStatusChange(user.id, user.status, user.username);
                                  if (confirmState.type === 'delete') handleDeleteUser(user.id, user.username);
                                }}
                                className="px-2 py-1 bg-rose-500 text-white rounded text-[10px] font-bold hover:bg-rose-600 transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmState(null)}
                                className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded text-[10px] font-bold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            
                            {/* Promote/Demote privilege toggle button */}
                            {(!isSuper && !isCurrent) ? (
                              <button
                                id={`user-role-toggle-${user.id}`}
                                onClick={() => setConfirmState({ id: user.id, type: 'role', username: user.username })}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                                  user.role === 'admin'
                                    ? 'bg-[#EE0000]/10 hover:bg-[#EE0000]/15 text-[#EE0000] border-transparent'
                                    : user.role === 'moderator'
                                    ? 'bg-blue-500/10 hover:bg-blue-500/15 text-blue-500 border-transparent'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent'
                                }`}
                              >
                                {user.role === 'admin' ? (
                                  <>
                                    <UserMinus className="w-3.5 h-3.5" /> Demote
                                  </>
                                ) : user.role === 'moderator' ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5" /> Plus Admin
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5" /> Plus Mod
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-[10px] text-neutral-400 font-mono italic">Override Blocked</span>
                            )}

                            {/* Suspend/Reactivate user */}
                            {(!isSuper && !isCurrent) && (
                              <button
                                id={`user-status-toggle-${user.id}`}
                                onClick={() => setConfirmState({ id: user.id, type: 'status', username: user.username })}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                  isSuspended
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent'
                                    : 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-500 border-transparent'
                                }`}
                              >
                                {isSuspended ? 'Reactivate' : 'Suspend'}
                              </button>
                            )}

                            {/* Delete profile completely */}
                            {(!isSuper && !isCurrent) && (
                              <button
                                id={`user-delete-${user.id}`}
                                onClick={() => setConfirmState({ id: user.id, type: 'delete', username: user.username })}
                                className="p-2 rounded-xl bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 border border-transparent transition-colors cursor-pointer"
                                title="Delete member permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
