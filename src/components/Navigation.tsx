import React from 'react';
import { Home, Search, Film, Users, Settings, LogOut, LogIn, User, Shield, HelpCircle, Bell, Activity } from 'lucide-react';
import { Profile } from '../types';

interface NavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  user: Profile | null;
  onLogout: () => void;
  siteName: string;
  siteLogo: string;
}

export default function Navigation({
  currentPath,
  onNavigate,
  user,
  onLogout,
  siteName,
  siteLogo
}: NavigationProps) {
  
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator');
  const isSuperAdmin = user && user.role === 'super_admin';

  const menuItems = [
    { label: 'Home', icon: Home, path: '/', role: 'public' },
    { label: 'Admin Hub', icon: Shield, path: '/admin', role: 'admin' },
    { label: 'Movies Manager', icon: Film, path: '/admin/movies', role: 'admin' },
    { label: 'Movie Requests', icon: HelpCircle, path: '/admin/requests', role: 'admin' },
    { label: 'Users Portal', icon: Users, path: '/admin/users', role: 'admin' },
    { label: 'System Alerts', icon: Bell, path: '/admin/notifications', role: 'admin' },
    { label: 'Activity Logs', icon: Activity, path: '/admin/logs', role: 'admin' },
    { label: 'Site Settings', icon: Settings, path: '/admin/settings', role: 'super_admin' },
  ];

  const visibleItems = menuItems.filter(item => {
    if (item.role === 'public') return true;
    if (item.role === 'admin') return isAdmin;
    if (item.role === 'super_admin') return isSuperAdmin;
    return false;
  });

  return (
    <>
      {/* DESKTOP SIDEBAR - Hidden on mobile, visible on lg screens */}
      <aside
        id="desktop-sidebar"
        className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-64 bg-slate-100/40 dark:bg-[#1B1B2A]/90 backdrop-blur-xl border-r border-[#000000]/5 dark:border-white/5 p-6 select-none z-40 transition-colors duration-300"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-10 pb-4 border-b border-[#000000]/5 dark:border-white/5">
          {siteLogo ? (
            <img referrerPolicy="no-referrer" src={siteLogo} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center text-white font-black text-lg shadow-md shadow-brand-accent/20">
              {siteName.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-neutral-800 dark:text-white dark:[text-shadow:0_0_15px_rgba(var(--brand-glow,124,58,237),0.4)]">
              {siteName}
            </h1>
            <span className="text-[10px] font-mono tracking-wider text-brand-accent uppercase font-semibold">
              Premium Portal
            </span>
          </div>
        </div>

        {/* Navigation Routes */}
        <nav className="flex-1 space-y-2">
          {visibleItems.map(item => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                id={`sidebar-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer relative group ${
                  isActive
                    ? 'bg-brand-accent/10 text-brand-accent shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-lg bg-brand-accent" />
                )}
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 duration-200 ${isActive ? 'text-brand-accent' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Account Controls */}
        <div className="pt-4 border-t border-[#000000]/5 dark:border-white/5">
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-[#0A0A0F] dark:to-[#1B1B2A] flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold border border-[#000000]/5 dark:border-white/10 uppercase shadow-sm">
                  {user.username.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">{user.username}</p>
                  <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[9px] font-bold tracking-wider rounded bg-brand-accent/10 text-brand-accent uppercase truncate">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                id="sidebar-logout-btn"
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              id="sidebar-signin-btn"
              onClick={() => onNavigate('/login')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-brand-accent hover:bg-brand-secondary transition-colors cursor-pointer shadow-md shadow-brand-accent/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Register</span>
            </button>
          )}
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION - Hidden on desktop lg, visible on md/sm */}
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-4 left-4 right-4 h-16 bg-slate-100/80 dark:bg-[#1B1B2A]/95 backdrop-blur-md p-1 border border-neutral-200/50 dark:border-white/5 rounded-2xl flex items-center justify-around select-none z-40 transition-colors duration-300 shadow-xl"
      >
        {/* Home */}
        <button
          id="mobile-nav-home"
          onClick={() => onNavigate('/')}
          className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
            currentPath === '/' ? 'text-brand-accent scale-105' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </button>
 
        {/* Dynamic Admin/Staff Entry point */}
        {isAdmin && (
          <button
            id="mobile-nav-admin"
            onClick={() => onNavigate('/admin')}
            className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
              currentPath.startsWith('/admin') ? 'text-brand-accent scale-105' : 'text-neutral-400 dark:text-neutral-500'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Admin</span>
          </button>
        )}
 
        {/* Profile / LogIn / Register */}
        {user ? (
          <button
            id="mobile-nav-profile"
            onClick={() => onNavigate('/profile')}
            className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
              currentPath === '/profile' ? 'text-brand-accent scale-105' : 'text-neutral-400 dark:text-neutral-500'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Profile</span>
          </button>
        ) : (
          <button
            id="mobile-nav-login"
            onClick={() => onNavigate('/login')}
            className="flex flex-col items-center justify-center py-1 px-3.5 rounded-xl text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Sign In</span>
          </button>
        )}
      </nav>
    </>
  );
}
