import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, IconButton } from 'react-native-paper';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        mode="outlined"
        dense
        style={styles.input}
        outlineStyle={styles.outline}
        activeOutlineColor="#2196F3"
        left={<TextInput.Icon icon="magnify" color="#94a3b8" />}
        right={
          value.length > 0 ? (
            <TextInput.Icon 
              icon="close-circle" 
              color="#94a3b8" 
              onPress={() => onChangeText('')} 
            />
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  input: {
    backgroundColor: '#f1f5f9',
    height: 40,
  },
  outline: {
    borderRadius: 8,
    borderWidth: 0, // Borderless visual accent style
  },
});
