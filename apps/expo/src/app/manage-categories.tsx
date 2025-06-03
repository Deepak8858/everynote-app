// apps/expo/src/app/manage-categories.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { usePowerSyncWatchedQuery, powerSyncDb } from '@powersync/react-native';
import { authClient } from '~/utils/auth';
import 'react-native-get-random-values'; // For crypto.randomUUID()
import { v4 as uuidv4 } from 'uuid';

interface Category {
  id: string;
  name: string;
  user_id: string;
}

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
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Category name cannot be empty.");
      return;
    }

    // Check for duplicate category name for the same user (case-insensitive for robustness)
    const existingCategory = await powerSyncDb.getOptional<Category>(
        `SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)`,
        [userId, newCategoryName.trim()]
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
        [newCategoryId, newCategoryName.trim(), userId, now]
      );
      setNewCategoryName(''); // Clear input
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
      `Are you sure you want to delete the category "${categoryName}"? Notes in this category will not be deleted but will lose their category assignment.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // PowerSync handles cascading deletes or setting null based on foreign key constraints
              // defined in the DB schema if applicable. Here, we just delete the category.
              // Notes' category_id might become orphaned if not handled by FK 'ON DELETE SET NULL'.
              // The Drizzle schema for notes has 'onDelete: set null' for categoryId.
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
    <View style={styles.categoryItemContainer}>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Pressable onPress={() => handleDeleteCategory(item.id, item.name)} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </Pressable>
    </View>
  );

  if (!userId && !session?.isLoading) {
    // This case should ideally be handled by the root layout redirecting to login
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: "Manage Categories" }} />
            <View style={styles.fullScreenMessageContainer}>
                <Text>Please log in to manage categories.</Text>
                <Button title="Go to Login" onPress={() => router.replace('/login')} />
            </View>
        </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Manage Categories" }} />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="New category name"
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          editable={!isAdding}
        />
        <Button title={isAdding ? "Adding..." : "Add Category"} onPress={handleAddCategory} disabled={isAdding} />
      </View>

      {isLoading && !categories?.length ? ( // Show loader only if loading and no categories are yet displayed
        <View style={styles.fullScreenMessageContainer}><Text>Loading categories...</Text></View>
      ) : categories?.length === 0 ? (
        <View style={styles.fullScreenMessageContainer}><Text>No categories yet. Add one above!</Text></View>
      ) : (
        <FlashList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={50} // Adjust as needed
          contentContainerStyle={styles.listContentContainer}
        />
      )}

      <View style={styles.doneButtonContainer}>
        <Button title="Done" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Light background for the screen
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: 'white',
  },
  listContentContainer: {
    paddingVertical: 8, // Add some padding if items are directly against edges
  },
  categoryItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryName: {
    fontSize: 16,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff4d4d', // A distinct red for delete
    borderRadius: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
  },
  doneButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: 'white', // Consistent background
  },
  fullScreenMessageContainer: { // Used for loading/empty/login messages
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
