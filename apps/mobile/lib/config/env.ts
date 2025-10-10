import { z } from 'zod';

const urlOrUndefined = z
  .string()
  .trim()
  .transform((s) => (s === '' ? undefined : s))
  .optional()
  .refine((v) => v === undefined || /^https?:\/\//i.test(v), {
    message: 'must be a valid http(s) URL when provided',
  });

const EnvSchema = z.object({
  // Firebase (required)
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_APP_ID: z.string().min(1),

  // Google OAuth (required)
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().min(1),

  // Risky Expo URLs (optional, but must be valid if set)
  EXPO_DEV_CLIENT_PUBLIC_URL: urlOrUndefined,
  EXPO_DEV_SERVER_URL: urlOrUndefined,
  EXPO_DEV_SERVER_ORIGIN: urlOrUndefined,
  EXPO_WEB_URL: urlOrUndefined,
  PUBLIC_URL: urlOrUndefined,
});

function read(key: string): string | undefined {
  return process.env[key] ?? undefined;
}

const raw = {
  EXPO_PUBLIC_FIREBASE_API_KEY: read('EXPO_PUBLIC_FIREBASE_API_KEY'),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: read('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: read('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: read('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: read('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  EXPO_PUBLIC_FIREBASE_APP_ID: read('EXPO_PUBLIC_FIREBASE_APP_ID'),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: read('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: read('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
  EXPO_DEV_CLIENT_PUBLIC_URL: read('EXPO_DEV_CLIENT_PUBLIC_URL'),
  EXPO_DEV_SERVER_URL: read('EXPO_DEV_SERVER_URL'),
  EXPO_DEV_SERVER_ORIGIN: read('EXPO_DEV_SERVER_ORIGIN'),
  EXPO_WEB_URL: read('EXPO_WEB_URL'),
  PUBLIC_URL: read('PUBLIC_URL'),
};

// Validate + transform
const parsed = EnvSchema.safeParse(raw);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `• ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Environment validation failed:\n${issues}`);
}

// Actively unset unsafe/invalid Expo URL envs if they are undefined (prevents "Invalid URL")
const riskyKeys: (keyof typeof parsed.data)[] = [
  'EXPO_DEV_CLIENT_PUBLIC_URL',
  'EXPO_DEV_SERVER_URL',
  'EXPO_DEV_SERVER_ORIGIN',
  'EXPO_WEB_URL',
  'PUBLIC_URL',
];

for (const key of riskyKeys) {
  if (!parsed.data[key]) {
    delete process.env[key];
  }
}

export const Env = parsed.data;
