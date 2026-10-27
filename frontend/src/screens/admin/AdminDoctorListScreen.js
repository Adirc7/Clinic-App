import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { buildServerUrl } from '../../api/axiosInstance';

export default function AdminDoctorListScreen({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/doctors/admin/all');
      setDoctors(response.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch doctors');
      console.error('Fetch doctors error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeactivate = (doctorId) => {
    Alert.alert('Deactivate Doctor', 'Are you sure you want to deactivate this doctor?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/doctors/${doctorId}`);
            Alert.alert('Success', 'Doctor deactivated');
            fetchDoctors();
          } catch (_error) {
            Alert.alert('Error', 'Failed to deactivate doctor');
          }
        },
      },
    ]);
  };

  const handleEditDoctor = (doctor) => {
    navigation.navigate('EditDoctor', { doctor });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#1A4B44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Doctors</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('EditDoctor', { doctor: null })}>
          <Ionicons name="add" size={24} color="#0DB591" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0DB591" />
        </View>
      ) : doctors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={48} color="#A3B5B3" />
          <Text style={styles.emptyText}>No doctors found</Text>
          <TouchableOpacity
            style={styles.addFirstButton}
            onPress={() => navigation.navigate('EditDoctor', { doctor: null })}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addFirstButtonText}>Add First Doctor</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchDoctors();
          }}
        >
          {doctors.map((doctor) => (
            <TouchableOpacity
              key={doctor._id}
              style={styles.doctorCard}
              onPress={() => handleEditDoctor(doctor)}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.profileSection}>
                  {doctor.profilePhoto ? (
                    <Image
                      source={{ uri: buildServerUrl(doctor.profilePhoto) }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={24} color="#0DB591" />
                    </View>
                  )}
                </View>

                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorSpec}>{doctor.specialization}</Text>
                  <Text style={styles.doctorEmail}>{doctor.email}</Text>
                  {doctor.phone && <Text style={styles.doctorPhone}>{doctor.phone}</Text>}
                  {doctor.schedule?.days && doctor.schedule.days.length > 0 && (
                    <Text style={styles.doctorAvailability}>
                      Available: {doctor.schedule.days[0].day} {doctor.schedule.days[0].startTime} - {doctor.schedule.days[0].endTime}
                    </Text>
                  )}
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        doctor.isActive
                          ? styles.statusBadgeActive
                          : styles.statusBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          doctor.isActive
                            ? styles.statusTextActive
                            : styles.statusTextInactive,
                        ]}
                      >
                        {doctor.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {doctor.isActive && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeactivate(doctor._id)}
                >
                  <Ionicons name="close-circle" size={24} color="#E74C3C" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2FAF8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F3F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A4B44',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#A3B5B3',
    fontSize: 16,
  },
  addFirstButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0DB591',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addFirstButtonText: {
    marginLeft: 8,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileSection: {
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F8F5',
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A4B44',
    marginBottom: 2,
  },
  doctorSpec: {
    fontSize: 12,
    color: '#5F7A77',
    marginBottom: 2,
  },
  doctorEmail: {
    fontSize: 11,
    color: '#A3B5B3',
  },
  doctorPhone: {
    fontSize: 11,
    color: '#A3B5B3',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: '#E8F8F5',
  },
  statusBadgeInactive: {
    backgroundColor: '#FDE8E8',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#0E6E5D',
  },
  statusTextInactive: {
    color: '#C0392B',
  },
  actionButton: {
    padding: 6,
  },
  doctorAvailability: {
    fontSize: 11,
    color: '#0DB591',
    fontWeight: '600',
    marginVertical: 4,
  },
});
