// apps/expo/src/types/note.ts
export interface Note {
  id: string; // UUID
  title: string;
  content: string;
  createdAt: number; // Store as Unix timestamp (milliseconds)
  updatedAt: number; // Store as Unix timestamp (milliseconds)
  isSynced?: boolean; // Optional, true if synced with backend, default false
  userId?: string; // Optional, for user-specific notes if auth is used
}
