import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axiosInstance, { buildServerUrl } from '../../api/axiosInstance';
import * as WebBrowser from 'expo-web-browser';

export default function MedicalRecordsScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchRecords(true);
    }, [])
  );

  const fetchRecords = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const res = await axiosInstance.get('/medical-records/my-records');
      setRecords(res.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load medical records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddRecord = () => {
    navigation.navigate('AddMedicalRecord', { onRecordAdded: fetchRecords });
  };

  const handleViewDocument = async (url) => {
    try {
      await WebBrowser.openBrowserAsync(buildServerUrl(url));
    } catch (_error) {
      Alert.alert('Error', 'Unable to open document');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/medical-records/${id}`);
            Alert.alert('Success', 'Record deleted successfully');
            fetchRecords();
          } catch (_error) {
            Alert.alert('Error', 'Failed to delete record');
          }
        },
      },
    ]);
  };

  const filteredRecords = records.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A2B4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <TouchableOpacity onPress={handleAddRecord} style={styles.addIconBtn}>
          <Ionicons name="add" size={26} color="#0C6875" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search records by title..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0C6875" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRecords(true); }} />}
        >
          {filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={60} color="#D1D1D1" />
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptySubtitle}>You haven&apos;t added any medical records yet or no records match your search.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAddRecord}>
                <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                <Text style={styles.primaryBtnText}>Upload New Record</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredRecords.map((record) => (
              <View key={record._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <Ionicons 
                      name={record.fileType?.includes('pdf') ? "document-text" : "image"} 
                      size={24} 
                      color={record.fileType?.includes('pdf') ? "#E74C3C" : "#3498DB"} 
                    />
                    <Text style={styles.cardTitle} numberOfLines={1}>{record.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(record._id)}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                {record.description && (
                  <Text style={styles.cardDesc} numberOfLines={2}>{record.description}</Text>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.metaInfo}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.metaText}>{new Date(record.recordDate).toLocaleDateString()}</Text>
                  </View>
                  {record.relatedDoctor && (
                    <View style={styles.metaInfo}>
                      <Ionicons name="person-outline" size={14} color="#666" />
                      <Text style={styles.metaText}>{record.relatedDoctor}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.viewBtn}
                  onPress={() => handleViewDocument(record.fileUrl)}
                >
                  <Text style={styles.viewBtnText}>View / Download Document</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0C6875" />
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{height: 80}} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EFF3F6' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A2B4A' },
  addIconBtn: { padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', margin: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E0E8F0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#333' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0C6875', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A2B4A', flex: 1 },
  cardDesc: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#666' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E7F1F2', paddingVertical: 12, borderRadius: 8 },
  viewBtnText: { fontSize: 14, fontWeight: '700', color: '#0C6875' }
});
