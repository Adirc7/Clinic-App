import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorHomeScreen({ currentUser, onLogout }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons name="medkit" size={14} color="#0DB591" />
          <Text style={styles.badgeText}>Doctor Access</Text>
        </View>

        <Text style={styles.title}>Welcome Dr. {currentUser?.name || 'Doctor'}</Text>
        <Text style={styles.subtitle}>{currentUser?.email || ''}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Doctor Portal</Text>
          <Text style={styles.infoText}>
            You can view appointments, patient records and schedule updates from this screen.
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2FAF8',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#0A6B5B',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F8F5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  badgeText: {
    color: '#0E6E5D',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#184841',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: '#5E7A76',
  },
  infoBox: {
    backgroundColor: '#F4FBF9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#154D43',
    marginBottom: 6,
  },
  infoText: {
    color: '#53736F',
    fontSize: 13,
    lineHeight: 20,
  },
  logoutButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0DB591',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
