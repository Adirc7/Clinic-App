import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';

const adminActions = [
  { title: 'Manage Doctors', icon: 'medical-outline', route: 'AdminDoctorList' },
  { title: 'Reschedule Requests', icon: 'time-outline', route: 'AdminRescheduleRequests' },
  { title: 'Manage Patients', icon: 'people-outline', route: 'AdminPatientList' },
  { title: 'Manage Appointments', icon: 'calendar-outline', route: 'AdminAppointmentList' },
  { title: 'Manage Billing', icon: 'cash-outline', route: 'AdminBillingList' },
  { title: 'Manage Prescriptions', icon: 'document-text-outline', route: 'AdminPrescriptionList' },
  { title: 'Manage Medical Records', icon: 'folder-open-outline', route: 'AdminMedicalRecordList' },
  { title: 'Clinic Settings', icon: 'settings-outline', route: 'AdminSettings' },
];

export default function AdminDashboardScreen({ currentUser, onLogout, navigation }) {
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get('/doctors/admin/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const metricCards = [
    { label: 'Total Doctors', value: stats.totalDoctors, icon: 'stethoscope' },
    { label: 'Total Patients', value: stats.totalPatients, icon: 'account-multiple' },
    { label: 'Today Appointments', value: stats.todayAppointments, icon: 'calendar-check' },
    { label: 'Pending Reviews', value: stats.pendingAppointments, icon: 'alert-circle-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchStats();
            }}
            colors={['#0DB591']}
          />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcome}>Welcome back,</Text>
            <Text style={styles.name}>{currentUser?.name || 'Admin'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={20} color="#0D6B5A" />
          </TouchableOpacity>
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={14} color="#0DB591" />
            <Text style={styles.badgeText}>Admin Access</Text>
          </View>
          <Text style={styles.badgeHint}>Dashboard view only for administrators</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0DB591" />
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            {metricCards.map((card) => (
              <View key={card.label} style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <MaterialCommunityIcons name={card.icon} size={20} color="#0DB591" />
                </View>
                <Text style={styles.metricValue}>{card.value}</Text>
                <Text style={styles.metricLabel}>{card.label}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Admin Actions</Text>
        {adminActions.map((action) => (
          <TouchableOpacity
            key={action.title}
            style={styles.actionItem}
            activeOpacity={0.85}
            onPress={() => {
              const implemented = [
                'AdminDoctorList', 'AdminRescheduleRequests',
                'AdminPatientList', 'AdminBillingList', 'AdminPrescriptionList',
                'AdminMedicalRecordList', 'AdminAppointmentList', 'AdminSettings'
              ];
              if (implemented.includes(action.route)) {
                navigation.navigate(action.route);
              } else {
                Alert.alert('Coming Soon', `${action.title} module is currently under development.`);
              }
            }}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name={action.icon} size={18} color="#0DB591" />
            </View>
            <Text style={styles.actionText}>{action.title}</Text>
            <Ionicons name="chevron-forward" size={18} color="#8DA8A4" />
          </TouchableOpacity>
        ))}

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>System Notice</Text>
          <Text style={styles.noticeText}>
            Role-based visibility is active. Non-admin users cannot access this dashboard.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2FAF8',
  },
  scroll: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  welcome: {
    fontSize: 14,
    color: '#5F7A77',
  },
  name: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: '700',
    color: '#143F38',
  },
  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F7F3',
  },
  badgeRow: {
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F8F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeText: {
    color: '#0E6E5D',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeHint: {
    color: '#64817D',
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0A6B5B',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#113C35',
  },
  metricLabel: {
    marginTop: 4,
    color: '#64817D',
    fontSize: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A4B44',
  },
  actionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    color: '#244E48',
    fontSize: 14,
    fontWeight: '600',
  },
  noticeBox: {
    marginTop: 14,
    backgroundColor: '#DFF3EF',
    borderRadius: 16,
    padding: 14,
  },
  noticeTitle: {
    color: '#165349',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeText: {
    color: '#2D6960',
    fontSize: 12,
    lineHeight: 18,
  },
});
