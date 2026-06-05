import React, { useEffect, useState } from 'react';
import { Activity, Clock, Search, RefreshCw, AlertCircle, Shield, User, Mail } from 'lucide-react';
import { ActivityLog, Profile } from '../types';

interface AdminLogsProps {
  token: string;
  currentUser: Profile;
}

export default function AdminLogs({ token, currentUser }: AdminLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [actionCategory, setActionCategory] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activities', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to sync activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('SUSPEND')) return 'border-rose-500/20 text-rose-500 bg-rose-500/10';
    if (act.includes('UPLOAD') || act.includes('CREATE') || act.includes('PROMOTE')) return 'border-emerald-500/20 text-emerald-500 bg-emerald-500/10';
    if (act.includes('EDIT') || act.includes('UPDATE')) return 'border-blue-500/20 text-blue-500 bg-blue-500/10';
    return 'border-neutral-500/20 text-neutral-400 bg-neutral-500/10';
  };

  const distinctActions = Array.from(new Set(logs.map(l => l.action)));

  const filteredLogs = logs.filter(log => {
    const matchesQuery = log.username.toLowerCase().includes(query.toLowerCase()) || 
                         log.email.toLowerCase().includes(query.toLowerCase()) ||
                         log.details.toLowerCase().includes(query.toLowerCase()) ||
                         log.action.toLowerCase().includes(query.toLowerCase());
    const matchesAction = actionCategory === 'all' ? true : log.action === actionCategory;
    return matchesQuery && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-50 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-accent" /> System Audit Trail
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Browse through real-time security events, catalog updates, user suspensions, and administrative modifications.
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="p-2 border border-[#000000]/10 dark:border-white/5 bg-white dark:bg-[#1B1B2A]/70 hover:bg-[#121223]/20 rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Query Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input 
            type="text"
            placeholder="Search details, username, email address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-100/40 dark:bg-[#1B1B2A]/60 border border-[#000000]/10 dark:border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-800 dark:text-white"
          />
        </div>

        {/* Categories picker */}
        <div className="w-full md:w-56">
          <select
            value={actionCategory}
            onChange={(e) => setActionCategory(e.target.value)}
            className="w-full bg-slate-100 dark:bg-[#1B1B2A]/65 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 font-bold focus:outline-none"
          >
            <option value="all">Filter: All Actions</option>
            {distinctActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Database Listing Panel */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-500">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-accent mb-3" />
          <span>Syncing logs directory...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center text-neutral-500 bg-slate-100/10 dark:bg-[#1B1B2A]/20 border border-dashed border-neutral-300 dark:border-white/5 rounded-2xl">
          <AlertCircle className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
          <h4 className="text-sm font-bold text-neutral-750 dark:text-neutral-300">No events cataloged</h4>
          <p className="text-xs text-neutral-450 mt-1 max-w-sm mx-auto">
            Matches do not exist under current filters. Try resetting terms.
          </p>
        </div>
      ) : (
        <div className="relative border-l border-neutral-200 dark:border-white/5 ml-3 pl-6 space-y-6">
          {filteredLogs.map(log => (
            <div key={log.id} className="relative select-none animate-fadeIn">
              {/* Dot decorator */}
              <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-accent ring-4 ring-white dark:ring-[#121223] shadow-md shadow-brand-accent/40" />

              <div className="p-4 bg-white dark:bg-[#1B1B2A]/40 border border-[#000000]/10 dark:border-white/5 rounded-2xl space-y-3.5 shadow-sm">
                
                {/* Event meta indicators */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block border px-2 py-0.5 rounded text-[8.5px] tracking-wider font-extrabold uppercase ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-semibold font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-neutral-500">
                    <span className="flex items-center gap-1 max-w-[130px] truncate" title={log.username}><User className="w-3.5 h-3.5" /> {log.username}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-neutral-500 max-w-[170px] truncate font-mono" title={log.email}><Mail className="w-3.5 h-3.5" /> {log.email}</span>
                  </div>
                </div>

                {/* Main Activity Sentence */}
                <p className="text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed font-man">
                  {log.details}
                </p>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
