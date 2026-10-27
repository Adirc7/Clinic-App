import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { buildServerUrl } from '../../api/axiosInstance';

export default function MyProfileScreen({ navigation, currentUser, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/patients/profile');
      setProfile(res.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Profile doesn't exist yet in the backend, initialize empty
        setProfile({
          userId: currentUser,
          dateOfBirth: null,
          gender: '',
          bloodGroup: '',
          age: null,
          address: '',
          emergencyContact: {}
        });
      } else {
        console.log('Failed to load profile', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfile();
    });
    return unsubscribe;
  }, [navigation, fetchProfile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0DB591" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>Error loading profile.</Text>
      </View>
    );
  }

  const { userId, dateOfBirth, gender, bloodGroup, age, address, emergencyContact } = profile;

  // Check if major profile details are missing
  const isProfileIncomplete = !dateOfBirth || !gender || !bloodGroup || !address;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="pencil" size={18} color="#0DB591" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} />
        }
      >
        <View style={styles.topSection}>
          <View style={styles.avatar}>
            {profile.profilePhoto ? (
              <Image source={{ uri: buildServerUrl(profile.profilePhoto) }} style={{width: '100%', height: '100%', borderRadius: 40}} />
            ) : (
              <Text style={styles.avatarText}>{userId?.name?.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.name}>{userId?.name}</Text>
          <Text style={styles.email}>{userId?.email}</Text>
        </View>

        {isProfileIncomplete && (
          <TouchableOpacity 
            style={styles.incompleteBanner}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.incompleteIconWrap}>
              <Ionicons name="alert-circle" size={22} color="#FF9800" />
            </View>
            <View style={styles.incompleteContent}>
              <Text style={styles.incompleteTitle}>Profile Incomplete</Text>
              <Text style={styles.incompleteDesc}>Tap here to complete your medical details for better care.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FF9800" />
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Age</Text>
            <Text style={styles.detailValue}>{age || '-'} years</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>{gender || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date of Birth</Text>
            <Text style={styles.detailValue}>{dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Blood Group</Text>
            <Text style={styles.detailValue}>{bloodGroup || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>{address || '-'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Emergency Contact</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{emergencyContact?.name || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{emergencyContact?.phone || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Relationship</Text>
            <Text style={styles.detailValue}>{emergencyContact?.relationship || '-'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.actionBtnCard}
          onPress={() => navigation.navigate('MedicalRecords')}
        >
          <View style={styles.actionBtnIcon}>
            <Ionicons name="folder-outline" size={24} color="#0DB591" />
          </View>
          <Text style={styles.actionBtnText}>My Medical Records</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtnCard}
          onPress={() => navigation.navigate('PatientPrescriptions')}
        >
          <View style={styles.actionBtnIcon}>
            <Ionicons name="document-text-outline" size={24} color="#0DB591" />
          </View>
          <Text style={styles.actionBtnText}>My Prescriptions</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={() => {
            if (onLogout) {
              onLogout();
            } else {
              Alert.alert('Logged out', 'Please restart the app to clear session.');
            }
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
        
        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2FAF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F3F0',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A4B44' },
  editBtn: {
    padding: 8,
    backgroundColor: '#E8F8F5',
    borderRadius: 8,
  },
  scroll: { padding: 20 },
  topSection: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0DB591',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 32, color: '#FFF', fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#666', marginTop: 4 },
  incompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#FF9800',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  incompleteIconWrap: {
    marginRight: 12,
  },
  incompleteContent: {
    flex: 1,
  },
  incompleteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 2,
  },
  incompleteDesc: {
    fontSize: 12,
    color: '#F57C00',
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A4B44', marginBottom: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    marginTop: 10,
    gap: 10,
  },
  logoutBtnText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionBtnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  actionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A4B44',
  }
});
