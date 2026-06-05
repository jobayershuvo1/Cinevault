import React, { useEffect, useState } from 'react';
import { Bell, Check, Trash, CheckSquare, BellOff, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { AdminNotification, Profile } from '../types';

interface AdminNotificationsProps {
  token: string;
  currentUser: Profile;
}

export default function AdminNotifications({ token, currentUser }: AdminNotificationsProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Sort unread first, then newest first
        const sorted = data.sort((a: AdminNotification, b: AdminNotification) => {
          if (a.read === b.read) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return a.read ? 1 : -1;
        });
        setNotifications(sorted);
      }
    } catch (err) {
      console.error('Failed to sync alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id?: string) => {
    setSuccess('');
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setSuccess(id ? 'Alert marked as read' : 'All alerts marked as read successfully');
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to write read action:', err);
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'signup': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'request': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
      case 'role_change': return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
      case 'moderator_add': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      default: return 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header section with markers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-50 flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-accent animate-swing" /> Internal System Alerts
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Displaying {unreadCount} unread platform updates regarding subscribers, moderator actions, and requests.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {unreadCount > 0 && (
            <button
              onClick={() => markRead()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-accent hover:bg-brand-secondary text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
            >
              <CheckSquare className="w-4 h-4" /> Mark All Read
            </button>
          )}

          <button 
            onClick={fetchNotifications} 
            disabled={loading}
            className="p-2 border border-[#000000]/10 dark:border-white/5 bg-white dark:bg-[#1B1B2A]/70 hover:bg-[#121223]/20 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4.5 h-4.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Grid checklist panel */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-500">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-accent mb-3" />
          <span>Syncing staff message queues...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center text-neutral-500 bg-slate-100/10 dark:bg-[#1B1B2A]/20 border border-dashed border-neutral-300 dark:border-white/5 rounded-2xl">
          <BellOff className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
          <h4 className="text-sm font-bold text-neutral-750 dark:text-neutral-300">Clean alert stream</h4>
          <p className="text-xs text-neutral-450 mt-1 max-w-sm mx-auto">
            You do not have any alerts registered at this timestamp. Enjoy the tranquility!
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-sm ${
                n.read 
                  ? 'bg-white/30 dark:bg-[#1B1B2A]/20 border-neutral-200/40 dark:border-white/5 opacity-70' 
                  : 'bg-white dark:bg-[#1B1B2A]/60 border-neutral-200/80 dark:border-brand-accent/25 ring-1 ring-brand-accent/5'
              }`}
            >
              <div className="flex-1 space-y-1.5 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${getTypeStyle(n.type)}`}>
                    {n.type}
                  </span>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                  )}
                  <h4 className={`text-sm font-extrabold ${n.read ? 'text-neutral-400 dark:text-neutral-300' : 'text-neutral-800 dark:text-neutral-50'}`}>
                    {n.title}
                  </h4>
                </div>
                <p className="text-xs text-neutral-450 leading-relaxed">
                  {n.message}
                </p>
                <span className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
                  <Clock className="w-3.5 h-3.5" /> {new Date(n.created_at).toLocaleString()}
                </span>
              </div>

              {/* Action */}
              {!n.read && (
                <button
                  onClick={() => markRead(n.id)}
                  className="w-full sm:w-auto px-3 py-1.5 border border-[#000000]/10 dark:border-white/5 bg-white dark:bg-[#1B1B2A]/70 hover:bg-[#121223]/20 hover:text-emerald-500 rounded-xl transition-all cursor-pointer font-bold text-xs"
                >
                  Mark Dismiss
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
