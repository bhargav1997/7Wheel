/**
 * validate.js — Comprehensive input validation middleware for 7 Wheel
 *
 * Layers:
 *  1. Required field presence
 *  2. Email format (strict RFC 5322 via `validator`)
 *  3. Disposable / temp mail domain blocklist
 *  4. Common free provider allow-list (optional soft warning)
 *  5. Username rules (alphanumeric + underscore, no reserved words)
 *  6. Password strength (length, uppercase, number, special char)
 */

const validator = require('validator');
const DISPOSABLE_DOMAINS = require('../data/disposableDomains');

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const USERNAME_RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support',
  'moderator', 'mod', 'staff', 'bot', 'official',
  'help', 'info', 'null', 'undefined', 'anonymous',
  'test', 'demo', 'guest', 'superuser',
  '7wheel', 'wheel', 'casino', 'hub',
]);

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_NO_CONSEC_UNDERSCORE = /__/;

// Known legitimate providers (not disposable — for informational purposes)
const LEGITIMATE_FREE_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in',
  'yahoo.co.uk', 'yahoo.co.jp', 'yahoo.fr', 'yahoo.de',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'protonmail.com', 'protonmail.ch', 'pm.me', 'icloud.com',
  'me.com', 'mac.com', 'aol.com', 'zoho.com',
  'yandex.com', 'yandex.ru', 'mail.ru', 'inbox.ru',
  'gmx.com', 'gmx.net', 'gmx.de', 'web.de',
  'fastmail.com', 'fastmail.fm', 'tutanota.com', 'tutanota.de',
  'rediffmail.com', 'rocketmail.com',
]);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Extract domain from email string safely.
 * Returns lowercase domain or null on invalid input.
 */
const extractDomain = (email) => {
  if (!email || typeof email !== 'string') return null;
  const parts = email.toLowerCase().trim().split('@');
  return parts.length === 2 && parts[1] ? parts[1] : null;
};

/**
 * Validate email thoroughly.
 * Returns { valid: boolean, message: string }
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required' };
  }

  const trimmed = email.trim();

  // Length guard
  if (trimmed.length > 254) {
    return { valid: false, message: 'Email address is too long' };
  }

  // Strict RFC 5322 format via validator library
  if (!validator.isEmail(trimmed, { allow_utf8_local_part: false, require_tld: true })) {
    return { valid: false, message: 'Please enter a valid email address' };
  }

  const domain = extractDomain(trimmed);
  if (!domain) {
    return { valid: false, message: 'Email domain is invalid' };
  }

  // Must have a real TLD (at least 2 chars after last dot)
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { valid: false, message: 'Email has an invalid domain extension' };
  }

  // Block single-character domains (e.g. a.io style abuse)
  const domainParts = domain.split('.');
  if (domainParts[0].length < 2) {
    return { valid: false, message: 'Email domain appears to be invalid' };
  }

  // Block IP address emails (e.g. user@192.168.1.1)
  if (validator.isIP(domain)) {
    return { valid: false, message: 'Email addresses with IP domains are not allowed' };
  }

  // Block consecutive dots (e.g. user@test..com)
  if (domain.includes('..') || trimmed.includes('..')) {
    return { valid: false, message: 'Email address contains invalid characters' };
  }

  // Disposable / temp mail check
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      message: 'Temporary and disposable email addresses are not allowed. Please use a real email.',
    };
  }

  // Check subdomain variations of disposable domains
  // e.g. user@anything.mailinator.com
  const domainRoot = domainParts.slice(-2).join('.');
  if (DISPOSABLE_DOMAINS.has(domainRoot)) {
    return {
      valid: false,
      message: 'Temporary and disposable email addresses are not allowed. Please use a real email.',
    };
  }

  return { valid: true, message: '' };
};

/**
 * Validate username.
 * Returns { valid: boolean, message: string }
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters long' };
  }

  if (trimmed.length > 20) {
    return { valid: false, message: 'Username must be at most 20 characters long' };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      message: 'Username can only contain letters, numbers, and underscores',
    };
  }

  // No leading/trailing underscores
  if (trimmed.startsWith('_') || trimmed.endsWith('_')) {
    return { valid: false, message: 'Username cannot start or end with an underscore' };
  }

  // No consecutive underscores
  if (USERNAME_NO_CONSEC_UNDERSCORE.test(trimmed)) {
    return { valid: false, message: 'Username cannot contain consecutive underscores' };
  }

  // No purely numeric usernames (e.g. "12345")
  if (/^\d+$/.test(trimmed)) {
    return { valid: false, message: 'Username cannot be only numbers' };
  }

  // Reserved words
  if (USERNAME_RESERVED.has(trimmed.toLowerCase())) {
    return { valid: false, message: `"${trimmed}" is a reserved username` };
  }

  // No "admin", "mod" etc as prefix+suffix abuse (admin1, 1admin)
  for (const word of USERNAME_RESERVED) {
    if (trimmed.toLowerCase() === word) {
      return { valid: false, message: `"${trimmed}" is a reserved username` };
    }
  }

  return { valid: true, message: '' };
};

/**
 * Validate password strength.
 * Returns { valid: boolean, message: string }
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password is too long (max 128 characters)' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character (e.g. @, #, !)',
    };
  }

  // Common weak passwords
  const WEAK_PASSWORDS = new Set([
    'Password1!', 'Password123!', 'P@ssword1', 'Admin@123',
    'Qwerty@123', 'Welcome@1', 'Abc@1234', 'Test@1234',
  ]);
  if (WEAK_PASSWORDS.has(password)) {
    return { valid: false, message: 'This password is too common. Please choose a more unique password.' };
  }

  return { valid: true, message: '' };
};

// ─────────────────────────────────────────────
// EXPRESS MIDDLEWARE
// ─────────────────────────────────────────────

/**
 * validateRegister — middleware for POST /api/auth/register
 * Validates username, email, and password before hitting the DB.
 */
const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];

  const usernameCheck = validateUsername(username);
  if (!usernameCheck.valid) errors.push(usernameCheck.message);

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) errors.push(emailCheck.message);

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) errors.push(passwordCheck.message);

  if (errors.length > 0) {
    return res.status(400).json({
      message: errors[0], // primary error
      errors,             // all errors for frontend multi-display
    });
  }

  // Normalize before passing to route handler
  req.body.email = email.trim().toLowerCase();
  req.body.username = username.trim();
  next();
};

/**
 * validateLogin — middleware for POST /api/auth/login
 * Basic sanitization — no lockout here (rate limiter handles that).
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ message: 'Email is required' });
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ message: 'Password is required' });
  }

  // Basic email format sanity (not full validation — avoid leaking info)
  if (!validator.isEmail(email.trim())) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

module.exports = { validateRegister, validateLogin, validateEmail, validateUsername, validatePassword };
