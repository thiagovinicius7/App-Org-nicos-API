import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

export interface SystemUser {
  id: string;
  username: string; // e.g. "Certificadora"
  email: string;
  displayName: string;
  role: "admin" | "certificadora" | "operador";
  passwordHash?: string;
  createdAt: string;
  photoURL?: string;
}

export interface AppAuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  role?: string;
  isSystemUser?: boolean;
}

// Built-in initial accounts
export const DEFAULT_SYSTEM_ACCOUNTS = [
  {
    id: "user_certificadora",
    username: "Certificadora",
    email: "certificadora@geranium.com.br",
    displayName: "Certificadora Orgânica (Auditoria)",
    password: "87654321",
    role: "certificadora" as const,
    photoURL: ""
  }
];

const LOCAL_STORAGE_USER_KEY = "geranium_system_auth_user";

/**
 * Normalizes usernames/emails for comparison
 */
export function normalizeUserString(str: string): string {
  return (str || "").trim().toLowerCase();
}

/**
 * Attempts to login with username/email and password
 */
export async function loginWithCredentials(
  userOrEmail: string,
  pass: string
): Promise<AppAuthUser | null> {
  const cleanInput = normalizeUserString(userOrEmail);
  const cleanPass = pass.trim();

  // 1. Check default built-in accounts
  const matchedDefault = DEFAULT_SYSTEM_ACCOUNTS.find(
    acc =>
      (normalizeUserString(acc.username) === cleanInput ||
       normalizeUserString(acc.email) === cleanInput) &&
      acc.password === cleanPass
  );

  if (matchedDefault) {
    const authUser: AppAuthUser = {
      uid: matchedDefault.id,
      displayName: matchedDefault.displayName,
      email: matchedDefault.email,
      photoURL: matchedDefault.photoURL || null,
      role: matchedDefault.role,
      isSystemUser: true
    };
    saveSystemUserSession(authUser);
    return authUser;
  }

  // 2. Check Firestore system_users collection
  try {
    const colRef = collection(db, "system_users");
    const snapshot = await getDocs(colRef);
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const matchName = normalizeUserString(data.username || "");
      const matchEmail = normalizeUserString(data.email || "");
      const storedPass = data.password || "";

      if ((matchName === cleanInput || matchEmail === cleanInput) && storedPass === cleanPass) {
        const authUser: AppAuthUser = {
          uid: docSnap.id,
          displayName: data.displayName || data.username || "Usuário",
          email: data.email || `${matchName}@geranium.com.br`,
          photoURL: data.photoURL || null,
          role: data.role || "user",
          isSystemUser: true
        };
        saveSystemUserSession(authUser);
        return authUser;
      }
    }
  } catch (err) {
    console.warn("Erro ao consultar usuários no Firestore:", err);
  }

  return null;
}

/**
 * Saves logged-in system user to localStorage for session persistence
 */
export function saveSystemUserSession(user: AppAuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  } catch (e) {
    console.error("LocalStorage error:", e);
  }
}

/**
 * Loads current persisted system user from session
 */
export function getSavedSystemUserSession(): AppAuthUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (raw) {
      return JSON.parse(raw) as AppAuthUser;
    }
  } catch (e) {
    console.error("LocalStorage read error:", e);
  }
  return null;
}

/**
 * Clears system user session
 */
export function clearSystemUserSession() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  } catch (e) {}
}
