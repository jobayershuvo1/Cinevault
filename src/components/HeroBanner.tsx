import React from 'react';
import { Film, Info, ArrowRight, Download, Sparkles } from 'lucide-react';
import { CustomMovie } from '../types';

interface HeroBannerProps {
  movie: CustomMovie | null;
  onViewDetails: (movie: CustomMovie) => void;
  onDownloadClick: (movie: CustomMovie) => void;
}

export default function HeroBanner({ movie, onViewDetails, onDownloadClick }: HeroBannerProps) {
  if (!movie) {
    // Elegant fallback banner when no movies have been configured
    return (
      <div id="hero-fallback-banner" className="relative h-[480px] rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-slate-900 dark:via-neutral-900 dark:to-[#121226] flex items-center justify-center p-6 md:p-12 text-center text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 shadow-2xl select-none group">
        <div className="absolute inset-0 bg-radial from-violet-500/5 dark:from-violet-500/10 via-transparent to-transparent opacity-50" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(255,255,255,1)_0%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(to_top,rgba(10,10,15,1)_0%,rgba(10,10,15,0.4)_50%,rgba(10,10,15,0)_100%)]" />
        
        <div className="relative max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-600 dark:text-violet-400">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Welcome to CineVault</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight bg-gradient-to-r from-neutral-800 via-neutral-600 to-neutral-500 dark:from-neutral-50 dark:via-neutral-100 dark:to-neutral-400 text-transparent bg-clip-text">
            Build Your Private, High-Speed Cinematic Archive
          </h2>
          <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-lg mx-auto">
            Discover, catalog, and secure redirect-backed movie archives directly from our high-performance CMS panel. Log in with admin permission to start uploading magnificent movie posters!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="px-4 py-2 text-xs font-mono text-neutral-600 dark:text-neutral-500 bg-white/50 dark:bg-black/30 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              CORS-free storage bucket configured
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`hero-movie-banner-${movie.id}`}
      className="relative h-[420px] md:h-[580px] rounded-3xl overflow-hidden bg-neutral-200 dark:bg-neutral-950 border border-neutral-300 dark:border-white/5 shadow-2xl flex items-end group select-none transition-all duration-300"
    >
      {/* Backdrop Image with Multi-Gradient Overlay Overlay */}
      {movie.backdrop_url ? (
        <img
          referrerPolicy="no-referrer"
          src={movie.backdrop_url}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-102"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-200 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 animate-pulse" />
      )}

      {/* Cinematic Gradual Dim Masks */}
      {/* Dark left glow gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-50/90 via-slate-50/60 dark:from-black/85 dark:via-black/50 to-transparent" />
      {/* Dark bottom rise overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/40 to-transparent dark:from-[#0A0A0F] dark:via-black/30 dark:to-black/5" />

      {/* Interactive Text & Action Details */}
      <div className="relative p-6 md:p-12 max-w-3xl space-y-4 md:space-y-6 text-neutral-800 dark:text-white">
        
        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 text-xs font-black tracking-wider uppercase rounded-lg bg-rose-500/80 dark:bg-violet-600/80 shadow-md text-white">
            Featured
          </span>
          <span className="px-2.5 py-1 text-xs font-bold bg-white/90 dark:bg-[#141416]/90 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-800 dark:text-neutral-200">
            {movie.category}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-300 font-medium font-mono">
            • {movie.genre}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-neutral-900 dark:text-neutral-50 drop-shadow-md">
          {movie.title}
        </h2>

        {/* Synopsis / Description */}
        <p className="text-neutral-600 dark:text-neutral-300 text-xs md:text-sm leading-relaxed line-clamp-3 md:line-clamp-4 max-w-xl font-normal drop-shadow-sm">
          {movie.description}
        </p>

        {/* Button Controls */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          
          <button
            id={`hero-view-details-btn-${movie.id}`}
            onClick={() => onViewDetails(movie)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-black/5 dark:bg-white/10 backdrop-blur-md border border-black/10 dark:border-white/15 text-neutral-800 dark:text-white font-semibold text-xs md:text-sm hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-pointer select-none"
          >
            <Info className="w-4 h-4 shrink-0 text-neutral-800 dark:text-white" />
            <span>Discover Movie</span>
          </button>

          {movie.download_enabled && movie.download_redirect_url && (
            <button
              id={`hero-download-btn-${movie.id}`}
              onClick={() => onDownloadClick(movie)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-accent hover:bg-brand-secondary text-white font-bold text-xs md:text-sm transition-all duration-200 shadow-lg shadow-brand-accent/40 cursor-pointer hover:scale-103 active:scale-97 select-none"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Speed Redirect Access</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
