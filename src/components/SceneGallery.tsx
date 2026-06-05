import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2, AlertCircle } from 'lucide-react';

interface SceneGalleryProps {
  images: string[];
}

export default function SceneGallery({ images }: SceneGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handlePrevLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const handleNextLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex < images.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div id="no-scene-images" className="flex flex-col items-center justify-center p-8 bg-neutral-900/10 dark:bg-black/10 border border-dashed border-neutral-200 dark:border-white/5 rounded-2xl text-center select-none">
        <AlertCircle className="w-8 h-8 text-neutral-400 mb-2" />
        <h4 className="text-sm font-semibold text-neutral-500">No scene snapshots available</h4>
        <p className="text-xs text-neutral-400">Admin hasn't uploaded any cinematic previews.</p>
      </div>
    );
  }

  return (
    <div id="scene-image-gallery-container" className="relative space-y-3 group select-none">
      
      {/* Scroll Controls (Desktop only) */}
      <button
        id="scroll-gallery-left-btn"
        onClick={scrollLeft}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#000000]/60 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 dark:group-hover:opacity-100 transition-opacity duration-300 z-10 cursor-pointer hover:bg-neutral-900"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        id="scroll-gallery-right-btn"
        onClick={scrollRight}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#000000]/60 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 dark:group-hover:opacity-100 transition-opacity duration-300 z-10 cursor-pointer hover:bg-neutral-900"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Interactive horizontal list */}
      <div
        ref={containerRef}
        id="scene-photos-slider"
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            onClick={() => setLightboxIndex(idx)}
            className="flex-none w-[260px] sm:w-[320px] aspect-video bg-neutral-900 rounded-xl overflow-hidden cursor-pointer relative group/item border border-black/10 dark:border-white/5 shadow"
          >
            <img
              referrerPolicy="no-referrer"
              src={img}
              alt={`Scene snapshot ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-102"
              loading="lazy"
            />
            
            {/* View full-screen overlay click */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
              <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white transform translate-y-2 group-hover/item:translate-y-0 transition-transform">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-[10px] text-neutral-400 sm:hidden">
        Swipe horizontally to view scene snapshot details
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxIndex !== null && (
        <div
          id="scene-lightbox-backdrop"
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 bg-[#07070F]/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn"
        >
          {/* Close trigger */}
          <button
            id="close-lightbox-btn"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 dark:bg-black/30 text-white cursor-pointer hover:bg-white/20 border border-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Left Arrow */}
          {lightboxIndex > 0 && (
            <button
              id="prev-lightbox-photo"
              onClick={handlePrevLightbox}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/45 border border-white/10 text-white cursor-pointer hover:bg-black/60 transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Right Arrow */}
          {lightboxIndex < images.length - 1 && (
            <button
              id="next-lightbox-photo"
              onClick={handleNextLightbox}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/45 border border-white/10 text-white cursor-pointer hover:bg-black/60 transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Large Image Frame */}
          <div
            id="lightbox-content"
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-full max-h-[85vh] rounded-2xl overflow-hidden border border-white/15 shadow-2xl flex flex-col justify-center bg-black/5"
          >
            <img
              referrerPolicy="no-referrer"
              src={images[lightboxIndex]}
              alt={`Fullscreen snapshot ${lightboxIndex + 1}`}
              className="object-contain max-h-[80vh] w-auto max-w-[90vw]"
            />
            {/* Index Label */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-[#000000]/60 border border-white/10 text-xs font-semibold text-neutral-300 font-mono">
              Screenshot {lightboxIndex + 1} of {images.length}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
