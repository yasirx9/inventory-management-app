import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Card, Surface } from 'react-native-paper';

export default function UsersScreen() {
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>User Accounts</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Administrative console to manage credentials</Text>
      </Surface>
      <View style={styles.content}>
        <Card style={styles.card}>
          <List.Item
            title="Yasir Khanzada (Admin)"
            description="yasir@eihinventory.com"
            left={props => <List.Icon {...props} icon="shield-account" />}
          />
          <List.Item
            title="General Staff (Staff)"
            description="staff@eihinventory.com"
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
