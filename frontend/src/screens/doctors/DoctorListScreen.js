import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axiosInstance, { getErrorMessage } from '../../api/axiosInstance';
import Avatar from '../../components/Avatar';
import { Card, EmptyState, GradientHeader } from '../../components/ui';
import { colors, doctorName, radius, shadow } from '../../theme';

const DAY_SHORT = { Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

// Picks an icon for a specialization by keyword
const specialtyIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n === 'all') return 'view-grid-outline';
  if (n.includes('cardio') || n.includes('heart')) return 'heart-pulse';
  if (n.includes('dent')) return 'tooth-outline';
  if (n.includes('pedia') || n.includes('child')) return 'baby-face-outline';
  if (n.includes('neuro')) return 'brain';
  if (n.includes('derma') || n.includes('skin')) return 'face-woman-shimmer-outline';
  if (n.includes('eye') || n.includes('ophth')) return 'eye-outline';
  if (n.includes('ortho') || n.includes('bone')) return 'bone';
  if (n.includes('nutri') || n.includes('diet')) return 'food-apple-outline';
  if (n.includes('psych')) return 'head-heart-outline';
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

  const fetchDoctors = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/doctors');
      setDoctors(response.data || []);
      setLoadError(null);
    } catch (error) {
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

  // Categories come from the real doctors' specializations
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(doctors.map((d) => (d.specialization || '').trim()).filter(Boolean)))],
    [doctors]
  );

  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || doc.name.toLowerCase().includes(q) || (doc.specialization || '').toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'All' || (doc.specialization || '').trim() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderDoctor = ({ item }) => {
    const days = item.schedule?.days || [];
    const hours = days[0] ? `${days[0].startTime} – ${days[0].endTime}` : null;
    return (
      <Card style={styles.docCard} onPress={() => navigation.navigate('DoctorDetail', { doctor: item })}>
        <View style={styles.docRow}>
          <Avatar name={item.name} photo={item.profilePhoto} size={64} radius={18} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.docName} numberOfLines={1}>{doctorName(item.name)}</Text>
            <Text style={styles.docSpec}>{item.specialization}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.metaStrong}>{item.averageRating || '5.0'}</Text>
                <Text style={styles.metaText}>({item.totalReviews || 0})</Text>
              </View>
              {item.experience ? (
                <View style={styles.metaPill}>
                  <Ionicons name="briefcase-outline" size={12} color={colors.primary} />
                  <Text style={styles.metaText}>{item.experience}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.arrow}>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </View>
        {days.length > 0 && (
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.body} />
            <Text style={styles.scheduleText} numberOfLines={1}>
              {days.map((d) => DAY_SHORT[d.day] || d.day).join(' · ')}
            </Text>
            {hours ? <Text style={styles.hours}>{hours}</Text> : null}
          </View>
        )}
      </Card>
    );
  };

  const header = (
    <>
      <GradientHeader style={{ paddingBottom: 26 }}>
        <Text style={styles.title}>Find your doctor</Text>
        <Text style={styles.subtitle}>
          {doctors.length > 0 ? `${doctors.length} specialist${doctors.length === 1 ? '' : 's'} ready to help` : 'Trusted specialists near you'}
        </Text>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or speciality"
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </GradientHeader>

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const active = selectedCategory === item;
          return (
            <Pressable onPress={() => setSelectedCategory(item)} style={[styles.chip, active && styles.chipActive]}>
              <MaterialCommunityIcons name={specialtyIcon(item)} size={16} color={active ? '#fff' : colors.primary} />
              <Text style={[styles.chipText, active && { color: '#fff' }]}>{item}</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{selectedCategory === 'All' ? 'All doctors' : selectedCategory}</Text>
        <Text style={styles.count}>{filteredDoctors.length} found</Text>
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      {loading ? (
        <>
          {header}
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        </>
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={(item) => item._id}
          renderItem={renderDoctor}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon="cloud-offline-outline" title="Couldn't load doctors" message={loadError} action="Try again" onAction={onRefresh} />
            ) : (
              <EmptyState icon="search-outline" title="No doctors found" message="Try a different name or speciality." />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.3, marginTop: 6 },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4, marginBottom: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: radius.md, height: 50, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, height: '100%', outlineWidth: 0 },

  chips: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadow.button },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.ink },

  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 14, marginBottom: 10 },
  listTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  count: { fontSize: 13, color: colors.muted, fontWeight: '600' },

  docCard: { marginHorizontal: 20, marginBottom: 12, padding: 14 },
  docRow: { flexDirection: 'row', alignItems: 'center' },
  docName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  docSpec: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  metaStrong: { fontSize: 12, fontWeight: '800', color: colors.ink },
  metaText: { fontSize: 12, color: colors.body },
  arrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  scheduleText: { flex: 1, fontSize: 12, color: colors.body },
  hours: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
