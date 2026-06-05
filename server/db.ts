import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Profile, CustomMovie, SiteSettings, UserRole, UserStatus, MovieRequest, DownloadAnalytics, ActivityLog, AdminNotification } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const DOWNLOADS_FILE = path.join(DATA_DIR, 'downloads.json');

// Interface for database records on disk (with passwords)
export interface UserRecord extends Profile {
  password_hash: string;
  password_salt: string;
  verification_code?: string;
  verification_expires_at?: number;
  reset_token?: string;
  reset_token_expires_at?: number;
}

// In-memory active session token cache linked to users
interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

// Ensure database directories are initialized
export function initializeDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Create upload folders
  const paths = [
    UPLOADS_DIR,
    path.join(UPLOADS_DIR, 'posters'),
    path.join(UPLOADS_DIR, 'backdrops'),
    path.join(UPLOADS_DIR, 'scene-images'),
    path.join(UPLOADS_DIR, 'avatars')
  ];
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }

  // Set default databases if empty
  if (!fs.existsSync(PROFILES_FILE)) {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(MOVIES_FILE)) {
    fs.writeFileSync(MOVIES_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings: SiteSettings = {
      site_name: "CineVault",
      site_logo: "",
      branding_color: "violet", // indigo, rose, emerald, violet, cyan, etc.
      default_theme: "dark"
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
  }

  if (!fs.existsSync(ANALYTICS_FILE)) {
    const defaultAnalytics = {
      pageViews: 147,
      uniqueVisitors: []
    };
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(defaultAnalytics, null, 2));
  }

  if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(ACTIVITIES_FILE)) {
    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(DOWNLOADS_FILE)) {
    const defaultDownloads: DownloadAnalytics = {
      totalClicks: 0,
      movieClicks: {},
      dailyClicks: {}
    };
    fs.writeFileSync(DOWNLOADS_FILE, JSON.stringify(defaultDownloads, null, 2));
  }

  console.log("Database and storage directories verified successfully.");
}

// Utility file-writer with atomic rename safety
function writeJsonAtomic(filePath: string, data: any) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filePath);
}

// SECURITY FUNCTIONS
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return testHash === hash;
}

// SETTINGS ACTIONS
export function getSettings(): SiteSettings {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch (err) {
    return {
      site_name: "CineVault",
      site_logo: "",
      branding_color: "violet",
      default_theme: "dark"
    };
  }
}

export function updateSettings(settings: Partial<SiteSettings>): SiteSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  writeJsonAtomic(SETTINGS_FILE, updated);
  return updated;
}

// PROFILE ACTIONS
export function getProfilesOnDisk(): UserRecord[] {
  try {
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

export function saveProfiles(profiles: UserRecord[]) {
  writeJsonAtomic(PROFILES_FILE, profiles);
}

export function createProfile(username: string, email: string, password_plain: string, roleOverride?: UserRole): Profile {
  const profiles = getProfilesOnDisk();
  
  // Rules check: First user ever becomes Super Admin, all future users become User
  let role: UserRole = 'user';
  if (profiles.length === 0) {
    role = 'super_admin';
  } else if (roleOverride) {
    role = roleOverride;
  }

  const { hash, salt } = hashPassword(password_plain);
  const id = crypto.randomUUID();
  
  // Normal users need email verification; super_admin is pre-verified
  const isVerified = role === 'super_admin';
  const vCode = isVerified ? undefined : Math.floor(100000 + Math.random() * 900000).toString();
  const vExpires = isVerified ? undefined : Date.now() + 60 * 60 * 1000;

  const newProfile: UserRecord = {
    id,
    username,
    email,
    role,
    status: 'active',
    created_at: new Date().toISOString(),
    password_hash: hash,
    password_salt: salt,
    avatar_url: "",
    is_verified: isVerified,
    verification_code: vCode,
    verification_expires_at: vExpires
  };

  profiles.push(newProfile);
  saveProfiles(profiles);

  // Return non-sensitive profile
  const { password_hash, password_salt, ...cleanProfile } = newProfile;
  return cleanProfile;
}

// MOVIES ACTIONS
export function getMovies(): CustomMovie[] {
  try {
    return JSON.parse(fs.readFileSync(MOVIES_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

export function saveMovies(movies: CustomMovie[]) {
  writeJsonAtomic(MOVIES_FILE, movies);
}

// SESSION MANAGEMENT
export function getSessions(): SessionRecord[] {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

export function saveSessions(sessions: SessionRecord[]) {
  writeJsonAtomic(SESSIONS_FILE, sessions);
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const sessions = getSessions();
  
  // 30 days expiration
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
  
  sessions.push({ token, userId, expiresAt });
  saveSessions(sessions);
  return token;
}

export function getSessionProfile(token: string): Profile | null {
  const sessions = getSessions();
  const now = Date.now();
  const index = sessions.findIndex(s => s.token === token);
  
  if (index === -1) return null;
  const session = sessions[index];
  
  if (session.expiresAt < now) {
    // Expired - clean it up
    sessions.splice(index, 1);
    saveSessions(sessions);
    return null;
  }

  // Load profile
  const profiles = getProfilesOnDisk();
  const profile = profiles.find(p => p.id === session.userId);
  if (!profile) return null;

  if (profile.status === 'suspended') {
    return null; // Don't allow active session for suspended user
  }

  const { password_hash, password_salt, ...cleanProfile } = profile;
  return cleanProfile;
}

export function destroySession(token: string) {
  const sessions = getSessions();
  const updated = sessions.filter(s => s.token !== token);
  saveSessions(updated);
}

export interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: string[];
}

export function getAnalytics(): AnalyticsData {
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
  } catch (err) {
    return { pageViews: 147, uniqueVisitors: [] };
  }
}

export function registerPageView(ipAddress: string) {
  try {
    const current = getAnalytics() as any;
    current.pageViews = (current.pageViews || 0) + 1;
    
    const cleanIp = ipAddress || 'unknown-device';
    if (!current.uniqueVisitors) current.uniqueVisitors = [];
    if (!current.uniqueVisitors.includes(cleanIp)) {
      current.uniqueVisitors.push(cleanIp);
    }
    
    // Track date-wise page views for traffic charts
    const today = new Date().toISOString().split('T')[0];
    if (!current.dailyViews) current.dailyViews = {};
    current.dailyViews[today] = (current.dailyViews[today] || 0) + 1;
    
    writeJsonAtomic(ANALYTICS_FILE, current);
  } catch (err) {
    console.error("Failed to update page views: ", err);
  }
}

// ==================== NEW PHASE 2 FUNCTIONS ====================

// MOVIE REQUESTS
export function getRequests(): MovieRequest[] {
  try {
    return JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

export function saveRequests(requests: MovieRequest[]) {
  writeJsonAtomic(REQUESTS_FILE, requests);
}

// IN-APP ADMIN NOTIFICATIONS
export function getNotifications(): AdminNotification[] {
  try {
    return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

export function saveNotifications(notifications: AdminNotification[]) {
  writeJsonAtomic(NOTIFICATIONS_FILE, notifications);
}

export function addNotification(type: 'signup' | 'request' | 'role_change' | 'moderator_add', title: string, message: string) {
  try {
    const notifications = getNotifications();
    const notification: AdminNotification = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      read: false,
      created_at: new Date().toISOString()
    };
    notifications.unshift(notification);
    saveNotifications(notifications.slice(0, 100)); // cap at 100
  } catch (err) {
    console.error("Failed to add notification:", err);
  }
}

// ACTIVITY LOGGING
export function getActivities(): ActivityLog[] {
  try {
    return JSON.parse(fs.readFileSync(ACTIVITIES_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

export function saveActivities(activities: ActivityLog[]) {
  writeJsonAtomic(ACTIVITIES_FILE, activities);
}

export function addActivityLog(userId: string, username: string, email: string, action: string, details: string) {
  try {
    const activities = getActivities();
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      userId,
      username,
      email,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    activities.unshift(log);
    saveActivities(activities.slice(0, 500)); // cap at 500
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

// DOWNLOAD TRACKING & METRICS
export function getDownloads(): DownloadAnalytics {
  try {
    return JSON.parse(fs.readFileSync(DOWNLOADS_FILE, 'utf-8'));
  } catch (err) {
    return {
      totalClicks: 0,
      movieClicks: {},
      dailyClicks: {}
    };
  }
}

export function saveDownloads(downloads: DownloadAnalytics) {
  writeJsonAtomic(DOWNLOADS_FILE, downloads);
}

export function registerDownloadClick(movieId: string) {
  try {
    const downloads = getDownloads();
    downloads.totalClicks = (downloads.totalClicks || 0) + 1;
    
    if (!downloads.movieClicks) downloads.movieClicks = {};
    downloads.movieClicks[movieId] = (downloads.movieClicks[movieId] || 0) + 1;
    
    // Day-wise downloads tracking for time charts
    const today = new Date().toISOString().split('T')[0];
    if (!downloads.dailyClicks) downloads.dailyClicks = {};
    downloads.dailyClicks[today] = (downloads.dailyClicks[today] || 0) + 1;
    
    downloads.lastClickTimestamp = new Date().toISOString();
    
    saveDownloads(downloads);
  } catch (err) {
    console.error("Failed to register download click:", err);
  }
}

