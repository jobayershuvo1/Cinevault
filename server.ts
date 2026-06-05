import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import {
  initializeDb,
  getSettings,
  updateSettings,
  getProfilesOnDisk,
  createProfile,
  getMovies,
  saveMovies,
  getSessionProfile,
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  saveProfiles,
  UserRecord,
  registerPageView,
  getAnalytics,
  getRequests,
  saveRequests,
  getNotifications,
  saveNotifications,
  addNotification,
  getActivities,
  saveActivities,
  addActivityLog,
  getDownloads,
  saveDownloads,
  registerDownloadClick
} from "./server/db";
import { CustomMovie, Profile, UserRole, CATEGORIES, MovieRequest, DownloadAnalytics, ActivityLog, AdminNotification } from "./src/types";

// Start DB directories setup
initializeDb();

const app = express();
const PORT = 3000;

// Track active clients in memory for real-time live counters
const activeClients = new Map<string, number>();

// In-memory cache for speed optimizations (CMS caching)
let cachedMoviesAdmin: CustomMovie[] | null = null;
let cachedMoviesPublic: CustomMovie[] | null = null;

function invalidateMovieCache() {
  cachedMoviesAdmin = null;
  cachedMoviesPublic = null;
}

// SMTP credentials and nodemailer setup
const smtpUser = "jobayeribnjahir@gmail.com";
const smtpPass = "vamrxozstcxjxqfg";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

async function sendNotificationEmail(to: string, subject: string, text: string, html: string) {
  if (!smtpUser || !smtpPass) {
    console.log(`⚠️ SMTP credentials not set. Simulating mail send to: [${to}] Subject: [${subject}]`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"CineVault Alert" <${smtpUser}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`✉️ Real Email transmitted successfully to: ${to}`);
  } catch (err: any) {
    console.error(`❌ SMTP mail transmit failed to ${to}:`, err.message || err);
  }
}

// Increase body sizes for base64 image uploads
app.use(express.json({ limit: "64mb" }));
app.use(express.urlencoded({ limit: "64mb", extended: true }));

// Serve uploaded movie images statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// AUTHENTICATION MIDDLEWARE
interface AuthRequest extends Request {
  user?: Profile;
}

const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const profile = getSessionProfile(token);
    if (profile) {
      req.user = profile;
    }
  }
  next();
};

const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(411).json({ error: "No authorization token provided" });
    return;
  }
  const token = authHeader.substring(7);
  const profile = getSessionProfile(token);
  if (!profile) {
    res.status(401).json({ error: "Session expired or invalid" });
    return;
  }
  req.user = profile;
  next();
};

const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: Insufficient privileges" });
      return;
    }
    next();
  };
};

// ==================== API ENDPOINTS ====================

// 1. First-time setup configuration status
app.get("/api/setup/status", (req: Request, res: Response) => {
  const profiles = getProfilesOnDisk();
  res.json({ hasAdmin: profiles.length > 0 });
});

// Setup registration endpoint
app.post("/api/setup/register", (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const profiles = getProfilesOnDisk();
  if (profiles.length > 0) {
    res.status(400).json({ error: "Setup already completed" });
    return;
  }

  try {
    // Creating first account automatically as 'super_admin'
    const profile = createProfile(username, email, password, "super_admin");
    const token = createSession(profile.id);
    res.json({ user: profile, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to finalize first-time setup" });
  }
});

// 2. Authentication Portal
app.post("/api/auth/register", (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const profiles = getProfilesOnDisk();
  const emailExists = profiles.some(p => p.email.toLowerCase() === email.toLowerCase());
  const usernameExists = profiles.some(p => p.username.toLowerCase() === username.toLowerCase());

  if (emailExists) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  if (usernameExists) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  try {
    const profile = createProfile(username, email, password);
    
    // Retrieve full record to fetch verification token
    const fullProfiles = getProfilesOnDisk();
    const updatedUser = fullProfiles.find(p => p.id === profile.id);

    if (updatedUser && updatedUser.verification_code) {
      const code = updatedUser.verification_code;
      console.log(`\n\n=========================================`);
      console.log(`✉️ REGISTER EMAIL CODE FOR ${email}: ${code}`);
      console.log(`=========================================\n\n`);

      const subject = "Verify your CineVault Account Registration";
      const text = `Welcome to CineVault, ${username}! Your 6-digit confirmation code is: ${code}`;
      const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
          <h2 style="color: #6d28d9;">Welcome to CineVault, ${username}!</h2>
          <p>Thank you for signing up. Please enter the following 6-digit confirmation code to verify your email address:</p>
          <div style="display: inline-block; font-size: 28px; font-weight: bold; padding: 12px 24px; background-color: #f3f4f6; border-radius: 8px; margin: 15px 0; color: #6d28d9; letter-spacing: 3px;">
            ${code}
          </div>
          <p style="font-size: 14px; color: #6b7280;">This verification code will expire in 1 hour.</p>
        </div>
      `;

      sendNotificationEmail(email, subject, text, html);
    }

    // Write system level activity log and notification
    addActivityLog(profile.id, username, email, "user_signup", "User created account and email verification code was sent.");
    addNotification("signup", "New User Joined", `${username} (${email}) registered on the platform.`);

    const token = createSession(profile.id);
    res.json({ user: profile, token });
  } catch (err: any) {
    console.error("Registration failed:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

const active2FASessions = new Map<string, { code: string, profileId: string, expiresAt: number }>();

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const profiles = getProfilesOnDisk();
  const profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());

  if (!profile) {
    res.status(400).json({ error: "Incorrect email or password" });
    return;
  }

  if (profile.status === "suspended") {
    res.status(403).json({ error: "This account has been suspended. Please contact support." });
    return;
  }

  const matches = verifyPassword(password, profile.password_hash, profile.password_salt);
  if (!matches) {
    res.status(400).json({ error: "Incorrect email or password" });
    return;
  }

  if (profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'moderator') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    active2FASessions.set(sessionId, {
        code,
        profileId: profile.id,
        expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`\n\n=========================================`);
    console.log(`🔑 ADMIN LOGIN 2FA CODE FOR ${profile.email}: ${code}`);
    console.log(`=========================================\n\n`);

    const smtpUser = 'jobayeribnjahir@gmail.com';
    const smtpPass = 'vamrxozstcxjxqfg';

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      try {
        await transporter.sendMail({
          from: `"CineVault Security" <${smtpUser}>`,
          to: profile.email,
          subject: "Your CineVault Admin Login Code",
          text: `Your 2FA verification code is: ${code}\nThis code will expire in 5 minutes.`,
          html: `<p>Your 2FA verification code is: <strong>${code}</strong></p><p>This code will expire in 5 minutes.</p>`
        });
        console.log(`Email sent to ${profile.email}`);
      } catch (err) {
        console.error(`Failed to send email to ${profile.email}:`, err);
        return res.status(500).json({ error: "Failed to send 2FA email. Please check your SMTP app password." });
      }
    } else {
      console.log('⚠️ SMTP_USER and SMTP_PASS environment variables are not set. Check server console for verification code.');
    }

    res.json({ 
      requires2FA: true, 
      sessionId, 
      message: smtpUser && smtpPass 
        ? "An email with a verification code has been sent." 
        : "Email settings not configured. Please check the backend server console for your code."
    });
    return;
  }

  const token = createSession(profile.id);
  const { password_hash, password_salt, ...cleanProfile } = profile;
  res.json({ user: cleanProfile, token });
});

app.post("/api/auth/verify-2fa", (req: Request, res: Response) => {
  const { sessionId, code } = req.body;
  if (!sessionId || !code) {
    res.status(400).json({ error: "Session ID and code are required" });
    return;
  }

  const session = active2FASessions.get(sessionId);
  if (!session) {
    res.status(400).json({ error: "Invalid or expired session" });
    return;
  }

  if (Date.now() > session.expiresAt) {
    active2FASessions.delete(sessionId);
    res.status(400).json({ error: "Session expired" });
    return;
  }

  if (session.code !== code) {
    res.status(400).json({ error: "Incorrect verification code" });
    return;
  }

  const profiles = getProfilesOnDisk();
  const profile = profiles.find(p => p.id === session.profileId);
  if (!profile) {
    res.status(400).json({ error: "Profile not found" });
    return;
  }

  active2FASessions.delete(sessionId);

  const token = createSession(profile.id);
  const { password_hash, password_salt, ...cleanProfile } = profile;
  res.json({ user: cleanProfile, token });
});

// Developer instant super-admin bypass login endpoint
app.post("/api/auth/dev-admin-login", (req: Request, res: Response) => {
  const profiles = getProfilesOnDisk();
  const superAdmin = profiles.find(p => p.role === "super_admin");
  if (!superAdmin) {
    res.status(404).json({ error: "No Super Admin profile was detected on disk." });
    return;
  }
  const token = createSession(superAdmin.id);
  const { password_hash, password_salt, ...cleanProfile } = superAdmin;
  res.json({ user: cleanProfile, token });
});

app.post("/api/auth/logout", requireAuth, (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    destroySession(token);
  }
  res.json({ success: true });
});

app.get("/api/auth/me", requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Password recovery API
app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const profiles = getProfilesOnDisk();
  const profileIndex = profiles.findIndex(p => p.email.toLowerCase() === email.toLowerCase());

  if (profileIndex === -1) {
    res.json({
      message: "If the email is registered, password reset instructions have been forwarded to your inbox."
    });
    return;
  }

  // Generate 6 digit reset code
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  profiles[profileIndex].reset_token = token;
  profiles[profileIndex].reset_token_expires_at = Date.now() + 15 * 60 * 1000; // 15 mins expiry
  saveProfiles(profiles);

  console.log(`\n\n=========================================`);
  console.log(`🔐 PASSWORD RESET TOKEN FOR ${email}: ${token}`);
  console.log(`=========================================\n\n`);

  const subject = "Reset your CineVault Account Password";
  const text = `You requested a password reset. Your 6-digit confirmation pin is: ${token}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
      <h2 style="color: #6d28d9;">Password Reset Request</h2>
      <p>Someone requested to reset the password for your CineVault account. Enter the following 6-digit reset code to define a new password:</p>
      <div style="display: inline-block; font-size: 28px; font-weight: bold; padding: 12px 24px; background-color: #f3f4f6; border-radius: 8px; margin: 15px 0; color: #dc2626; letter-spacing: 3px;">
        ${token}
      </div>
      <p style="font-size: 14px; color: #6b7280;">This code is valid for 15 minutes. If you did not make this request, please safely ignore this email.</p>
    </div>
  `;

  await sendNotificationEmail(email, subject, text, html);

  res.json({
    message: "If the email is registered, password reset instructions have been forwarded to your inbox."
  });
});

app.post("/api/auth/reset-password", (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    res.status(400).json({ error: "All arguments are required (email, code, newPassword)" });
    return;
  }

  const profiles = getProfilesOnDisk();
  const index = profiles.findIndex(p => p.email.toLowerCase() === email.toLowerCase());

  if (index === -1) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  const profile = profiles[index];
  if (!profile.reset_token || profile.reset_token !== code) {
    res.status(400).json({ error: "Incorrect password reset pin code" });
    return;
  }

  if (profile.reset_token_expires_at && Date.now() > profile.reset_token_expires_at) {
    res.status(400).json({ error: "Password reset token code has expired" });
    return;
  }

  // Update hash & salt
  const { hash, salt } = hashPassword(newPassword);
  profiles[index].password_hash = hash;
  profiles[index].password_salt = salt;
  profiles[index].reset_token = undefined;
  profiles[index].reset_token_expires_at = undefined;
  saveProfiles(profiles);

  addActivityLog(profile.id, profile.username, profile.email, "password_reset", "User reset password successfully via recovery pin.");

  res.json({ success: true, message: "Your password has been changed successfully. You may now login." });
});

app.post("/api/auth/verify-email", (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "Email and verification pin are required" });
    return;
  }

  const profiles = getProfilesOnDisk();
  const index = profiles.findIndex(p => p.email.toLowerCase() === email.toLowerCase());

  if (index === -1) {
    res.status(404).json({ error: "Registered account not found." });
    return;
  }

  const profile = profiles[index];
  if (profile.is_verified) {
    res.json({ success: true, message: "Account email is already verified!" });
    return;
  }

  if (!profile.verification_code || profile.verification_code !== code) {
    res.status(400).json({ error: "Invalid verification pin code" });
    return;
  }

  if (profile.verification_expires_at && Date.now() > profile.verification_expires_at) {
    res.status(400).json({ error: "Verification pin code expired. Please request a new one." });
    return;
  }

  profiles[index].is_verified = true;
  profiles[index].verification_code = undefined;
  profiles[index].verification_expires_at = undefined;
  saveProfiles(profiles);

  addActivityLog(profile.id, profile.username, profile.email, "email_verification_success", "User successfully verified email address.");

  res.json({ success: true, message: "Email verification successful! Welcome aboard." });
});

app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const profiles = getProfilesOnDisk();
  const index = profiles.findIndex(p => p.email.toLowerCase() === email.toLowerCase());

  if (index === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (profiles[index].is_verified) {
    res.status(400).json({ error: "User email already verified" });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  profiles[index].verification_code = code;
  profiles[index].verification_expires_at = Date.now() + 60 * 60 * 1000;
  saveProfiles(profiles);

  console.log(`\n\n=========================================`);
  console.log(`✉️ RESENT VERIFICATION CODE FOR ${email}: ${code}`);
  console.log(`=========================================\n\n`);

  const subject = "Verify your CineVault Account Registration";
  const text = `Your 6-digit verification code is: ${code}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
      <h2 style="color: #6d28d9;">Email Verification Code</h2>
      <p>Please enter the following 6-digit confirmation code to complete email verification:</p>
      <div style="display: inline-block; font-size: 28px; font-weight: bold; padding: 12px 24px; background-color: #f3f4f6; border-radius: 8px; margin: 15px 0; color: #6d28d9; letter-spacing: 3px;">
        ${code}
      </div>
      <p style="font-size: 14px; color: #6b7280;">This verification code will expire in 1 hour.</p>
    </div>
  `;

  await sendNotificationEmail(email, subject, text, html);

  res.json({ success: true, message: "A new confirmation code has been transmitted to your inbox." });
});

app.post("/api/auth/google", (req: Request, res: Response) => {
  const { email, username, avatar_url } = req.body;
  if (!email || !username) {
    res.status(400).json({ error: "Google profile data is required" });
    return;
  }

  const profiles = getProfilesOnDisk();
  let profileIndex = profiles.findIndex(p => p.email.toLowerCase() === email.toLowerCase());

  if (profileIndex === -1) {
    // Generate a random high-entropy local password for social profiles
    const randomPassword = crypto.randomBytes(16).toString("hex");
    const { hash, salt } = hashPassword(randomPassword);
    
    const id = crypto.randomUUID();
    const isVerified = true; // Social emails are pre-verified

    const newUser: UserRecord = {
      id,
      username: username.replace(/\s+/g, '_').toLowerCase(),
      email,
      role: "user",
      status: "active",
      created_at: new Date().toISOString(),
      password_hash: hash,
      password_salt: salt,
      avatar_url: avatar_url || "",
      is_verified: isVerified
    };

    profiles.push(newUser);
    saveProfiles(profiles);
    
    addActivityLog(newUser.id, newUser.username, newUser.email, "social_signup", "User signed up via Google Single Sign-On.");
    addNotification("signup", "New Social User Joined", `${username} (${email}) registered via Google Login.`);
    
    profileIndex = profiles.length - 1;
  }

  const profile = profiles[profileIndex];
  if (profile.status === "suspended") {
    res.status(403).json({ error: "This account has been suspended." });
    return;
  }

  const token = createSession(profile.id);
  const { password_hash, password_salt, ...cleanProfile } = profile;
  res.json({ user: cleanProfile, token });
});

app.post("/api/profile/update", requireAuth, (req: AuthRequest, res: Response) => {
  const { username, email, oldPassword, newPassword } = req.body;
  const user = req.user!;
  
  const profiles = getProfilesOnDisk();
  const index = profiles.findIndex(p => p.id === user.id);
  if (index === -1) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const record = profiles[index];

  // If changing email/username, check uniqueness
  if (email && email.toLowerCase() !== record.email.toLowerCase()) {
    const exists = profiles.some(p => p.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "Email is already taken by another account" });
      return;
    }
    profiles[index].email = email;
    addActivityLog(user.id, user.username, user.email, "profile_edit_email", `User changed email to ${email}`);
  }

  if (username && username.toLowerCase() !== record.username.toLowerCase()) {
    const exists = profiles.some(p => p.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "Username is already taken by another account" });
      return;
    }
    profiles[index].username = username;
    addActivityLog(user.id, user.username, user.email, "profile_edit_username", `User changed username to ${username}`);
  }

  // If resetting password
  if (newPassword) {
    if (!oldPassword) {
      res.status(400).json({ error: "Current password is required to change password" });
      return;
    }
    const matches = verifyPassword(oldPassword, record.password_hash, record.password_salt);
    if (!matches) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    const { hash, salt } = hashPassword(newPassword);
    profiles[index].password_hash = hash;
    profiles[index].password_salt = salt;
    addActivityLog(user.id, user.username, user.email, "profile_change_password", "User changed their login password successfully.");
  }

  saveProfiles(profiles);
  const { password_hash, password_salt, ...cleanProfile } = profiles[index];
  res.json({ success: true, user: cleanProfile });
});

app.post("/api/profile/avatar", requireAuth, (req: AuthRequest, res: Response) => {
  const { data, filename } = req.body;
  if (!data || !filename) {
    res.status(400).json({ error: "Base64 image data and filename are required" });
    return;
  }
  
  const user = req.user!;
  
  try {
    const matches = data.match(/^data:(image\/[a-zA-Z1-9.+_-]+);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({ error: "Malformed base64 payload" });
      return;
    }
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    
    const ext = path.extname(filename) || ".jpg";
    const safeFilename = `avatar-${user.id}-${Date.now()}${ext}`;
    const dest = path.join(process.cwd(), "uploads", "avatars", safeFilename);
    
    fs.writeFileSync(dest, buffer);
    const avatarUrl = `/uploads/avatars/${safeFilename}`;
    
    // Save in database
    const profiles = getProfilesOnDisk();
    const index = profiles.findIndex(p => p.id === user.id);
    if (index !== -1) {
      profiles[index].avatar_url = avatarUrl;
      saveProfiles(profiles);
    }
    
    addActivityLog(user.id, user.username, user.email, "avatar_upload", "User updated their profile photo.");
    
    res.json({ success: true, avatar_url: avatarUrl });
  } catch (err: any) {
    console.error("Avatar upload failed:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

app.get("/api/profile/activity", requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const logs = getActivities();
  const userLogs = logs.filter(l => l.userId === user.id);
  res.json(userLogs);
});

// 3. Movies API with Cache optimization
app.get("/api/movies", optionalAuth, (req: AuthRequest, res: Response) => {
  const user = req.user;
  const isAdmin = user && (user.role === "admin" || user.role === "super_admin" || user.role === "moderator");

  if (isAdmin) {
    if (cachedMoviesAdmin) {
      res.json(cachedMoviesAdmin);
      return;
    }
    const movies = getMovies();
    cachedMoviesAdmin = movies;
    res.json(movies);
  } else {
    if (cachedMoviesPublic) {
      res.json(cachedMoviesPublic);
      return;
    }
    const movies = getMovies();
    const published = movies.filter(m => m.status === "published");
    cachedMoviesPublic = published;
    res.json(published);
  }
});

app.get("/api/movies/:id", optionalAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const movies = getMovies();
  const movie = movies.find(m => m.id === id);

  if (!movie) {
    res.status(404).json({ error: "Movie not found" });
    return;
  }

  const user = req.user;
  const isAdmin = user && (user.role === "admin" || user.role === "super_admin" || user.role === "moderator");

  if (!isAdmin && movie.status !== "published") {
    res.status(403).json({ error: "Access Denied" });
    return;
  }

  res.json(movie);
});

// Admin-Protected CRUD
app.post(
  "/api/movies",
  requireAuth,
  requireRole(["admin", "super_admin", "moderator"]),
  (req: AuthRequest, res: Response) => {
    const {
      title,
      description,
      genre,
      category,
      poster_url,
      backdrop_url,
      scene_images,
      download_redirect_url,
      download_enabled,
      status
    } = req.body;

    if (!title || !description || !genre || !category) {
      res.status(400).json({ error: "Title, Description, Genre, and Category are required" });
      return;
    }

    const movies = getMovies();
    const newMovie: CustomMovie = {
      id: crypto.randomUUID(),
      title,
      description,
      genre,
      category,
      poster_url: poster_url || "",
      backdrop_url: backdrop_url || "",
      scene_images: scene_images || [],
      download_redirect_url: download_redirect_url || "",
      download_enabled: !!download_enabled,
      status: status || "draft",
      created_at: new Date().toISOString()
    };

    movies.push(newMovie);
    saveMovies(movies);
    
    // Caches invalidation
    invalidateMovieCache();

    // Logs & alerts
    addActivityLog(req.user!.id, req.user!.username, req.user!.email, "movie_upload", `Published New Movie contents: "${title}"`);
    addNotification("request", "New Movie Uploaded", `Movie "${title}" has been added to catalogs by ${req.user!.username}.`);

    res.status(201).json(newMovie);
  }
);

app.put(
  "/api/movies/:id",
  requireAuth,
  requireRole(["admin", "super_admin", "moderator"]),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const movies = getMovies();
    const movieIndex = movies.findIndex(m => m.id === id);

    if (movieIndex === -1) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }

    const currentMovie = movies[movieIndex];
    const {
      title,
      description,
      genre,
      category,
      poster_url,
      backdrop_url,
      scene_images,
      download_redirect_url,
      download_enabled,
      status
    } = req.body;

    const updatedMovie: CustomMovie = {
      ...currentMovie,
      title: title !== undefined ? title : currentMovie.title,
      description: description !== undefined ? description : currentMovie.description,
      genre: genre !== undefined ? genre : currentMovie.genre,
      category: category !== undefined ? category : currentMovie.category,
      poster_url: poster_url !== undefined ? poster_url : currentMovie.poster_url,
      backdrop_url: backdrop_url !== undefined ? backdrop_url : currentMovie.backdrop_url,
      scene_images: scene_images !== undefined ? scene_images : currentMovie.scene_images,
      download_redirect_url: download_redirect_url !== undefined ? download_redirect_url : currentMovie.download_redirect_url,
      download_enabled: download_enabled !== undefined ? !!download_enabled : currentMovie.download_enabled,
      status: status !== undefined ? status : currentMovie.status
    };

    movies[movieIndex] = updatedMovie;
    saveMovies(movies);

    // Invalidate Cache
    invalidateMovieCache();

    // Log Activity
    addActivityLog(req.user!.id, req.user!.username, req.user!.email, "movie_edit", `Modified Movie entry: "${updatedMovie.title}"`);

    res.json(updatedMovie);
  }
);

app.delete(
  "/api/movies/:id",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const movies = getMovies();
    const movieToDelete = movies.find(m => m.id === id);
    const filtered = movies.filter(m => m.id !== id);

    if (movies.length === filtered.length) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }

    saveMovies(filtered);

    // Invalidate Cache
    invalidateMovieCache();

    // Log Activity
    addActivityLog(
      req.user!.id,
      req.user!.username,
      req.user!.email,
      "movie_delete",
      `Deleted movie record: "${movieToDelete ? movieToDelete.title : id}"`
    );

    res.json({ success: true });
  }
);

// 4. Asset upload pipeline for posters, backdrops, and scenes
app.post(
  "/api/upload",
  requireAuth,
  requireRole(["admin", "super_admin", "moderator"]),
  (req: AuthRequest, res: Response) => {
    const { data, filename, folder } = req.body;

    if (!data || !filename || !folder) {
      res.status(400).json({ error: "Base64 data, filename, and directory target are required" });
      return;
    }

    if (!["posters", "backdrops", "scene-images"].includes(folder)) {
      res.status(400).json({ error: "Invalid upload directory bucket" });
      return;
    }

    try {
      // Decode image
      const matches = data.match(/^data:(image\/[a-zA-Z1-9.+_-]+);base64,(.+)$/);
      if (!matches) {
        res.status(400).json({ error: "Malformed payload image format" });
        return;
      }

      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");
      
      // Clean up file name to prevent directory traversal
      const safeFilename = `${Date.now()}-${path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const uploadPath = path.join(process.cwd(), "uploads", folder, safeFilename);

      fs.writeFileSync(uploadPath, buffer);
      
      // Log upload action
      addActivityLog(req.user!.id, req.user!.username, req.user!.email, "asset_upload", `Uploaded media file into [${folder}] as [${safeFilename}]`);

      // Return absolute applet-relative file location
      res.json({ url: `/uploads/${folder}/${safeFilename}` });
    } catch (err: any) {
      console.error("Upload failed: ", err);
      res.status(500).json({ error: "Internal storage writing failed" });
    }
  }
);

// 5. Site settings setup
app.get("/api/settings", (req: Request, res: Response) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress || "127.0.0.1";

  const clientId = req.query.clientId as string | undefined;
  if (clientId) {
    activeClients.set(clientId, Date.now());
  } else {
    activeClients.set(ip, Date.now());
  }

  res.json(getSettings());
});

app.post("/api/analytics/hit", (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress || "127.0.0.1";
    registerPageView(ip);

    if (clientId) {
      activeClients.set(clientId, Date.now());
    } else {
      activeClients.set(ip, Date.now());
    }

    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to log hit" });
  }
});

app.post("/api/analytics/heartbeat", (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress || "127.0.0.1";

    if (clientId) {
      activeClients.set(clientId, Date.now());
    } else {
      activeClients.set(ip, Date.now());
    }

    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update heartbeat" });
  }
});

app.post(
  "/api/settings",
  requireAuth,
  requireRole(["super_admin"]),
  (req: AuthRequest, res: Response) => {
    const updated = updateSettings(req.body);
    res.json(updated);
  }
);

// 5.5 Analytics dashboard statistics for Admins & Super Admins
app.get(
  "/api/analytics/stats",
  requireAuth,
  requireRole(["super_admin", "admin", "moderator"]),
  (req: AuthRequest, res: Response) => {
    try {
      const profiles = getProfilesOnDisk();
      const moviesList = getMovies();
      const analytics = getAnalytics() as any;
      const downloads = getDownloads();

      const totalUsers = profiles.length;
      const activeUsers = profiles.filter(p => p.status === "active").length;
      const totalMovies = moviesList.length;
      const totalPublished = moviesList.filter(m => m.status === "published").length;
      const totalDrafts = moviesList.filter(m => m.status === "draft").length;

      // Clean up old active sessions/tabs (> 15 seconds)
      const now = Date.now();
      const limit = now - 15000;
      for (const [clientId, lastSeen] of activeClients.entries()) {
        if (lastSeen < limit) {
          activeClients.delete(clientId);
        }
      }

      const activeOnline = Math.max(1, activeClients.size);

      // Calculate Top Downloaded Movies list
      const movieClicks = downloads.movieClicks || {};
      const sortedMovieClicks = Object.entries(movieClicks)
        .map(([movieId, clicks]) => {
          const m = moviesList.find(item => item.id === movieId);
          return {
            movieId,
            movieTitle: m ? m.title : "Unknown Movie",
            clicks: clicks as number
          };
        })
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10); // show top 10

      res.json({
        totalUsers,
        activeUsers,
        totalMovies,
        totalPublished,
        totalDrafts,
        pageViews: analytics.pageViews || 0,
        uniqueVisitors: (analytics.uniqueVisitors || []).length,
        activeOnline,
        totalDownloads: downloads.totalClicks || 0,
        topDownloadedMovies: sortedMovieClicks,
        dailyClicks: downloads.dailyClicks || {},
        dailyViews: analytics.dailyViews || {},
        lastClickTimestamp: downloads.lastClickTimestamp || null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve metrics" });
    }
  }
);

// 6. Super Admin USER MANAGEMENT Portal
app.get(
  "/api/users",
  requireAuth,
  requireRole(["super_admin", "admin"]),
  (req: AuthRequest, res: Response) => {
    const profiles = getProfilesOnDisk();
    // Return clean user list without credential hash/salt secrets
    const cleanProfiles = profiles.map(({ password_hash, password_salt, ...u }) => u);
    res.json(cleanProfiles);
  }
);

app.post(
  "/api/users/:id/role",
  requireAuth,
  requireRole(["super_admin", "admin"]),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "user", "super_admin", "moderator"].includes(role)) {
      res.status(400).json({ error: "Invalid role selected" });
      return;
    }

    if (id === req.user!.id) {
      res.status(400).json({ error: "You cannot change your own admin role privileges!" });
      return;
    }

    const profiles = getProfilesOnDisk();
    const index = profiles.findIndex(p => p.id === id);

    if (index === -1) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    const targetUser = profiles[index];
    const oldRole = targetUser.role;

    // Standard admins cannot promote to super_admin or demote a super_admin
    if (req.user!.role !== "super_admin") {
      if (role === "super_admin" || targetUser.role === "super_admin") {
        res.status(403).json({ error: "Overriding super_admin privileges requires super_admin access" });
        return;
      }
    }

    profiles[index].role = role;
    saveProfiles(profiles);

    // Track state Transitions
    addActivityLog(
      req.user!.id,
      req.user!.username,
      req.user!.email,
      "user_role_change",
      `Changed role of user ${targetUser.username} from [${oldRole}] to [${role}]`
    );

    addNotification(
      role === "moderator" ? "moderator_add" : "role_change",
      "User role transition",
      `User ${targetUser.username} was promoted/reclassified to ${role} by ${req.user!.username}.`
    );

    const { password_hash, password_salt, ...cleanProfile } = profiles[index];
    res.json(cleanProfile);
  }
);

app.post(
  "/api/users/:id/status",
  requireAuth,
  requireRole(["super_admin", "admin"]),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      res.status(400).json({ error: "Invalid account status" });
      return;
    }

    if (id === req.user!.id) {
      res.status(400).json({ error: "You cannot suspend your own admin session" });
      return;
    }

    const profiles = getProfilesOnDisk();
    const index = profiles.findIndex(p => p.id === id);

    if (index === -1) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    const targetUser = profiles[index];

    // Standard admins cannot suspend super_admin
    if (req.user!.role !== "super_admin" && targetUser.role === "super_admin") {
      res.status(403).json({ error: "Cannot suspend a super_admin" });
      return;
    }

    profiles[index].status = status;
    saveProfiles(profiles);

    // Track logs
    addActivityLog(
      req.user!.id,
      req.user!.username,
      req.user!.email,
      status === "suspended" ? "user_suspended" : "user_activated",
      `Successfully set user ${targetUser.username} status parameter to [${status}]`
    );

    addNotification(
      "role_change",
      `User accounts ${status}`,
      `User ${targetUser.username} has been ${status === "suspended" ? "suspended" : "reactivated"} by Admin ${req.user!.username}.`
    );

    const { password_hash, password_salt, ...cleanProfile } = profiles[index];
    res.json(cleanProfile);
  }
);

app.delete(
  "/api/users/:id",
  requireAuth,
  requireRole(["super_admin", "admin"]),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (id === req.user!.id) {
      res.status(400).json({ error: "You cannot delete your own session" });
      return;
    }

    const profiles = getProfilesOnDisk();
    const index = profiles.findIndex(p => p.id === id);

    if (index === -1) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    const targetUser = profiles[index];

    // Standard admins cannot delete super_admin
    if (req.user!.role !== "super_admin" && targetUser.role === "super_admin") {
      res.status(403).json({ error: "Cannot delete a super_admin" });
      return;
    }

    const filtered = profiles.filter(p => p.id !== id);

    if (profiles.length === filtered.length) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    saveProfiles(filtered);

    // Track state Log
    addActivityLog(
      req.user!.id,
      req.user!.username,
      req.user!.email,
      "user_delete",
      `Deleted user account resource: "${targetUser.username}" (${targetUser.email})`
    );

    res.json({ success: true });
  }
);

// 7. Click analytics
app.post("/api/movies/:id/download-click", optionalAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const movies = getMovies();
  const m = movies.find(item => item.id === id);
  if (!m) {
    res.status(404).json({ error: "Movie not found" });
    return;
  }

  registerDownloadClick(id);

  // Log activity
  const user = req.user;
  addActivityLog(
    user ? user.id : "guest",
    user ? user.username : "guest",
    user ? user.email : "guest",
    "movie_download",
    `Triggered download link click for movie: "${m.title}"`
  );

  res.json({ success: true, redirect_url: m.download_redirect_url });
});

// 8. Movie Requests System APIs
app.post("/api/requests", requireAuth, (req: AuthRequest, res: Response) => {
  const { title, year, message } = req.body;
  if (!title || !year) {
    res.status(400).json({ error: "Movie name and year are required" });
    return;
  }

  const user = req.user!;
  const requests = getRequests();

  const newRequest: any = {
    id: crypto.randomUUID(),
    userId: user.id,
    username: user.username,
    title,
    year,
    message: message || "",
    status: "pending",
    created_at: new Date().toISOString()
  };

  requests.push(newRequest);
  saveRequests(requests);

  // Notifications & Logging
  addActivityLog(
    user.id,
    user.username,
    user.email,
    "movie_request_create",
    `Submitted request for movie: "${title} (${year})"`
  );

  addNotification(
    "request",
    "New Movie Requested",
    `User ${user.username} has submitted a request for "${title} (${year})".`
  );

  res.status(201).json(newRequest);
});

app.get("/api/requests", requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const requests = getRequests();

  // If standard user, only view own requests. Otherwise view all.
  const isAdmin = ["super_admin", "admin", "moderator"].includes(user.role);
  if (isAdmin) {
    res.json(requests);
  } else {
    const userRequests = requests.filter(r => r.userId === user.id);
    res.json(userRequests);
  }
});

app.put(
  "/api/requests/:id/status",
  requireAuth,
  requireRole(["super_admin", "admin", "moderator"]),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "uploaded", "rejected"].includes(status)) {
      res.status(400).json({ error: "Invalid status parameters" });
      return;
    }

    const requests = getRequests();
    const index = requests.findIndex(r => r.id === id);

    if (index === -1) {
      res.status(404).json({ error: "Movie request not found" });
      return;
    }

    const reqItem = requests[index];
    const oldStatus = reqItem.status;
    requests[index].status = status;
    saveRequests(requests);

    // Activity log
    addActivityLog(
      req.user!.id,
      req.user!.username,
      req.user!.email,
      "movie_request_status_update",
      `Changed movie request status from [${oldStatus}] to [${status}] for "${reqItem.title}"`
    );

    res.json(requests[index]);
  }
);

// 9. Logs & Admin Alerts API
app.get(
  "/api/activities",
  requireAuth,
  requireRole(["super_admin", "admin", "moderator"]),
  (req: AuthRequest, res: Response) => {
    res.json(getActivities());
  }
);

app.get(
  "/api/notifications",
  requireAuth,
  requireRole(["super_admin", "admin", "moderator"]),
  (req: AuthRequest, res: Response) => {
    res.json(getNotifications());
  }
);

app.post(
  "/api/notifications/mark-read",
  requireAuth,
  requireRole(["super_admin", "admin", "moderator"]),
  (req: AuthRequest, res: Response) => {
    const { id } = req.body;
    const notifications = getNotifications();

    if (id) {
      // Mark individual read
      const index = notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        notifications[index].read = true;
      }
    } else {
      // Mark all read
      notifications.forEach(n => {
        n.read = true;
      });
    }

    saveNotifications(notifications);
    res.json({ success: true });
  }
);

// 10. SEO Dynamic Sitemap and Robots.txt Handlers
app.get("/sitemap.xml", (req: Request, res: Response) => {
  const host = req.get("host") || "cinevault-cms.com";
  const protocol = req.protocol || "https";
  const origin = `${protocol}://${host}`;
  const movies = getMovies().filter(m => m.status === "published");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // Base endpoints
  xml += `  <url>\n    <loc>${origin}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${origin}/movies</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${origin}/login</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;

  // Dynamic movie endpoints
  movies.forEach(m => {
    xml += `  <url>\n    <loc>${origin}/movies/${m.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  xml += `</urlset>\n`;

  res.header("Content-Type", "application/xml");
  res.status(200).send(xml);
});

app.get("/robots.txt", (req: Request, res: Response) => {
  const host = req.get("host") || "cinevault-cms.com";
  const protocol = req.protocol || "https";
  let content = `User-agent: *\n`;
  content += `Disallow: /admin\n`;
  content += `Disallow: /api/\n`;
  content += `Allow: /\n\n`;
  content += `Sitemap: ${protocol}://${host}/sitemap.xml\n`;

  res.header("Content-Type", "text/plain");
  res.status(200).send(content);
});

// ==================== ASSETS & VITE SERVING ====================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve client router fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CineVault core system listening on http://localhost:${PORT}`);
  });
}

startServer();
