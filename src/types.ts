/**
 * Shared Type Definitions for Movie Platform with Admin CMS
 */

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'user';
export type UserStatus = 'active' | 'suspended';
export type MovieStatus = 'draft' | 'published' | 'hidden';

export interface Profile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  avatar_url?: string;
  is_verified?: boolean;
}

export interface CustomMovie {
  id: string;
  title: string;
  description: string;
  genre: string;
  category: string;
  poster_url: string;
  backdrop_url: string;
  scene_images: string[]; // paths or base64 data URLs
  download_redirect_url: string;
  download_enabled: boolean;
  status: MovieStatus;
  created_at: string;
}

export interface SiteSettings {
  site_name: string;
  site_logo: string; // URL or base64 SVG
  branding_color: string; // Tailwind class color preset
  default_theme: 'dark' | 'light';
}

export interface SessionData {
  token: string;
  user: Profile;
}

export interface MovieRequest {
  id: string;
  title: string;
  year: string;
  message?: string;
  userId: string;
  username: string;
  email: string;
  status: 'pending' | 'uploaded' | 'rejected';
  created_at: string;
}

export interface DownloadMetric {
  movieId: string;
  movieTitle: string;
  clicks: number;
}

export interface DownloadAnalytics {
  totalClicks: number;
  movieClicks: Record<string, number>; // movieId -> count
  dailyClicks: Record<string, number>; // YYYY-MM-DD -> count
  lastClickTimestamp?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  email: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AdminNotification {
  id: string;
  type: 'signup' | 'request' | 'role_change' | 'moderator_add';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export const CATEGORIES = [
  'Action',
  'Comedy',
  'Horror',
  'Drama',
  'Sci-Fi',
  'Romance',
  'Thriller',
  'Animation',
  'Fantasy'
] as const;

export type CategoryType = typeof CATEGORIES[number];

