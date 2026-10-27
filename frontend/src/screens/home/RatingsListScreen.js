import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doctorName } from '../../theme';
import axiosInstance, { buildServerUrl } from '../../api/axiosInstance';
import { Image } from 'react-native';

export default function RatingsListScreen({ navigation }) {
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/appointments/my-appointments/patient');
      
      // Filter for completed appointments
      const completed = (res.data || []).filter(
        (apt) => apt.status?.toLowerCase() === 'completed'
      );
      
      // Sort by date descending
      completed.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setCompletedAppointments(completed);
    } catch (error) {
      console.log('Error fetching appointments for rating:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rate Your Experience</Text>
        <Text style={styles.headerSub}>Help us improve by rating your past visits</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0C6875" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }} colors={['#0C6875']} />
          }
        >
          {completedAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={60} color="#D1D9E6" />
              <Text style={styles.emptyTitle}>No Completed Visits</Text>
              <Text style={styles.emptySub}>You do not have any completed appointments to rate yet.</Text>
            </View>
          ) : (
            completedAppointments.map((apt) => (
              <View key={apt._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.dateBox}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                    <Text style={styles.dateText}>{formatDate(apt.date)}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Completed</Text>
                  </View>
                </View>

                <View style={styles.doctorInfoRow}>
                  {apt.doctorId?.profilePhoto ? (
                    <Image source={{ uri: buildServerUrl(apt.doctorId.profilePhoto) }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#0C6875" />
                    </View>
                  )}
                  <View style={styles.doctorDetails}>
                    <Text style={styles.doctorName}>
                      {apt.doctorId?.name ? doctorName(apt.doctorId.name) : 'Doctor'}
                    </Text>
                    <Text style={styles.doctorSpec}>{apt.doctorId?.specialization || 'General'}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.rateBtn}
                  onPress={() => navigation.navigate('Rating', {
                    doctorId: apt.doctorId?._id,
                    doctorName: apt.doctorId?.name,
                    appointmentId: apt._id
                  })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="star" size={16} color="#FFF" />
                  <Text style={styles.rateBtnText}>Rate Now</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2A2E',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  statusBadge: {
    backgroundColor: '#E7F1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#0C6875',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E7F1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  doctorSpec: {
    fontSize: 13,
    color: '#64748B',
  },
  rateBtn: {
    backgroundColor: '#FFB300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  rateBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
