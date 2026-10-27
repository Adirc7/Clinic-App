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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return '#FF9500';
    case 'confirmed':
      return '#0C6875';
    case 'completed':
      return '#34C759';
    case 'cancelled':
      return '#FF3B30';
    default:
      return '#8DA8A4';
  }
};

export default function AllAppointmentsScreen({ currentUser, navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, completed, cancelled

  // Reschedule Modal State
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [rescheduleErrors, setRescheduleErrors] = useState({});

  // Patient Modal State
  const [isPatientModalVisible, setIsPatientModalVisible] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      // Fetch appointments via the doctor-specific endpoint
      const response = await axiosInstance.get('/appointments/my-appointments/doctor');
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredAppointments = () => {
    if (filter === 'all') return appointments;
    return appointments.filter((apt) => apt.status?.toLowerCase() === filter.toLowerCase());
  };

  const filteredAppointments = getFilteredAppointments();

  const openRescheduleModal = (appointment) => {
    // Cannot request reschedule on the same day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() === today.getTime()) {
      Alert.alert('Not Allowed', 'Cannot request a reschedule on the same day as the appointment.');
      return;
    }

    if (appointment.rescheduleRequested) {
      Alert.alert('Pending Request', 'A reschedule request is already pending for this appointment.');
      return;
    }

    setSelectedAppointment(appointment);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleReason('');
    setRescheduleErrors({});
    setRescheduleModalVisible(true);
  };

  const submitRescheduleRequest = async () => {
    let newErrors = {};
    if (!rescheduleDate.trim()) newErrors.date = 'Date is required';
    if (!rescheduleTime.trim()) newErrors.time = 'Time is required';
    if (!rescheduleReason.trim()) newErrors.reason = 'Reason is required';

    setRescheduleErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setSubmittingReschedule(true);
      await axiosInstance.post(`/appointments/${selectedAppointment._id}/request-reschedule`, {
        rescheduleDate,
        rescheduleTime,
        reason: rescheduleReason,
      });
      
      Alert.alert('Success', 'Reschedule request submitted to Admin.');
      setRescheduleModalVisible(false);
      fetchAppointments();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to submit request.'));
    } finally {
      setSubmittingReschedule(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C6875" />
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
          <Ionicons name="chevron-back" size={24} color="#0C6875" />
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
                ? 'You have no appointments'
                : `No ${filter} appointments`}
            </Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {filteredAppointments.map((appointment) => (
              <View key={appointment._id} style={styles.appointmentCard}>
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedAppointment(appointment);
                    setIsPatientModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.patientName}>
                      {appointment.patientName || 'Patient'}
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

                {appointment.notes && (
                  <View style={styles.notes}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{appointment.notes}</Text>
                  </View>
                )}
                </TouchableOpacity>

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

                {appointment.status === 'Confirmed' && !appointment.rescheduleRequested && (
                  <TouchableOpacity
                    style={styles.rescheduleBtn}
                    onPress={() => openRescheduleModal(appointment)}
                  >
                    <Ionicons name="calendar" size={14} color="#0C6875" />
                    <Text style={styles.rescheduleBtnText}>Request Reschedule</Text>
                  </TouchableOpacity>
                )}
                
                {appointment.rescheduleRequested && (
                  <View style={styles.pendingRequestBadge}>
                    <Ionicons name="time" size={14} color="#FF9500" />
                    <Text style={styles.pendingRequestText}>Reschedule Requested</Text>
                  </View>
                )}

                <View style={styles.timestampRow}>
                  <Text style={styles.timestamp}>
                    Created: {new Date(appointment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Reschedule</Text>
              <TouchableOpacity onPress={() => setRescheduleModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Request Admin to reschedule appointment with {selectedAppointment?.patientName}.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Date (YYYY-MM-DD) <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput
                style={[styles.input, rescheduleErrors.date && styles.inputError]}
                value={rescheduleDate}
                onChangeText={(text) => {
                  setRescheduleDate(text);
                  if (rescheduleErrors.date) setRescheduleErrors(prev => ({ ...prev, date: null }));
                }}
                placeholder="e.g. 2026-05-10"
              />
              {rescheduleErrors.date && <Text style={styles.errorText}>{rescheduleErrors.date}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Time <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput
                style={[styles.input, rescheduleErrors.time && styles.inputError]}
                value={rescheduleTime}
                onChangeText={(text) => {
                  setRescheduleTime(text);
                  if (rescheduleErrors.time) setRescheduleErrors(prev => ({ ...prev, time: null }));
                }}
                placeholder="e.g. 10:30 AM"
              />
              {rescheduleErrors.time && <Text style={styles.errorText}>{rescheduleErrors.time}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reason <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea, rescheduleErrors.reason && styles.inputError]}
                value={rescheduleReason}
                onChangeText={(text) => {
                  setRescheduleReason(text);
                  if (rescheduleErrors.reason) setRescheduleErrors(prev => ({ ...prev, reason: null }));
                }}
                placeholder="Reason for rescheduling..."
                multiline
                numberOfLines={3}
              />
              {rescheduleErrors.reason && <Text style={styles.errorText}>{rescheduleErrors.reason}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submittingReschedule && { opacity: 0.7 }]}
              onPress={submitRescheduleRequest}
              disabled={submittingReschedule}
            >
              {submittingReschedule ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

      {/* Patient Details Modal */}
      <Modal
        visible={isPatientModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPatientModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { padding: 0, overflow: 'hidden' }]}>
            <View style={[styles.modalHeader, { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: 0 }]}>
              <Text style={styles.modalTitle}>Patient Information</Text>
              <TouchableOpacity onPress={() => setIsPatientModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0C6875' }}>
                      {selectedAppointment.patientName?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>{selectedAppointment.patientName}</Text>
                    <Text style={{ fontSize: 14, color: '#666' }}>{selectedAppointment.patientId?.email}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                  <View style={{ width: '48%', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: '#666' }}>Phone</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>{selectedAppointment.patientPhone || 'N/A'}</Text>
                  </View>
                  <View style={{ width: '48%', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: '#666' }}>Status</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: getStatusColor(selectedAppointment.status) }}>{selectedAppointment.status}</Text>
                  </View>
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>Visit Reason</Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>{selectedAppointment.description || 'No description provided'}</Text>
                </View>

                {selectedAppointment.status?.toLowerCase() === 'completed' && (
                  <TouchableOpacity
                    style={[styles.prescriptionBtn, { width: '100%', marginBottom: 10 }]}
                    onPress={() => {
                      setIsPatientModalVisible(false);
                      navigation.navigate('AddPrescription', { appointment: selectedAppointment });
                    }}
                  >
                    <Ionicons name="document-text" size={16} color="#FFF" />
                    <Text style={styles.prescriptionBtnText}>Attach Prescription</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.prescriptionBtn, { width: '100%', backgroundColor: '#0C6875' }]}
                  onPress={() => {
                    setIsPatientModalVisible(false);
                    navigation.navigate('DoctorPatientRecords', { 
                      patientId: (selectedAppointment.patientId._id || selectedAppointment.patientId).toString(), 
                      patientName: selectedAppointment.patientName 
                    });
                  }}
                >
                  <Ionicons name="folder-outline" size={16} color="#FFF" />
                  <Text style={styles.prescriptionBtnText}>View Medical Records</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.prescriptionBtn, { width: '100%', backgroundColor: '#E53935', marginTop: 10 }]}
                  onPress={() => {
                    Alert.alert(
                      "Delete Appointment",
                      "Are you sure you want to permanently delete this appointment?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { 
                          text: "Delete", 
                          style: "destructive",
                          onPress: async () => {
                            try {
                              await axiosInstance.delete(`/appointments/${selectedAppointment._id}`);
                              setIsPatientModalVisible(false);
                              fetchAppointments();
                              Alert.alert('Deleted', 'Appointment deleted successfully.');
                            } catch (_error) {
                              Alert.alert('Error', 'Failed to delete appointment.');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFF" />
                  <Text style={styles.prescriptionBtnText}>Delete Appointment</Text>
                </TouchableOpacity>
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
    backgroundColor: '#F5F5F5',
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#0C6875',
    borderColor: '#0C6875',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyStateSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#999',
  },
  appointmentsList: {
    paddingBottom: 20,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0C6875',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  appointmentDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0C6875',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  notes: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0C6875',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  timestampRow: {
    marginTop: 8,
  },
  timestamp: {
    fontSize: 11,
    color: '#AAA',
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0C6875',
    backgroundColor: '#F0F8FF',
  },
  rescheduleBtnText: {
    color: '#0C6875',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  confirmBtn: {
    backgroundColor: '#0C6875',
  },
  cancelBtn: {
    backgroundColor: '#FF3B30',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pendingRequestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FFF8E6',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  pendingRequestText: {
    color: '#D97700',
    fontSize: 12,
    fontWeight: '600',
  },
  prescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#7B1FA2',
  },
  prescriptionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#0C6875',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBody: {
    paddingBottom: 20,
  },
  modalPatientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatarWrap: {
    marginRight: 16,
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  modalAvatarPlaceholder: {
    backgroundColor: '#0C6875',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  modalPatientMeta: {
    flex: 1,
  },
  modalPatientName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modalPatientEmail: {
    fontSize: 14,
    color: '#666',
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  infoBox: {
    width: '47%',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalSectionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  emergencyBox: {
    backgroundColor: '#FFF0F0',
    padding: 16,
    borderRadius: 12,
  },
  emergencyText: {
    fontSize: 14,
    color: '#D32F2F',
    marginBottom: 4,
  },
  errorText: { color: '#FF3B30', fontSize: 12, marginTop: 4 },
  inputError: { borderColor: '#FF3B30' },
});
