import React, { useEffect, useState } from 'react';
import { Film, Plus, FileEdit, Trash2, Check, AlertCircle, Upload, Eye, EyeOff, Loader2, Link, Save, HelpCircle, X } from 'lucide-react';
import { CustomMovie, CATEGORIES, Profile } from '../types';

interface AdminMoviesProps {
  token: string;
  currentUser: Profile;
  onNavigate: (path: string) => void;
  initialFilter?: 'all' | 'published' | 'draft' | 'hidden';
  onFilterChange?: (filter: 'all' | 'published' | 'draft' | 'hidden') => void;
}

export default function AdminMovies({ token, currentUser, onNavigate, initialFilter = 'all', onFilterChange }: AdminMoviesProps) {
  const [movies, setMovies] = useState<CustomMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'hidden'>(initialFilter);

  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [category, setCategory] = useState<string>('Action');
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [sceneImages, setSceneImages] = useState<string[]>([]);
  const [downloadRedirectUrl, setDownloadRedirectUrl] = useState('');
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const [status, setStatus] = useState<'draft' | 'published' | 'hidden'>('draft');

  // Asset upload load states
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [uploadingScenes, setUploadingScenes] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/movies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync catalog');
      }
      setMovies(data);
      // Dispatch real-time statistics update trigger
      window.dispatchEvent(new Event('movies_changed'));
    } catch (err: any) {
      setError(err.message || 'Error fetching movies.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPublish = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/movies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'published' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish movie');
      }
      setSuccess(`"${data.title}" has been successfully published live!`);
      fetchMovies();
    } catch (err: any) {
      setError(err.message || 'Quick publish failed.');
    }
  };

  const handleEdit = (movie: CustomMovie) => {
    setEditId(movie.id);
    setTitle(movie.title);
    setDescription(movie.description);
    setGenre(movie.genre);
    setCategory(movie.category);
    setPosterUrl(movie.poster_url);
    setBackdropUrl(movie.backdrop_url);
    setSceneImages(movie.scene_images || []);
    setDownloadRedirectUrl(movie.download_redirect_url || '');
    setDownloadEnabled(movie.download_enabled);
    setStatus(movie.status);
    setIsEditing(true);
    setError('');
  };

  const handleCreateNew = () => {
    setEditId(null);
    setTitle('');
    setDescription('');
    setGenre('');
    setCategory('Action');
    setPosterUrl('');
    setBackdropUrl('');
    setSceneImages([]);
    setDownloadRedirectUrl('');
    setDownloadEnabled(true);
    setStatus('draft');
    setIsEditing(true);
    setError('');
  };

  // Upload image pipeline
  const processImageUpload = async (file: File, folder: 'posters' | 'backdrops' | 'scene-images') => {
    return new Promise<string>((resolve, reject) => {
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
              folder
            })
          });
          const data = await res.json();
          if (!res.ok) {
            reject(new Error(data.error || 'Upload aborted.'));
            return;
          }
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('FileReader decoding failed.'));
    });
  };

  const handlePosterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPoster(true);
    setError('');
    try {
      const url = await processImageUpload(file, 'posters');
      setPosterUrl(url);
      setSuccess('Movie poster uploaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Movie poster upload error.');
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleBackdropFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBackdrop(true);
    setError('');
    try {
      const url = await processImageUpload(file, 'backdrops');
      setBackdropUrl(url);
      setSuccess('Cinema backdrop uploaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Backdrop upload error.');
    } finally {
      setUploadingBackdrop(false);
    }
  };

  const handleScenesFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingScenes(true);
    setError('');
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await processImageUpload(files[i], 'scene-images');
        uploadedUrls.push(url);
      }
      setSceneImages(prev => [...prev, ...uploadedUrls]);
      setSuccess('Screenshots imported successfully.');
    } catch (err: any) {
      setError(err.message || 'Scene uploads error.');
    } finally {
      setUploadingScenes(false);
    }
  };

  const removeSceneImage = (indexToRemove: number) => {
    setSceneImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDelete = async (id: string, movieTitle: string) => {
    setError('');
    setSuccess('');
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/movies/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Deletion failed.');
      }
      setMovies(prev => prev.filter(m => m.id !== id));
      setSuccess('Movie deleted from database.');
    } catch (err: any) {
      setError(err.message || 'Delete operation error.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !description || !genre || !category) {
      setError('Title, description, genre and category cannot remain empty.');
      return;
    }

    const payload = {
      title,
      description,
      genre,
      category,
      poster_url: posterUrl,
      backdrop_url: backdropUrl,
      scene_images: sceneImages,
      download_redirect_url: downloadRedirectUrl,
      download_enabled: downloadEnabled,
      status
    };

    setLoading(true);
    try {
      const url = editId ? `/api/movies/${editId}` : '/api/movies';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Form submission aborted.');
      }

      setSuccess(editId ? `"${title}" updated successfully.` : `"${title}" added successfully.`);
      setIsEditing(false);
      fetchMovies();
    } catch (err: any) {
      setError(err.message || 'Saving movie failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="admin-movies-container" className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#000000]/5 dark:border-white/5 pb-5 select-none">
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-800 dark:text-neutral-50 tracking-tight flex items-center gap-2">
            <Film className="w-6 h-6 text-rose-500 dark:text-violet-400" /> Movies Library CMS
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Design movie brochures, customize storage targets, configure high-speed download gates.
          </p>
        </div>
        {!isEditing && (
          <button
            id="cms-create-movie-btn"
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-neutral-550 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 dark:bg-violet-600 dark:hover:bg-violet-500 active:scale-97 cursor-pointer transition-all shadow-md shadow-rose-500/10 dark:shadow-violet-600/10"
          >
            <Plus className="w-4 h-4" /> Add Catalog Movie
          </button>
        )}
      </div>

      {error && (
        <div id="cms-error-banner" className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="cms-success-banner" className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <Check className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {isEditing ? (
        /* EDIT FORM */
        <form onSubmit={handleSubmit} id="movie-cms-edit-form" className="bg-slate-100/50 dark:bg-[#1B1B2A]/70 backdrop-blur-md rounded-2xl p-5 md:p-8 border border-neutral-200 dark:border-white/5 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-white/5 select-none">
            <h3 className="text-md font-bold text-neutral-800 dark:text-neutral-200 capitalize">
              {editId ? 'Modify Movie Archive' : 'Draft New Movie Index'}
            </h3>
            <button
              id="cms-cancel-edit-btn"
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column A: Metadata information */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Movie Title</label>
                <input
                  id="form_title_input"
                  type="text"
                  required
                  placeholder="e.g. Inception"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-neutral-800 dark:text-white focus:outline-none focus:border-rose-500 dark:focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Detailed Synopsis (Description)</label>
                <textarea
                  id="form_description_input"
                  rows={4}
                  required
                  placeholder="Insert storyline summaries, staff listings, cinematic details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-neutral-800 dark:text-white focus:outline-none focus:border-rose-500 dark:focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Genre tags</label>
                  <input
                    id="form_genre_input"
                    type="text"
                    required
                    placeholder="e.g. Mystery, Thriller"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-neutral-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Section Category</label>
                  <select
                    id="form_category_select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-neutral-800 dark:text-white focus:outline-none focus:border-rose-500 dark:focus:border-violet-500 cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/5">
                <h4 className="text-xs font-bold uppercase text-neutral-500 select-none">High-Speed Download Settings</h4>
                
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-[#121223]/50 rounded-xl border border-neutral-200 dark:border-white/5 select-none">
                  <div>
                    <span className="block text-xs font-bold text-neutral-700 dark:text-neutral-200">Enable Download Gate</span>
                    <span className="text-[10px] text-neutral-400">Toggles visibility of download button for subscribers.</span>
                  </div>
                  <button
                    id="form_download_enabled_toggle"
                    type="button"
                    onClick={() => setDownloadEnabled(!downloadEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      downloadEnabled ? 'bg-rose-500 dark:bg-violet-600' : 'bg-neutral-300 dark:bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        downloadEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Redirect Speed-Gate URL</label>
                  <div className="relative">
                    <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      id="form_download_url_input"
                      type="url"
                      placeholder="https://gdrive.example.com/file-index"
                      value={downloadRedirectUrl}
                      onChange={(e) => setDownloadRedirectUrl(e.target.value)}
                      className="w-full bg-white dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-800 dark:text-white"
                    />
                  </div>
                  <span className="inline-block mt-1 text-[10px] text-neutral-400 select-none">
                    * Make sure URL prefix is fully qualified (starts with http/https)
                  </span>
                </div>
              </div>
            </div>

            {/* Column B: Asset uploading layout */}
            <div className="space-y-4">
              
              {/* Poster Upload file picker */}
              <div className="p-4 bg-white dark:bg-[#121223]/50 rounded-xl border border-neutral-200 dark:border-white/5 space-y-2">
                <label className="block text-xs font-bold uppercase text-neutral-500">Movie Poster</label>
                <div className="flex gap-4 items-center">
                  <div className="relative w-16 h-24 rounded-lg bg-neutral-200 dark:bg-[#0A0A10] overflow-hidden shrink-0 border border-neutral-300 dark:border-white/5 flex items-center justify-center">
                    {posterUrl ? (
                      <img referrerPolicy="no-referrer" src={posterUrl} alt="Poster preview" className="w-[64px] h-[96px] object-cover" />
                    ) : (
                      <Film className="w-6 h-6 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="relative flex items-center bg-rose-500/10 hover:bg-rose-500/20 dark:bg-violet-600/10 dark:hover:bg-violet-600/20 text-rose-500 dark:text-violet-400 text-xs px-4 py-2.5 rounded-lg font-bold border border-rose-500/20 dark:border-violet-500/20 cursor-pointer justify-center">
                      <Upload className="w-4 h-4 mr-1.5" />
                      <span>{uploadingPoster ? 'Uploading...' : 'Upload Poster Image'}</span>
                      <input
                        id="form_poster_file_input"
                        type="file"
                        accept="image/*"
                        onChange={handlePosterFile}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={uploadingPoster}
                      />
                    </div>
                    <span className="block text-[10px] text-neutral-400">Supported formats: png, jpg, webp, jpeg</span>
                  </div>
                </div>
              </div>

              {/* Backdrop Upload file picker */}
              <div className="p-4 bg-white dark:bg-[#121223]/50 rounded-xl border border-neutral-200 dark:border-white/5 space-y-2">
                <label className="block text-xs font-bold uppercase text-neutral-500">Cinema Wide Backdrop</label>
                <div className="flex gap-4 items-center">
                  <div className="relative w-28 h-16 rounded-lg bg-neutral-200 dark:bg-[#0A0A10] overflow-hidden shrink-0 border border-neutral-300 dark:border-white/5 flex items-center justify-center">
                    {backdropUrl ? (
                      <img referrerPolicy="no-referrer" src={backdropUrl} alt="Backdrop preview" className="w-[112px] h-[64px] object-cover" />
                    ) : (
                      <Film className="w-6 h-6 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="relative flex items-center bg-rose-500/10 hover:bg-rose-500/20 dark:bg-violet-600/10 dark:hover:bg-violet-600/20 text-rose-500 dark:text-violet-400 text-xs px-4 py-2.5 rounded-lg font-bold border border-rose-500/20 dark:border-violet-500/20 cursor-pointer justify-center">
                      <Upload className="w-4 h-4 mr-1.5" />
                      <span>{uploadingBackdrop ? 'Uploading...' : 'Upload Wide Backdrop'}</span>
                      <input
                        id="form_backdrop_file_input"
                        type="file"
                        accept="image/*"
                        onChange={handleBackdropFile}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={uploadingBackdrop}
                      />
                    </div>
                    <span className="block text-[10px] text-neutral-400">Aspect layout ratio: 16:9 recommended</span>
                  </div>
                </div>
              </div>

              {/* Multiple Scene snap Upload */}
              <div className="p-4 bg-white dark:bg-[#121223]/50 rounded-xl border border-neutral-200 dark:border-white/5 space-y-3">
                <label className="block text-xs font-bold uppercase text-neutral-500">Scene Screenshots Collection</label>
                
                <div className="relative flex items-center bg-black/10 dark:bg-[#121223]/30 text-xs py-3.5 rounded-xl font-bold border border-dashed border-neutral-300 dark:border-white/10 cursor-pointer justify-center hover:bg-black/15 transition-colors">
                  <Upload className="w-5 h-5 mr-2 text-neutral-400" />
                  <span className="text-neutral-500 dark:text-neutral-300">{uploadingScenes ? 'Importing assets...' : 'Upload Scene Screenshots (Multi)'}</span>
                  <input
                    id="form_scenes_file_input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleScenesFiles}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploadingScenes}
                  />
                </div>

                {/* Previews wrap flex */}
                {sceneImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {sceneImages.map((srcImg, idx) => (
                      <div key={idx} className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10 group">
                        <img referrerPolicy="no-referrer" src={srcImg} alt="Scene thumbnail" className="w-full h-full object-cover" />
                        <button
                          id={`remove-scene-${idx}`}
                          type="button"
                          onClick={() => removeSceneImage(idx)}
                          className="absolute -top-1 -right-1 p-1 bg-[#EE0000] text-white rounded-full cursor-pointer hover:bg-rose-700 shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Editing publishing state */}
              <div className="p-4 bg-white dark:bg-[#121223]/50 rounded-xl border border-neutral-200 dark:border-white/5 space-y-2 select-none">
                <label className="block text-xs font-bold uppercase text-neutral-500">Publishing Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['draft', 'published', 'hidden'] as const).map(item => (
                    <button
                      key={item}
                      id={`form-status-${item}`}
                      type="button"
                      onClick={() => setStatus(item)}
                      className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                        status === item
                          ? 'bg-rose-500/15 border-rose-500 text-rose-500 dark:bg-violet-600/10 dark:border-violet-500 dark:text-violet-400 hover:opacity-90'
                          : 'bg-black/5 dark:bg-transparent border-neutral-200 dark:border-white/5 text-neutral-400 hover:bg-black/10'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

          <div className="pt-4 border-t border-neutral-200 dark:border-white/5 flex items-center justify-end gap-3 select-none">
            <button
              id="cms-cancel-submit-btn"
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-white/10 text-neutral-500 dark:text-neutral-400 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="cms-submit-movie-btn"
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 dark:bg-violet-600 dark:hover:bg-violet-500 active:scale-97 cursor-pointer transition-colors shadow-md shadow-rose-500/10 dark:shadow-violet-600/10"
            >
              <Save className="w-4 h-4" /> Save Movie Record
            </button>
          </div>
        </form>
      ) : (
        /* CATALOG LIST DISPLAY WITH TABS AND TABLE */
        <div className="space-y-4">
          
          {/* Segmented Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/30 dark:bg-[#1B1B2A]/50 p-2 rounded-2xl border border-neutral-200 dark:border-white/5 backdrop-blur-md select-none">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'published', 'draft', 'hidden'] as const).map(filter => {
                const isActive = statusFilter === filter;
                const count = movies.filter(m => filter === 'all' || m.status === filter).length;
                return (
                  <button
                    key={filter}
                    id={`filter-tab-${filter}`}
                    type="button"
                    onClick={() => {
                      setStatusFilter(filter);
                      onFilterChange?.(filter);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-brand-accent/15 border border-brand-accent/25 text-brand-accent shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                        : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-450 dark:hover:text-neutral-100 border border-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-850/50'
                    }`}
                  >
                    {filter} ({count})
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 px-2">
              Showing {movies.filter(m => statusFilter === 'all' || m.status === statusFilter).length} of {movies.length} records
            </div>
          </div>

          <div className="bg-slate-100/50 dark:bg-[#1B1B2A]/70 backdrop-blur-md border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden shadow">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-400 select-none">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-brand-accent" />
                <span>Fetching dynamic movies catalog...</span>
              </div>
            ) : movies.filter(m => statusFilter === 'all' || m.status === statusFilter).length === 0 ? (
              <div className="p-12 text-center text-neutral-500 select-none">
                <Film className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                <h4 className="text-md font-bold text-neutral-800 dark:text-neutral-300">No movies found in this section</h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  Try selecting another filter tag or click "Add Catalog Movie" at the top right to register dynamic cinema records.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto min-w-full">
                <table id="movies-catalog-table" className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-white/5 text-left text-neutral-500 uppercase tracking-wider text-[11px] font-black select-none">
                      <th className="px-5 py-4">Title & Poster</th>
                      <th className="px-5 py-4">Category</th>
                      <th className="px-5 py-4">Genre Tag</th>
                      <th className="px-5 py-4">Download Status</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-white/5">
                    {movies
                      .filter(m => statusFilter === 'all' || m.status === statusFilter)
                      .map(movie => (
                        <tr key={movie.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="px-5 py-4 flex items-center gap-3.5">
                            <div className="w-10 h-14 rounded bg-neutral-200 dark:bg-black overflow-hidden shrink-0 border border-neutral-300 dark:border-white/10 font-mono text-[9px] text-neutral-500 flex items-center justify-center">
                              {movie.poster_url ? (
                                <img referrerPolicy="no-referrer" src={movie.poster_url} alt="Cover preview" className="w-[40px] h-[56px] object-cover" />
                              ) : (
                                'N/A'
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-neutral-800 dark:text-neutral-100 truncate">{movie.title}</p>
                              <span className="text-[10px] font-mono text-neutral-400 block truncate">ID: {movie.id.substring(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 select-none">
                            <span className="inline-block px-2 py-0.5 text-xs font-bold border border-neutral-200 dark:border-white/5 text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5 rounded-lg">
                              {movie.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-neutral-600 dark:text-neutral-300 truncate max-w-[150px]">{movie.genre}</td>
                          <td className="px-5 py-4 select-none">
                            {movie.download_enabled && movie.download_redirect_url ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-emerald-550 text-emerald-550 dark:text-emerald-400 text-xs font-bold">
                                  • Gate Active
                                </span>
                                <span className="block text-[10px] text-neutral-400 truncate max-w-[120px] font-mono">
                                  {movie.download_redirect_url}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-xs font-bold">Offline / Disabled</span>
                            )}
                          </td>
                          <td className="px-5 py-4 uppercase font-black text-[10px] tracking-wider select-none">
                            {movie.status === 'published' && <span className="text-emerald-500">Published</span>}
                            {movie.status === 'draft' && <span className="text-yellow-500">Draft</span>}
                            {movie.status === 'hidden' && <span className="text-neutral-400">Hidden</span>}
                          </td>
                          <td className="px-5 py-4 select-none">
                            {confirmDeleteId === movie.id ? (
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] text-rose-500 font-bold uppercase">Are you sure?</span>
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleDelete(movie.id, movie.title)}
                                    className="px-2 py-1 bg-rose-500 text-white rounded text-[10px] font-bold hover:bg-rose-600 transition-colors"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded text-[10px] font-bold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                {movie.status !== 'published' && (
                                  <button
                                    id={`actions-publish-${movie.id}`}
                                    onClick={() => handleQuickPublish(movie.id)}
                                    className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-550 dark:text-emerald-400 transition-all cursor-pointer hover:scale-110 duration-150"
                                    title="Quick Publish Live"
                                  >
                                    <Check className="w-4 h-4 text-emerald-550 dark:text-emerald-400 font-black" />
                                  </button>
                                )}
                                <button
                                  id={`actions-edit-${movie.id}`}
                                  onClick={() => handleEdit(movie)}
                                  className="p-1.5 rounded-lg hover:bg-brand-accent/10 text-brand-accent transition-colors cursor-pointer"
                                  title="Edit Record"
                                >
                                  <FileEdit className="w-4 h-4" />
                                </button>
                                {currentUser.role !== 'moderator' && (
                                  <button
                                    id={`actions-delete-${movie.id}`}
                                    onClick={() => setConfirmDeleteId(movie.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 dark:text-red-400 transition-colors cursor-pointer"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
