# Expo Note-Taking App

## Overview

This is a feature-rich, offline-first mobile note-taking application built with Expo (React Native), PowerSync for data synchronization, and a T3 Turbo monorepo structure. It allows users to create, edit, categorize, and manage notes seamlessly, with data persisting locally and syncing with a backend service when available. The app features a rich text editor for note content and user authentication for personalized note-keeping.

## Features

*   **User Authentication**: Secure sign-in using Google (and placeholder for Apple Sign-In).
*   **Offline-First**: Leverages PowerSync to store all data locally in an SQLite database, allowing full app functionality even without an internet connection.
*   **Real-time Data Sync**: Synchronizes data with a backend service via PowerSync when online.
*   **Rich Text Notes**: Uses the 10tap Editor for creating and editing notes with rich text capabilities.
*   **Note Management**:
    *   Create, view, edit, and delete notes.
    *   List notes with a preview.
*   **Category Management**:
    *   Create, view, and delete categories.
    *   Assign notes to categories.
    *   Filter notes by category.
*   **Dark Mode**: The application supports both light and dark themes, adapting to system settings.
*   **Cross-Platform**: Built with Expo for compatibility with both iOS and Android.

## Setup

### Prerequisites

*   Node.js (version specified in root `package.json`, e.g., `>=20.16.0`)
*   pnpm (version specified in root `package.json`, e.g., `^9.6.0`)
*   Expo CLI: `npm install -g expo-cli` (or `pnpm add -g expo-cli`)
*   An available PostgreSQL database instance.
*   A configured PowerSync backend service instance. (Details for setting this up are beyond this README, refer to PowerSync documentation).

### Environment Variables

The application requires certain environment variables to be set up for database connections and authentication. These are typically managed in a `.env` file in the monorepo root. Refer to the main project README and `packages/auth/env.ts` or `packages/db/src/client.ts` for required variables.

Example variables needed:

*   `DATABASE_URL`: PostgreSQL connection string for Drizzle ORM.
*   `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: For authentication (Better Auth, NextAuth.js based).
*   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: For Google Sign-In.
*   `POWERSYNC_URL`: The endpoint for your PowerSync backend instance. (This will be used later when connecting PowerSync SDK to the backend).

Create a `.env` file in the root of the monorepo:
```env
# Example .env file
DATABASE_URL="postgresql://user:password@host:port/database"

# For Better Auth / NextAuth.js
NEXTAUTH_URL="http://localhost:3000" # Or your app's URL
NEXTAUTH_SECRET="your_super_secret_key_here"

# Google OAuth Credentials (ensure these are for a Native/Mobile OAuth Client)
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# PowerSync Backend URL (to be configured later in app code)
# POWERSYNC_URL="your_powersync_instance_url"
```
**Note**: For mobile app OAuth (like Google Sign-In in Expo), ensure your OAuth credentials (Client ID) are configured for iOS and Android, not just web. This might involve setting up specific bundle IDs or package names in your Google Cloud Console.

### Database Setup (PostgreSQL with Drizzle ORM)

1.  **Ensure PostgreSQL is running** and you have connection details.
2.  **Set `DATABASE_URL`**: Make sure your `.env` file at the monorepo root has the correct `DATABASE_URL`.
3.  **Run Migrations**: From the root of the monorepo, apply schema changes to your database:
    ```bash
    pnpm db:push
    ```
    This command uses Drizzle Kit to push the schema defined in `packages/db/src/schema.ts` (which includes `app-schema.ts` and `auth-schema.ts`) to your PostgreSQL database.

### PowerSync Backend Configuration

This application uses PowerSync for data synchronization. You need a PowerSync backend instance connected to your PostgreSQL database.

1.  **Deploy a PowerSync instance**: Follow the [PowerSync documentation](https://docs.powersync.com/) to set up and deploy a PowerSync service connected to your PostgreSQL database. This typically involves configuring PowerSync to recognize your database schema (especially the `notes` and `categories` tables, and any auth-related tables like `users`, `sessions`, `accounts`).
2.  **Obtain PowerSync URL**: Once deployed, you will get a URL for your PowerSync instance. This URL will be used by the Expo app to connect to PowerSync.
3.  **Schema Mapping**: Ensure the tables and columns defined in `packages/db/src/app-schema.ts` (e.g., `notes`, `categories`) and `packages/db/src/auth-schema.ts` are correctly mapped and synchronized by your PowerSync instance configuration. PowerSync needs to be aware of these tables to sync them. The schema in `apps/expo/src/utils/powersync.ts` must also align with what PowerSync backend is configured to sync.

### Running the App

1.  **Install Dependencies**: From the root of the monorepo:
    ```bash
    pnpm install
    ```
2.  **Start the Expo Development Server**:
    ```bash
    pnpm -F @acme/expo dev
    ```
    Or, if you are in the `apps/expo` directory:
    ```bash
    pnpm dev
    ```
3.  **Run on Device/Simulator**:
    *   Press `i` to open in an iOS simulator.
    *   Press `a` to open in an Android emulator/device.
    *   Scan the QR code with the Expo Go app on your physical device (if not using dev client).
    *   **Note**: For features like OAuth and PowerSync, using a development build (`expo prebuild` or `eas build`) might be necessary for full functionality on physical devices, especially if custom native code or specific entitlements are involved. The current setup uses `expo-dev-client`.

## Project Structure (Expo App - `apps/expo`)

*   `src/`: Main source code directory.
    *   `app/`: Expo Router file-based routing. Screens and layouts are defined here.
        *   `_layout.tsx`: Root layout, handles global providers (TRPC, PowerSync, Auth) and navigation structure.
        *   `index.tsx`: Home screen (notes list, category filters).
        *   `login.tsx`: Login screen.
        *   `editor.tsx`: Note editor screen.
        *   `manage-categories.tsx`: Screen for managing categories.
    *   `assets/`: Static assets like icons and images.
    *   `styles.css`: Global stylesheet for NativeWind.
    *   `types/`: TypeScript type definitions.
        *   `10tap-editor.d.ts`: Type declarations for the rich text editor.
        *   `note.ts`: (Previously used for local SQLite, now schema is more driven by PowerSync and DB package).
    *   `utils/`: Utility functions and configurations.
        *   `api.ts`: TRPC client setup.
        *   `auth.ts`: Authentication client setup (`better-auth`).
        *   `powersync.ts`: PowerSync database and schema setup for the client-side SQLite.
*   `app.config.ts`: Expo app configuration.
*   `babel.config.js`: Babel configuration.
*   `metro.config.js`: Metro bundler configuration.
*   `tailwind.config.ts`: NativeWind (Tailwind CSS) configuration.

## Technologies Used

*   **React Native & Expo**: For cross-platform mobile app development.
*   **Expo Router**: File-system based routing for navigation.
*   **PowerSync**: Offline-first data synchronization service.
    *   `@powersync/react-native`: PowerSync React Native SDK.
*   **Drizzle ORM**: TypeScript ORM for interacting with the PostgreSQL database (used by the backend, schema defined in `packages/db`).
*   **TRPC**: For type-safe API communication (if backend APIs beyond PowerSync sync are used).
*   **NativeWind**: Tailwind CSS for React Native.
*   **Better Auth**: Authentication handling, built on NextAuth.js patterns.
*   **10tap Editor (`@10play/tentap-editor`)**: Rich text editor component.
*   **TypeScript**: For static typing.
*   **PNPM Workspaces**: Monorepo management.
*   **TurboRepo**: High-performance build system for monorepos.

```
