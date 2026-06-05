import React, { useEffect, useState } from 'react';
import { HelpCircle, Check, X, AlertCircle, Clock, Search, RefreshCw, User, Mail, Sparkles, Upload } from 'lucide-react';
import { MovieRequest, Profile } from '../types';

interface AdminRequestsProps {
  token: string;
  currentUser: Profile;
  onStartUpload?: (requestId: string, title: string, year: string) => void;
}

export default function AdminRequests({ token, currentUser, onStartUpload }: AdminRequestsProps) {
  const [requests, setRequests] = useState<MovieRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'uploaded' | 'rejected'>('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to sync movie requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, nextStatus: 'pending' | 'uploaded' | 'rejected') => {
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/requests/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Request successfully marked as "${nextStatus}"`);
        fetchRequests();
        window.dispatchEvent(new Event('movies_changed'));
      } else {
        setError(data.error || 'Failed to update request role code');
      }
    } catch (err) {
      setError('Connection interrupted. Please resubmit.');
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesQuery = req.title.toLowerCase().includes(query.toLowerCase()) || 
                         req.username.toLowerCase().includes(query.toLowerCase()) ||
                         req.email.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = filterStatus === 'all' ? true : req.status === filterStatus;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-50 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand-accent" /> Movie Requests Desk
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Review catalogue additions submitted by subscribers. Process items into upload channels or filter queries.
          </p>
        </div>
        <button 
          onClick={fetchRequests} 
          disabled={loading}
          className="p-2 border border-[#000000]/10 dark:border-white/5 bg-white dark:bg-[#1B1B2A]/70 hover:bg-[#121223]/20 rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4.5 h-4.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-450 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4.5 h-4.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Query Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input 
            type="text"
            placeholder="Search movie title, requester name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-100/40 dark:bg-[#1B1B2A]/60 border border-[#000000]/10 dark:border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-800 dark:text-white"
          />
        </div>

        {/* Tab filters */}
        <div className="flex bg-slate-100 dark:bg-[#1B1B2A]/40 border border-neutral-200 dark:border-white/5 p-1 rounded-xl w-full sm:w-auto">
          {(['all', 'pending', 'uploaded', 'rejected'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                filterStatus === st 
                  ? 'bg-brand-accent text-white shadow-sm shadow-brand-accent/20' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid panel listings */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-500">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-accent mb-3" />
          <span>Scanning directory records...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center text-neutral-500 bg-slate-100/10 dark:bg-[#1B1B2A]/20 border border-dashed border-neutral-300 dark:border-white/5 rounded-2xl">
          <HelpCircle className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
          <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No requests cataloged</h4>
          <p className="text-xs text-neutral-450 mt-1 max-w-sm mx-auto">
            Matches do not exist under current query filter. Try refining terms.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map(req => (
            <div 
              key={req.id} 
              className="p-5 bg-white dark:bg-[#1B1B2A]/40 border border-[#000000]/10 dark:border-white/5 rounded-2xl flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-neutral-800 dark:text-neutral-100">{req.title}</h3>
                    <span className="text-[11px] font-mono font-bold text-brand-accent">Release Year: {req.year}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                    req.status === 'uploaded' 
                      ? 'bg-emerald-500/15 text-emerald-500' 
                      : req.status === 'rejected' 
                        ? 'bg-rose-500/15 text-rose-500' 
                        : 'bg-yellow-500/15 text-yellow-500'
                  }`}>
                    {req.status}
                  </span>
                </div>

                {req.message && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-black/20 p-2.5 rounded-lg border border-[#000000]/5 dark:border-white/5">
                    {req.message}
                  </p>
                )}

                <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-white/5 space-y-1 text-[11px] text-neutral-500">
                  <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Filed by: <strong className="text-neutral-400">{req.username}</strong></p>
                  <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Requester email: <strong className="text-neutral-400 font-mono">{req.email}</strong></p>
                  <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Date queue: <span className="font-mono">{new Date(req.created_at).toLocaleString()}</span></p>
                </div>
              </div>

              {/* Status Actions buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-dashed border-neutral-200 dark:border-white/5">
                <button
                  onClick={() => updateRequestStatus(req.id, 'uploaded')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500 font-bold text-xs capitalize transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Mark Uploaded
                </button>
                <button
                  onClick={() => updateRequestStatus(req.id, 'rejected')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-rose-500/10 hover:bg-rose-500/15 text-rose-500 font-bold text-xs capitalize transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Reject Request
                </button>
                <button
                  onClick={() => updateRequestStatus(req.id, 'pending')}
                  className="px-2.5 flex items-center justify-center py-1.5 rounded-xl border border-yellow-500/10 hover:bg-yellow-500/15 text-yellow-500 font-bold text-xs capitalize transition-colors cursor-pointer"
                  title="Mark Pending"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
