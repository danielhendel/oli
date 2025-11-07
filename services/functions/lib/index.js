"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAuthCreate = void 0;
const admin = __importStar(require("firebase-admin"));
// ⬅️ Pull the v1 API explicitly so `.auth.user().onCreate` exists.
const functionsV1 = __importStar(require("firebase-functions/v1"));
try {
    admin.app();
}
catch {
    admin.initializeApp();
}
const db = admin.firestore();
function defaultGeneralProfile(user) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    return {
        displayName: user.displayName ?? null,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        email: user.email ?? null,
        createdAt: now,
        updatedAt: now,
    };
}
// v1 Auth trigger (stable and supported in firebase-functions v6)
exports.onAuthCreate = functionsV1.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    await db
        .doc(`users/${uid}/profile/general`)
        .set(defaultGeneralProfile(user), { merge: true });
});
