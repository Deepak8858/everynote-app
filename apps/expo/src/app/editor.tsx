// apps/expo/src/app/editor.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import TenTapEditor, { Toolbar, useEditorBridge } from '@10play/tentap-editor';
import { powerSyncDb, usePowerSyncWatchedQuery } from '@powersync/react-native';
import { authClient } from '~/utils/auth';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useColorScheme } from "nativewind"; // Import useColorScheme

interface Note {
  id: string;
  content?: string;
  user_id: string;
  category_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
}

export default function EditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ noteId?: string }>();
  const noteIdFromParams = params.noteId;

  const { colorScheme } = useColorScheme(); // Get current color scheme
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  const isNewNote = noteIdFromParams === 'new' || !noteIdFromParams;

  const { data: categories, isLoading: isLoadingCategories } = usePowerSyncWatchedQuery<Category>(
    `SELECT id, name FROM categories WHERE user_id = ? ORDER BY name ASC`,
    [userId!],
    { enabled: !!userId }
  );

  const editor = useEditorBridge({
    autofocus: true,
    initialContent: content,
  });

  useEffect(() => {
    const loadNote = async () => {
      if (!isNewNote && noteIdFromParams && userId) {
        setIsLoadingNote(true);
        try {
          const note = await powerSyncDb.getOptional<Note>(
            `SELECT id, content, category_id FROM notes WHERE id = ? AND user_id = ?`,
            [noteIdFromParams, userId]
          );
          if (note) {
            setCurrentNote(note);
            const noteContent = note.content || '';
            setContent(noteContent);
            setSelectedCategoryId(note.category_id || null);
            if(editor && noteContent !== editor.getHTML()) {
                editor.setContent(noteContent);
            }
          } else {
            Alert.alert("Error", "Note not found or access denied.");
            router.back();
          }
        } catch (error) {
          console.error("Error loading note:", error);
          Alert.alert("Error", "Failed to load note.");
          router.back();
        } finally {
          setIsLoadingNote(false);
        }
      } else if (isNewNote) {
        const initialEmptyContent = '';
        setContent(initialEmptyContent);
        setSelectedCategoryId(null);
        if(editor) editor.setContent(initialEmptyContent);
      }
    };

    if (userId) {
      loadNote();
    } else if (!session && !authClient.isLoading) {
      Alert.alert("Authentication Error", "You must be logged in to edit notes.");
      router.replace('/login');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteIdFromParams, userId, isNewNote, router, session]);

  const handleSave = async () => {
    if (!userId) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }
    const editorContent = editor?.getHTML() || '';
    if (!editorContent.trim() && isNewNote) {
      Alert.alert("Cannot Save", "Content cannot be empty for a new note.");
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();

    try {
      if (isNewNote) {
        const newNoteId = uuidv4();
        await powerSyncDb.execute(
          `INSERT INTO notes (id, content, user_id, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [newNoteId, editorContent, userId, selectedCategoryId, now, now]
        );
        Alert.alert("Success", "Note saved!");
      } else if (currentNote) {
        await powerSyncDb.execute(
          `UPDATE notes SET content = ?, category_id = ?, updated_at = ? WHERE id = ?`,
          [editorContent, selectedCategoryId, now, currentNote.id]
        );
        Alert.alert("Success", "Note updated!");
      }
      router.back();
    } catch (error) {
      console.error("Error saving note:", error);
      Alert.alert("Error", "Failed to save note.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNewNote || !currentNote) {
      Alert.alert("Error", "No note to delete.");
      return;
    }
    Alert.alert("Confirm Delete", "Are you sure you want to delete this note?",
      [{ text: "Cancel", style: "cancel" },{
        text: "Delete", style: "destructive",
        onPress: async () => {
          setIsDeleting(true);
          try {
            await powerSyncDb.execute(`DELETE FROM notes WHERE id = ?`, [currentNote.id]);
            Alert.alert("Success", "Note deleted!");
            router.back();
          } catch (error) {
            console.error("Error deleting note:", error);
            Alert.alert("Error", "Failed to delete note.");
          } finally {
            setIsDeleting(false);
          }
        },
      },]
    );
  };

  const isPageLoading = isLoadingNote || (!!userId && isLoadingCategories && !categories);

  if (isPageLoading && !currentNote && !isNewNote) {
    return <SafeAreaView className="flex-1 bg-white dark:bg-black justify-center items-center"><ActivityIndicator size="large" color={Platform.OS === 'android' ? "#db2777" : undefined} /></SafeAreaView>;
  }
  if (!userId && !session?.isLoading) {
    return <SafeAreaView className="flex-1 bg-white dark:bg-black justify-center items-center"><Text className="text-stone-700 dark:text-stone-200">Redirecting to login...</Text></SafeAreaView>;
  }

  const renderCategoryPill = (category: Category | { id: null; name: 'No Category' }) => {
    const isSelected = selectedCategoryId === category.id;
    return (
      <Pressable
        key={category.id ?? 'no-category-key'}
        className={`py-2 px-3.5 rounded-full mx-1 border
                    ${isSelected
                      ? 'bg-pink-600 border-pink-600 active:bg-pink-700 dark:bg-pink-500 dark:border-pink-500 dark:active:bg-pink-600'
                      : 'bg-stone-100 border-stone-300 active:bg-stone-200 dark:bg-stone-700 dark:border-stone-600 dark:active:bg-stone-600'}`}
        onPress={() => setSelectedCategoryId(category.id)}
      >
        <Text className={`text-xs font-medium ${isSelected ? 'text-white dark:text-gray-100' : 'text-stone-700 dark:text-stone-200'}`}>
          {category.name}
        </Text>
      </Pressable>
    );
  };

  // Button components for consistent styling
  const StyledButton = ({ title, onPress, disabled, color, isDelete = false }: { title: string, onPress: () => void, disabled?: boolean, color?: string, isDelete?: boolean }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 py-3 rounded-lg items-center mx-1 shadow-sm
                  ${disabled ? 'bg-gray-300 dark:bg-gray-600' :
                    isDelete ? 'bg-red-600 active:bg-red-700 dark:bg-red-500 dark:active:bg-red-600' :
                               'bg-blue-600 active:bg-blue-700 dark:bg-blue-500 dark:active:bg-blue-600'}`}
    >
      <Text className={`text-base font-semibold ${disabled ? 'text-gray-500 dark:text-gray-400' : 'text-white'}`}>{title}</Text>
    </Pressable>
  );


  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <Stack.Screen options={{ title: isNewNote ? "New Note" : "Edit Note" }} />
      <View className="flex-1 p-4">
        <Text className="text-xl font-bold mb-2 text-center text-stone-900 dark:text-white">
          {isNewNote ? "Create New Note" : `Editing Note`}
        </Text>

        <View className="mb-3">
          <Text className="text-base font-medium mb-1.5 text-stone-700 dark:text-stone-200">Category:</Text>
          {isLoadingCategories && !categories ? <ActivityIndicator color={Platform.OS === 'android' ? "#db2777" : undefined} /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row items-center py-1">
              {renderCategoryPill({ id: null, name: 'No Category' })}
              {categories?.map(cat => renderCategoryPill(cat))}
            </ScrollView>
          )}
        </View>

        <View className="flex-1 border border-stone-300 dark:border-stone-600 rounded-lg mb-4 overflow-hidden bg-white dark:bg-stone-800">
          {editor ? (
            <TenTapEditor
              editor={editor}
              theme={colorScheme === "dark" ? "dark" : "light"} // Pass theme prop
            />
          ) : <View className="flex-1 justify-center items-center"><ActivityIndicator size="large" color={Platform.OS === 'android' ? "#db2777" : undefined} /></View> }
        </View>

        <View className="flex-row justify-around mb-2">
          <StyledButton title={isSaving ? "Saving..." : "Save Note"} onPress={handleSave} disabled={isSaving || isDeleting || !editor} />
          {!isNewNote && currentNote && (
             <StyledButton title={isDeleting ? "Deleting..." : "Delete Note"} onPress={handleDelete} disabled={isSaving || isDeleting || !editor} isDelete={true} />
          )}
        </View>
         <StyledButton title="Back to Home" onPress={() => router.back()} disabled={isSaving || isDeleting} color="#6c757d" />
      </View>
      {editor && (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            // The toolbar itself should handle its dark theme via its `theme` prop.
            // The KAV might need a background if the toolbar doesn't fully cover it or for overscroll.
            className="absolute w-full bottom-0 bg-transparent dark:bg-transparent"
        >
            <Toolbar editor={editor} theme={colorScheme === "dark" ? "dark" : "light"} />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
