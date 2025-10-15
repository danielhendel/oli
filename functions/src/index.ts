import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
if (!getApps().length) initializeApp({ credential: applicationDefault() });

export * from './onAuthCreate';
