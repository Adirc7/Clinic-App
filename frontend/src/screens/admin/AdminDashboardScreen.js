import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';
import { GradientHeader, HeaderIconButton, SectionHeader } from '../../components/ui';
import { colors, greeting, radius, shadow } from '../../theme';

const adminActions = [
  { title: 'Doctors', sub: 'Profiles & schedules', icon: 'medkit', color: colors.primary, bg: colors.primarySoft, route: 'AdminDoctorList' },
  { title: 'Appointments', sub: 'All bookings', icon: 'calendar', color: colors.info, bg: colors.infoSoft, route: 'AdminAppointmentList' },
  { title: 'Reschedules', sub: 'Doctor requests', icon: 'swap-horizontal', color: colors.warning, bg: colors.warningSoft, route: 'AdminRescheduleRequests' },
  { title: 'Patients', sub: 'Registered patients', icon: 'people', color: colors.violet, bg: colors.violetSoft, route: 'AdminPatientList' },
  { title: 'Billing', sub: 'Invoices & payments', icon: 'wallet', color: colors.success, bg: colors.successSoft, route: 'AdminBillingList' },
  { title: 'Prescriptions', sub: 'Issued medicines', icon: 'document-text', color: '#EC4899', bg: '#FDECF5', route: 'AdminPrescriptionList' },
  { title: 'Records', sub: 'Medical documents', icon: 'folder-open', color: '#0EA5E9', bg: '#E6F6FD', route: 'AdminMedicalRecordList' },
  { title: 'Settings', sub: 'Booking rules', icon: 'settings', color: colors.body, bg: '#EEF2F3', route: 'AdminSettings' },
];

export default function AdminDashboardScreen({ currentUser, onLogout, navigation }) {
  const [stats, setStats] = useState({ totalDoctors: 0, totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalAppointments: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/doctors/admin/stats');
      setStats(res.data);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    return navigation.addListener('focus', fetchStats);
  }, [navigation, fetchStats]);

  const confirmLogout = () =>
    Alert.alert('Log out', 'Log out of the admin dashboard?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: onLogout },
    ]);

  const metrics = [
    { label: 'Doctors', value: stats.totalDoctors, icon: 'medkit', color: colors.primary, bg: colors.primarySoft },
    { label: 'Patients', value: stats.totalPatients, icon: 'people', color: colors.violet, bg: colors.violetSoft },
    { label: 'Pending bookings', value: stats.pendingAppointments, icon: 'hourglass', color: colors.warning, bg: colors.warningSoft, route: 'AdminAppointmentList' },
    { label: 'All appointments', value: stats.totalAppointments ?? 0, icon: 'calendar', color: colors.info, bg: colors.infoSoft, route: 'AdminAppointmentList' },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor="#fff" colors={[colors.primary]} />}
      >
        <GradientHeader style={{ paddingBottom: 84 }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.roleChip}>
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                <Text style={styles.roleText}>Administrator</Text>
              </View>
              <Text style={styles.hello}>{greeting()},</Text>
              <Text style={styles.name} numberOfLines={1}>{currentUser?.name || 'Admin'}</Text>
            </View>
            <HeaderIconButton icon="log-out-outline" onPress={confirmLogout} />
          </View>
        </GradientHeader>

        {/* Today highlight card overlapping the header */}
        <Pressable style={styles.todayCard} onPress={() => navigation.navigate('AdminAppointmentList')}>
          <View style={styles.todayIcon}>
            <Ionicons name="today" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.todayLabel}>Appointments today</Text>
            <Text style={styles.todayValue}>{loading ? '…' : stats.todayAppointments}</Text>
          </View>
          <View style={styles.todayLink}>
            <Text style={styles.todayLinkText}>View</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
        </Pressable>

        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <View style={styles.metrics}>
              {metrics.map((m) => (
                <Pressable key={m.label} style={styles.metric} disabled={!m.route} onPress={() => m.route && navigation.navigate(m.route)}>
                  <View style={[styles.metricIcon, { backgroundColor: m.bg }]}>
                    <Ionicons name={m.icon} size={18} color={m.color} />
                  </View>
                  <Text style={styles.metricValue}>{m.value}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <SectionHeader title="Manage clinic" style={{ marginTop: 26 }} />
          <View style={styles.grid}>
            {adminActions.map((a) => (
              <Pressable
                key={a.route}
                style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}
                onPress={() => navigation.navigate(a.route)}
              >
                <View style={[styles.tileIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={styles.tileTitle}>{a.title}</Text>
                <Text style={styles.tileSub}>{a.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  roleText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  hello: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  name: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },

  todayCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, marginHorizontal: 20, marginTop: -58, borderRadius: radius.lg, padding: 16, ...shadow.card },
  todayIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  todayLabel: { fontSize: 13, color: colors.body, fontWeight: '600' },
  todayValue: { fontSize: 30, fontWeight: '800', color: colors.ink, marginTop: -2 },
  todayLink: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 12, height: 34, borderRadius: 10 },
  todayLinkText: { color: colors.primary, fontWeight: '800', fontSize: 13 },

  body: { paddingHorizontal: 20, paddingTop: 16 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { width: '47.8%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, ...shadow.soft },
  metricIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 10 },
  metricLabel: { fontSize: 12, color: colors.body, fontWeight: '600', marginTop: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47.8%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, ...shadow.soft },
  tileIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tileTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  tileSub: { fontSize: 12, color: colors.body, marginTop: 2 },
});
