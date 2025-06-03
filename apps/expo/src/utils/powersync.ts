// apps/expo/src/utils/powersync.ts
import { PowerSyncDatabase, Schema, Table, Column, Index } from '@powersync/react-native';

// Define columns for the 'notes' table
// PowerSync automatically adds an 'id' column (UUID)
const noteColumns: Column[] = [
  new Column({ name: 'created_at', type: 'TEXT' }), // ISO8601 date string
  new Column({ name: 'updated_at', type: 'TEXT' }), // ISO8601 date string, will be updated by PowerSync on modification
  new Column({ name: 'content', type: 'TEXT' }),    // To store 10tap-editor data (likely JSON string)
  new Column({ name: 'category_id', type: 'TEXT' }), // Foreign key to categories table
  new Column({ name: 'user_id', type: 'TEXT' })      // To associate notes with a user
];

// Define indexes for the 'notes' table
const noteIndexes: Index[] = [
  new Index({ name: 'user_created', columns: ['user_id', 'created_at'] }),
  new Index({ name: 'note_category_idx', columns: ['category_id'] }) // Index for category_id
];

// Create the 'notes' table schema
const noteTable = new Table({
  name: 'notes',
  columns: noteColumns,
  indexes: noteIndexes,
  // local_only: false, // Default, means it syncs. True for local-only tables.
});

// Define columns for the 'categories' table
const categoryColumns: Column[] = [
  new Column({ name: 'name', type: 'TEXT' }),
  new Column({ name: 'user_id', type: 'TEXT' }),
  new Column({ name: 'created_at', type: 'TEXT' }) // ISO8601 date string
];

// Define indexes for the 'categories' table
const categoryIndexes: Index[] = [
  new Index({ name: 'category_user_idx', columns: ['user_id'] })
];

// Create the 'categories' table schema
const categoryTable = new Table({
  name: 'categories',
  columns: categoryColumns,
  indexes: categoryIndexes,
});

// Define the overall schema for PowerSync
// Add other tables here if needed
const schema = new Schema([noteTable, categoryTable]); // Added categoryTable

// Initialize the PowerSync database instance
export const powerSyncDb = new PowerSyncDatabase({
  schema: schema,
  database: { dbName: 'notesapp.powersync.db' }, // Choose a name for the local SQLite file
});

export const initializePowerSync = async () => {
  try {
    // Initialize the PowerSync local database
    await powerSyncDb.init();
    console.log('PowerSync local database initialized.');

    // TODO: Implement backend connection logic in a later step.
    // This will involve getting the PowerSync service URL from your backend deployment
    // and setting up authentication (e.g., passing JWT tokens).
    // Example:
    // await powerSyncDb.connect({
    //   endpoint: 'YOUR_POWERSYNC_BACKEND_URL',
    //   getAccessToken: async () => {
    //     // Fetch your user's authentication token here
    //     // const session = await getSession(); return session?.accessToken;
    //     return 'your_auth_token_placeholder';
    //   }
    // });
    // console.log('PowerSync connection to backend initiated (placeholder).');

  } catch (error) {
    console.error('Failed to initialize or connect PowerSync:', error);
    throw error; // Re-throw to allow calling code to handle
  }
};

// It's crucial to call initializePowerSync() during your app's startup phase.
// For example, in your main App component or root layout effect.
// e.g., in _layout.tsx:
// useEffect(() => {
//   initializePowerSync().catch(console.error);
// }, []);
