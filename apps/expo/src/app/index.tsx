// apps/expo/src/app/index.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native'; // Added Platform
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { usePowerSyncWatchedQuery } from '@powersync/react-native';
import { authClient } from '~/utils/auth';

interface Note {
  id: string;
  content: string;
  created_at: string;
  category_id?: string;
}

interface Category {
  id: string;
  name: string;
  user_id: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: categories, isLoading: isLoadingCategories } = usePowerSyncWatchedQuery<Category>(
    `SELECT id, name FROM categories WHERE user_id = ? ORDER BY name ASC`,
    [userId!],
    { enabled: !!userId }
  );

  let notesQuery = `SELECT id, content, created_at, category_id FROM notes WHERE user_id = ?`;
  const queryParams: (string | number)[] = [userId!];

  if (selectedCategoryId) {
    notesQuery += ` AND category_id = ?`;
    queryParams.push(selectedCategoryId);
  }
  notesQuery += ` ORDER BY created_at DESC`;

  const { data: notes, isLoading: isLoadingNotes } = usePowerSyncWatchedQuery<Note>(
    notesQuery,
    queryParams,
    { enabled: !!userId }
  );

  const isLoading = isLoadingCategories || isLoadingNotes;

  const renderNoteItem = ({ item }: { item: Note }) => (
    <Pressable
      // Dark theme for note item
      className="bg-stone-50 dark:bg-stone-800 p-3 mb-3 rounded-lg border border-stone-200 dark:border-stone-700 active:bg-stone-100 dark:active:bg-stone-700 shadow-sm"
      onPress={() => router.push(`/editor?noteId=${item.id}`)}
    >
      <Text className="text-base text-stone-800 dark:text-stone-100 mb-1" numberOfLines={3}>{item.content || 'No content'}</Text>
      <Text className="text-xs text-stone-500 dark:text-stone-400">
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </Pressable>
  );

  const renderCategoryItem = (category: Category | { id: null; name: 'All' }) => {
    const isSelected = selectedCategoryId === category.id;
    return (
      // Dark theme for category pills
      <Pressable
        key={category.id ?? 'all-category-key'}
        className={`py-2.5 px-4 rounded-full mx-1 justify-center items-center border
                    ${isSelected
                      ? 'bg-pink-600 border-pink-600 active:bg-pink-700 dark:bg-pink-500 dark:border-pink-500 dark:active:bg-pink-600'
                      : 'bg-stone-100 border-stone-300 active:bg-stone-200 dark:bg-stone-700 dark:border-stone-600 dark:active:bg-stone-600'}`}
        onPress={() => setSelectedCategoryId(category.id)}
      >
        <Text
          className={`text-sm font-medium ${isSelected ? 'text-white dark:text-gray-100' : 'text-stone-700 dark:text-stone-200'}`}
        >
          {category.name}
        </Text>
      </Pressable>
    );
  };

  const ListEmptyComponent = () => (
    <View className="flex-1 justify-center items-center p-4">
      {(isLoading || !userId) ? (
        <ActivityIndicator size="large" color={Platform.OS === 'android' ? "#db2777" : undefined} /> // Pink color for Android
      ) : (
        // Dark theme for empty list text
        <Text className="text-base text-stone-500 dark:text-stone-400 text-center">No notes yet. Tap '+' to create one!</Text>
      )}
    </View>
  );

  return (
    // Dark theme for main container
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <Stack.Screen options={{ title: "My Notes" }} />

      {/* Header with dark theme */}
      <View className="py-2 border-b border-stone-200 dark:border-stone-700">
        <View className="flex-row justify-end items-center px-3 mb-2">
          {/* Dark theme for header icons */}
          <Pressable className="p-1.5 active:bg-stone-200 dark:active:bg-stone-700 rounded-full">
            <Text className="text-2xl text-stone-700 dark:text-stone-200">🔍</Text>
          </Pressable>
          <Pressable className="p-1.5 ml-1 active:bg-stone-200 dark:active:bg-stone-700 rounded-full">
            <Text className="text-2xl text-stone-700 dark:text-stone-200">📅</Text>
          </Pressable>
          <Pressable className="p-1.5 ml-1 active:bg-stone-200 dark:active:bg-stone-700 rounded-full">
            <Text className="text-2xl text-stone-700 dark:text-stone-200">👤</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-3 items-center">
          {renderCategoryItem({ id: null, name: 'All' })}
          {categories?.map(cat => renderCategoryItem(cat))}
        </ScrollView>
        <View className="items-center mt-3 mb-1">
            <Pressable
                // Dark theme for manage categories button
                className="py-2 px-4 bg-stone-500 active:bg-stone-600 dark:bg-stone-600 dark:active:bg-stone-500 rounded-full shadow-sm"
                onPress={() => router.push('/manage-categories')}
            >
                <Text className="text-white dark:text-gray-100 text-xs font-medium">Manage Categories</Text>
            </Pressable>
        </View>
      </View>

      {!userId && !session?.isLoading ? (
         <View className="flex-1 justify-center items-center p-4">
           <Text className="text-stone-600 dark:text-stone-300">Please log in to see your notes.</Text>
         </View>
      ): (
        <FlashList
            data={notes}
            renderItem={renderNoteItem}
            keyExtractor={(item) => item.id}
            estimatedItemSize={90}
            ListEmptyComponent={ListEmptyComponent}
            contentContainerClassName="p-3" // Applied to FlashList's content container
        />
      )}

      {/* FAB with dark theme (active state might need slight adjustment if bg changes drastically) */}
      <Pressable
        className="absolute bottom-7 right-7 w-14 h-14 rounded-full bg-pink-600 active:bg-pink-700 dark:bg-pink-500 dark:active:bg-pink-600 justify-center items-center shadow-lg"
        onPress={() => router.push('/editor?noteId=new')}
      >
        <Text className="text-white text-3xl pb-1">+</Text>
      </Pressable>
    </SafeAreaView>
  );
}
