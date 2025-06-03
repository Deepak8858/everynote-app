// apps/expo/src/types/10tap-editor.d.ts
declare module '@10play/tentap-editor' { // Corrected module name
  import * as React from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  export interface TenTapEditorProps {
    value: string; // Or the specific data type the editor uses (e.g., Delta)
    onChange: (value: string) => void; // Or the specific data type
    style?: StyleProp<ViewStyle>;
    // Add other props based on the library's documentation
    placeholder?: string;
    editable?: boolean;
    autoFocus?: boolean;
    theme?: 'light' | 'dark'; // Example, check actual props
  }

  const TenTapEditor: React.FC<TenTapEditorProps>;
  export default TenTapEditor;

  // You might also need to declare types for specific editor content formats (e.g., DeltaOperation)
  // if you interact with them directly.
}
