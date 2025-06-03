// apps/expo/src/app/login.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native'; // StyleSheet removed
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
      // Applied NativeWind classes to SafeAreaView
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />{/* Tailwind color classes don't apply to ActivityIndicator directly */}
      </SafeAreaView>
    );
  }

  return (
    // Applied NativeWind classes
    <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
      <View className="w-4/5 items-center p-5 bg-white rounded-lg shadow-lg">
        <Text className="text-3xl font-bold mb-2 text-gray-800">Welcome</Text>
        <Text className="text-base mb-8 text-gray-600">Sign in to continue</Text>

        <Pressable
          className="w-full py-3.5 rounded-lg items-center mb-4 bg-blue-600 active:bg-blue-700" // Google blue like color
          onPress={handleGoogleSignIn}
        >
          <Text className="text-white text-base font-semibold">Sign in with Google</Text>
        </Pressable>

        <Pressable
          className="w-full py-3.5 rounded-lg items-center bg-black active:bg-gray-800" // Apple black
          onPress={() => alert('Apple Sign-In (UI Only)')}
        >
          <Text className="text-white text-base font-semibold">Sign in with Apple</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// StyleSheet definition is removed
