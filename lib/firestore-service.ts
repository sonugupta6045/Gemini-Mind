import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { db } from "./firebase";
import { JournalEntry } from "./types";

/**
 * Strips all undefined fields recursively from an object before saving to Firestore.
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        cleaned[key] = cleanForFirestore(value);
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map((item) =>
          item !== null && typeof item === "object" ? cleanForFirestore(item) : item
        ).filter(item => item !== undefined);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as T;
}

/**
 * Subscribes to all journal entries for the authenticated user.
 */
export function subscribeUserJournals(
  userId: string,
  callback: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const journalsRef = collection(db, "users", userId, "journals");
  const q = query(journalsRef, orderBy("updatedAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(entries);
    },
    (error) => {
      console.error("[Firestore subscribe error]:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves or updates a journal entry for the user.
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) throw new Error("User ID is required to save journal entry.");
  const entryRef = doc(db, "users", userId, "journals", entry.id);
  const dataToSave = cleanForFirestore({
    ...entry,
    userId,
    updatedAt: Date.now(),
  });
  await setDoc(entryRef, dataToSave, { merge: true });
}

/**
 * Deletes a journal entry.
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) return;
  const entryRef = doc(db, "users", userId, "journals", entryId);
  await deleteDoc(entryRef);
}
