import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, HelperText, Text } from 'react-native-paper';

interface FormFieldProps extends React.ComponentProps<typeof TextInput> {
  label: string;
  error?: string;
  required?: boolean;
}

export default function FormField({ 
  label, 
  error, 
  required = false, 
  style, 
  ...rest 
}: FormFieldProps) {
  const hasError = !!error;

  return (
    <View style={styles.container}>
      <TextInput
        label={`${label}${required ? ' *' : ''}`}
        error={hasError}
        mode="outlined"
        activeOutlineColor="#2196F3"
        style={[styles.input, style]}
        {...rest}
      />
      {hasError && (
        <HelperText type="error" visible={hasError} style={styles.helper}>
          {error}
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  input: {
    backgroundColor: '#ffffff',
  },
  helper: {
    paddingHorizontal: 8,
    marginTop: -2,
  },
});
