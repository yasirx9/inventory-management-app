import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, List, Button, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MoreStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';

type NavigationProp = StackNavigationProp<MoreStackParamList, 'MoreMenu'>;

export default function MoreMenuScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userProfile, logout } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text 
            size={56} 
            label={userProfile?.name?.slice(0, 2).toUpperCase() || 'US'} 
            style={styles.avatar} 
          />
          <View style={styles.profileText}>
            <Text variant="titleLarge" style={styles.userName}>{userProfile?.name || 'Loading User...'}</Text>
            <Text variant="bodyMedium" style={styles.userRole}>
              {userProfile?.role?.toUpperCase()} • {userProfile?.department}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <List.Section style={styles.section}>
        <List.Subheader style={styles.subheader}>Administrative Sub-systems</List.Subheader>
        
        <List.Item
          title="Categories"
          description="Manage inventory classifications"
          left={(props) => <List.Icon {...props} icon="tag" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Categories')}
          style={styles.item}
        />

        <List.Item
          title="Suppliers"
          description="Manage logistics vendor details"
          left={(props) => <List.Icon {...props} icon="truck-delivery" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Suppliers')}
          style={styles.item}
        />

        <List.Item
          title="Locations"
          description="Configure depots and warehouses"
          left={(props) => <List.Icon {...props} icon="map-marker" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Locations')}
          style={styles.item}
        />

        <List.Item
          title="Team Members"
          description="Staff directory, CNIC and passport records"
          left={(props) => <List.Icon {...props} icon="account-group" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('TeamMembers')}
          style={styles.item}
        />
      </List.Section>

      <List.Section style={styles.section}>
        <List.Subheader style={styles.subheader}>Operations & Configurations</List.Subheader>

        <List.Item
          title="Reports"
          description="Review stock movements and activity metrics"
          left={(props) => <List.Icon {...props} icon="chart-bar" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Reports')}
          style={styles.item}
        />

        <List.Item
          title="App Settings"
          description="Toggle system configurations"
          left={(props) => <List.Icon {...props} icon="cog" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Settings')}
          style={styles.item}
        />

        <List.Item
          title="User Accounts"
          description="Manage login permissions"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Users')}
          style={styles.item}
        />
      </List.Section>

      <Button 
        mode="outlined" 
        onPress={logout} 
        style={styles.logoutBtn}
        labelStyle={{ color: '#ef4444' }}
      >
        Sign Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileCard: {
    margin: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#2196F3',
    marginRight: 16,
  },
  profileText: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  userRole: {
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    elevation: 1,
  },
  subheader: {
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 14,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logoutBtn: {
    margin: 16,
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 40,
  },
});
