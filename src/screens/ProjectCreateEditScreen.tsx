import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ProjectStackParamList } from '../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';

type CreateEditRouteProp = RouteProp<ProjectStackParamList, 'ProjectCreateEdit'>;
type NavigationProp = StackNavigationProp<ProjectStackParamList, 'ProjectCreateEdit'>;

export default function ProjectCreateEditScreen() {
  const route = useRoute<CreateEditRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const projectId = route.params?.projectId;
  const isEditMode = !!projectId;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [client, setClient] = useState('');

  const handleSave = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.headerSurface} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          {isEditMode ? 'Edit Project Contract' : 'Create Project Record'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {isEditMode ? `Updating Project ID: ${projectId}` : 'Establish a new business project'}
        </Text>
      </Surface>

      <View style={styles.content}>
        <TextInput
          label="Project Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="Project Code (Unique)"
          value={code}
          onChangeText={setCode}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Client Business Name"
          value={client}
          onChangeText={setClient}
          mode="outlined"
          style={styles.input}
        />

        <View style={styles.btnRow}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.btn}>
            Cancel
          </Button>
          <Button mode="contained" onPress={handleSave} style={[styles.btn, styles.saveBtn]}>
            Save Project
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerSurface: {
    padding: 20,
    backgroundColor: '#1e293b',
  },
  title: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94a3b8',
  },
  content: {
    padding: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  btn: {
    flex: 1,
    marginHorizontal: 8,
  },
  saveBtn: {
    backgroundColor: '#2196F3',
  },
});
