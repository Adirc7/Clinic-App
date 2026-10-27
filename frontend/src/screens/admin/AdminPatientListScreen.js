import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';

export default function AdminPatientListScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPatients = async () => {
    try {
      const res = await axiosInstance.get('/patients');
      setPatients(res.data);
    } catch (error) {
      console.error('Failed to fetch patients', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPatients();
    });
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Patient',
      `Are you sure you want to delete ${name}? This will also cancel all their appointments and bills.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/patients/${id}`);
              Alert.alert('Success', 'Patient deleted successfully');
              fetchPatients();
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error, 'Failed to delete'));
            }
          },
        },
      ]
    );
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.userId?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.userId?.name}</Text>
          <Text style={styles.email}>{item.userId?.email}</Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id, item.userId?.name)}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue}>{item.age || '-'} yrs</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Gender</Text>
          <Text style={styles.detailValue}>{item.gender}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Blood</Text>
          <Text style={styles.detailValue}>{item.bloodGroup || '-'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F2A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Patients</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8DA8A4" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0C6875" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPatients(); }} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No patients found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F7F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F3F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F2A2E' },
  backBtn: { padding: 5 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 20,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E8F3F0',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E7F1F2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#0C6875' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#0F2A2E', marginBottom: 2 },
  email: { fontSize: 13, color: '#666' },
  deleteBtn: { padding: 8, backgroundColor: '#FFF0F0', borderRadius: 8 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 15 },
  detail: { alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#8DA8A4', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666', fontSize: 16 },
});
