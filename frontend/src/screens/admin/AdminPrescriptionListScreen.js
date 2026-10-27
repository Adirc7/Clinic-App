import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';

export default function AdminPrescriptionListScreen({ navigation }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrescriptions = async () => {
    try {
      const res = await axiosInstance.get('/prescriptions');
      setPrescriptions(res.data);
    } catch (error) {
      console.error('Failed to fetch prescriptions', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPrescriptions();
    });
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('PrescriptionDetail', { appointmentId: item.appointmentId?._id })}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.patientName}>{item.patientId?.name || 'Unknown Patient'}</Text>
          <Text style={styles.dateText}>Date: {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0DB591" />
      </View>

      <View style={styles.detailsRow}>
        <View>
          <Text style={styles.detailLabel}>Prescribing Doctor</Text>
          <Text style={styles.detailValue}>Dr. {item.doctorId?.name || 'Unknown'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.detailLabel}>Medicines</Text>
            <Text style={styles.medValue}>{item.medications?.length} items</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              style={styles.editBtn}
              onPress={() => navigation.navigate('AdminPrescriptionEdit', { prescriptionId: item._id })}
            >
              <Ionicons name="create-outline" size={20} color="#0DB591" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={() => handleDelete(item._id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleDelete = (id) => {
    Alert.alert('Delete Prescription', 'Are you sure you want to delete this prescription?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/prescriptions/${id}`);
            fetchPrescriptions();
          } catch (error) {
            console.error('Delete error', error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A4B44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Prescriptions</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0DB591" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPrescriptions(); }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No prescriptions found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2FAF8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F3F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A4B44' },
  backBtn: { padding: 5 },
  list: { padding: 15, paddingBottom: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#1A4B44' },
  dateText: { fontSize: 12, color: '#666', marginTop: 4 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 15 },
  detailLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  medValue: { fontSize: 14, fontWeight: 'bold', color: '#0DB591' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666', fontSize: 16 },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#FFF1F0',
    borderRadius: 8,
  },
  editBtn: {
    padding: 8,
    backgroundColor: '#F0F9F7',
    borderRadius: 8,
  },
});
