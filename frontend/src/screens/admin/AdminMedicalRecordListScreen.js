import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance, { buildServerUrl } from '../../api/axiosInstance';

export default function AdminMedicalRecordListScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecords = async () => {
    try {
      const res = await axiosInstance.get('/medical-records');
      setRecords(res.data);
    } catch (error) {
      console.error('Failed to fetch records', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRecords();
    });
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this medical record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/medical-records/${id}`);
            fetchRecords();
          } catch (error) {
            console.error('Delete error', error);
            Alert.alert('Error', 'Failed to delete record');
          }
        },
      },
    ]);
  };

  const handleViewFile = (fileUrl) => {
    const fullUrl = buildServerUrl(fileUrl);
    Linking.openURL(fullUrl).catch(err => {
      Alert.alert('Error', 'Cannot open file URL');
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.recordMain}>
          <Text style={styles.patientName}>{item.patientId?.name || 'Unknown Patient'}</Text>
          <Text style={styles.recordTitle}>{item.title}</Text>
          <Text style={styles.dateText}>Record Date: {new Date(item.recordDate).toLocaleDateString()}</Text>
        </View>
        <TouchableOpacity 
          style={styles.fileBtn}
          onPress={() => handleViewFile(item.fileUrl)}
        >
          <Ionicons name="document-attach-outline" size={24} color="#0DB591" />
        </TouchableOpacity>
      </View>

      <View style={styles.detailsRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailLabel}>Related Doctor</Text>
          <Text style={styles.detailValue}>{item.relatedDoctor || 'Not specified'}</Text>
        </View>
        <View style={styles.actionGroup}>
          <TouchableOpacity 
            style={styles.deleteBtn}
            onPress={() => handleDelete(item._id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      {item.description && (
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A4B44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0DB591" />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => { setRefreshing(true); fetchRecords(); }} 
              colors={['#0DB591']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>No medical records found.</Text>
            </View>
          }
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 15, paddingBottom: 30 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0A6B5B',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  recordMain: { flex: 1 },
  patientName: { fontSize: 13, color: '#64817D', fontWeight: '600', marginBottom: 2 },
  recordTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A4B44' },
  dateText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  fileBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9', 
    paddingTop: 12,
    marginTop: 4
  },
  detailLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#475569' },
  actionGroup: { flexDirection: 'row', gap: 8 },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#FFF1F0',
    borderRadius: 8,
  },
  descriptionBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 16 },
});
