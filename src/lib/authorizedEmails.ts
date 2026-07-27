import { collection, getDocs, setDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

export interface AuthorizedEmail {
  id: string;
  email: string;
  addedBy?: string;
  addedAt?: string;
}

const DEFAULT_ADMIN_EMAIL = "thiagovinicius7@gmail.com";

/**
 * Checks if the given email is authorized in Firestore.
 * If the collection is empty, seeds the DEFAULT_ADMIN_EMAIL and current email.
 */
export async function isEmailAuthorized(email: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const colRef = collection(db, "authorized_emails");
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.log("authorized_emails collection empty. Seeding initial authorized emails...");
      // Seed default admin email and the first logging user
      const initialEmails = Array.from(new Set([DEFAULT_ADMIN_EMAIL.toLowerCase(), cleanEmail]));
      for (const mail of initialEmails) {
        const docId = mail.replace(/[^a-zA-Z0-9_.]/g, "_");
        await setDoc(doc(db, "authorized_emails", docId), {
          email: mail,
          addedBy: "Sistema (Inicialização)",
          addedAt: new Date().toISOString()
        });
      }
      return true;
    }

    // Check if cleanEmail exists in existing documents
    const docs = snapshot.docs.map(d => d.data());
    const isAllowed = docs.some(d => d.email && d.email.trim().toLowerCase() === cleanEmail);

    // Always ensure default admin email remains allowed if needed
    if (!isAllowed && cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      const docId = cleanEmail.replace(/[^a-zA-Z0-9_.]/g, "_");
      await setDoc(doc(db, "authorized_emails", docId), {
        email: cleanEmail,
        addedBy: "Sistema (Admin Principal)",
        addedAt: new Date().toISOString()
      });
      return true;
    }

    return isAllowed;
  } catch (err) {
    console.error("Erro ao verificar e-mail autorizado:", err);
    // In case of Firestore read issues, allow owner/admin email as fallback
    if (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) return true;
    return false;
  }
}

/**
 * Fetches all authorized emails from Firestore.
 */
export async function getAuthorizedEmails(): Promise<AuthorizedEmail[]> {
  try {
    const colRef = collection(db, "authorized_emails");
    const snapshot = await getDocs(colRef);
    const list: AuthorizedEmail[] = snapshot.docs.map(d => ({
      id: d.id,
      email: d.data().email || "",
      addedBy: d.data().addedBy,
      addedAt: d.data().addedAt
    }));

    // Ensure default admin is in list if list is empty
    if (list.length === 0) {
      list.push({
        id: DEFAULT_ADMIN_EMAIL.replace(/[^a-zA-Z0-9_.]/g, "_"),
        email: DEFAULT_ADMIN_EMAIL,
        addedBy: "Sistema",
        addedAt: new Date().toISOString()
      });
    }

    return list.sort((a, b) => a.email.localeCompare(b.email));
  } catch (err) {
    console.error("Erro ao buscar e-mails autorizados:", err);
    return [{
      id: DEFAULT_ADMIN_EMAIL.replace(/[^a-zA-Z0-9_.]/g, "_"),
      email: DEFAULT_ADMIN_EMAIL,
      addedBy: "Sistema (Fallback)",
      addedAt: new Date().toISOString()
    }];
  }
}

/**
 * Adds a new email to the authorized_emails collection.
 */
export async function addAuthorizedEmail(newEmail: string, addedByEmail: string): Promise<void> {
  const cleanEmail = newEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Por favor, informe um endereço de e-mail válido.");
  }

  const docId = cleanEmail.replace(/[^a-zA-Z0-9_.]/g, "_");
  await setDoc(doc(db, "authorized_emails", docId), {
    email: cleanEmail,
    addedBy: addedByEmail || "Administrador",
    addedAt: new Date().toISOString()
  });
}

/**
 * Removes an email from the authorized_emails collection.
 */
export async function removeAuthorizedEmail(docId: string): Promise<void> {
  await deleteDoc(doc(db, "authorized_emails", docId));
}
