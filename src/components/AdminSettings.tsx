import React, { useEffect, useState } from 'react';
import { Settings, Save, Sparkles, Check, AlertCircle, Upload, Palette, HelpCircle, Layout } from 'lucide-react';
import { SiteSettings } from '../types';

interface AdminSettingsProps {
  token: string;
  initialSettings: SiteSettings;
  onSettingsUpdated: (newSettings: SiteSettings) => void;
}

const PALETTE_OPTIONS = [
  { name: 'Rose', class: 'rose', activeColor: 'bg-rose-500' },
  { name: 'Violet', class: 'violet', activeColor: 'bg-violet-500' },
  { name: 'Indigo', class: 'indigo', activeColor: 'bg-indigo-500' },
  { name: 'Emerald', class: 'emerald', activeColor: 'bg-emerald-500' },
  { name: 'Cyan', class: 'cyan', activeColor: 'bg-cyan-500' },
  { name: 'Amber', class: 'amber', activeColor: 'bg-amber-500' },
  { name: 'Fuchsia', class: 'fuchsia', activeColor: 'bg-fuchsia-500' },
];

export default function AdminSettings({ token, initialSettings, onSettingsUpdated }: AdminSettingsProps) {
  const [siteName, setSiteName] = useState(initialSettings.site_name);
  const [siteLogo, setSiteLogo] = useState(initialSettings.site_logo);
  const [brandingColor, setBrandingColor] = useState(initialSettings.branding_color);
  const [defaultTheme, setDefaultTheme] = useState<'dark' | 'light'>(initialSettings.default_theme);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    setSiteName(initialSettings.site_name);
    setSiteLogo(initialSettings.site_logo);
    setBrandingColor(initialSettings.branding_color);
    setDefaultTheme(initialSettings.default_theme);
  }, [initialSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setError('');
    setSuccess('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              data: reader.result as string,
              filename: file.name,
              folder: 'posters' // Place logos securely in static media folders
            })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Identity logo upload failed.');
          }
          setSiteLogo(data.url);
          setSuccess('Global platform logo updated in preview form.');
        } catch (err: any) {
          setError(err.message || 'Error processing logo upload.');
        } finally {
          setLogoUploading(false);
        }
      };
    } catch (err: any) {
      setError(err.message || 'Log file reading failed.');
      setLogoUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!siteName) {
      setError('Global Platform Name cannot remain empty.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          site_name: siteName,
          site_logo: siteLogo,
          branding_color: brandingColor,
          default_theme: defaultTheme
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Site settings preservation failed.');
      }

      onSettingsUpdated(data);
      setSuccess('Site settings permanently preserved inside database!');
    } catch (err: any) {
      setError(err.message || 'Writing settings failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="admin-settings-panel" className="space-y-6">
      
      {/* Header */}
      <div className="border-b border-[#000000]/5 dark:border-white/5 pb-5 select-none">
        <h2 className="text-2xl font-extrabold text-neutral-800 dark:text-neutral-50 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-accent" /> Platform Configuration
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Personalize visual identities, bind logos, tweak typography accent profiles, or set client layouts.
        </p>
      </div>

      {error && (
        <div id="settings-error-banner" className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="settings-success-banner" className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <Check className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Basic Brand configuration Card */}
        <div className="md:col-span-2 bg-slate-100/50 dark:bg-[#1B1B2A]/70 backdrop-blur-md rounded-2xl p-6 border border-neutral-200 dark:border-white/5 space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2 select-none">
            <Palette className="w-4 h-4 text-brand-accent" /> Visual Identity Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Platform Name</label>
              <input
                id="settings_site_name_input"
                type="text"
                required
                placeholder="e.g. CineVault"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-neutral-800 dark:text-white"
              />
            </div>

            {/* Logo Settings */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-neutral-500">Global Website Logo</label>
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#121223] overflow-hidden shrink-0 border border-neutral-200 dark:border-white/5 flex items-center justify-center p-2 shadow-sm">
                  {siteLogo ? (
                    <img referrerPolicy="no-referrer" src={siteLogo} alt="Logo preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center text-white text-xs font-black">
                      {siteName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="relative flex items-center bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-xs px-4 py-2.5 rounded-lg font-bold border border-brand-accent/20 cursor-pointer justify-center transition-colors">
                    <Upload className="w-4 h-4 mr-1.5" />
                    <span>{logoUploading ? 'Uploading Logo...' : 'Upload Brand Logo'}</span>
                    <input
                      id="settings_logo_file_input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={logoUploading}
                    />
                  </div>
                  <span className="block text-[10px] text-neutral-400">Supported formats: png, svg, webp. Inline SVG is optimal.</span>
                </div>
              </div>
            </div>

            {/* Branding Accent Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase text-neutral-500 select-none flex items-center gap-1">
                Accent Branding Palette
              </label>
              <div className="flex flex-wrap gap-2 select-none">
                {PALETTE_OPTIONS.map(opt => {
                  const isActive = brandingColor === opt.class;
                  return (
                    <button
                      key={opt.name}
                      id={`branding-theme-${opt.class}`}
                      type="button"
                      onClick={() => setBrandingColor(opt.class)}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-brand-accent/15 border-brand-accent text-brand-accent'
                          : 'bg-white dark:bg-[#121223] border-neutral-200 dark:border-white/5 text-neutral-500 dark:text-neutral-450 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                      style={isActive ? { borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)', backgroundColor: 'rgba(var(--brand-glow), 0.1)' } : {}}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${opt.activeColor} shadow-inner`} />
                      <span>{opt.name}</span>
                    </button>
                  );
                })}
              </div>
              <span className="inline-block text-[10px] text-neutral-400 select-none">
                * Accent colors will instantly update visual interactive highlights globally across the platform.
              </span>
            </div>

          </div>
        </div>

        {/* Layout theme preset card */}
        <div className="bg-slate-100/50 dark:bg-[#1B1B2A]/70 backdrop-blur-md rounded-2xl p-6 border border-neutral-200 dark:border-white/5 space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2 select-none">
            <Layout className="w-4 h-4 text-brand-accent" /> Default layouts
          </h3>

          <div className="space-y-4">
            <div className="space-y-2 select-none">
              <label className="block text-xs font-bold uppercase text-neutral-500">Default Client Theme</label>
              <div className="grid grid-cols-2 gap-2">
                {(['dark', 'light'] as const).map(item => (
                  <button
                    key={item}
                    id={`settings-theme-${item}`}
                    type="button"
                    onClick={() => setDefaultTheme(item)}
                    className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      defaultTheme === item
                        ? 'bg-brand-accent/15 border-brand-accent text-brand-accent font-extrabold'
                        : 'bg-white dark:bg-[#121223] border-neutral-200 dark:border-white/5 text-neutral-500 dark:text-neutral-450 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {item} Theme
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-400 leading-normal pt-1">
                Specifies the default design theme initialized for first-time visitors who have not yet selected a preference.
              </p>
            </div>

            <div className="p-4 bg-yellow-600/5 border border-yellow-500/20 text-xs text-neutral-500 dark:text-neutral-400 rounded-2xl space-y-1.5">
              <span className="font-bold flex items-center gap-1.5 text-orange-500 dark:text-orange-400">
                <HelpCircle className="w-4 h-4" /> Live System Note
              </span>
              <p className="leading-relaxed">
                Theme changes will take shape instantly upon saving. New visitors will align to the designated settings. Active subscribers can override their clients locally status anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-3 flex justify-end pt-2 select-none">
          <button
            id="settings_submit_btn"
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-brand-accent hover:opacity-90 text-white shadow-lg shadow-brand-accent/15 active:scale-98 transition-all duration-250 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-accent)' }}
          >
            <Save className="w-4 h-4" />
            {loading ? 'Preserving settings...' : 'Commit Site Changes'}
          </button>
        </div>

      </form>

    </div>
  );
}
