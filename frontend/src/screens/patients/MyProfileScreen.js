import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../api/axiosInstance';
import Avatar from '../../components/Avatar';
import { Card, GradientHeader, InfoRow } from '../../components/ui';
import { colors, radius } from '../../theme';

export default function MyProfileScreen({ navigation, currentUser, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/patients/profile');
      setProfile(res.data);
    } catch (error) {
      if (error.response?.status === 404) {
        // No medical profile yet
        setProfile({ userId: currentUser, emergencyContact: {} });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchProfile();
    return navigation.addListener('focus', fetchProfile);
  }, [navigation, fetchProfile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const p = profile || { userId: currentUser, emergencyContact: {} };
  const user = p.userId || currentUser || {};
  const { dateOfBirth, gender, bloodGroup, age, address, emergencyContact } = p;
  const isIncomplete = !dateOfBirth || !gender || !address;

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => onLogout && onLogout() },
    ]);

  const menu = [
    { label: 'Medical records', sub: 'Lab reports, scans & documents', icon: 'folder-open', color: colors.violet, bg: colors.violetSoft, onPress: () => navigation.navigate('MedicalRecords') },
    { label: 'Prescriptions', sub: 'Medicines from your doctors', icon: 'medkit', color: colors.warning, bg: colors.warningSoft, onPress: () => navigation.navigate('PatientPrescriptions') },
    { label: 'Edit medical profile', sub: 'Personal & emergency details', icon: 'create', color: colors.primary, bg: colors.primarySoft, onPress: () => navigation.navigate('EditProfile') },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} tintColor="#fff" colors={[colors.primary]} />}
      >
        <GradientHeader style={{ paddingBottom: 60 }}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>My profile</Text>
            <Pressable style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')} hitSlop={8}>
              <Ionicons name="create-outline" size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.identity}>
            <Avatar name={user.name} photo={p.profilePhoto} size={88} radius={30} style={styles.avatar} />
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </GradientHeader>

        <View style={styles.statsRow}>
          {[
            { label: 'Age', value: age != null ? `${age}` : '—', unit: age != null ? 'yrs' : '' },
            { label: 'Blood', value: bloodGroup || '—', unit: '' },
            { label: 'Gender', value: gender || '—', unit: '' },
          ].map((st, i) => (
            <View key={st.label} style={[styles.stat, i < 2 && styles.statBorder]}>
              <Text style={styles.statValue}>
                {st.value}
                {st.unit ? <Text style={styles.statUnit}> {st.unit}</Text> : null}
              </Text>
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.body}>
          {isIncomplete && (
            <Pressable style={styles.banner} onPress={() => navigation.navigate('EditProfile')}>
              <View style={styles.bannerIcon}>
                <Ionicons name="alert-circle" size={22} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Complete your medical profile</Text>
                <Text style={styles.bannerSub}>Needed before you can book an appointment.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.warning} />
            </Pressable>
          )}

          <Text style={styles.sectionTitle}>Personal details</Text>
          <Card style={styles.card}>
            <InfoRow icon="calendar-outline" label="Date of birth" value={dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
            <InfoRow icon="location-outline" label="Address" value={address} last />
          </Card>

          <Text style={styles.sectionTitle}>Emergency contact</Text>
          <Card style={styles.card}>
            <InfoRow icon="person-outline" label="Name" value={emergencyContact?.name} />
            <InfoRow icon="call-outline" label="Phone" value={emergencyContact?.phone} />
            <InfoRow icon="people-outline" label="Relationship" value={emergencyContact?.relationship} last />
          </Card>

          <Text style={styles.sectionTitle}>My health</Text>
          <Card style={{ padding: 6 }}>
            {menu.map((m, i) => (
              <Pressable key={m.label} onPress={m.onPress} style={({ pressed }) => [styles.menuItem, i < menu.length - 1 && styles.menuBorder, pressed && { opacity: 0.7 }]}>
                <View style={[styles.menuIcon, { backgroundColor: m.bg }]}>
                  <Ionicons name={m.icon} size={19} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{m.label}</Text>
                  <Text style={styles.menuSub}>{m.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </Card>

          <Pressable style={styles.logout} onPress={confirmLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', marginTop: 8 },
  avatar: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 12 },
  email: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },

  statsRow: {
    flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: 20, marginTop: -36,
    borderRadius: radius.lg, paddingVertical: 14,
    shadowColor: '#0C3A40', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  stat: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: colors.border },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.ink },
  statUnit: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },

  body: { paddingHorizontal: 20, paddingTop: 8 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.warningSoft, borderRadius: radius.lg, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#FCE3B4' },
  bannerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  bannerSub: { fontSize: 12, color: '#B45309', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 22, marginBottom: 10 },
  card: { paddingVertical: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  menuSub: { fontSize: 12, color: colors.body, marginTop: 1 },

  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: radius.md, backgroundColor: colors.dangerSoft, marginTop: 22 },
  logoutText: { color: colors.danger, fontWeight: '800', fontSize: 15 },
});
