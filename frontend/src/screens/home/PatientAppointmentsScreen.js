import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';
import Avatar from '../../components/Avatar';
import { Button, Card, EmptyState, GradientHeader, StatusBadge } from '../../components/ui';
import { colors, doctorName, radius, shadow } from '../../theme';

const FILTERS = ['Upcoming', 'Completed', 'Cancelled', 'All'];

const isUpcoming = (a) => ['Pending', 'Confirmed'].includes(a.status);

const canModify = (appointmentDate) => {
  const today = new Date();
  const aptDate = new Date(appointmentDate);
  today.setHours(0, 0, 0, 0);
  aptDate.setHours(0, 0, 0, 0);
  return aptDate > today;
};

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const dayNum = (d) => new Date(d).getDate();
const monthShort = (d) => new Date(d).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();

export default function PatientAppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('Upcoming');
  const [selected, setSelected] = useState(null);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/appointments/my-appointments/patient');
      setAppointments(res.data || []);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to load appointments. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    return navigation.addListener('focus', fetchAppointments);
  }, [navigation, fetchAppointments]);

  const handleCancel = (appointment) => {
    if (!canModify(appointment.date)) {
      Alert.alert('Not possible', 'Appointments can only be cancelled before the scheduled date.');
      return;
    }
    const doc = appointment.doctorId?.name ? doctorName(appointment.doctorId.name) : 'the doctor';
    Alert.alert('Cancel appointment', `Cancel your appointment with ${doc}?`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            // Marks it Cancelled (keeps the record for the clinic) instead of deleting it
            await axiosInstance.put(`/appointments/${appointment._id}`, { status: 'Cancelled' });
            setSelected(null);
            fetchAppointments();
            Alert.alert('Cancelled', 'Your appointment has been cancelled.');
          } catch (error) {
            Alert.alert('Error', getErrorMessage(error, 'Failed to cancel. Please try again.'));
          }
        },
      },
    ]);
  };

  const handleUpdate = (appointment) => {
    if (!canModify(appointment.date)) {
      Alert.alert('Not possible', 'Appointments can only be changed before the scheduled date.');
      return;
    }
    setSelected(null);
    navigation.navigate('DoctorDetail', { doctor: appointment.doctorId, editingAppointment: appointment });
  };

  const goTo = (screen, params) => {
    setSelected(null);
    navigation.navigate(screen, params);
  };

  const counts = {
    Upcoming: appointments.filter(isUpcoming).length,
    Completed: appointments.filter((a) => a.status === 'Completed').length,
    Cancelled: appointments.filter((a) => a.status === 'Cancelled').length,
    All: appointments.length,
  };

  const filtered = appointments
    .filter((a) => (filter === 'All' ? true : filter === 'Upcoming' ? isUpcoming(a) : a.status === filter))
    .sort((a, b) => (filter === 'Upcoming' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)));

  return (
    <View style={styles.screen}>
      <GradientHeader style={{ paddingBottom: 22 }}>
        <Text style={styles.title}>My bookings</Text>
        <Text style={styles.subtitle}>
          {counts.Upcoming > 0 ? `You have ${counts.Upcoming} upcoming visit${counts.Upcoming > 1 ? 's' : ''}` : 'No upcoming visits'}
        </Text>
        <View style={styles.segment}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.segBtn, active && styles.segBtnActive]}>
                <Text style={[styles.segText, active && styles.segTextActive]}>{f}</Text>
                {counts[f] > 0 && f === 'Upcoming' ? (
                  <View style={[styles.segCount, active && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.segCountText, active && { color: '#fff' }]}>{counts[f]}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </GradientHeader>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAppointments(); }} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon="calendar-clear-outline"
              title={filter === 'Upcoming' ? 'No upcoming appointments' : `No ${filter.toLowerCase()} appointments`}
              message={filter === 'Upcoming' ? 'Find a specialist and book a visit in under a minute.' : undefined}
              action={filter === 'Upcoming' ? 'Find a doctor' : undefined}
              onAction={() => navigation.navigate('Doctors')}
            />
          ) : (
            filtered.map((apt) => {
              const doc = apt.doctorId;
              const faded = apt.status === 'Cancelled';
              return (
                <Card key={apt._id} style={[styles.card, faded && { opacity: 0.7 }]} onPress={() => setSelected(apt)}>
                  <View style={styles.cardTop}>
                    <View style={[styles.dateTile, isUpcoming(apt) && styles.dateTileActive]}>
                      <Text style={[styles.dateDay, isUpcoming(apt) && { color: '#fff' }]}>{dayNum(apt.date)}</Text>
                      <Text style={[styles.dateMonth, isUpcoming(apt) && { color: 'rgba(255,255,255,0.85)' }]}>{monthShort(apt.date)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.docName} numberOfLines={1}>{doc?.name ? doctorName(doc.name) : 'Doctor'}</Text>
                      <Text style={styles.spec}>{doc?.specialization || 'General'}</Text>
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={13} color={colors.body} />
                        <Text style={styles.timeText}>{apt.time}</Text>
                      </View>
                    </View>
                    <StatusBadge status={apt.status} />
                  </View>
                  {apt.isRescheduled && (
                    <View style={styles.note}>
                      <Ionicons name="swap-horizontal" size={14} color={colors.warning} />
                      <Text style={styles.noteText} numberOfLines={2}>Rescheduled — {apt.rescheduleNote || 'new date/time set by the clinic'}</Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── DETAIL SHEET ── */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetDoc}>
                  <Avatar name={selected.doctorId?.name} photo={selected.doctorId?.profilePhoto} size={56} radius={18} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.sheetName}>{selected.doctorId?.name ? doctorName(selected.doctorId.name) : 'Doctor'}</Text>
                    <Text style={styles.spec}>{selected.doctorId?.specialization}</Text>
                  </View>
                  <StatusBadge status={selected.status} />
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoCell}>
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                    <Text style={styles.infoLabel}>Date</Text>
                    <Text style={styles.infoValue}>{fmt(selected.date)}</Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Ionicons name="time" size={16} color={colors.primary} />
                    <Text style={styles.infoLabel}>Time</Text>
                    <Text style={styles.infoValue}>{selected.time}</Text>
                  </View>
                </View>

                {selected.description ? (
                  <View style={styles.block}>
                    <Text style={styles.blockLabel}>Reason / notes</Text>
                    <Text style={styles.blockText}>{selected.description}</Text>
                  </View>
                ) : null}

                <Text style={styles.meta}>Booking #{selected._id.slice(-6).toUpperCase()} · booked {new Date(selected.createdAt).toLocaleDateString()}</Text>

                {isUpcoming(selected) && (
                  <View style={{ gap: 10, marginTop: 16 }}>
                    <Button title="Change date or time" icon="create-outline" onPress={() => handleUpdate(selected)} />
                    <Button title="Cancel appointment" icon="close-circle-outline" variant="ghost" onPress={() => handleCancel(selected)} />
                    <Text style={styles.policy}>Changes are allowed until the day before your visit.</Text>
                  </View>
                )}

                {selected.status === 'Completed' && (
                  <View style={styles.actions}>
                    {[
                      { label: 'Prescription', icon: 'medkit', color: colors.primary, bg: colors.primarySoft, onPress: () => goTo('PrescriptionDetail', { appointmentId: selected._id }) },
                      { label: 'Bill', icon: 'receipt', color: colors.info, bg: colors.infoSoft, onPress: () => goTo('BillingDetail', { appointmentId: selected._id }) },
                      { label: 'Rate visit', icon: 'star', color: colors.warning, bg: colors.warningSoft, onPress: () => goTo('Rating', { doctorId: selected.doctorId?._id, doctorName: selected.doctorId?.name }) },
                    ].map((a) => (
                      <Pressable key={a.label} style={[styles.actionTile, { backgroundColor: a.bg }]} onPress={a.onPress}>
                        <Ionicons name={a.icon} size={22} color={a.color} />
                        <Text style={[styles.actionText, { color: a.color }]}>{a.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 6, letterSpacing: -0.3 },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4, marginBottom: 16 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, padding: 4 },
  segBtn: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 36, borderRadius: 11, paddingHorizontal: 8 },
  segBtnActive: { backgroundColor: '#fff' },
  segText: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 12 },
  segTextActive: { color: colors.primary },
  segCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segCountText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  list: { padding: 20, paddingBottom: 120 },
  card: { marginBottom: 12, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  dateTile: { width: 56, height: 60, borderRadius: 16, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dateTileActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDay: { fontSize: 20, fontWeight: '800', color: colors.ink },
  dateMonth: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: -1 },
  docName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  spec: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  timeText: { fontSize: 12, color: colors.body, fontWeight: '600' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warningSoft, borderRadius: 10, padding: 8, marginTop: 12 },
  noteText: { flex: 1, fontSize: 12, color: '#92400E' },

  overlay: { flex: 1, backgroundColor: 'rgba(6,30,34,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34, maxHeight: '88%' },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetDoc: { flexDirection: 'row', alignItems: 'center' },
  sheetName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  infoGrid: { flexDirection: 'row', gap: 10, marginTop: 18 },
  infoCell: { flex: 1, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12, gap: 3 },
  infoLabel: { fontSize: 11, color: colors.body, fontWeight: '700', marginTop: 4 },
  infoValue: { fontSize: 14, color: colors.ink, fontWeight: '800' },
  block: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: 12 },
  blockLabel: { fontSize: 11, color: colors.body, fontWeight: '700', marginBottom: 4 },
  blockText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 12 },
  policy: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  actionTile: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: radius.md, gap: 6, ...shadow.soft, shadowOpacity: 0 },
  actionText: { fontSize: 12, fontWeight: '800' },
});
