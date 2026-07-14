import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../services/authContext';
import { AntDesign, Feather } from '@expo/vector-icons';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to end your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.slice(0, 2)?.toUpperCase()}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{user?.role}</Text>
            </View>
          </View>
        </View>

        {/* Security & Options Panel */}
        <View style={styles.optionsGroup}>
          <TouchableOpacity style={styles.optionButton}>
            <Feather name="bell" size={20} color="#94A3B8" />
            <Text style={styles.optionLabel}>Notification Settings</Text>
            <AntDesign name="right" size={14} color="#475569" style={styles.optionArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <Feather name="shield" size={20} color="#94A3B8" />
            <Text style={styles.optionLabel}>Security & Password</Text>
            <AntDesign name="right" size={14} color="#475569" style={styles.optionArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <Feather name="info" size={20} color="#94A3B8" />
            <Text style={styles.optionLabel}>Help & SLA Documentation</Text>
            <AntDesign name="right" size={14} color="#475569" style={styles.optionArrow} />
          </TouchableOpacity>
        </View>

        {/* Action Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    gap: 24,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  email: {
    fontSize: 13,
    color: '#64748B',
  },
  roleTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleTagText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  optionsGroup: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  optionLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  optionArrow: {
    marginLeft: 'auto',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
