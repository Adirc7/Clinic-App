import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';
import Avatar from '../../components/Avatar';
import { doctorName } from '../../theme';

// Picks an icon for a specialization by keyword
const specialtyIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n === 'all') return 'apps';
  if (n.includes('cardio') || n.includes('heart')) return 'heart-pulse';
  if (n.includes('dent')) return 'tooth';
  if (n.includes('pedia') || n.includes('child')) return 'baby-face';
  if (n.includes('neuro')) return 'brain';
  if (n.includes('derma') || n.includes('skin')) return 'face-woman-shimmer';
  if (n.includes('eye') || n.includes('ophth')) return 'eye';
  if (n.includes('ortho') || n.includes('bone')) return 'bone';
  if (n.includes('nutri') || n.includes('diet')) return 'food-apple';
  if (n.includes('psych')) return 'head-heart';
  if (n.includes('gyn') || n.includes('obst')) return 'mother-heart';
  return 'stethoscope';
};


export default function DoctorListScreen({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loadError, setLoadError] = useState(null);

  // Categories come from the real doctors' specializations
  const categories = ['All', ...Array.from(new Set(doctors.map((d) => (d.specialization || '').trim()).filter(Boolean)))]
    .map((name) => ({ name, icon: specialtyIcon(name) }));

  const fetchDoctors = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/doctors');
      setDoctors(response.data || []);
      setLoadError(null);
    } catch (error) {
      console.log('Error fetching doctors:', error.message);
      // Never show fake doctors — they can't be booked
      setLoadError(getErrorMessage(error, 'Could not load doctors.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctors();
  };

  const filteredDoctors = doctors.filter(doc => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || doc.name.toLowerCase().includes(q) || (doc.specialization || '').toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'All' || (doc.specialization || '').trim() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderCategory = ({ item }) => {
    const isSelected = selectedCategory === item.name;
    return (
      <TouchableOpacity 
        style={styles.categoryItem}
        onPress={() => setSelectedCategory(item.name)}
      >
        <View style={[styles.categoryIconContainer, isSelected && styles.categoryIconContainerSelected]}>
          <MaterialCommunityIcons 
            name={item.icon} 
            size={24} 
            color={isSelected ? '#FFF' : '#0DB591'} 
          />
        </View>
        <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDoctor = ({ item }) => (
    <TouchableOpacity 
      style={styles.doctorCard}
      onPress={() => navigation.navigate('DoctorDetail', { doctor: item })}
    >
      <Avatar name={item.name} photo={item.profilePhoto} size={60} radius={12} style={styles.doctorImage} />
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>
          {doctorName(item.name)}
        </Text>
        <Text style={styles.doctorSpecialization}>{item.specialization}</Text>
        
        {item.experience && (
          <Text style={styles.doctorExperience}>{item.experience}</Text>
        )}
        
        {item.schedule?.days && item.schedule.days.length > 0 && (
          <View style={styles.availabilityBadge}>
            <Ionicons name="calendar" size={12} color="#0DB591" />
            <Text style={styles.availabilityText}>
              {item.schedule.days[0].startTime} - {item.schedule.days[0].endTime}
            </Text>
          </View>
        )}
        
        <View style={styles.ratingContainer}>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#0DB591" />
            <Text style={styles.ratingText}>{item.averageRating || '5.0'}</Text>
          </View>
          <Text style={styles.reviewsText}>| {item.totalReviews || '0'} reviews</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#E8F5E9' : '#FFEBEE' }]}>
        <Ionicons name={item.isActive ? "checkmark-circle" : "close-circle"} size={14} color={item.isActive ? "#4CAF50" : "#F44336"} />
        <Text style={[styles.statusText, { color: item.isActive ? "#4CAF50" : "#F44336" }]}>
          {item.isActive ? 'Available' : 'Unavailable'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Doctors</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddDoctor')}>
          <Ionicons name="ellipsis-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0DB591']} />}
      >
        <View style={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Find a doctor..."
              placeholderTextColor="gray"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Text style={styles.sectionTitle}>Category</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item.name}
            renderItem={renderCategory}
            contentContainerStyle={styles.categoriesList}
            style={styles.categoriesFlatList}
          />

          {/* ── CHOOSE YOUR DOCTOR ADVICE SECTION ── */}
          <View style={styles.adviceContainer}>
            <View style={styles.adviceTitleRow}>
              <View style={styles.adviceTitleIcon}>
                <Ionicons name="people" size={20} color="#0DB591" />
              </View>
              <Text style={styles.adviceSectionTitle}>Choose Your Doctor</Text>
            </View>

            {[
              { color: '#03A9F4', title: 'Select Specialty', sub: 'Pick a doctor related to your health issue.' },
              { color: '#9C27B0', title: 'Check Experience', sub: 'Experienced doctors can provide better care.' },
              { color: '#4CAF50', title: 'Check Availability', sub: 'Choose a doctor available on your preferred date/time.' },
              { color: '#FF9800', title: 'Urgent Issues', sub: 'Select the earliest available doctor for quick treatment.' },
            ].map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: item.color }]} />
                <View style={styles.bulletContent}>
                  <Text style={styles.bulletTitle}>{item.title}</Text>
                  <Text style={styles.bulletSub}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Available Doctors</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#0DB591" style={styles.loader} />
          ) : (
            <FlatList
              data={filteredDoctors}
              keyExtractor={(item) => item._id}
              renderItem={renderDoctor}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name={loadError ? 'cloud-offline-outline' : 'search-outline'} size={44} color="#A3B5B3" />
                  <Text style={styles.emptyText}>{loadError || 'No doctors found.'}</Text>
                  {loadError ? (
                    <TouchableOpacity onPress={onRefresh} style={{ marginTop: 12 }}>
                      <Text style={{ color: '#0DB591', fontWeight: '700' }}>Try again</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              }
            />
          )}

          <View style={{height: 80}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
    backgroundColor: '#FAFAFA',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    height: 50,
    marginBottom: 25,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoriesFlatList: {
    marginBottom: 25,
    marginHorizontal: -20, // To allow scrolling to edges
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconContainerSelected: {
    backgroundColor: '#0DB591',
  },
  categoryText: {
    fontSize: 12,
    color: 'gray',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#0DB591',
    fontWeight: 'bold',
  },
  doctorCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 15,
  },
  doctorInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  doctorSpecialization: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  ratingText: {
    fontSize: 10,
    color: '#0DB591',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 10,
    color: 'gray',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    position: 'absolute',
    top: 15,
    right: 15,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recentList: {
    marginBottom: 20,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  recentItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 60,
  },
  recentImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  recentName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
    marginBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    color: '#666',
    fontSize: 14,
  },
  doctorExperience: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 6,
    gap: 4,
  },
  availabilityText: {
    fontSize: 11,
    color: '#0DB591',
    fontWeight: '600',
  },
  adviceContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  adviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  adviceTitleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F5F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adviceSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E2A',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  bulletDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
    flexShrink: 0,
  },
  bulletContent: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2E2A',
    marginBottom: 2,
  },
  bulletSub: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
