// apps/mobile/scripts/validate-env.cjs
const REQUIRED = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  ];
  
  // Optional URL-like vars we *only* keep if valid.
  const OPTIONAL_URLS = ['EXPO_DEV_SERVER_ORIGIN', 'EXPO_DEV_CLIENT_ORIGIN'];
  
  function isNonEmpty(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }
  
  function isValidUrl(v) {
    try { new URL(v); return true; } catch { return false; }
  }
  
  function validateRequired() {
    const missing = REQUIRED.filter((k) => !isNonEmpty(process.env[k]));
    if (missing.length) {
      const msg = `Missing required env(s): ${missing.join(', ')}. Check your .env files.`;
      throw new Error(msg);
    }
  }
  
  function sanitizeOptionalUrls() {
    OPTIONAL_URLS.forEach((k) => {
      const val = process.env[k];
      if (!isNonEmpty(val) || !isValidUrl(val)) {
        delete process.env[k]; // let Expo compute a safe default
      }
    });
  }
  
  function validateNoEmptyStrings() {
    // Guard against `KEY=` with nothing after equals (common source of ""/Invalid URL)
    Object.keys(process.env).forEach((k) => {
      if (process.env[k] === '') {
        // Prefer removing empty strings entirely so downstream code does not treat it as a value.
        delete process.env[k];
      }
    });
  }
  
  validateNoEmptyStrings();
  sanitizeOptionalUrls();
  validateRequired();
  