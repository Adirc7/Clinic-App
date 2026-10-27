import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  RefreshControl,
  Image,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doctorName } from '../../theme';
import axiosInstance, { buildServerUrl, getErrorMessage } from '../../api/axiosInstance';
import { toDateKey } from '../../utils/date';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
};

const getGreetingIcon = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 18) return 'sunny';
  return 'moon';
};

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

export default function DoctorDashboardScreen({ currentUser, onLogout, navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState({
    todayCount: 0,
    totalPatients: 0,
    pendingCount: 0,
    completedCount: 0,
  });
  const [markedDates, setMarkedDates] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isPatientModalVisible, setIsPatientModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch Doctor Profile for the photo
      try {
        const profileRes = await axiosInstance.get('/doctors/my-profile');
        setDoctorProfile(profileRes.data);
      } catch (err) {
        console.log('Profile fetch error:', err.message);
      }

      // Fetch holidays
      let holidayData = [];
      try {
        const holidayRes = await axiosInstance.get('/holidays');
        holidayData = holidayRes.data || [];
      } catch (err) {
        console.log('Holiday fetch error:', err.message);
      }

      // Fetch appointments for this doctor
      const appointmentRes = await axiosInstance.get('/appointments/my-appointments/doctor');

      // Get today's date
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      // Filter today's appointments
      const todayAppts = (appointmentRes.data || []).filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= todayStart && aptDate < todayEnd;
      });

      setTodayAppointments(todayAppts);

      // Calculate statistics
      const allAppointments = appointmentRes.data || [];
      const pendingAppts = allAppointments.filter(
        (apt) => apt.status?.toLowerCase() === 'pending'
      );
      const completedAppts = allAppointments.filter(
        (apt) => apt.status?.toLowerCase() === 'completed'
      );

      // Get unique patients
      const uniquePatients = new Set(allAppointments.map((apt) => (apt.patientId?._id || apt.patientId)?.toString()).filter(Boolean));

      setStats({
        todayCount: todayAppts.length,
        totalPatients: uniquePatients.size,
        pendingCount: pendingAppts.length,
        completedCount: completedAppts.length,
      });

      // Calculate marked dates for the calendar
      const newMarkedDates = {};
      const todayStr = toDateKey(today);

      // Mark holidays first
      holidayData.forEach(h => {
        newMarkedDates[h.date] = {
          marked: true,
          dotColor: '#FF3B30', // Red dot for holiday
          customStyles: {
            text: { color: '#FF3B30', fontWeight: 'bold' }
          }
        };
      });

      allAppointments.forEach((apt) => {
        if (apt.date) {
          const dateStr = toDateKey(new Date(apt.date));
          // Determine if it's upcoming
          if (new Date(apt.date) >= todayStart && apt.status?.toLowerCase() !== 'cancelled') {
            newMarkedDates[dateStr] = {
              marked: true,
              dotColor: '#34C759', // Green dot
            };
          }
        }
      });

      // Highlight today
      if (newMarkedDates[todayStr]) {
        newMarkedDates[todayStr].selected = true;
        newMarkedDates[todayStr].selectedColor = '#0077B6';
      } else {
        newMarkedDates[todayStr] = { selected: true, selectedColor: '#0077B6' };
      }

      setMarkedDates(newMarkedDates);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // NOTE: must come AFTER fetchData is declared (const is not hoisted)
  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const toggleAvailability = async (value) => {
    try {
      // Optimistic update
      setDoctorProfile((prev) => prev ? { ...prev, isActive: value } : prev);
      
      await axiosInstance.put('/doctors/my-profile/status', {
        isActive: value,
      });
    } catch (_error) {
      // Revert optimistic update
      setDoctorProfile((prev) => prev ? { ...prev, isActive: !value } : prev);
      Alert.alert('Error', 'Failed to update availability status');
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      setUpdatingId(appointmentId);
      await axiosInstance.put(`/appointments/${appointmentId}/status`, {
        status: newStatus,
      });

      // Refresh the data
      fetchData();
      Alert.alert('Success', `Appointment ${newStatus.toLowerCase()}`);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to update appointment'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAccept = (id) => {
    Alert.alert('Confirm Appointment', 'Do you want to confirm this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => updateAppointmentStatus(id, 'Confirmed'),
      },
    ]);
  };

  const handleReject = (id) => {
    Alert.alert('Cancel Appointment', 'Do you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => updateAppointmentStatus(id, 'Cancelled'),
      },
    ]);
  };

  const handleComplete = (id) => {
    Alert.alert('Mark as Complete', 'Do you want to mark this appointment as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: () => updateAppointmentStatus(id, 'Completed'),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerWrapper}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1624727828489-a1e03b79bba8?q=80&w=2071&auto=format&fit=crop' }}
            style={styles.headerBgImage}
            blurRadius={20}
          />
          <View style={styles.headerOverlay} />
          
          <View style={styles.headerSection}>
            <View style={styles.headerContent}>
              <View style={styles.doctorProfileSection}>
                <View style={styles.profileImageWrapper}>
                  {(doctorProfile?.profilePhoto || currentUser?.profilePhoto) ? (
                    <Image
                      source={{ uri: buildServerUrl(doctorProfile?.profilePhoto || currentUser?.profilePhoto) }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={28} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={[styles.onlineIndicator, { backgroundColor: doctorProfile?.isActive ? '#34C759' : '#FF3B30' }]} />
                </View>
                
                <View style={styles.nameContainer}>
                  <View style={styles.greetingRow}>
                    <Ionicons name={getGreetingIcon()} size={14} color="rgba(255, 255, 255, 0.9)" />
                    <Text style={styles.greetingText}>{getGreeting()},</Text>
                  </View>
                  <Text style={styles.doctorName}>
                    {currentUser?.name ? doctorName(currentUser.name) : 'Doctor'}
                  </Text>
                  <Text style={styles.doctorDetails}>
                    ID: {currentUser?.id?.slice(-6).toUpperCase() || 'N/A'} • {doctorProfile?.specialization || 'General'}
                  </Text>
                  <Text style={styles.liveTime}>
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              {/* Glass Logout Button */}
              <TouchableOpacity
                style={styles.glassLogoutBtn}
                onPress={onLogout}
                activeOpacity={0.7}
              >
                <View style={styles.glassContent}>
                  <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Availability Toggle */}
            {doctorProfile && (
              <View style={styles.availabilityToggleWrap}>
                <Text style={styles.availabilityToggleLabel}>
                  {doctorProfile.isActive ? 'Available' : 'Unavailable'}
                </Text>
                <Switch
                  value={doctorProfile.isActive}
                  onValueChange={toggleAvailability}
                  trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#34C759' }}
                  thumbColor="#FFF"
                  ios_backgroundColor="rgba(255,255,255,0.3)"
                  style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                />
              </View>
            )}
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.cardsGrid}>
          <View style={styles.card}>
            <View style={[styles.cardIconBg, { backgroundColor: '#E3F2FD' }]}>
              <MaterialCommunityIcons name="calendar-check" size={18} color="#0077B6" />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardValue}>{stats.todayCount}</Text>
              <Text style={styles.cardLabel}>Today</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardIconBg, { backgroundColor: '#F3E5F5' }]}>
              <MaterialCommunityIcons name="account-multiple" size={18} color="#7B1FA2" />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardValue}>{stats.totalPatients}</Text>
              <Text style={styles.cardLabel}>Patients</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardIconBg, { backgroundColor: '#FFF3E0' }]}>
              <MaterialCommunityIcons name="clock-outline" size={18} color="#FF9500" />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardValue}>{stats.pendingCount}</Text>
              <Text style={styles.cardLabel}>Pending</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardIconBg, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardValue}>{stats.completedCount}</Text>
              <Text style={styles.cardLabel}>Done</Text>
            </View>
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
          <View style={styles.calendarContainer}>
            <Calendar
              markedDates={markedDates}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: '#0077B6',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#0077B6',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#34C759',
                selectedDotColor: '#ffffff',
                arrowColor: '#0077B6',
                monthTextColor: '#0077B6',
                indicatorColor: '#0077B6',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 12,
                textMonthFontSize: 14,
                textDayHeaderFontSize: 12

              }}
            />
            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
                <Text style={styles.legendText}>Appointments</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#0077B6' }]} />
                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Today's Appointments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Appointments</Text>
            <Text style={styles.appointmentCount}>{todayAppointments.length}</Text>
          </View>

          {todayAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#D1D1D1" />
              <Text style={styles.emptyStateText}>No appointments today</Text>
              <Text style={styles.emptyStateSubtext}>You have a free day!</Text>
            </View>
          ) : (
            <View>
              {todayAppointments.map((appointment) => (
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
                      <Text style={styles.appointmentTime}>
                        <Ionicons name="time-outline" size={14} color="#666" />
                        {' '}{appointment.time || 'N/A'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(appointment.status) },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {appointment.status || 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {appointment.description && (
                    <Text style={styles.appointmentDesc}>{appointment.description}</Text>
                  )}
                  </TouchableOpacity>

                  {appointment.status?.toLowerCase() === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.acceptBtn,
                          updatingId === appointment._id && styles.disabledBtn,
                        ]}
                        onPress={() => handleAccept(appointment._id)}
                        disabled={updatingId === appointment._id}
                      >
                        {updatingId === appointment._id ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnText}>Confirm</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.rejectBtn,
                          updatingId === appointment._id && styles.disabledBtn,
                        ]}
                        onPress={() => handleReject(appointment._id)}
                        disabled={updatingId === appointment._id}
                      >
                        {updatingId === appointment._id ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnText}>Cancel</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {appointment.status?.toLowerCase() === 'confirmed' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.completeBtn,
                          updatingId === appointment._id && styles.disabledBtn,
                        ]}
                        onPress={() => handleComplete(appointment._id)}
                        disabled={updatingId === appointment._id}
                      >
                        {updatingId === appointment._id ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnText}>Mark Complete</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                </View>
              ))}
            </View>
          )}
        </View>

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
                            {selectedAppointment.patientName?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.modalPatientMeta}>
                      <Text style={styles.modalPatientName}>{selectedAppointment.patientName}</Text>
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

                  {selectedAppointment.status?.toLowerCase() === 'completed' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.prescriptionBtn, { marginTop: 10, alignSelf: 'stretch', justifyContent: 'center' }]}
                      onPress={() => {
                        setIsPatientModalVisible(false);
                        navigation.navigate('AddPrescription', { appointment: selectedAppointment });
                      }}
                    >
                      <Ionicons name="document-text" size={18} color="#FFF" />
                      <Text style={[styles.actionBtnText, { fontSize: 16, marginLeft: 8 }]}>Attach Prescription</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#0077B6', marginTop: 10, alignSelf: 'stretch', justifyContent: 'center' }]}
                    onPress={() => {
                      setIsPatientModalVisible(false);
                      navigation.navigate('DoctorPatientRecords', { 
                        patientId: (selectedAppointment.patientId._id || selectedAppointment.patientId).toString(), 
                        patientName: selectedAppointment.patientName 
                      });
                    }}
                  >
                    <Ionicons name="folder-outline" size={18} color="#FFF" />
                    <Text style={[styles.actionBtnText, { fontSize: 16, marginLeft: 8 }]}>View Medical Records</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('AllAppointments')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="calendar-outline" size={20} color="#0077B6" />
            </View>
            <Text style={styles.quickActionText}>View All Appointments</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              Alert.alert('Info', 'Please select a completed appointment from the list to add a prescription.');
              navigation.navigate('AllAppointments');
            }}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="document-text-outline" size={20} color="#0077B6" />
            </View>
            <Text style={styles.quickActionText}>Add Prescription</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              Alert.alert('Info', 'Please select an appointment from the list to view the patient\'s medical records.');
              navigation.navigate('AllAppointments');
            }}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="folder-outline" size={20} color="#0077B6" />
            </View>
            <Text style={styles.quickActionText}>View Medical Records</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  headerWrapper: {
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: '#0077B6',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    backgroundColor: '#0077B6',
  },
  headerBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 119, 182, 0.6)',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  profileImagePlaceholder: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#0077B6',
  },
  availabilityToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  availabilityToggleLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  nameContainer: {
    justifyContent: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  greetingText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  doctorDetails: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  liveTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontWeight: '600',
  },
  glassLogoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glassContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0077B6',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 119, 182, 0.05)',
  },
  cardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0077B6',
    lineHeight: 22,
  },
  cardLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  calendarContainer: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#0077B6',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 5,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  appointmentCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0077B6',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
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
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0077B6',
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
  appointmentDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#34C759',
  },
  rejectBtn: {
    backgroundColor: '#FF3B30',
  },
  completeBtn: {
    backgroundColor: '#0077B6',
  },
  prescriptionBtn: {
    backgroundColor: '#7B1FA2',
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
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
    backgroundColor: '#0077B6',
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
});
