// apps/expo/src/app/editor.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native'; // Added ScrollView, Pressable
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import TenTapEditor, { Toolbar, useEditorBridge } from '@10play/tentap-editor';
import { powerSyncDb, usePowerSyncWatchedQuery } from '@powersync/react-native'; // Import usePowerSyncWatchedQuery
import { authClient } from '~/utils/auth';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface Note {
  id: string;
  content?: string;
  user_id: string;
  category_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface Category { // Added Category interface
  id: string;
  name: string;
}

export default function EditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ noteId?: string }>();
  const noteIdFromParams = params.noteId;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); // State for selected category
  const [isLoadingNote, setIsLoadingNote] = useState(false); // Separate loading for note
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  const isNewNote = noteIdFromParams === 'new' || !noteIdFromParams;

  // Fetch categories
  const { data: categories, isLoading: isLoadingCategories } = usePowerSyncWatchedQuery<Category>(
    `SELECT id, name FROM categories WHERE user_id = ? ORDER BY name ASC`,
    [userId!], // userId must be non-null due to enabled: !!userId
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
    return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" /></View></SafeAreaView>;
  }
  if (!userId && !session?.isLoading) {
    return <SafeAreaView style={styles.container}><View style={styles.centered}><Text>Redirecting to login...</Text></View></SafeAreaView>;
  }

  const renderCategoryPill = (category: Category | { id: null; name: 'No Category' }) => (
    <Pressable
      key={category.id ?? 'no-category-key'}
      style={[
        styles.categoryPill,
        selectedCategoryId === category.id ? styles.categoryPillSelected : {},
      ]}
      onPress={() => setSelectedCategoryId(category.id)}
    >
      <Text style={[
        styles.categoryPillText,
        selectedCategoryId === category.id ? styles.categoryPillTextSelected : {},
      ]}>
        {category.name}
      </Text>
    </Pressable>
  );


  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: isNewNote ? "New Note" : "Edit Note" }} />
      <View style={styles.content}>
        <Text style={styles.titleText}>
          {isNewNote ? "Create New Note" : `Editing Note`}
        </Text>

        <View style={styles.categorySelectorContainer}>
          <Text style={styles.categoryLabel}>Category:</Text>
          {isLoadingCategories && !categories ? <ActivityIndicator/> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScrollView}>
              {renderCategoryPill({ id: null, name: 'No Category' })}
              {categories?.map(cat => renderCategoryPill(cat))}
            </ScrollView>
          )}
        </View>

        <View style={styles.editorContainer}>
          {editor ? (
            <TenTapEditor editor={editor} />
          ) : <View style={styles.centered}><ActivityIndicator /></View> }
        </View>

        <View style={styles.buttonContainer}>
          <Button title={isSaving ? "Saving..." : "Save Note"} onPress={handleSave} disabled={isSaving || isDeleting || !editor} />
          {!isNewNote && currentNote && (
            <Button title={isDeleting ? "Deleting..." : "Delete Note"} color="red" onPress={handleDelete} disabled={isSaving || isDeleting || !editor} />
          )}
        </View>
        <Button title="Back to Home" onPress={() => router.back()} disabled={isSaving || isDeleting} />
      </View>
      {editor && (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
        >
            <Toolbar editor={editor} />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: { // Centering style for loaders
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  categorySelectorContainer: {
    marginBottom: 10,
    minHeight: 50, // Ensure space for loader or categories
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  categoriesScrollView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 5,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  categoryPillSelected: {
    backgroundColor: '#f472b6',
    borderColor: '#f472b6',
  },
  categoryPillText: {
    fontSize: 14,
    color: '#333',
  },
  categoryPillTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  editorContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
  }
});
