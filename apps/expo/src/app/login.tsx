// apps/expo/src/app/login.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authClient, signIn } from '~/utils/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { data: session, isLoading } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      router.replace('/');
    }
  }, [session, router]);

  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({ provider: 'google', callbackURL: "/" });
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  };

  if (isLoading || session?.user) {
    return (
      // Dark theme for loading state container
      <SafeAreaView className="flex-1 bg-gray-100 dark:bg-black justify-center items-center">
        {/* ActivityIndicator color can be managed by a theme provider or conditional props if needed */}
        {/* For now, using a color that works on both light/dark or relying on system default if not specified */}
        <ActivityIndicator size="large" color={Platform.OS === 'android' ? "#db2777" : undefined} />
      </SafeAreaView>
    );
  }

  return (
    // Dark theme for main container
    <SafeAreaView className="flex-1 bg-gray-100 dark:bg-black justify-center items-center p-4">
      {/* Dark theme for content box */}
      <View className="w-full max-w-sm items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
        {/* Dark theme for title and subtitle text */}
        <Text className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Welcome</Text>
        <Text className="text-base mb-8 text-gray-600 dark:text-gray-300">Sign in to continue</Text>

        {/* Google Sign-In Button - distinct styling */}
        {/* Google's branding guidelines often show a white button with colored logo, or a blue button. */}
        {/* Using a common pattern: white button on light, slightly darker on dark mode for visibility. */}
        <Pressable
          className="w-full py-3.5 rounded-lg items-center mb-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm active:bg-gray-50 dark:active:bg-gray-600"
          onPress={handleGoogleSignIn}
        >
          {/* Placeholder for Google Icon would go here */}
          <Text className="text-gray-700 dark:text-white text-base font-semibold">Sign in with Google</Text>
        </Pressable>

        {/* Apple Sign-In Button - now blue, as requested */}
        <Pressable
          className="w-full py-3.5 rounded-lg items-center bg-blue-600 active:bg-blue-700 dark:bg-blue-500 dark:active:bg-blue-600 shadow-sm"
          onPress={() => alert('Apple Sign-In (UI Only)')}
        >
          {/* Placeholder for Apple Icon would go here */}
          <Text className="text-white text-base font-semibold">Sign in with Apple</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
