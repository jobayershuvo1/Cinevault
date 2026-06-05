import React from 'react';
import { Play, EyeOff, FileEdit, Download, Lock } from 'lucide-react';
import { CustomMovie } from '../types';

interface MovieCardProps {
  key?: React.Key;
  movie: CustomMovie;
  onClick: () => void;
  isAdminView?: boolean;
  onEditClick?: () => void;
}

export default function MovieCard({ movie, onClick, isAdminView = false, onEditClick }: MovieCardProps) {
  const isDraft = movie.status === 'draft';
  const isHidden = movie.status === 'hidden';

  return (
    <div
      id={`movie-card-element-${movie.id}`}
      onClick={onClick}
      className="group relative flex-none w-[160px] sm:w-[200px] md:w-[220px] aspect-[2/3] bg-neutral-900/60 dark:bg-[#1B1B2A] rounded-2xl overflow-hidden border border-[#000000]/5 dark:border-white/5 dark:hover:border-brand-accent cursor-pointer shadow-md shadow-black/5 dark:shadow-[#050515]/30 hover:shadow-xl hover:shadow-brand-accent/20 transition-all duration-300 transform hover:-translate-y-2 select-none"
    >
      {/* High-Fi Movie Poster Card background */}
      {movie.poster_url ? (
        <img
          referrerPolicy="no-referrer"
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-tr from-[#1e1b4b] to-[#312e81] flex flex-col items-center justify-center p-4 text-center">
          <Play className="w-8 h-8 text-neutral-300 mb-2 group-hover:scale-125 transition-transform text-brand-accent" />
          <h4 className="text-xs font-semibold text-white line-clamp-2">{movie.title}</h4>
        </div>
      )}

      {/* Admin indicators */}
      {isAdminView && (
        <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
          {isDraft && (
            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-yellow-500 text-black">
              Draft
            </span>
          )}
          {isHidden && (
            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-zinc-600 text-white flex items-center gap-1">
              <EyeOff className="w-2.5 h-2.5" /> Hidden
            </span>
          )}
        </div>
      )}

      {/* Download direct indicators */}
      {movie.download_enabled && (
        <div className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-[#000000]/60 dark:bg-black/70 text-rose-500 dark:text-violet-400 border border-white/5 shadow-sm">
          <Download className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Hover Information overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 sm:p-4 text-white">
        
        {/* Decorative Play Button */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-rose-500 dark:bg-violet-600 border border-white/10 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-all duration-300">
          <Play className="w-5 h-5 text-white fill-current ml-0.5" />
        </div>

        {/* Categories / Meta */}
        <div className="space-y-1">
          <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-rose-500 dark:text-violet-400">
            {movie.category}
          </span>
          <h3 className="text-xs sm:text-sm font-bold truncate text-white leading-tight">
            {movie.title}
          </h3>
          <p className="text-[10px] text-neutral-300 line-clamp-1">{movie.genre}</p>
        </div>

        {/* Quick actions for Admins */}
        {isAdminView && onEditClick && (
          <button
            id={`card-quick-edit-${movie.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onEditClick();
            }}
            className="mt-2 w-full py-1 rounded bg-white/15 hover:bg-white/20 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-white/5 active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" /> Core Edit
          </button>
        )}

      </div>
    </div>
  );
}
