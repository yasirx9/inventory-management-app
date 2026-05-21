import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Card, Surface } from 'react-native-paper';

export default function TeamMembersScreen() {
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>Team Members</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Staff directory and government credentials</Text>
      </Surface>
      <View style={styles.content}>
        <Card style={styles.card}>
          <List.Item
            title="Yasir Khanzada"
            description="Role: Project Manager | CNIC Expiry: 2027-04-15"
            left={props => <List.Icon {...props} icon="account" />}
          />
          <List.Item
            title="Mohammed Ali"
            description="Role: Site Supervisor | Passport Expiry: 2029-09-30"
            left={props => <List.Icon {...props} icon="account" />}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#1e293b' },
  title: { color: '#ffffff', fontWeight: 'bold' },
  subtitle: { color: '#94a3b8' },
  content: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 8 },
});
