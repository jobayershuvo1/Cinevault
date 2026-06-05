import React, { useEffect, useState } from 'react';
import {
  Film,
  Search,
  Download,
  Info,
  Shield,
  LogOut,
  LogIn,
  KeyRound,
  Mail,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  Check,
  FileEdit,
  ChevronRight,
  Eye,
  Settings,
  Calendar,
  Sparkles,
  HelpCircle,
  ChevronLeft,
  Users,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import Navigation from './components/Navigation';
import ThemeToggle from './components/ThemeToggle';
import FirstTimeSetup from './components/FirstTimeSetup';
import HeroBanner from './components/HeroBanner';
import MovieCard from './components/MovieCard';
import SceneGallery from './components/SceneGallery';
import AdminMovies from './components/AdminMovies';
import AdminUsers from './components/AdminUsers';
import AdminSettings from './components/AdminSettings';
import UserProfile from './components/UserProfile';
import AdminRequests from './components/AdminRequests';
import AdminLogs from './components/AdminLogs';
import AdminNotifications from './components/AdminNotifications';
import AdminHubDashboard from './components/AdminHubDashboard';
import { CustomMovie, Profile, SiteSettings, CATEGORIES } from './types';

export default function App() {
  // Navigation / Router States
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [activeMovieId, setActiveMovieId] = useState<string | null>(null);

  // Database Systems
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    site_name: 'CineVault',
    site_logo: '',
    branding_color: 'violet',
    default_theme: 'dark'
  });
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cinevault_token'));
  const [movies, setMovies] = useState<CustomMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState<{
    totalUsers: number;
    totalMovies: number;
    totalDrafts?: number;
    pageViews: number;
    uniqueVisitors: number;
    activeOnline?: number;
  } | null>(null);

  const [adminMoviesFilter, setAdminMoviesFilter] = useState<'all' | 'published' | 'draft' | 'hidden'>('all');

  // Authentication Fields (for /login page)
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authSubMode, setAuthSubMode] = useState<'signin' | 'register' | 'forgot' | 'reset'>('signin');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetTokenVal, setResetTokenVal] = useState('');
  const [resetNewPasswordVal, setResetNewPasswordVal] = useState('');
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPass, setAuthConfirmPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoader, setAuthLoader] = useState(false);
  const [authRequires2FA, setAuthRequires2FA] = useState(false);
  const [auth2FASessionId, setAuth2FASessionId] = useState('');
  const [auth2FACode, setAuth2FACode] = useState('');

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<CustomMovie[]>([]);

  // Init fetcher
  useEffect(() => {
    checkSetupStatus();
    loadSiteSettings();
    
    // Listen for custom pathname modifications
    const handleLocationChange = () => {
      const pathname = window.location.pathname;
      setCurrentPath(pathname);
      
      // Parse out movie ID if pathname matches /movie/:id
      const movieMatch = pathname.match(/^\/movie\/([a-zA-Z0-9-]+)$/);
      if (movieMatch) {
        setActiveMovieId(movieMatch[1]);
      } else {
        setActiveMovieId(null);
      }
    };
    
    window.addEventListener('popstate', handleLocationChange);
    // Initial parse
    handleLocationChange();

    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Sync token-bound user info
  useEffect(() => {
    if (token) {
      localStorage.setItem('cinevault_token', token);
      syncUserProfile();
    } else {
      localStorage.removeItem('cinevault_token');
      setUser(null);
    }
  }, [token]);

  // Sync movies when credentials modify
  useEffect(() => {
    fetchMovies();
  }, [user, token]);

  const fetchAdminStats = async () => {
    if (!token || !user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'moderator')) return;
    try {
      const res = await fetch('/api/analytics/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (err) {
      console.error('Failed to sync admin stats: ', err);
    }
  };

  const getClientId = () => {
    let id = sessionStorage.getItem('cinevault_client_id');
    if (!id) {
      id = 'client_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('cinevault_client_id', id);
    }
    return id;
  };

  // Record page hit automatically on SPA route navigation
  useEffect(() => {
    const trackPageHit = async () => {
      try {
        await fetch('/api/analytics/hit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: getClientId() })
        });
      } catch (err) {
        console.error('Failed to register route hit:', err);
      }
    };
    trackPageHit();
  }, [currentPath]);

  // Periodic heartbeat to keep client active in real-time online count
  useEffect(() => {
    const runHeartbeat = async () => {
      try {
        await fetch('/api/analytics/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: getClientId() })
        });
      } catch (err) {
        // failed silently
      }
    };

    // Keep active
    const heartId = setInterval(runHeartbeat, 6000);
    return () => clearInterval(heartId);
  }, []);

  useEffect(() => {
    let intervalId: any = null;

    if (token && user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator') && currentPath.startsWith('/admin')) {
      fetchAdminStats();
      // Start live statistics polling
      intervalId = setInterval(() => {
        fetchAdminStats();
      }, 2500);
    }

    const handleStatsReload = () => {
      fetchAdminStats();
    };

    window.addEventListener('movies_changed', handleStatsReload);
    window.addEventListener('users_changed', handleStatsReload);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener('movies_changed', handleStatsReload);
      window.removeEventListener('users_changed', handleStatsReload);
    };
  }, [currentPath, token, user]);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('popstate'));
  };

  const checkSetupStatus = async () => {
    try {
      const res = await fetch('/api/setup/status');
      const data = await res.json();
      if (!data.hasAdmin) {
        setSetupRequired(true);
      }
    } catch (err) {
      console.error('Boot status query aborted: ', err);
    }
  };

  const loadSiteSettings = async () => {
    try {
      const res = await fetch(`/api/settings?clientId=${getClientId()}`);
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data);
      }
    } catch (err) {
      console.error('Settings query failed: ', err);
    }
  };

  // Synchronize CSS custom properties on document element for brand accent settings
  useEffect(() => {
    const root = document.documentElement;
    const palette: Record<string, { accent: string; secondary: string; glow: string }> = {
      rose: { accent: '#F43F5E', secondary: '#E11D48', glow: '244, 63, 94' },
      violet: { accent: '#7C3AED', secondary: '#6D28D9', glow: '124, 58, 237' },
      indigo: { accent: '#4F46E5', secondary: '#4338CA', glow: '79, 70, 229' },
      emerald: { accent: '#10B981', secondary: '#059669', glow: '16, 185, 129' },
      cyan: { accent: '#06B6D4', secondary: '#0891B2', glow: '6, 182, 212' },
      amber: { accent: '#F59E0B', secondary: '#D97706', glow: '245, 158, 11' },
      fuchsia: { accent: '#D946EF', secondary: '#C084FC', glow: '217, 70, 239' },
    };

    const colors = palette[siteSettings.branding_color] || palette.violet;
    root.style.setProperty('--brand-accent', colors.accent);
    root.style.setProperty('--brand-secondary', colors.secondary);
    root.style.setProperty('--brand-glow', colors.glow);
  }, [siteSettings.branding_color]);

  const syncUserProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token expired
        setToken(null);
      }
    } catch (err) {
      setToken(null);
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/movies', { headers });
      if (res.ok) {
        const data = await res.json();
        setMovies(data);
      }
    } catch (err) {
      console.error('Movies collection listing failed: ', err);
    } finally {
      setLoading(false);
    }
  };

  // Auth form handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (isRegisterMode && currentPath !== '/admin/login') {
      if (!authEmail || !authUsername || !authPassword || !authConfirmPass) {
        setAuthError('Please fill in all standard register inputs.');
        return;
      }
      if (authPassword !== authConfirmPass) {
        setAuthError('Passwords do not match.');
        return;
      }
      if (authPassword.length < 6) {
        setAuthError('Passwords must contain at least 6 characters.');
        return;
      }

      setAuthLoader(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: authUsername, email: authEmail, password: authPassword })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed.');
        }
        setAuthSuccess('Account created successfully! Auto-login processing...');
        setTimeout(() => {
          setToken(data.token);
          setUser(data.user);
          setAuthEmail('');
          setAuthUsername('');
          setAuthPassword('');
          setAuthConfirmPass('');
          navigate('/');
        }, 1200);
      } catch (err: any) {
        setAuthError(err.message || 'Error executing registration.');
      } finally {
        setAuthLoader(false);
      }
    } else {
      if (!authEmail || !authPassword) {
        setAuthError('Please submit both credentials.');
        return;
      }

      setAuthLoader(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Authentication rejected.');
        }

        if (data.requires2FA) {
          setAuthRequires2FA(true);
          setAuth2FASessionId(data.sessionId);
          setAuthSuccess(data.message);
          return;
        }
        
        setAuthSuccess('Sign in verified! Portal forwarding...');
        setTimeout(() => {
          setToken(data.token);
          setUser(data.user);
          setAuthEmail('');
          setAuthPassword('');
          
          // Redirect standard admins to admin panel, users to homepage
          if (data.user.role === 'admin' || data.user.role === 'super_admin' || data.user.role === 'moderator') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 1000);
      } catch (err: any) {
        setAuthError(err.message || 'Incorrect credentials.');
      } finally {
        setAuthLoader(false);
      }
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoader(true);
    
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: auth2FASessionId, code: auth2FACode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }
      
      setAuthSuccess('Sign in verified! Portal forwarding...');
      setTimeout(() => {
        setToken(data.token);
        setUser(data.user);
        setAuthRequires2FA(false);
        setAuth2FASessionId('');
        setAuth2FACode('');
        setAuthEmail('');
        setAuthPassword('');
        setAuthConfirmPass('');
        
        // Redirect standard admins to admin panel, users to homepage
        if (data.user.role === 'admin' || data.user.role === 'super_admin' || data.user.role === 'moderator') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect verification code.');
    } finally {
      setAuthLoader(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoader(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset link.');
      }
      setAuthSuccess(data.message || 'We sent a verification/reset link. Check server logs or SMTP!');
      setForgotEmail('');
    } catch (err: any) {
      setAuthError(err.message || 'Error executing request.');
    } finally {
      setAuthLoader(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoader(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetTokenVal, newPassword: resetNewPasswordVal })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Token is invalid or has expired.');
      }
      setAuthSuccess('Credentials updated successfully! Proceeding to Login panel...');
      setResetTokenVal('');
      setResetNewPasswordVal('');
      setTimeout(() => {
        setAuthSubMode('signin');
      }, 1500);
    } catch (err: any) {
      setAuthError(err.message || 'Error writing registration details.');
    } finally {
      setAuthLoader(false);
    }
  };

  const handleGoogleMockSubmit = async (googleEmail: string, googleUsername: string) => {
    setAuthError('');
    setAuthSuccess('');
    setAuthLoader(true);
    try {
      const randomGoogleId = 'g_' + Math.random().toString(36).substring(2, 11);
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleEmail,
          username: googleUsername,
          googleId: randomGoogleId,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${googleUsername}`
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google login session rejected.');
      }

      setAuthSuccess('Linked with Google profile successfully!');
      setTimeout(() => {
        setToken(data.token);
        setUser(data.user);
        navigate('/');
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || 'Google Auth session error.');
    } finally {
      setAuthLoader(false);
    }
  };

  const handleDevAdminLogin = async () => {
    setAuthError('');
    setAuthSuccess('');
    setAuthLoader(true);
    try {
      const res = await fetch('/api/auth/dev-admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Direct Super Admin authentication failed.');
      }
      setAuthSuccess('Authorized as Super Admin! Portal forwarding...');
      setTimeout(() => {
        setToken(data.token);
        setUser(data.user);
        setAuthEmail('');
        setAuthPassword('');
        navigate('/admin');
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoader(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Logout error: ', err);
      }
    }
    setToken(null);
    setUser(null);
    navigate('/');
  };

  const handleFirstTimeSetupComplete = (newUser: Profile, newToken: string) => {
    setSetupRequired(false);
    setToken(newToken);
    setUser(newUser);
    loadSiteSettings();
    navigate('/admin');
  };

  const handleDownloadRedirect = (movie: CustomMovie) => {
    if (movie.download_enabled && movie.download_redirect_url) {
      // Use clean redirection safe window structure
      window.top!.location.href = movie.download_redirect_url;
    }
  };

  // Live text suggestions parsing
  const handleSearchTyping = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setSearchSuggestions([]);
      return;
    }
    const cleanQ = query.toLowerCase();
    const matches = movies.filter(
      m =>
        m.title.toLowerCase().includes(cleanQ) ||
        m.category.toLowerCase().includes(cleanQ) ||
        m.genre.toLowerCase().includes(cleanQ)
    );
    setSearchSuggestions(matches.slice(0, 5));
  };

  // Find active selected detail movie object
  const activeMovieObj = movies.find(m => m.id === activeMovieId) || null;

  // Render correct nested dashboard view index
  const renderAdminPanelContent = () => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'moderator')) {
      return (
        <div className="text-center py-24 select-none">
          <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-4" />
          <h3 className="text-lg font-black">Staff Authorization Required</h3>
          <p className="text-sm text-neutral-400 mt-2">Sign in with Admin credentials to access configuration ports.</p>
          <button onClick={() => {
            setIsRegisterMode(false);
            navigate('/admin/login');
          }} className="mt-4 px-4 py-2 text-xs font-bold text-white bg-rose-500 rounded-lg">
            Staff Access Sign In
          </button>
        </div>
      );
    }

    if (currentPath === '/admin/users') {
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return (
          <div className="p-8 text-center text-neutral-400 select-none">
            <AlertCircle className="w-10 h-10 mx-auto text-orange-500" />
            <h4 className="font-bold text-md mt-2">Privileges Required</h4>
            <p className="text-xs">You do not possess security credentials to access User Management records.</p>
          </div>
        );
      }
      return <AdminUsers token={token!} currentUser={user} />;
    }

    if (currentPath === '/admin/requests') {
      return <AdminRequests token={token!} currentUser={user} />;
    }

    if (currentPath === '/admin/logs') {
      return <AdminLogs token={token!} currentUser={user} />;
    }

    if (currentPath === '/admin/notifications') {
      return <AdminNotifications token={token!} currentUser={user} />;
    }

    if (currentPath === '/admin/settings') {
      if (user.role !== 'super_admin') {
        return (
          <div className="p-8 text-center text-neutral-400 select-none">
            <AlertCircle className="w-10 h-10 mx-auto text-orange-500" />
            <h4 className="font-bold text-md mt-2">Super Admin Privileges Required</h4>
            <p className="text-xs">Settings configuration is locked to Super Admin users only.</p>
          </div>
        );
      }
      return (
        <AdminSettings
          token={token!}
          initialSettings={siteSettings}
          onSettingsUpdated={(updated) => setSiteSettings(updated)}
        />
      );
    }

    if (currentPath === '/admin') {
      if (adminStats) {
        return <AdminHubDashboard stats={adminStats as any} />;
      } else {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-accent mb-3.5" />
            <span>Sourcing system metrics...</span>
          </div>
        );
      }
    }

    // Default to movies CRUD catalog
    return <AdminMovies token={token!} currentUser={user} onNavigate={navigate} initialFilter={adminMoviesFilter} onFilterChange={setAdminMoviesFilter} />;
  };

  // Palette mapper
  const brandingClassName = (() => {
    switch (siteSettings.branding_color) {
      case 'rose': return 'text-rose-500 border-rose-500 bg-rose-500/10 focus:border-rose-500';
      case 'violet': return 'text-[#7C3AED] border-[#7C3AED] bg-[#7C3AED]/10 focus:border-[#7C3AED]';
      case 'indigo': return 'text-indigo-500 border-indigo-500 bg-indigo-500/10 focus:border-indigo-500';
      case 'emerald': return 'text-emerald-500 border-emerald-500 bg-emerald-500/10 focus:border-emerald-500';
      case 'cyan': return 'text-cyan-500 border-cyan-500 bg-cyan-500/10 focus:border-cyan-500';
      case 'amber': return 'text-amber-500 border-amber-500 bg-amber-500/10 focus:border-amber-500';
      case 'fuchsia': return 'text-fuchsia-500 border-fuchsia-500 bg-fuchsia-500/10 focus:border-fuchsia-500';
      default: return 'text-[#7C3AED] border-[#7C3AED] bg-[#7C3AED]/10 focus:border-[#7C3AED]';
    }
  })();

  const primaryBtnBrandClass = (() => {
    switch (siteSettings.branding_color) {
      case 'rose': return 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20';
      case 'violet': return 'bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[#7C3AED]/40';
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20';
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20';
      case 'cyan': return 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20';
      case 'fuchsia': return 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-fuchsia-550/20';
      default: return 'bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[#7C3AED]/40';
    }
  })();

  // Render Setup if required
  if (setupRequired) {
    return <FirstTimeSetup onComplete={handleFirstTimeSetupComplete} />;
  }

  // Get first published catalog item as featured choice
  const featuredMovieCandidate = movies.find(m => m.status === 'published') || null;

  return (
    <div id="cinevault-core-application" className="min-h-screen bg-slate-50 text-neutral-800 dark:bg-[#0A0A0F] dark:text-neutral-100 transition-colors duration-300 md:pb-0 pb-20">
      
      {/* Sidebar Navigation */}
      <Navigation
        currentPath={currentPath}
        onNavigate={navigate}
        user={user}
        onLogout={handleLogout}
        siteName={siteSettings.site_name}
        siteLogo={siteSettings.site_logo}
      />

      {/* Main Grid content frames */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        
        {/* TOP COMPACT BRAND HEADER CONTROL LINE */}
        <header className="sticky top-0 z-30 flex items-center justify-between p-4 md:px-8 bg-slate-50/70 dark:bg-[#0A0A0F]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 select-none-all">
          
          {/* Logo element for mob layout */}
          <div className="lg:hidden flex items-center gap-2">
            {siteSettings.site_logo ? (
              <img referrerPolicy="no-referrer" src={siteSettings.site_logo} alt="Logo" className="w-7 h-7 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-fuchsia-500 dark:from-[#7C3AED] dark:to-[#A855F7] flex items-center justify-center text-white text-md font-black shadow-lg dark:shadow-[#7C3AED]/20">
                {siteSettings.site_name.charAt(0)}
              </div>
            )}
            <h1 className="text-md font-extrabold tracking-tight text-neutral-800 dark:text-white dark:[text-shadow:0_0_15px_rgba(124,58,237,0.4)]">{siteSettings.site_name}</h1>
          </div>

          {/* Quick catalog instant suggested search filter bar */}
          <div className="hidden md:block relative w-80">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 shrink-0" />
              <input
                id="header_instant_search_input"
                type="text"
                placeholder="Lookup movies, genre tags..."
                value={searchQuery}
                onChange={(e) => handleSearchTyping(e.target.value)}
                className="w-full bg-slate-200/50 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-800 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-[#7C3AED]/50"
              />
            </div>

            {/* Suggestions Dropdown overlay */}
            {searchSuggestions.length > 0 && (
              <div className="absolute top-11 left-0 right-0 bg-white dark:bg-[#151528] border border-neutral-200 dark:border-white/5 rounded-xl p-2.5 shadow-2xl z-40 space-y-1 block animate-fadeIn">
                <span className="block text-[9px] uppercase font-bold text-neutral-400 pb-1 px-1.5 select-none">Quick Suggestions</span>
                {searchSuggestions.map(item => (
                  <button
                    key={item.id}
                    id={`search-suggestion-${item.id}`}
                    onClick={() => {
                      setSearchQuery('');
                      setSearchSuggestions([]);
                      navigate(`/movie/${item.id}`);
                    }}
                    className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-9 rounded bg-[#101018] shrink-0 overflow-hidden font-mono text-[8px] flex items-center justify-center">
                      {item.poster_url ? (
                        <img referrerPolicy="no-referrer" src={item.poster_url} alt="cover" className="w-[28px] h-[36px] object-cover" />
                      ) : (
                        'N/A'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate text-neutral-800 dark:text-neutral-200">{item.title}</p>
                      <span className="text-[9px] text-neutral-400">{item.genre}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User / Theme parameters controls */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            
            {user ? (
              <div className="hidden lg:flex items-center gap-3 bg-rose-500/5 dark:bg-violet-600/5 px-3 py-1.5 rounded-2xl border border-rose-500/10 dark:border-violet-500/10">
                <div className="w-6.5 h-6.5 rounded-full bg-rose-550 dark:bg-violet-600 text-white flex items-center justify-center text-xs font-black select-none uppercase">
                  {user.username.charAt(0)}
                </div>
                <div className="text-left font-sans text-xs">
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">{user.username}</p>
                </div>
              </div>
            ) : (
              <button
                id="header-signin-btn"
                onClick={() => navigate('/login')}
                className={`hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-rose-500/10 ${primaryBtnBrandClass}`}
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
            )}
          </div>
        </header>

        {/* FEED VIEWS SCROLL CONTEXT */}
        <main className="flex-1 p-4 md:p-8 space-y-10">

          {/* Movie Details Page view */}
          {currentPath.startsWith('/movie/') && activeMovieObj ? (
            <div id="movie-details-view" className="space-y-8 animate-fadeIn select-none">
              
              {/* Back controls navigation */}
              <button
                id="back-to-home-btn"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-white/5 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer text-xs font-bold bg-white dark:bg-transparent"
              >
                <ArrowLeft className="w-4 h-4" /> <span>Catalog Dashboard</span>
              </button>

              {/* Cover Showcase visual block */}
              <div className="relative h-[280px] md:h-[400px] rounded-3xl overflow-hidden bg-neutral-200 dark:bg-black border border-neutral-300 dark:border-white/5 shadow-xl flex items-end">
                {activeMovieObj.backdrop_url ? (
                  <img
                    referrerPolicy="no-referrer"
                    src={activeMovieObj.backdrop_url}
                    alt={activeMovieObj.title}
                    className="absolute inset-0 w-full h-full object-cover dark:opacity-80 opacity-100"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-neutral-900 dark:to-neutral-800" />
                )}
                {/* Overlay vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/40 dark:from-[#0A0A0F] dark:via-black/40 to-transparent" />
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                
                {/* Column side Poster */}
                <div className="hidden lg:block space-y-4">
                  <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-200 dark:bg-neutral-900 border border-neutral-300 dark:border-white/5 shadow-2xl flex items-center justify-center font-mono">
                    {activeMovieObj.poster_url ? (
                      <img referrerPolicy="no-referrer" src={activeMovieObj.poster_url} alt="Cover artwork" className="w-full h-full object-cover" />
                    ) : (
                      'N/A'
                    )}
                  </div>
                </div>

                {/* Column details block */}
                <div className="lg:col-span-2 space-y-6">
                  
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-bold bg-rose-500/10 text-rose-500 dark:bg-violet-400/10 dark:text-violet-300 border border-rose-500/15 dark:border-violet-500/15 rounded-lg">
                        {activeMovieObj.category}
                      </span>
                      <span className="text-xs text-neutral-400 font-bold font-mono">
                        {activeMovieObj.genre}
                      </span>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-neutral-800 dark:text-neutral-50 leading-tight">
                      {activeMovieObj.title}
                    </h2>
                  </div>

                  <p className="text-neutral-600 dark:text-neutral-300 text-sm md:text-base leading-relaxed leading-7 font-normal">
                    {activeMovieObj.description}
                  </p>

                  {/* Redirection Download block */}
                  {activeMovieObj.download_enabled && activeMovieObj.download_redirect_url ? (
                    <div className="p-6 rounded-2xl bg-slate-100 dark:bg-[#181829] border border-neutral-200 dark:border-white/5 text-left space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <Download className="w-4.5 h-4.5 text-rose-500 dark:text-violet-400" /> Redirect File Access Gateway
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          Clicking download connects your browser to our external secure mirror defined by system administrator.
                        </p>
                      </div>
                      
                      <button
                        id="redirect_download_btn"
                        onClick={() => handleDownloadRedirect(activeMovieObj)}
                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs md:text-sm text-white shadow-lg transition-transform hover:scale-103 active:scale-97 cursor-pointer ${primaryBtnBrandClass}`}
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Secure Download Redirect</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-center gap-2">
                       <AlertCircle className="w-4.5 h-4.5" />
                       <span>Standard download access gate is currently offline. Please contact an admin.</span>
                    </div>
                  )}

                  {/* Scene snapshot Gallery Carousel */}
                  <div className="space-y-3 pt-6 border-t border-neutral-200 dark:border-white/5">
                    <h3 className="text-md font-bold text-neutral-800 dark:text-neutral-200">Cinematic Previews Gallery</h3>
                    <SceneGallery images={activeMovieObj.scene_images || []} />
                  </div>

                </div>

              </div>

            </div>
          ) : (currentPath.startsWith('/admin') && currentPath !== '/admin/login') ? (
            /* ADMIN CMS VIEWS FRAME */
            <div id="admin-dashboard-views-outlet" className="space-y-6 animate-fadeIn">
              
              {/* Mobile Admin Sub-Navigation */}
              {user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator') && (
                <div className="lg:hidden flex space-x-2 overflow-x-auto pb-2 border-b border-black/5 dark:border-white/5 scrollbar-none snap-x">
                  <button 
                    onClick={() => navigate('/admin/movies')}
                    className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-colors ${currentPath === '/admin/movies' || currentPath === '/admin' ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20' : 'text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}`}
                  >
                    <Film className="w-4 h-4 inline-block mr-1.5" /> Movies
                  </button>
                  
                  {(user.role === 'admin' || user.role === 'super_admin') && (
                    <button 
                      onClick={() => navigate('/admin/users')}
                      className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-colors ${currentPath === '/admin/users' ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20' : 'text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}`}
                    >
                      <Users className="w-4 h-4 inline-block mr-1.5" /> Users
                    </button>
                  )}

                  {user.role === 'super_admin' && (
                    <button 
                      onClick={() => navigate('/admin/settings')}
                      className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-colors ${currentPath === '/admin/settings' ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20' : 'text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}`}
                    >
                      <Settings className="w-4 h-4 inline-block mr-1.5" /> Settings
                    </button>
                  )}
                </div>
              )}

              {/* Central Admin KPI Stats Board */}
              {(() => {
                const isSubscribersSelected = currentPath === '/admin/users';
                const isPublishedSelected = (currentPath === '/admin/movies' || currentPath === '/admin') && adminMoviesFilter === 'published';
                const isDraftsSelected = (currentPath === '/admin/movies' || currentPath === '/admin') && adminMoviesFilter === 'draft';

                return adminStats && (
                  <div id="admin-analytics-kpi-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 p-3.5 bg-slate-100/50 dark:bg-[#1B1B2A]/50 backdrop-blur-md border border-neutral-200 dark:border-white/5 rounded-2xl">
                    {/* KPI: Subscribers */}
                    <button
                      onClick={() => navigate('/admin/users')}
                      className={`p-3.5 rounded-2xl border transition-all duration-300 text-left w-full select-none cursor-pointer flex flex-col justify-between gap-3 ${
                        isSubscribersSelected
                          ? 'stat-card-selected-brand scale-[1.02] z-10'
                          : 'bg-white/70 dark:bg-[#1B1B2A]/70 border-neutral-200/50 dark:border-white/5 hover:translate-y-[-2px] hover:border-brand-accent/40 hover:bg-white dark:hover:bg-[#1B1B2A] hover:shadow-lg hover:shadow-brand-accent/5'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isSubscribersSelected
                            ? 'bg-brand-accent text-white shadow-md'
                            : 'bg-brand-accent/10 text-brand-accent'
                        }`}
                        >
                          <Users className="w-4.5 h-4.5" />
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0 select-none transition-all ${
                          isSubscribersSelected
                            ? 'bg-brand-accent text-white font-extrabold'
                            : 'bg-brand-accent/10 text-brand-accent'
                        }`}
                        >
                          View
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-black tracking-wider truncate">Subscribers</p>
                        <h4 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-50 font-mono leading-none mt-1">{adminStats.totalUsers}</h4>
                      </div>
                    </button>

                    {/* KPI: Movies Catalog (Published) */}
                    <button
                      onClick={() => {
                        setAdminMoviesFilter('published');
                        navigate('/admin/movies');
                      }}
                      className={`p-3.5 rounded-2xl border transition-all duration-300 text-left w-full select-none cursor-pointer flex flex-col justify-between gap-3 ${
                        isPublishedSelected
                          ? 'stat-card-selected-emerald scale-[1.02] z-10'
                          : 'bg-white/70 dark:bg-[#1B1B2A]/70 border-neutral-200/50 dark:border-white/5 hover:translate-y-[-2px] hover:border-emerald-500/40 hover:bg-white dark:hover:bg-[#1B1B2A] hover:shadow-lg hover:shadow-emerald-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isPublishedSelected 
                            ? 'bg-emerald-500 text-white shadow-md' 
                            : 'bg-emerald-500/10 text-emerald-555 dark:text-emerald-400'
                        }`}>
                          <Film className="w-4 h-4" />
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0 select-none transition-all ${
                          isPublishedSelected 
                            ? 'bg-emerald-500 text-white font-extrabold' 
                            : 'bg-emerald-500/10 text-emerald-555 dark:text-emerald-400'
                        }`}>
                          Filter
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-black tracking-wider truncate">Published</p>
                        <h4 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-50 font-mono leading-none mt-1">{adminStats.totalMovies}</h4>
                      </div>
                    </button>

                    {/* KPI: Drafts */}
                    <button
                      onClick={() => {
                        setAdminMoviesFilter('draft');
                        navigate('/admin/movies');
                      }}
                      className={`p-3.5 rounded-2xl border transition-all duration-300 text-left w-full select-none cursor-pointer flex flex-col justify-between gap-3 ${
                        isDraftsSelected
                          ? 'stat-card-selected-amber scale-[1.02] z-10'
                          : 'bg-white/70 dark:bg-[#1B1B2A]/70 border-neutral-200/50 dark:border-white/5 hover:translate-y-[-2px] hover:border-amber-500/40 hover:bg-white dark:hover:bg-[#1B1B2A] hover:shadow-lg hover:shadow-amber-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isDraftsSelected 
                            ? 'bg-amber-500 text-white shadow-md' 
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          <FileEdit className="w-4 h-4" />
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0 select-none transition-all ${
                          isDraftsSelected 
                            ? 'bg-amber-500 text-white font-extrabold' 
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          Filter
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-black tracking-wider truncate">Drafts</p>
                        <h4 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-50 font-mono leading-none mt-1">{adminStats.totalDrafts ?? 0}</h4>
                      </div>
                    </button>

                    {/* KPI: Online Now (Real-Time Live Concurrent Users) */}
                    <div className="p-3.5 bg-white/70 dark:bg-[#1B1B2A]/70 rounded-2xl border border-neutral-200/50 dark:border-white/5 flex flex-col justify-between gap-3 select-none hover:translate-y-[-1px] hover:shadow-md transition-all text-left w-full">
                      <div className="flex items-center justify-between w-full">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0 select-none flex items-center gap-1">
                          Live Now
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-black tracking-wider truncate">Active Users</p>
                        <h4 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-50 font-mono leading-none mt-1">
                          {adminStats.activeOnline ?? 1}
                        </h4>
                      </div>
                    </div>

                    {/* KPI: Page Views (Page Hits) */}
                    <div className="p-3.5 bg-white/70 dark:bg-[#1B1B2A]/70 rounded-2xl border border-neutral-200/50 dark:border-white/5 flex flex-col justify-between gap-3 select-none hover:translate-y-[-1px] hover:shadow-md transition-all text-left w-full col-span-2 md:col-span-1 lg:col-span-1">
                      <div className="flex items-center justify-between w-full">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400 flex items-center justify-center shrink-0">
                          <Eye className="w-4 h-4" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-500 dark:text-violet-400 shrink-0 select-none">
                          Page Hits
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-black tracking-wider truncate">Total Views</p>
                        <h4 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-50 font-mono leading-none mt-1">{adminStats.pageViews}</h4>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {renderAdminPanelContent()}
            </div>
          ) : currentPath === '/login' || currentPath === '/admin/login' ? (
            /* COMBINED PREMIUM AUTHENTICATION PANEL */
            <div id="auth-portal-view" className="max-w-md mx-auto py-10 animate-fadeIn">
              
              <div className="bg-slate-100/50 dark:bg-[#1B1B2A]/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-neutral-200 dark:border-white/5 space-y-6 shadow-2xl relative overflow-hidden">
                
                {/* Google Picker Modal Overlay Overlay */}
                {showGooglePicker && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-[#121223]/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
                    <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-4 border border-black/5 dark:border-white/5">
                      <svg className="w-5.5 h-5.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-black text-neutral-800 dark:text-neutral-100">Sync with Google Account</h3>
                    <p className="text-[11px] text-neutral-400 mt-1 max-w-xs">
                      Select a Google account to bypass passwords and log in or subscribe seamlessly.
                    </p>

                    <div className="w-full mt-5 space-y-2 max-h-56 overflow-y-auto">
                      {[
                        { email: 'sarah.connor@gmail.com', username: 'SarahConnor' },
                        { email: 'john.doe@gmail.com', username: 'JohnDoe' },
                        { email: 'neomovie.fan@gmail.com', username: 'NeoFan' }
                      ].map(acc => (
                        <button
                          key={acc.email}
                          onClick={() => {
                            setShowGooglePicker(false);
                            handleGoogleMockSubmit(acc.email, acc.username);
                          }}
                          className="w-full text-left p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{acc.username}</h4>
                            <span className="text-[10px] text-neutral-500 font-mono">{acc.email}</span>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-neutral-400" />
                        </button>
                      ))}

                      {/* Custom Input */}
                      <button
                        onClick={() => {
                          const customEmail = prompt("Enter custom Google email:");
                          if (customEmail && customEmail.includes('@')) {
                            const parsedUser = customEmail.split('@')[0];
                            setShowGooglePicker(false);
                            handleGoogleMockSubmit(customEmail, parsedUser);
                          } else if (customEmail) {
                            alert("Please enter a valid email format");
                          }
                        }}
                        className="w-full text-center p-2.5 rounded-xl border border-dashed border-neutral-300 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-[10px] text-neutral-400 cursor-pointer font-bold"
                      >
                        + Use another Google account
                      </button>
                    </div>

                    <button
                      onClick={() => setShowGooglePicker(false)}
                      className="mt-4 text-[10px] font-bold text-rose-500 cursor-pointer uppercase tracking-wider"
                    >
                      Cancel Account Selection
                    </button>
                  </div>
                )}

                {/* Brand label */}
                <div className="text-center space-y-2 select-none">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-fuchsia-500 dark:from-violet-600 dark:to-fuchsia-600 flex items-center justify-center text-white text-xl font-extrabold mx-auto shadow-md shadow-rose-500/10 dark:shadow-violet-600/10">
                    {siteSettings.site_name.charAt(0)}
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-neutral-800 dark:text-neutral-50">
                    {currentPath === '/admin/login' 
                      ? 'Staff Entrance Portal' 
                      : authSubMode === 'forgot'
                        ? 'Recovery Pipeline'
                        : authSubMode === 'reset'
                          ? 'Update Account Keys'
                          : isRegisterMode 
                            ? 'Subscribe Profile' 
                            : 'Access Account Portal'}
                  </h2>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    {currentPath === '/admin/login' 
                      ? 'Secure administrative clearance only. Ordinary registrations use user access points.'
                      : authSubMode === 'forgot'
                        ? 'Reset your forgotten security keys using your associated email.'
                        : authSubMode === 'reset'
                          ? 'Input the validation token to write your new credentials.'
                          : isRegisterMode
                            ? 'Unlock high-fidelity download links.'
                            : 'Sign in to access search redirects.'}
                  </p>
                </div>

                {authError && (
                  <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-left">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-left">
                    <Check className="w-4.5 h-4.5 shrink-0" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                {authRequires2FA ? (
                  <form onSubmit={handle2FASubmit} className="space-y-4">
                    <p className="text-xs text-neutral-400 mb-4 text-center">
                      {authSuccess || "Please enter the verification code to continue."}
                    </p>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-wider">Verification Code</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          id="auth_2fa_code_field"
                          type="text"
                          required
                          placeholder="123456"
                          value={auth2FACode}
                          onChange={(e) => setAuth2FACode(e.target.value)}
                          className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white text-center tracking-widest font-mono font-black"
                        />
                      </div>
                    </div>
                    <button
                      id="submit_2fa_btn"
                      type="submit"
                      disabled={authLoader}
                      className={`w-full py-3 rounded-xl font-bold text-xs text-white uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-55 active:scale-98 ${primaryBtnBrandClass}`}
                    >
                      {authLoader ? 'Verifying...' : 'Submit Code'}
                    </button>
                    <div className="text-center pt-2 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthRequires2FA(false);
                          setAuth2FASessionId('');
                          setAuth2FACode('');
                        }}
                        className="text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
                      >
                        Cancel Verification
                      </button>
                    </div>
                  </form>
                ) : authSubMode === 'forgot' && currentPath !== '/admin/login' ? (
                  /* FORGOT PASSWORD FORM */
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-left">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-wider">Registered Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="email"
                          required
                          placeholder="youraccount@domain.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoader}
                      className={`w-full py-3 rounded-xl font-bold text-xs text-white uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-55 ${primaryBtnBrandClass}`}
                    >
                      {authLoader ? 'Synthesizing reset keys...' : 'Send Recovery Token'}
                    </button>

                    <div className="flex items-center justify-between pt-2 select-none text-xs text-neutral-400">
                      <button type="button" onClick={() => setAuthSubMode('signin')} className="hover:text-neutral-200 cursor-pointer text-left">
                        ← Back to Sign In
                      </button>
                      <button type="button" onClick={() => setAuthSubMode('reset')} className="hover:text-neutral-200 cursor-pointer text-right">
                        Have a Reset Token? →
                      </button>
                    </div>
                  </form>
                ) : authSubMode === 'reset' && currentPath !== '/admin/login' ? (
                  /* RESET PASSWORD FORM */
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-left">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-wider">Reset Security Token</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="text"
                          required
                          placeholder="pwr_..."
                          value={resetTokenVal}
                          onChange={(e) => setResetTokenVal(e.target.value)}
                          className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-wider">New Secure Password</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={resetNewPasswordVal}
                          onChange={(e) => setResetNewPasswordVal(e.target.value)}
                          className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoader}
                      className={`w-full py-3 rounded-xl font-bold text-xs text-white uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-55 ${primaryBtnBrandClass}`}
                    >
                      {authLoader ? 'Committing changes...' : 'Save New Credentials'}
                    </button>

                    <div className="text-center pt-2 select-none text-xs text-neutral-400">
                      <button type="button" onClick={() => setAuthSubMode('signin')} className="hover:text-neutral-200 cursor-pointer">
                        ← Cancel and Return to Sign In
                      </button>
                    </div>
                  </form>
                ) : (
                  /* MAIN REGISTER / LOGIN INPUT FORM */
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {isRegisterMode && currentPath !== '/admin/login' && (
                      <div className="text-left">
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-wider">Desired Username</label>
                        <div className="relative">
                          <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            id="auth_username_field"
                            type="text"
                            required
                            placeholder="subscrib_root"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-left">
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-wider">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          id="auth_email_field"
                          type="email"
                          required
                          placeholder="yourname@gmail.com"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="text-left">
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-wider">Credentials Password</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          id="auth_password_field"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white"
                        />
                      </div>
                    </div>

                    {isRegisterMode && currentPath !== '/admin/login' && (
                      <div className="text-left">
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-wider">Confirm Password</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            id="auth_password_confirm_field"
                            type="password"
                            required
                            placeholder="••••••••"
                            value={authConfirmPass}
                            onChange={(e) => setAuthConfirmPass(e.target.value)}
                            className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      id="submit_auth_btn"
                      type="submit"
                      disabled={authLoader}
                      className={`w-full py-3 rounded-xl font-bold text-xs text-white uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-55 active:scale-98 ${primaryBtnBrandClass}`}
                    >
                      {authLoader ? 'Checking Credentials...' : isRegisterMode ? 'Subscribe Access' : 'Secure Entry Auth'}
                    </button>

                    {/* Google Social login row */}
                    {currentPath !== '/admin/login' && !isRegisterMode && (
                      <div className="pt-2 select-none">
                        <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-[#000000]/10 dark:border-white/5"></div>
                          <span className="flex-shrink mx-4 text-[9px] text-neutral-500 uppercase tracking-widest font-black">or login instantly</span>
                          <div className="flex-grow border-t border-[#000000]/10 dark:border-white/5"></div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowGooglePicker(true)}
                          className="w-full py-2.5 px-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-200 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>Sign in with Google</span>
                        </button>
                      </div>
                    )}

                  </form>
                )}

                {/* Subtext toggles */}
                {currentPath !== '/admin/login' && (
                  <div className="flex flex-col gap-2 text-center pt-2 select-none text-[11px] text-neutral-400">
                    <div>
                      <button
                        id="toggle_register_mode_btn"
                        onClick={() => {
                          setIsRegisterMode(!isRegisterMode);
                          setAuthSubMode(isRegisterMode ? 'signin' : 'register');
                        }}
                        className="hover:text-neutral-200 cursor-pointer font-bold"
                      >
                        {isRegisterMode ? 'Already cataloged? Sign In' : 'First-time here? Create account'}
                      </button>
                    </div>

                    {authSubMode === 'signin' && (
                      <div className="flex justify-center gap-4 text-[10px]">
                        <button type="button" onClick={() => setAuthSubMode('forgot')} className="hover:text-neutral-200 cursor-pointer">
                          Forgot Password?
                        </button>
                        <span>•</span>
                        <button type="button" onClick={() => setAuthSubMode('reset')} className="hover:text-neutral-200 cursor-pointer">
                          Enter Reset Token
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>
          ) : currentPath === '/profile' && user ? (
            /* USER PROFILE / GENERAL DETAILS LOGOUT SCREEN */
            <div id="user-profile-view" className="animate-fadeIn">
              <UserProfile token={token!} user={user} onProfileUpdated={(updated) => setUser(updated)} />
              <div className="max-w-md mx-auto pt-4 text-center select-none">
                <button
                  id="profile-signout-btn"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#EE0000]/10 hover:bg-[#EE0000]/15 text-[#EE0000] text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>Logout Current Session</span>
                </button>
              </div>
            </div>
          ) : (
            /* PUBLIC HOME CATALOG PAGE VIEW */
            <div id="public-home-feed-view" className="space-y-12 animate-fadeIn select-none">
              
              {/* Dynamic Featured cover banner */}
              <HeroBanner
                movie={featuredMovieCandidate}
                onViewDetails={(m) => navigate(`/movie/${m.id}`)}
                onDownloadClick={handleDownloadRedirect}
              />

              {/* public slider sections by category */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
                  <Film className="w-10 h-10 animate-spin mb-3 text-rose-500 dark:text-violet-450" />
                  <span>Constructing home catalogue dashboard...</span>
                </div>
              ) : movies.length === 0 ? (
                <div className="text-center py-16 text-neutral-500 bg-slate-100/20 dark:bg-[#151528]/10 rounded-2xl border border-dashed border-neutral-300 dark:border-white/5">
                  <Film className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                  <h4 className="text-md font-bold text-neutral-800 dark:text-neutral-300">Catalogue is currently offline</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    No custom movies have been published yet by platform administrators.
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  {CATEGORIES.map(categoryName => {
                    const filteredMovies = movies.filter(m => m.category === categoryName);
                    if (filteredMovies.length === 0) return null; // Compact hides empty rows

                    return (
                      <section key={categoryName} id={`category-row-${categoryName.toLowerCase()}`} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-neutral-800 dark:text-neutral-100 tracking-tight flex items-center gap-2">
                            {categoryName}
                          </h3>
                        </div>

                        {/* Horizontal row scroll wrap */}
                        <div
                          className="flex gap-4.5 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth scrollbar-none"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          {filteredMovies.map(movieObj => (
                            <MovieCard
                              key={movieObj.id}
                              movie={movieObj}
                              onClick={() => navigate(`/movie/${movieObj.id}`)}
                              isAdminView={false}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </main>

        {/* REUSABLE PREMIUM METADATA STAFF ACCESS FOOTER */}
        <footer className="mt-auto py-6 border-t border-black/5 dark:border-white/5 text-center text-xs text-neutral-400 select-none">
          <p className="font-mono">© {new Date().getFullYear()} {siteSettings.site_name} Platforms. All rights reserved.</p>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span>Powered by dynamic storage servers.</span>
            <span>•</span>
            <button
              id="staff-access-footer-btn"
              onClick={() => {
                setIsRegisterMode(false);
                navigate('/admin/login');
              }}
              className="text-rose-500 dark:text-violet-400 cursor-pointer hover:underline font-bold"
            >
              Staff Access
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
