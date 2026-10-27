import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { buildServerUrl, getErrorMessage } from '../../api/axiosInstance';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return '#FF9500';
    case 'confirmed':
      return '#0077B6';
    case 'completed':
      return '#34C759';
    case 'cancelled':
      return '#FF3B30';
    default:
      return '#8DA8A4';
  }
};

export default function AdminAppointmentListScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, completed, cancelled
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isPatientModalVisible, setIsPatientModalVisible] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/appointments');
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStatus = async (appointmentId, newStatus) => {
    try {
      setLoading(true);
      await axiosInstance.put(`/appointments/${appointmentId}/status`, {
        status: newStatus,
      });
      fetchAppointments();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to update status'));
      setLoading(false);
    }
  };

  const getFilteredAppointments = () => {
    if (filter === 'all') return appointments;
    return appointments.filter((apt) => apt.status?.toLowerCase() === filter.toLowerCase());
  };

  const filteredAppointments = getFilteredAppointments();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0DB591" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#1A4B44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Appointments</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filter === status && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === status && styles.filterButtonTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Appointments List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAppointments();
            }}
          />
        }
      >
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#D1D1D1" />
            <Text style={styles.emptyStateText}>No appointments</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'all'
                ? 'No appointments in the system'
                : `No ${filter} appointments found`}
            </Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {filteredAppointments.map((appointment) => (
              <TouchableOpacity 
                key={appointment._id} 
                style={styles.appointmentCard}
                onPress={() => {
                  setSelectedAppointment(appointment);
                  setIsPatientModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.patientName}>
                      Patient: {appointment.patientName || appointment.patientId?.name || 'Unknown'}
                    </Text>
                    <Text style={styles.doctorName}>
                      Doctor: {appointment.doctorId?.name || 'Unknown'}
                    </Text>
                    <Text style={styles.appointmentDate}>
                      <Ionicons name="calendar-outline" size={14} color="#666" />
                      {' '}
                      {new Date(appointment.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.appointmentTime}>
                      <Ionicons name="time-outline" size={14} color="#666" />
                      {' '}{appointment.time}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(appointment.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {appointment.status}
                    </Text>
                  </View>
                </View>

                {appointment.description && (
                  <View style={styles.description}>
                    <Text style={styles.descriptionLabel}>Reason:</Text>
                    <Text style={styles.descriptionText}>{appointment.description}</Text>
                  </View>
                )}

                {appointment.status === 'Pending' && (
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.confirmBtn]}
                      onPress={() => updateStatus(appointment._id, 'Confirmed')}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                      <Text style={styles.actionBtnText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cancelBtn]}
                      onPress={() => updateStatus(appointment._id, 'Cancelled')}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                      <Text style={styles.actionBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.timestampRow}>
                  <Text style={styles.timestamp}>
                    Created: {new Date(appointment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Patient Details Modal */}
      <Modal
        visible={isPatientModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPatientModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Information</Text>
              <TouchableOpacity onPress={() => setIsPatientModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <View style={styles.modalPatientHeader}>
                  <View style={styles.modalAvatarWrap}>
                    {selectedAppointment.patientProfile?.profilePhoto ? (
                      <Image 
                        source={{ uri: buildServerUrl(selectedAppointment.patientProfile.profilePhoto) }} 
                        style={styles.modalAvatar} 
                      />
                    ) : (
                      <View style={[styles.modalAvatar, styles.modalAvatarPlaceholder]}>
                        <Text style={styles.modalAvatarText}>
                          {(selectedAppointment.patientName || selectedAppointment.patientId?.name)?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.modalPatientMeta}>
                    <Text style={styles.modalPatientName}>{selectedAppointment.patientName || selectedAppointment.patientId?.name}</Text>
                    <Text style={styles.modalPatientEmail}>{selectedAppointment.patientId?.email}</Text>
                  </View>
                </View>

                <View style={styles.modalInfoGrid}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Gender</Text>
                    <Text style={styles.infoValue}>{selectedAppointment.patientProfile?.gender || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Age</Text>
                    <Text style={styles.infoValue}>{selectedAppointment.patientProfile?.age || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Blood Group</Text>
                    <Text style={styles.infoValue}>{selectedAppointment.patientProfile?.bloodGroup || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{selectedAppointment.patientPhone || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Address</Text>
                  <Text style={styles.modalSectionText}>{selectedAppointment.patientAddress || 'No address provided'}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Emergency Contact</Text>
                  {selectedAppointment.patientProfile?.emergencyContact ? (
                    <View style={styles.emergencyBox}>
                      <Text style={styles.emergencyText}>
                        <Text style={{fontWeight: '700'}}>Name: </Text>
                        {selectedAppointment.patientProfile.emergencyContact.name || 'N/A'}
                      </Text>
                      <Text style={styles.emergencyText}>
                        <Text style={{fontWeight: '700'}}>Relation: </Text>
                        {selectedAppointment.patientProfile.emergencyContact.relationship || 'N/A'}
                      </Text>
                      <Text style={styles.emergencyText}>
                        <Text style={{fontWeight: '700'}}>Phone: </Text>
                        {selectedAppointment.patientProfile.emergencyContact.phone || 'N/A'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.modalSectionText}>No emergency contact provided</Text>
                  )}
                </View>

                <View style={[styles.modalSection, { borderBottomWidth: 0 }]}>
                  <Text style={styles.modalSectionTitle}>Visit Reason</Text>
                  <Text style={styles.modalSectionText}>{selectedAppointment.description || 'No description provided'}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2FAF8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  placeholder: {
    width: 36,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F3F0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F8F5',
    borderWidth: 1,
    borderColor: '#E8F3F0',
  },
  filterButtonActive: {
    backgroundColor: '#0DB591',
    borderColor: '#0DB591',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64817D',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A4B44',
  },
  emptyStateSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#A3B5B3',
  },
  appointmentsList: {
    paddingBottom: 40,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#0DB591',
    shadowColor: '#0A6B5B',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A4B44',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 14,
    color: '#0DB591',
    marginBottom: 8,
    fontWeight: '600',
  },
  appointmentDate: {
    fontSize: 13,
    color: '#64817D',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 13,
    color: '#64817D',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    backgroundColor: '#F9FCFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A4B44',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#64817D',
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  confirmBtn: {
    backgroundColor: '#0DB591',
  },
  cancelBtn: {
    backgroundColor: '#E74C3C',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  timestampRow: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    color: '#A3B5B3',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalBody: {
    padding: 24,
  },
  modalPatientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatarWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  modalAvatar: {
    width: '100%',
    height: '100%',
  },
  modalAvatarPlaceholder: {
    backgroundColor: '#0077B6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  modalPatientMeta: {
    marginLeft: 16,
    flex: 1,
  },
  modalPatientName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalPatientEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  infoBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  modalSectionText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  emergencyBox: {
    backgroundColor: '#FFF5F5',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFEBEB',
  },
  emergencyText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});
