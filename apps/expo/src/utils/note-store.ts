// apps/expo/src/utils/note-store.ts
import * as SQLite from 'expo-sqlite';
import 'react-native-get-random-values'; // Required for uuid
import { v4 as uuidv4 } from 'uuid';
import type { Note } from '../types/note'; // Adjust path if necessary

// Function to open or create the database
function openDatabase() {
  if (globalThis.navigator && globalThis.navigator.product === 'ReactNative') {
    return SQLite.openDatabase('notes.db');
  }
  // Fallback for environments where SQLite might not be available or needed (e.g., web testing mocks)
  // This mock implementation should be more robust for actual testing.
  return {
    transaction: (txCallback: (tx: SQLite.SQLTransaction) => void) => {
      console.warn("SQLite mock transaction called. DB operations will not persist.");
      // Mock transaction object
      const mockTx: SQLite.SQLTransaction = {
        executeSql: (sqlStatement: string, args?: (string | number | null)[], callback?: SQLite.SQLStatementCallback | undefined, errorCallback?: SQLite.SQLStatementErrorCallback | undefined) => {
          console.log("Mock executeSql:", sqlStatement, args);
          if (callback) {
            // Simulate a successful execution with an empty result set or mock data
            callback(mockTx, { rowsAffected: 0, insertId: undefined, rows: { _array: [], length: 0, item: (idx: number) => null } });
          }
        }
      };
      txCallback(mockTx);
    }
  } as unknown as SQLite.SQLiteDatabase;
}

const db = openDatabase();

export const initDb = () => {
  return new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          isSynced INTEGER DEFAULT 0,
          userId TEXT
        );`,
        [],
        () => resolve(),
        (_, error) => {
          console.error("Error creating notes table:", error);
          reject(error);
          return true; // Stop propagation
        }
      );
    });
  });
};

export const addNote = async (noteData: Pick<Note, 'title' | 'content' | 'userId'>): Promise<Note> => {
  const now = Date.now();
  const newNote: Note = {
    id: uuidv4(),
    ...noteData,
    createdAt: now,
    updatedAt: now,
    isSynced: false,
  };

  return new Promise<Note>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO notes (id, title, content, createdAt, updatedAt, isSynced, userId) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [newNote.id, newNote.title, newNote.content, newNote.createdAt, newNote.updatedAt, newNote.isSynced ? 1 : 0, newNote.userId || null],
        () => resolve(newNote),
        (_, error) => {
          console.error("Error adding note:", error);
          reject(error);
          return true; // Stop propagation
        }
      );
    });
  });
};

export const getNoteById = async (id: string): Promise<Note | null> => {
  return new Promise<Note | null>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM notes WHERE id = ?;',
        [id],
        (_, { rows }) => {
          if (rows.length > 0) {
            const note = rows.item(0) as Note;
            resolve({ ...note, isSynced: !!note.isSynced });
          } else {
            resolve(null);
          }
        },
        (_, error) => {
          console.error("Error getting note by ID:", error);
          reject(error);
          return true; // Stop propagation
        }
      );
    });
  });
};

export const getAllNotes = async (userId?: string): Promise<Note[]> => {
  return new Promise<Note[]>((resolve, reject) => {
    db.transaction(tx => {
      let query = 'SELECT * FROM notes ORDER BY updatedAt DESC;';
      const params: (string | number)[] = [];
      if (userId) {
        query = 'SELECT * FROM notes WHERE userId = ? ORDER BY updatedAt DESC;';
        params.push(userId);
      }
      tx.executeSql(
        query,
        params,
        (_, { rows }) => {
          const notes: Note[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            notes.push({ ...row, isSynced: !!row.isSynced });
          }
          resolve(notes);
        },
        (_, error) => {
          console.error("Error getting all notes:", error);
          reject(error);
          return true; // Stop propagation
        }
      );
    });
  });
};

export const updateNote = async (noteUpdate: Partial<Note> & { id: string }): Promise<Note | null> => {
  const now = Date.now();
  // Determine if content-related fields are changing, to reset isSynced
  const { id, title, content, ...otherProps } = noteUpdate;
  const isContentChanged = title !== undefined || content !== undefined;

  return new Promise<Note | null>((resolve, reject) => {
    db.transaction(async tx => { // Mark transaction as async
      // First, fetch the current note to check if it exists
      tx.executeSql(
        'SELECT * FROM notes WHERE id = ?;',
        [id],
        async (_, { rows }) => { // Mark callback as async
          if (rows.length === 0) {
            resolve(null); // Note not found
            return;
          }

          const currentNote = rows.item(0);
          const newIsSyncedValue = isContentChanged ? 0 : (noteUpdate.isSynced !== undefined ? (noteUpdate.isSynced ? 1 : 0) : currentNote.isSynced);

          let updateQuery = 'UPDATE notes SET updatedAt = ?';
          const params: (string | number | null)[] = [now];

          const updateFields: (keyof Note)[] = ['title', 'content', 'userId', 'isSynced']; // Add other updatable fields from Note
          updateFields.forEach(field => {
            if (noteUpdate[field] !== undefined) {
              updateQuery += `, ${field} = ?`;
              if (field === 'isSynced') {
                params.push(newIsSyncedValue);
              } else {
                params.push(noteUpdate[field] as string | number);
              }
            }
          });
          // If only isSynced is explicitly set and no content change, ensure it's part of the query
          if (noteUpdate.isSynced !== undefined && !updateQuery.includes('isSynced = ?')) {
             updateQuery += `, isSynced = ?`;
             params.push(newIsSyncedValue);
          }


          updateQuery += ' WHERE id = ?;';
          params.push(id);

          tx.executeSql(
            updateQuery,
            params,
            async () => { // Mark callback as async
              // Fetch the updated note
              tx.executeSql(
                'SELECT * FROM notes WHERE id = ?;',
                [id],
                (_, { rows: updatedRows }) => {
                  if (updatedRows.length > 0) {
                    const updatedNote = updatedRows.item(0) as Note;
                    resolve({ ...updatedNote, isSynced: !!updatedNote.isSynced });
                  } else {
                    resolve(null); // Should not happen if update was successful
                  }
                },
                (_, error) => { // Error fetching updated note
                  console.error("Error fetching updated note after update:", error);
                  reject(error);
                  return true;
                }
              );
            },
            (_, error) => { // Error updating note
              console.error("Error updating note:", error);
              reject(error);
              return true;
            }
          );
        },
        (_, error) => { // Error fetching current note
            console.error("Error fetching note for update:", error);
            reject(error);
            return true;
        }
      );
    });
  });
};

export const deleteNote = async (id: string): Promise<boolean> => {
  return new Promise<boolean>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM notes WHERE id = ?;',
        [id],
        (_, { rowsAffected }) => {
          resolve(rowsAffected > 0);
        },
        (_, error) => {
          console.error("Error deleting note:", error);
          reject(error);
          return true; // Stop propagation
        }
      );
    });
  });
};

export const getUnsyncedNotes = async (userId?: string): Promise<Note[]> => {
 return new Promise<Note[]>((resolve, reject) => {
    db.transaction(tx => {
      let query = 'SELECT * FROM notes WHERE isSynced = 0 ORDER BY updatedAt ASC;';
      const params: (string | number)[] = [];
      if (userId) {
        query = 'SELECT * FROM notes WHERE isSynced = 0 AND userId = ? ORDER BY updatedAt ASC;';
        params.push(userId);
      }
      tx.executeSql(
        query,
        params,
        (_, { rows }) => {
          const notes: Note[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            notes.push({ ...row, isSynced: !!row.isSynced });
          }
          resolve(notes);
        },
        (_, error) => {
          console.error("Error getting unsynced notes:", error);
          reject(error);
          return true; // Stop propagation
        }
      );
    });
  });
};

export const markNoteAsSynced = async (id: string): Promise<boolean> => {
 return new Promise<boolean>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE notes SET isSynced = 1 WHERE id = ?;',
        [id],
        (_, { rowsAffected }) => {
          resolve(rowsAffected > 0);
        },
        (_, error) => {
          console.error("Error marking note as synced:", error);
          reject(error);
          return true; // Stop propagation
        }
      );
    });
  });
};
