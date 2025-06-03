// apps/expo/src/app/_layout.tsx
import "@bacons/text-decoder/install"; // Existing
import React, { useEffect } from 'react'; // Added React and useEffect
import { Stack, useRouter, useSegments } from "expo-router"; // Added useRouter, useSegments
import { StatusBar } from "expo-status-bar"; // Existing
import { useColorScheme } from "nativewind"; // Existing
import { TRPCProvider } from "~/utils/api"; // Existing
import { authClient } from "~/utils/auth"; // Import authClient
import { initializePowerSync, powerSyncDb } from "~/utils/powersync"; // Import PowerSync init and db
import { PowerSyncProvider } from '@powersync/react-native'; // Import PowerSyncProvider

import "../styles.css"; // Existing

// This is the main layout of the app
// It wraps your pages with the providers they need
function RootLayoutNav() {
  const { colorScheme } = useColorScheme(); // Existing, moved into Nav
  const { data: session, isLoading } = authClient.useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Initialize PowerSync on app load
    initializePowerSync().catch(console.error);
  }, []);

  useEffect(() => {
    if (isLoading) return; // Wait for session to load

    const inAuthGroup = segments[0] === 'login';

    if (!session?.user && !inAuthGroup) {
      // Redirect to login if not authenticated and not on login page
      router.replace('/login');
    } else if (session?.user && inAuthGroup) {
      // Redirect to home if authenticated and on login page
      router.replace('/');
    }
  }, [session, isLoading, segments, router]);

  // Conditionally render content based on auth state, or let pages handle their own checks
  // For this setup, we allow Stack to render, and individual pages might show loading/redirect.
  // If session is loading, you might want to show a global loading screen.
  // if (isLoading) {
  //   return <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" /></View>;
  // }

  return (
    <>
      {/* The Stack component displays the current page. */}
      {/* It also allows you to configure your screens  */}
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#f472b6", // Existing style
          },
          contentStyle: {
            backgroundColor: colorScheme === "dark" ? "#09090B" : "#FFFFFF", // Existing style, ensure colorScheme is correct
          },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="editor" options={{ title: "Editor" }} />
        <Stack.Screen name="manage-categories" options={{ title: "Manage Categories" }} />
        {/* Add other common screens here if needed, or define in their own layout files */}
      </Stack>
      <StatusBar />
    </>
  );
}

export default function RootLayout() { // RootLayout now wraps RootLayoutNav with providers
  return (
    <TRPCProvider>
      <PowerSyncProvider db={powerSyncDb}>
        {/* Better Auth provider might be needed here if not already part of TRPCProvider or context */}
        {/* For now, assume authClient.useSession() works globally via context from Better Auth setup */}
        <RootLayoutNav />
      </PowerSyncProvider>
    </TRPCProvider>
  );
}
