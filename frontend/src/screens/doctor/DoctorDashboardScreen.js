import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  RefreshControl,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors, doctorName, greeting, radius, shadow } from '../../theme';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';
import Avatar from '../../components/Avatar';
import { Button, Card, EmptyState, GradientHeader, HeaderIconButton, SectionHeader, StatusBadge } from '../../components/ui';
import { toDateKey } from '../../utils/date';

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
              dotColor: colors.accent,
            };
          }
        }
      });

      // Highlight today
      if (newMarkedDates[todayStr]) {
        newMarkedDates[todayStr].selected = true;
        newMarkedDates[todayStr].selectedColor = colors.primary;
      } else {
        newMarkedDates[todayStr] = { selected: true, selectedColor: colors.primary };
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

  const firstPending = todayAppointments.filter((a) => a.status === 'Pending').length;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your day…</Text>
      </View>
    );
  }

  const confirmLogout = () =>
    Alert.alert('Log out', 'Log out of your doctor account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: onLogout },
    ]);

  const statCards = [
    { label: 'Today', value: stats.todayCount, icon: 'today', color: colors.primary, bg: colors.primarySoft },
    { label: 'Pending', value: stats.pendingCount, icon: 'hourglass', color: colors.warning, bg: colors.warningSoft },
    { label: 'Completed', value: stats.completedCount, icon: 'checkmark-done', color: colors.success, bg: colors.successSoft },
    { label: 'Patients', value: stats.totalPatients, icon: 'people', color: colors.violet, bg: colors.violetSoft },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#fff" colors={[colors.primary]} />}
      >
        <GradientHeader style={{ paddingBottom: 86 }}>
          <View style={styles.headerRow}>
            <View style={styles.avatarWrap}>
              <Avatar name={currentUser?.name} photo={doctorProfile?.profilePhoto} size={56} radius={18} style={styles.avatar} />
              <View style={[styles.onlineDot, { backgroundColor: doctorProfile?.isActive ? colors.success : colors.danger }]} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.hello}>{greeting()},</Text>
              <Text style={styles.name} numberOfLines={1}>{currentUser?.name ? doctorName(currentUser.name) : 'Doctor'}</Text>
              <Text style={styles.spec}>{doctorProfile?.specialization || 'General'} · {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <HeaderIconButton icon="log-out-outline" onPress={confirmLogout} />
          </View>

          {doctorProfile && (
            <View style={styles.availability}>
              <View style={[styles.availDot, { backgroundColor: doctorProfile.isActive ? '#4ADE80' : '#FCA5A5' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.availTitle}>{doctorProfile.isActive ? 'Accepting new bookings' : 'Not accepting bookings'}</Text>
                <Text style={styles.availSub}>{doctorProfile.isActive ? 'Patients can see and book you' : 'You are hidden from the doctor list'}</Text>
              </View>
              <Switch
                value={doctorProfile.isActive}
                onValueChange={toggleAvailability}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#4ADE80' }}
                thumbColor="#FFF"
                ios_backgroundColor="rgba(255,255,255,0.3)"
              />
            </View>
          )}
        </GradientHeader>

        {/* Stats overlapping the header */}
        <View style={styles.statsCard}>
          {statCards.map((st, i) => (
            <View key={st.label} style={[styles.stat, i < statCards.length - 1 && styles.statBorder]}>
              <View style={[styles.statIcon, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon} size={16} color={st.color} />
              </View>
              <Text style={styles.statValue}>{st.value}</Text>
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.body}>
          {/* Today's queue */}
          <SectionHeader
            title="Today's patients"
            action={todayAppointments.length ? `${todayAppointments.length} total` : undefined}
            style={{ marginTop: 24 }}
          />
          {firstPending > 0 && (
            <View style={styles.pendingNote}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={styles.pendingNoteText}>{firstPending} booking{firstPending > 1 ? 's' : ''} waiting for your confirmation</Text>
            </View>
          )}

          {todayAppointments.length === 0 ? (
            <Card>
              <EmptyState icon="cafe-outline" title="No appointments today" message="Enjoy the quiet — upcoming visits show on the calendar below." />
            </Card>
          ) : (
            todayAppointments.map((appointment) => {
              const busy = updatingId === appointment._id;
              const status = appointment.status || 'Pending';
              return (
                <Card key={appointment._id} style={styles.apptCard}>
                  <Pressable
                    style={styles.apptTop}
                    onPress={() => { setSelectedAppointment(appointment); setIsPatientModalVisible(true); }}
                  >
                    <View style={styles.timeTile}>
                      <Text style={styles.timeTileText}>{(appointment.time || '').split(' ')[0]}</Text>
                      <Text style={styles.timeTileAmPm}>{(appointment.time || '').split(' ')[1] || ''}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.patientName} numberOfLines={1}>{appointment.patientName || 'Patient'}</Text>
                      <Text style={styles.apptReason} numberOfLines={1}>
                        {(appointment.description || '').split('Reason: ')[1] || appointment.description || 'General consultation'}
                      </Text>
                    </View>
                    <StatusBadge status={status} />
                  </Pressable>

                  {status === 'Pending' && (
                    <View style={styles.actionRow}>
                      <Button title="Confirm" icon="checkmark" small loading={busy} onPress={() => handleAccept(appointment._id)} style={{ flex: 1 }} />
                      <Button title="Decline" icon="close" small variant="ghost" disabled={busy} onPress={() => handleReject(appointment._id)} style={{ flex: 1 }} />
                    </View>
                  )}
                  {status === 'Confirmed' && (
                    <View style={styles.actionRow}>
                      <Button title="Mark as completed" icon="checkmark-done" small loading={busy} onPress={() => handleComplete(appointment._id)} style={{ flex: 1 }} />
                    </View>
                  )}
                </Card>
              );
            })
          )}

          {/* Quick actions */}
          <SectionHeader title="Quick actions" style={{ marginTop: 24 }} />
          <View style={styles.quickRow}>
            {[
              { label: 'All appointments', icon: 'calendar', color: colors.info, bg: colors.infoSoft, onPress: () => navigation.navigate('AllAppointments') },
              { label: 'Add prescription', icon: 'document-text', color: colors.primary, bg: colors.primarySoft, onPress: () => { Alert.alert('Add prescription', 'Open a completed appointment to attach a prescription.'); navigation.navigate('AllAppointments'); } },
              { label: 'Reschedule', icon: 'swap-horizontal', color: colors.warning, bg: colors.warningSoft, onPress: () => navigation.navigate('AllAppointments') },
            ].map((q) => (
              <Pressable key={q.label} style={({ pressed }) => [styles.quickTile, pressed && { opacity: 0.85 }]} onPress={q.onPress}>
                <View style={[styles.quickIcon, { backgroundColor: q.bg }]}>
                  <Ionicons name={q.icon} size={20} color={q.color} />
                </View>
                <Text style={styles.quickLabel}>{q.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Calendar */}
          <SectionHeader title="Schedule" style={{ marginTop: 24 }} />
          <Card style={{ padding: 8 }}>
            <Calendar
              markedDates={markedDates}
              theme={{
                calendarBackground: '#ffffff',
                textSectionTitleColor: colors.muted,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.primary,
                dayTextColor: colors.ink,
                textDisabledColor: '#CBD5D7',
                dotColor: colors.accent,
                selectedDotColor: '#ffffff',
                arrowColor: colors.primary,
                monthTextColor: colors.ink,
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
                textDayHeaderFontWeight: '700',
                textDayFontSize: 13,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.accent }]} /><Text style={styles.legendText}>Appointments</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} /><Text style={styles.legendText}>Holiday</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Today</Text></View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Patient details sheet */}
      <Modal visible={isPatientModalVisible} animationType="slide" transparent onRequestClose={() => setIsPatientModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setIsPatientModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            {selectedAppointment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHead}>
                  <Avatar name={selectedAppointment.patientName} photo={selectedAppointment.patientProfile?.profilePhoto} size={58} radius={18} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.sheetName}>{selectedAppointment.patientName}</Text>
                    <Text style={styles.sheetSub}>{selectedAppointment.patientId?.email || ''}</Text>
                  </View>
                  <StatusBadge status={selectedAppointment.status || 'Pending'} />
                </View>

                <View style={styles.infoGrid}>
                  {[
                    ['Gender', selectedAppointment.patientProfile?.gender],
                    ['Age', selectedAppointment.patientProfile?.age != null ? `${selectedAppointment.patientProfile.age} yrs` : null],
                    ['Blood', selectedAppointment.patientProfile?.bloodGroup],
                    ['Phone', selectedAppointment.patientPhone],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.infoBox}>
                      <Text style={styles.infoLabel}>{label}</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Reason for visit</Text>
                  <Text style={styles.blockText}>{selectedAppointment.description || 'Not provided'}</Text>
                </View>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Address</Text>
                  <Text style={styles.blockText}>{selectedAppointment.patientAddress || 'Not provided'}</Text>
                </View>
                {selectedAppointment.patientProfile?.emergencyContact?.name ? (
                  <View style={styles.block}>
                    <Text style={styles.blockLabel}>Emergency contact</Text>
                    <Text style={styles.blockText}>
                      {selectedAppointment.patientProfile.emergencyContact.name}
                      {selectedAppointment.patientProfile.emergencyContact.relationship ? ` (${selectedAppointment.patientProfile.emergencyContact.relationship})` : ''}
                      {selectedAppointment.patientProfile.emergencyContact.phone ? ` · ${selectedAppointment.patientProfile.emergencyContact.phone}` : ''}
                    </Text>
                  </View>
                ) : null}

                <View style={{ gap: 10, marginTop: 16 }}>
                  {selectedAppointment.status === 'Completed' && (
                    <Button
                      title={selectedAppointment.hasPrescription ? 'Prescription added' : 'Attach prescription'}
                      icon="document-text"
                      disabled={selectedAppointment.hasPrescription}
                      onPress={() => { setIsPatientModalVisible(false); navigation.navigate('AddPrescription', { appointment: selectedAppointment }); }}
                    />
                  )}
                  <Button
                    title="View medical records"
                    icon="folder-open-outline"
                    variant="secondary"
                    onPress={() => {
                      setIsPatientModalVisible(false);
                      navigation.navigate('DoctorPatientRecords', {
                        patientId: (selectedAppointment.patientId?._id || selectedAppointment.patientId).toString(),
                        patientName: selectedAppointment.patientName,
                      });
                    }}
                  />
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { marginTop: 12, color: colors.body },

  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  onlineDot: { position: 'absolute', right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: colors.primary },
  hello: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  name: { color: '#fff', fontSize: 21, fontWeight: '800' },
  spec: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  availability: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.lg, padding: 12, marginTop: 18 },
  availDot: { width: 10, height: 10, borderRadius: 5 },
  availTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  availSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },

  statsCard: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: 20, marginTop: -56, borderRadius: radius.lg, paddingVertical: 14, ...shadow.card },
  stat: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: colors.border },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 6 },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  body: { paddingHorizontal: 20 },
  pendingNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: 10, marginBottom: 12 },
  pendingNoteText: { flex: 1, color: '#92400E', fontSize: 13, fontWeight: '600' },

  apptCard: { marginBottom: 12, padding: 14 },
  apptTop: { flexDirection: 'row', alignItems: 'center' },
  timeTile: { width: 58, height: 58, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  timeTileText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  timeTileAmPm: { fontSize: 10, fontWeight: '800', color: colors.primary, opacity: 0.7 },
  patientName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  apptReason: { fontSize: 12, color: colors.body, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },

  quickRow: { flexDirection: 'row', gap: 10 },
  quickTile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, alignItems: 'center', ...shadow.soft },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: '700', color: colors.ink, textAlign: 'center' },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.body },

  overlay: { flex: 1, backgroundColor: 'rgba(6,30,34,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34, maxHeight: '88%' },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  sheetName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  sheetSub: { fontSize: 12, color: colors.body, marginTop: 2 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  infoBox: { width: '48.5%', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12 },
  infoLabel: { fontSize: 11, color: colors.body, fontWeight: '700' },
  infoValue: { fontSize: 15, color: colors.ink, fontWeight: '800', marginTop: 2 },
  block: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: 10 },
  blockLabel: { fontSize: 11, color: colors.body, fontWeight: '700', marginBottom: 4 },
  blockText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
});
