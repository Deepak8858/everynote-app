// apps/expo/src/app/index.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native'; // StyleSheet removed
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
    // NativeWind for note item
    <Pressable
      className="bg-stone-50 p-3 mb-3 rounded-lg border border-stone-200 active:bg-stone-100 shadow-sm"
      onPress={() => router.push(`/editor?noteId=${item.id}`)}
    >
      <Text className="text-base text-stone-800 mb-1" numberOfLines={3}>{item.content || 'No content'}</Text>
      <Text className="text-xs text-stone-500">
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </Pressable>
  );

  const renderCategoryItem = (category: Category | { id: null; name: 'All' }) => {
    const isSelected = selectedCategoryId === category.id;
    return (
      // NativeWind for category pills
      <Pressable
        key={category.id ?? 'all-category-key'}
        className={`py-2.5 px-4 rounded-full mx-1 justify-center items-center border
                    ${isSelected ? 'bg-pink-600 border-pink-600 active:bg-pink-700' : 'bg-stone-100 border-stone-300 active:bg-stone-200'}`}
        onPress={() => setSelectedCategoryId(category.id)}
      >
        <Text
          className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-stone-700'}`}
        >
          {category.name}
        </Text>
      </Pressable>
    );
  };

  const ListEmptyComponent = () => (
    // NativeWind for empty list component
    <View className="flex-1 justify-center items-center p-4">
      {(isLoading || !userId) ? (
        <ActivityIndicator size="large" color="#db2777" /> // Using a Tailwind pink-600 like color
      ) : (
        <Text className="text-base text-stone-500 text-center">No notes yet. Tap '+' to create one!</Text>
      )}
    </View>
  );

  return (
    // NativeWind for main container
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ title: "My Notes" }} />

      {/* Header with NativeWind */}
      <View className="py-2 border-b border-stone-200">
        {/* Top row for icons */}
        <View className="flex-row justify-end items-center px-3 mb-2">
          <Pressable className="p-1.5 active:bg-stone-200 rounded-full"><Text className="text-2xl">🔍</Text></Pressable>
          <Pressable className="p-1.5 ml-1 active:bg-stone-200 rounded-full"><Text className="text-2xl">📅</Text></Pressable>
          <Pressable className="p-1.5 ml-1 active:bg-stone-200 rounded-full"><Text className="text-2xl">👤</Text></Pressable>
        </View>
        {/* Category Pills ScrollView */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-3 items-center">
          {renderCategoryItem({ id: null, name: 'All' })}
          {categories?.map(cat => renderCategoryItem(cat))}
        </ScrollView>
         {/* Manage Categories Button - Centered below categories */}
        <View className="items-center mt-3 mb-1">
            <Pressable
                className="py-2 px-4 bg-stone-500 active:bg-stone-600 rounded-full shadow-sm"
                onPress={() => router.push('/manage-categories')}
            >
                <Text className="text-white text-xs font-medium">Manage Categories</Text>
            </Pressable>
        </View>
      </View>

      {/* Main Content: Note List */}
      {!userId && !session?.isLoading ? (
         <View className="flex-1 justify-center items-center p-4"><Text className="text-stone-600">Please log in to see your notes.</Text></View>
      ): (
        <FlashList
            data={notes}
            renderItem={renderNoteItem}
            keyExtractor={(item) => item.id}
            estimatedItemSize={90} // Adjusted based on styling
            ListEmptyComponent={ListEmptyComponent}
            contentContainerClassName="p-3" // NativeWind for list padding
        />
      )}

      {/* FAB with NativeWind */}
      <Pressable
        className="absolute bottom-7 right-7 w-14 h-14 rounded-full bg-pink-600 active:bg-pink-700 justify-center items-center shadow-lg"
        onPress={() => router.push('/editor?noteId=new')}
      >
        <Text className="text-white text-3xl pb-1">+</Text>{/* Adjusted for vertical centering */}
      </Pressable>
    </SafeAreaView>
  );
}

// StyleSheet definition is removed
