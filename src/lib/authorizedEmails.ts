import { collection, getDocs, getDoc, setDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

export interface AuthorizedEmail {
  id: string;
  email: string;
  addedBy?: string;
  addedAt?: string;
  role?: "admin" | "user";
}

export interface AuthSettings {
  isRestricted: boolean;
  allowedDomains: string[];
}

export const PERMANENT_ADMIN_EMAILS = [
  "thiagovinicius7@gmail.com",
  "rafaelmorenocampos@gmail.com",
  "certificadora@geranium.com.br"
];

/**
 * Normalizes email to lowercase and trimmed string
 */
export function normalizeEmail(email: string): string {
  return email ? email.trim().toLowerCase() : "";
}

/**
 * Creates a safe Firestore document ID from an email address
 */
export function getEmailDocId(email: string): string {
  return normalizeEmail(email).replace(/[^a-zA-Z0-9_.]/g, "_");
}

/**
 * Fetches global access control settings from Firestore
 */
export async function getAuthSettings(): Promise<AuthSettings> {
  try {
    const snap = await getDoc(doc(db, "metadata", "auth_settings"));
    if (snap.exists()) {
      const data = snap.data();
      return {
        isRestricted: data.isRestricted !== false, // default true
        allowedDomains: Array.isArray(data.allowedDomains) ? data.allowedDomains : []
      };
    }
  } catch (err) {
    console.warn("Erro ao buscar configurações de acesso:", err);
  }
  return {
    isRestricted: true,
    allowedDomains: []
  };
}

/**
 * Updates global access control settings in Firestore
 */
export async function saveAuthSettings(settings: AuthSettings): Promise<void> {
  await setDoc(doc(db, "metadata", "auth_settings"), {
    isRestricted: settings.isRestricted,
    allowedDomains: settings.allowedDomains || [],
    updatedAt: new Date().toISOString()
  });
}

/**
 * Checks if the given email is authorized to access the system.
 * Always allows permanent admin emails and checks Firestore for others.
 */
export async function isEmailAuthorized(email: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = normalizeEmail(email);

  // 1. Instant bypass for permanent administrators (instant access, 0 latency)
  if (PERMANENT_ADMIN_EMAILS.some(admin => normalizeEmail(admin) === cleanEmail)) {
    syncAdminEmailToFirestore(cleanEmail).catch(console.error);
    return true;
  }

  try {
    // 2. Check global access settings (e.g. if open mode is enabled)
    const settings = await getAuthSettings();
    if (!settings.isRestricted) {
      // Access is open to any Google account
      return true;
    }

    // Check if user's domain is in allowedDomains (e.g., "@geranium.com.br")
    if (settings.allowedDomains.some(d => cleanEmail.endsWith(normalizeEmail(d)))) {
      return true;
    }

    const docId = getEmailDocId(cleanEmail);

    // 3. Direct document lookup (fast, single document read)
    const directDocPromise = getDoc(doc(db, "authorized_emails", docId));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout ao verificar autorização no banco")), 5000)
    );

    const docSnap = (await Promise.race([directDocPromise, timeoutPromise])) as any;
    if (docSnap && docSnap.exists()) {
      return true;
    }

    // 4. Fallback: query collection in case document ID had a different format
    const colRef = collection(db, "authorized_emails");
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.log("authorized_emails collection empty. Seeding initial authorized emails...");
      // Seed default admin emails and current user
      const initialEmails = Array.from(new Set([...PERMANENT_ADMIN_EMAILS, cleanEmail]));
      for (const mail of initialEmails) {
        const id = getEmailDocId(mail);
        await setDoc(doc(db, "authorized_emails", id), {
          email: mail,
          addedBy: "Sistema (Inicialização)",
          addedAt: new Date().toISOString(),
          role: PERMANENT_ADMIN_EMAILS.includes(mail) ? "admin" : "user"
        });
      }
      return true;
    }

    // Check if cleanEmail matches any document in the collection
    const isAllowed = snapshot.docs.some(d => {
      const data = d.data();
      return data.email && normalizeEmail(data.email) === cleanEmail;
    });

    return isAllowed;
  } catch (err) {
    console.error("Erro ao verificar e-mail autorizado:", err);
    // In case of Firestore connection issues, allow permanent admins
    if (PERMANENT_ADMIN_EMAILS.some(admin => normalizeEmail(admin) === cleanEmail)) {
      return true;
    }
    return false;
  }
}

/**
 * Ensures permanent admin emails exist in Firestore
 */
async function syncAdminEmailToFirestore(email: string) {
  try {
    const docId = getEmailDocId(email);
    const docRef = doc(db, "authorized_emails", docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        email: normalizeEmail(email),
        addedBy: "Sistema (Administrador Padrão)",
        addedAt: new Date().toISOString(),
        role: "admin"
      });
    }
  } catch (err) {
    // Non-critical background sync
    console.warn("Async sync admin email error:", err);
  }
}

/**
 * Fetches all authorized emails from Firestore.
 */
export async function getAuthorizedEmails(): Promise<AuthorizedEmail[]> {
  try {
    const colRef = collection(db, "authorized_emails");
    const snapshot = await getDocs(colRef);
    const map = new Map<string, AuthorizedEmail>();

    // Add entries from Firestore
    snapshot.docs.forEach(d => {
      const data = d.data();
      const mail = normalizeEmail(data.email || "");
      if (mail) {
        map.set(mail, {
          id: d.id,
          email: mail,
          addedBy: data.addedBy,
          addedAt: data.addedAt,
          role: PERMANENT_ADMIN_EMAILS.some(a => normalizeEmail(a) === mail) ? "admin" : (data.role || "user")
        });
      }
    });

    // Ensure permanent admins are always included in the list
    for (const adminEmail of PERMANENT_ADMIN_EMAILS) {
      const norm = normalizeEmail(adminEmail);
      if (!map.has(norm)) {
        const id = getEmailDocId(norm);
        const item: AuthorizedEmail = {
          id,
          email: norm,
          addedBy: "Sistema (Administrador)",
          addedAt: new Date().toISOString(),
          role: "admin"
        };
        map.set(norm, item);
        setDoc(doc(db, "authorized_emails", id), item).catch(console.error);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
  } catch (err) {
    console.error("Erro ao buscar e-mails autorizados:", err);
    return PERMANENT_ADMIN_EMAILS.map(email => ({
      id: getEmailDocId(email),
      email: normalizeEmail(email),
      addedBy: "Sistema (Fallback)",
      addedAt: new Date().toISOString(),
      role: "admin"
    }));
  }
}

/**
 * Adds a new email to the authorized_emails collection.
 */
export async function addAuthorizedEmail(newEmail: string, addedByEmail: string): Promise<void> {
  const cleanEmail = normalizeEmail(newEmail);
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Por favor, informe um endereço de e-mail válido.");
  }

  const docId = getEmailDocId(cleanEmail);
  await setDoc(doc(db, "authorized_emails", docId), {
    email: cleanEmail,
    addedBy: addedByEmail || "Administrador",
    addedAt: new Date().toISOString(),
    role: PERMANENT_ADMIN_EMAILS.some(a => normalizeEmail(a) === cleanEmail) ? "admin" : "user"
  });
}

/**
 * Removes an email from the authorized_emails collection.
 */
export async function removeAuthorizedEmail(docId: string): Promise<void> {
  await deleteDoc(doc(db, "authorized_emails", docId));
}

