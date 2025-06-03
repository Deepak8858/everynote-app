// apps/expo/src/app/manage-categories.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { usePowerSyncWatchedQuery, powerSyncDb } from '@powersync/react-native';
import { authClient } from '~/utils/auth';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface Category {
  id: string;
  name: string;
  user_id: string;
}

// Reusable Styled Button for consistency (optional, could be inline)
const StyledAppButton = ({ title, onPress, disabled, variant = 'primary', customClassName = '' }: { title: string, onPress: () => void, disabled?: boolean, variant?: 'primary' | 'delete' | 'neutral', customClassName?: string }) => {
  let baseClasses = "py-2.5 px-4 rounded-lg items-center justify-center shadow-sm ";
  let textClasses = "text-sm font-semibold ";

  if (disabled) {
    baseClasses += "bg-stone-200 dark:bg-stone-700 ";
    textClasses += "text-stone-400 dark:text-stone-500 ";
  } else {
    switch (variant) {
      case 'delete':
        baseClasses += "bg-red-600 active:bg-red-700 dark:bg-red-500 dark:active:bg-red-600 ";
        textClasses += "text-white ";
        break;
      case 'neutral':
        baseClasses += "bg-stone-500 active:bg-stone-600 dark:bg-stone-600 dark:active:bg-stone-500 ";
        textClasses += "text-white ";
        break;
      default: // primary
        baseClasses += "bg-pink-600 active:bg-pink-700 dark:bg-pink-500 dark:active:bg-pink-600 ";
        textClasses += "text-white ";
        break;
    }
  }
  baseClasses += customClassName;

  return (
    <Pressable onPress={onPress} disabled={disabled} className={baseClasses}>
      <Text className={textClasses}>{title}</Text>
    </Pressable>
  );
};


export default function ManageCategoriesScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: categories, isLoading } = usePowerSyncWatchedQuery<Category>(
    `SELECT id, name FROM categories WHERE user_id = ? ORDER BY name ASC`,
    [userId!],
    { enabled: !!userId }
  );

  const handleAddCategory = async () => {
    if (!userId) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Category name cannot be empty.");
      return;
    }
    const existingCategory = await powerSyncDb.getOptional<Category>(
        `SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)`,
        [userId, trimmedName]
    );
    if (existingCategory) {
        Alert.alert("Duplicate Category", "A category with this name already exists.");
        return;
    }
    setIsAdding(true);
    const now = new Date().toISOString();
    const newCategoryId = uuidv4();
    try {
      await powerSyncDb.execute(
        `INSERT INTO categories (id, name, user_id, created_at) VALUES (?, ?, ?, ?)`,
        [newCategoryId, trimmedName, userId, now]
      );
      setNewCategoryName('');
    } catch (error) {
      console.error("Error adding category:", error);
      Alert.alert("Error", "Failed to add category.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete the category "${categoryName}"? Notes in this category will lose their category assignment.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await powerSyncDb.execute(`DELETE FROM categories WHERE id = ? AND user_id = ?`, [categoryId, userId!]);
            } catch (error) {
              console.error("Error deleting category:", error);
              Alert.alert("Error", "Failed to delete category.");
            }
          },
        },
      ]
    );
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View className="flex-row justify-between items-center py-3.5 px-4 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
      <Text className="text-base text-stone-800 dark:text-stone-100 flex-1" numberOfLines={1}>{item.name}</Text>
      <StyledAppButton title="Delete" onPress={() => handleDeleteCategory(item.id, item.name)} variant="delete" customClassName="px-3 py-1.5 ml-2" />
    </View>
  );

  if (!userId && !session?.isLoading) {
    return (
        <SafeAreaView className="flex-1 bg-stone-100 dark:bg-black">
            <Stack.Screen options={{ title: "Manage Categories" }} />
            <View className="flex-1 justify-center items-center p-4">
                <Text className="text-stone-700 dark:text-stone-200 mb-4 text-center">Please log in to manage categories.</Text>
                <StyledAppButton title="Go to Login" onPress={() => router.replace('/login')} customClassName="w-1/2" />
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-100 dark:bg-black">
      <Stack.Screen options={{ title: "Manage Categories" }} />

      <View className="flex-row p-3 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 items-center shadow-sm">
        <TextInput
          className="flex-1 border border-stone-300 dark:border-stone-600 rounded-md py-2 px-3 mr-2 text-base text-stone-900 dark:text-white bg-white dark:bg-stone-700 placeholder-stone-500 dark:placeholder-stone-400"
          placeholder="New category name"
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          editable={!isAdding}
          placeholderTextColor={Platform.OS === 'android' ? (useColorScheme().colorScheme === 'dark' ? '#a1a1aa': '#78716c') : undefined}
        />
        <StyledAppButton title={isAdding ? "Adding..." : "Add"} onPress={handleAddCategory} disabled={isAdding} customClassName="px-5" />
      </View>

      {isLoading && !categories?.length ? (
        <View className="flex-1 justify-center items-center p-4">
          <ActivityIndicator size="large" color={Platform.OS === 'android' ? "#db2777" : undefined} />
          <Text className="mt-2 text-stone-600 dark:text-stone-300">Loading categories...</Text>
        </View>
      ) : categories?.length === 0 ? (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-stone-600 dark:text-stone-300 text-center">No categories yet. Add one above!</Text>
        </View>
      ) : (
        <FlashList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={56} // Adjusted for new item height
          contentContainerClassName="py-2"
        />
      )}

      <View className="p-3 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-sm">
        <StyledAppButton title="Done" onPress={() => router.back()} variant="neutral" customClassName="w-full" />
      </View>
    </SafeAreaView>
  );
}
