import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Linking, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../api/axiosInstance';
import Avatar from '../../components/Avatar';
import BrandLogo from '../../components/BrandLogo';
import { Button, Card, GradientHeader, HeaderIconButton, SectionHeader, StatusBadge } from '../../components/ui';
import { colors, doctorName, gradients, greeting, radius, shadow } from '../../theme';
import { formatDate } from '../../utils/date';

const NOTIF_COLORS = { success: colors.success, error: colors.danger, info: colors.info, warning: colors.warning };

export default function HomeScreen({ navigation, currentUser, onLogout }) {
  const isLoggedIn = !!currentUser;
  const [topDoctors, setTopDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Enquiry form
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', type: 'success' });

  const goOrLogin = (screen, params) => navigation.navigate(isLoggedIn ? screen : 'Login', isLoggedIn ? params : undefined);

  const handleEnquirySubmit = () => {
    if (!enquiryName || !enquiryPhone || !enquiryMessage) {
      setCustomAlert({ visible: true, title: 'Missing Info', message: 'Please fill in all fields so we can assist you better.', type: 'warning' });
      return;
    }
    setCustomAlert({ visible: true, title: 'Enquiry Sent! ✅', message: 'Thank you for reaching out. Our medical support team will contact you shortly.', type: 'success' });
    setEnquiryName('');
    setEnquiryPhone('');
    setEnquiryMessage('');
  };

  // ── Data ────────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    const notifs = [];
    try {
      const res = await axiosInstance.get('/appointments/my-appointments/patient');
      const apps = res.data || [];

      // Next upcoming appointment (today or later, not cancelled/completed)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const upcoming = apps
        .filter((a) => new Date(a.date) >= startOfToday && ['Pending', 'Confirmed'].includes(a.status))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setNextAppointment(upcoming[0] || null);

      apps.forEach((app) => {
        const docName = app.doctorId?.name ? doctorName(app.doctorId.name) : 'your doctor';
        const dateStr = new Date(app.date).toLocaleDateString();
        if (app.status === 'Confirmed') {
          notifs.push({ id: app._id + '_conf', title: 'Appointment confirmed', message: `Your appointment with ${docName} on ${dateStr} at ${app.time} has been confirmed.`, date: app.updatedAt, type: 'success', icon: 'checkmark-circle' });
        } else if (app.status === 'Cancelled') {
          notifs.push({ id: app._id + '_canc', title: 'Appointment cancelled', message: `Your appointment with ${docName} on ${dateStr} at ${app.time} was cancelled.`, date: app.updatedAt, type: 'error', icon: 'close-circle' });
        }
        if (app.isRescheduled) {
          notifs.push({ id: app._id + '_resch', title: 'Appointment rescheduled', message: `Your appointment with ${docName} was moved to ${dateStr} at ${app.time}. ${app.rescheduleNote || ''}`, date: app.updatedAt, type: 'warning', icon: 'swap-horizontal' });
        }
        if (app.hasBill || app.billingId) {
          notifs.push({ id: app._id + '_bill', title: 'Bill ready', message: `Your invoice for the visit with ${docName} on ${dateStr} is available.`, date: app.updatedAt, type: 'info', icon: 'receipt' });
        }
      });
    } catch (_) {}

    try {
      const billingRes = await axiosInstance.get('/billing/my-billing');
      (billingRes.data || []).forEach((bill) => {
        const docName = bill.doctorId?.name ? doctorName(bill.doctorId.name) : 'your doctor';
        if (bill.status === 'Paid') {
          notifs.push({ id: bill._id + '_paid', title: 'Payment confirmed', message: `Your bill of Rs. ${bill.amount} for ${docName} has been paid.`, date: bill.paidAt || bill.updatedAt, type: 'success', icon: 'wallet' });
        } else if (bill.status === 'Pending') {
          notifs.push({ id: bill._id + '_pending', title: 'Payment pending', message: `You have an outstanding bill of Rs. ${bill.amount} for ${docName}.`, date: bill.createdAt, type: 'warning', icon: 'card' });
        }
      });
    } catch (_) {}

    try {
      const prescRes = await axiosInstance.get('/prescriptions/my-prescriptions');
      (prescRes.data || []).forEach((presc) => {
        const docName = presc.doctorId?.name ? doctorName(presc.doctorId.name) : 'Your doctor';
        notifs.push({ id: presc._id + '_rx', title: 'New prescription', message: `${docName} issued a prescription for you.`, date: presc.createdAt, type: 'success', icon: 'medkit' });
      });
    } catch (_) {}

    const seen = new Set();
    const unique = notifs.filter((n) => (seen.has(n.id) ? false : seen.add(n.id)));
    unique.sort((a, b) => new Date(b.date) - new Date(a.date));
    setNotifications(unique);
  }, []);

  const checkUnratedAppointments = useCallback(async () => {
    try {
      const aptRes = await axiosInstance.get('/appointments/my-appointments/patient');
      const completed = (aptRes.data || []).filter((a) => a.status === 'Completed');
      // Prompt only once per completed visit
      const seenKey = `ratingPromptSeen_${currentUser?.id || currentUser?._id || ''}`;
      let seen = [];
      try { seen = JSON.parse((await AsyncStorage.getItem(seenKey)) || '[]'); } catch (_) {}
      const unseen = completed.filter((a) => !seen.includes(a._id));
      if (unseen.length > 0) {
        await AsyncStorage.setItem(seenKey, JSON.stringify([...seen, ...unseen.map((a) => a._id)]));
        setCustomAlert({ visible: true, title: 'How was your visit?', message: 'Your feedback helps us improve. It only takes a minute.', type: 'rating' });
      }
    } catch (_) {}
  }, [currentUser]);

  const fetchTopDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/doctors');
      const sorted = [...(res.data || [])].sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
      setTopDoctors(sorted.slice(0, 6));
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopDoctors();
    if (currentUser?.role === 'patient') {
      fetchNotifications();
      checkUnratedAppointments();
    }
  }, [currentUser, fetchTopDoctors, fetchNotifications, checkUnratedAppointments]);

  // Refresh "next appointment" when coming back to Home
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    return navigation.addListener('focus', fetchNotifications);
  }, [navigation, isLoggedIn, fetchNotifications]);

  // ── Menu ────────────────────────────────────────────────────────────────────
  const menuItems = [
    { label: 'About MediCare', icon: 'information-circle-outline', onPress: () => Alert.alert('About MediCare', 'MediCare Clinic is a modern clinic platform for booking trusted doctors, managing bills, prescriptions and medical records.') },
    { label: 'Our Doctors', icon: 'people-outline', onPress: () => goOrLogin('Doctors') },
    { label: 'Contact Us', icon: 'call-outline', onPress: () => navigation.navigate('Contact') },
  ];
  if (isLoggedIn) {
    menuItems.push({ label: 'Feedback & Rating', icon: 'star-outline', onPress: () => navigation.navigate('Rating') });
    menuItems.push({ label: 'Log Out', icon: 'log-out-outline', danger: true, onPress: () => onLogout && onLogout() });
  }

  const quickActions = isLoggedIn
    ? [
        { label: 'Find Doctor', icon: 'search', color: colors.primary, bg: colors.primarySoft, onPress: () => navigation.navigate('Doctors') },
        { label: 'Bookings', icon: 'calendar', color: colors.info, bg: colors.infoSoft, onPress: () => navigation.navigate('Appointments') },
        { label: 'Records', icon: 'document-text', color: colors.violet, bg: colors.violetSoft, onPress: () => navigation.navigate('MedicalRecords') },
        { label: 'Medicines', icon: 'medkit', color: colors.warning, bg: colors.warningSoft, onPress: () => navigation.navigate('PatientPrescriptions') },
      ]
    : [
        { label: 'Doctors', icon: 'people', color: colors.primary, bg: colors.primarySoft, onPress: () => navigation.navigate('Login') },
        { label: 'Ambulance', icon: 'car', color: colors.danger, bg: colors.dangerSoft, onPress: () => Linking.openURL('tel:1990') },
        { label: 'Contact', icon: 'call', color: colors.info, bg: colors.infoSoft, onPress: () => navigation.navigate('Contact') },
        { label: 'Records', icon: 'document-text', color: colors.violet, bg: colors.violetSoft, onPress: () => navigation.navigate('Login') },
      ];

  const firstName = currentUser?.name?.split(' ')[0];

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── HEADER ── */}
        <GradientHeader style={{ paddingBottom: 30 }}>
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              {isLoggedIn ? (
                <Avatar name={currentUser.name} size={46} radius={15} style={s.headerAvatar} />
              ) : (
                <BrandLogo size={46} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.hello}>{isLoggedIn ? `${greeting()},` : 'Welcome to'}</Text>
                <Text style={s.name} numberOfLines={1}>{isLoggedIn ? `${firstName} 👋` : 'MediCare Clinic'}</Text>
              </View>
            </View>
            <View style={s.headerRight}>
              {isLoggedIn ? (
                <HeaderIconButton icon="notifications-outline" badge={notifications.length > 0} onPress={() => { fetchNotifications(); setShowNotifications(true); }} />
              ) : (
                <Pressable style={s.loginPill} onPress={() => navigation.navigate('Login')}>
                  <Text style={s.loginPillText}>Sign in</Text>
                </Pressable>
              )}
              <HeaderIconButton icon="menu" onPress={() => setShowMenu(true)} />
            </View>
          </View>

          <Text style={s.headline}>How are you feeling today?</Text>

          <Pressable style={s.search} onPress={() => goOrLogin('Doctors')}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <Text style={s.searchText}>Search doctors or specialities</Text>
            <View style={s.searchBtn}>
              <Ionicons name="options-outline" size={16} color="#fff" />
            </View>
          </Pressable>
        </GradientHeader>

        <View style={s.body}>
          {/* ── EMERGENCY STRIP ── */}
          <Pressable onPress={() => setShowEmergency(true)} style={({ pressed }) => [s.emergency, pressed && { opacity: 0.9 }]}>
            <View style={s.emergencyIcon}>
              <Ionicons name="pulse" size={20} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.emergencyTitle}>Emergency? We&apos;re here 24/7</Text>
              <Text style={s.emergencySub}>Tap for ambulance & hotlines</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} />
          </Pressable>

          {/* ── QUICK ACTIONS ── */}
          <View style={s.quickRow}>
            {quickActions.map((a) => (
              <Pressable key={a.label} style={({ pressed }) => [s.quickItem, pressed && { transform: [{ scale: 0.96 }] }]} onPress={a.onPress}>
                <View style={[s.quickIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={s.quickLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── NEXT APPOINTMENT ── */}
          {isLoggedIn && (
            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="Upcoming appointment" action="View all" onAction={() => navigation.navigate('Appointments')} />
              {nextAppointment ? (
                <Pressable onPress={() => navigation.navigate('Appointments')}>
                  <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.apptCard}>
                    <View style={s.apptTop}>
                      <Avatar name={nextAppointment.doctorId?.name} photo={nextAppointment.doctorId?.profilePhoto} size={52} radius={16} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.apptDoctor} numberOfLines={1}>{doctorName(nextAppointment.doctorId?.name || 'Doctor')}</Text>
                        <Text style={s.apptSpec}>{nextAppointment.doctorId?.specialization || 'General'}</Text>
                      </View>
                      <StatusBadge status={nextAppointment.status} style={{ backgroundColor: 'rgba(255,255,255,0.92)' }} />
                    </View>
                    <View style={s.apptInfo}>
                      <View style={s.apptInfoItem}>
                        <Ionicons name="calendar-outline" size={16} color="#fff" />
                        <Text style={s.apptInfoText}>{formatDate(nextAppointment.date)}</Text>
                      </View>
                      <View style={s.apptDivider} />
                      <View style={s.apptInfoItem}>
                        <Ionicons name="time-outline" size={16} color="#fff" />
                        <Text style={s.apptInfoText}>{nextAppointment.time}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Card style={s.noAppt}>
                  <View style={s.noApptIcon}>
                    <Ionicons name="calendar-clear-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.noApptTitle}>No upcoming visits</Text>
                    <Text style={s.noApptSub}>Book a specialist in under a minute.</Text>
                  </View>
                  <Button title="Book" small onPress={() => navigation.navigate('Doctors')} style={{ width: 84 }} />
                </Card>
              )}
            </View>
          )}

          {/* ── PROMO BANNER ── */}
          <LinearGradient colors={['#E3F4F2', '#CDEBE7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.promo}>
            <View style={s.promoText}>
              <Text style={s.promoTag}>CHANNEL A SPECIALIST</Text>
              <Text style={s.promoTitle}>Expert care, without the wait</Text>
              <Text style={s.promoSub}>Verified consultants, instant booking.</Text>
              <Button title="Book now" icon="calendar-outline" small onPress={() => goOrLogin('Doctors')} style={{ marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 6 }} />
            </View>
            <Image source={require('../../images/welcome.png')} style={s.promoImg} resizeMode="contain" />
          </LinearGradient>

          {/* ── TOP DOCTORS ── */}
          <SectionHeader title="Top doctors" action="See all" onAction={() => goOrLogin('Doctors')} style={{ marginTop: 26 }} />
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : topDoctors.length === 0 ? (
            <Text style={s.emptyText}>No doctors available yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8, paddingBottom: 6 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
              {topDoctors.map((doc) => (
                <Pressable
                  key={doc._id}
                  style={({ pressed }) => [s.docCard, pressed && { transform: [{ scale: 0.97 }] }]}
                  onPress={() => goOrLogin('DoctorDetail', { doctor: doc })}
                >
                  <Avatar name={doc.name} photo={doc.profilePhoto} size={64} radius={20} />
                  <Text style={s.docName} numberOfLines={1}>{doctorName(doc.name)}</Text>
                  <Text style={s.docSpec} numberOfLines={1}>{doc.specialization}</Text>
                  <View style={s.docMeta}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={s.docRating}>{doc.averageRating || '5.0'}</Text>
                    <Text style={s.docReviews}>({doc.totalReviews || 0})</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* ── WHY US ── */}
          <View style={s.whyRow}>
            {[
              ['shield-checkmark', 'Verified', 'doctors'],
              ['flash', 'Instant', 'booking'],
              ['lock-closed', 'Private', 'records'],
            ].map(([icon, a, b]) => (
              <View key={a} style={s.whyItem}>
                <Ionicons name={icon} size={20} color={colors.primary} />
                <Text style={s.whyA}>{a}</Text>
                <Text style={s.whyB}>{b}</Text>
              </View>
            ))}
          </View>

          {/* ── ENQUIRY ── */}
          <SectionHeader title="Have a question?" style={{ marginTop: 26 }} />
          <Card>
            <Text style={s.enquiryDesc}>Send us a message and our team will get back to you shortly.</Text>
            <TextInput style={s.input} placeholder="Your name" placeholderTextColor={colors.muted} value={enquiryName} onChangeText={setEnquiryName} />
            <TextInput style={s.input} placeholder="Phone number" placeholderTextColor={colors.muted} keyboardType="phone-pad" value={enquiryPhone} onChangeText={setEnquiryPhone} />
            <TextInput
              style={[s.input, { height: 96, paddingTop: 12 }]}
              placeholder="How can we help you?"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              value={enquiryMessage}
              onChangeText={setEnquiryMessage}
            />
            <Button title="Send enquiry" icon="paper-plane-outline" onPress={handleEnquirySubmit} style={{ marginTop: 4 }} />
          </Card>
        </View>
      </ScrollView>

      {/* ── ALERT ── */}
      <Modal visible={customAlert.visible} transparent animationType="fade" onRequestClose={() => setCustomAlert({ ...customAlert, visible: false })}>
        <View style={s.overlayCenter}>
          <View style={s.alertBox}>
            <View style={[s.alertIcon, { backgroundColor: customAlert.type === 'warning' ? colors.warningSoft : customAlert.type === 'rating' ? '#FEF3C7' : colors.successSoft }]}>
              <Ionicons
                name={customAlert.type === 'success' ? 'checkmark-circle' : customAlert.type === 'warning' ? 'warning' : 'star'}
                size={34}
                color={customAlert.type === 'success' ? colors.success : customAlert.type === 'warning' ? colors.warning : '#F59E0B'}
              />
            </View>
            <Text style={s.alertTitle}>{customAlert.title}</Text>
            <Text style={s.alertMsg}>{customAlert.message}</Text>
            <Button
              title={customAlert.type === 'rating' ? 'Rate now' : 'OK'}
              onPress={() => {
                setCustomAlert({ ...customAlert, visible: false });
                if (customAlert.type === 'rating') navigation.navigate('Ratings');
              }}
              style={{ alignSelf: 'stretch' }}
            />
            {customAlert.type === 'rating' && (
              <Pressable style={{ marginTop: 14 }} onPress={() => setCustomAlert({ ...customAlert, visible: false })}>
                <Text style={s.later}>Maybe later</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* ── EMERGENCY SHEET ── */}
      <Modal visible={showEmergency} transparent animationType="slide" onRequestClose={() => setShowEmergency(false)}>
        <Pressable style={s.overlay} onPress={() => setShowEmergency(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <View style={[s.emergencyIcon, { width: 44, height: 44 }]}>
                <Ionicons name="pulse" size={22} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Emergency contacts</Text>
                <Text style={s.sheetSub}>MediCare Clinic · Available 24/7</Text>
              </View>
              <Pressable onPress={() => setShowEmergency(false)} hitSlop={10}><Ionicons name="close" size={22} color={colors.body} /></Pressable>
            </View>
            {[
              { color: colors.danger, label: 'Ambulance / Emergency', num: '1990', sub: 'National ambulance (Suwa Seriya)' },
              { color: colors.primary, label: 'Clinic general line', num: '0115 577 111', sub: 'All departments' },
              { color: colors.info, label: 'Channelling hotline', num: '0115 777 888', sub: 'Book or reschedule' },
            ].map((c) => (
              <Pressable key={c.label} style={s.callRow} onPress={() => Linking.openURL(`tel:${c.num.replace(/\s/g, '')}`)}>
                <View style={[s.callIcon, { backgroundColor: c.color + '18' }]}>
                  <Ionicons name="call" size={18} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.callLabel}>{c.label}</Text>
                  <Text style={s.callSub}>{c.sub}</Text>
                </View>
                <Text style={[s.callNum, { color: c.color }]}>{c.num}</Text>
              </Pressable>
            ))}
            <View style={s.tips}>
              <Text style={s.tipsTitle}>Quick first-aid tips</Text>
              <Text style={s.tipsText}>• Stay calm and keep the patient still{'\n'}• Call the ambulance before anything else{'\n'}• Don&apos;t move someone with a suspected spinal injury{'\n'}• For burns, run cool water for 10+ minutes</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MENU SHEET ── */}
      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={s.overlay} onPress={() => setShowMenu(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <BrandLogo size={40} />
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>MediCare Clinic</Text>
                <Text style={s.sheetSub}>{isLoggedIn ? currentUser.email : 'Your health, our priority'}</Text>
              </View>
              <Pressable onPress={() => setShowMenu(false)} hitSlop={10}><Ionicons name="close" size={22} color={colors.body} /></Pressable>
            </View>
            {menuItems.map((item) => (
              <Pressable key={item.label} style={s.menuItem} onPress={() => { setShowMenu(false); item.onPress(); }}>
                <View style={[s.menuIcon, item.danger && { backgroundColor: colors.dangerSoft }]}>
                  <Ionicons name={item.icon} size={19} color={item.danger ? colors.danger : colors.primary} />
                </View>
                <Text style={[s.menuText, item.danger && { color: colors.danger }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── NOTIFICATIONS SHEET ── */}
      <Modal visible={showNotifications} transparent animationType="slide" onRequestClose={() => setShowNotifications(false)}>
        <Pressable style={s.overlay} onPress={() => setShowNotifications(false)}>
          <Pressable style={[s.sheet, { maxHeight: '80%' }]} onPress={() => {}}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { flex: 1 }]}>Notifications</Text>
              <Pressable onPress={() => setShowNotifications(false)} hitSlop={10}><Ionicons name="close" size={22} color={colors.body} /></Pressable>
            </View>
            {notifications.length > 0 ? (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={s.notif}>
                    <View style={[s.notifIcon, { backgroundColor: (NOTIF_COLORS[item.type] || colors.info) + '1A' }]}>
                      <Ionicons name={item.icon || 'notifications'} size={18} color={NOTIF_COLORS[item.type] || colors.info} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.notifTitle}>{item.title}</Text>
                      <Text style={s.notifMsg}>{item.message}</Text>
                      <Text style={s.notifTime}>{item.date ? new Date(item.date).toLocaleString() : ''}</Text>
                    </View>
                  </View>
                )}
              />
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="notifications-off-outline" size={44} color={colors.muted} />
                <Text style={{ color: colors.body, marginTop: 10 }}>You&apos;re all caught up.</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  // header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerAvatar: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hello: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  name: { color: '#fff', fontSize: 20, fontWeight: '800' },
  loginPill: { backgroundColor: '#fff', paddingHorizontal: 14, height: 38, borderRadius: 12, justifyContent: 'center' },
  loginPillText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  headline: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 22, marginBottom: 14, letterSpacing: -0.3 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: radius.md, height: 52, paddingLeft: 14, paddingRight: 6 },
  searchText: { flex: 1, color: colors.muted, fontSize: 14 },
  searchBtn: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },

  body: { paddingHorizontal: 20, marginTop: 18 },

  emergency: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF5F5', borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: '#FBD5D5', marginBottom: 20 },
  emergencyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  emergencyTitle: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
  emergencySub: { fontSize: 12, color: '#B45454', marginTop: 1 },

  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 },
  quickItem: { alignItems: 'center', width: '23%' },
  quickIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: colors.ink },

  apptCard: { borderRadius: radius.lg, padding: 16, ...shadow.button },
  apptTop: { flexDirection: 'row', alignItems: 'center' },
  apptDoctor: { color: '#fff', fontSize: 16, fontWeight: '800' },
  apptSpec: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  apptInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 12, marginTop: 14 },
  apptInfoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  apptInfoText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  apptDivider: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.3)' },
  noAppt: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noApptIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  noApptTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  noApptSub: { fontSize: 12, color: colors.body, marginTop: 2 },

  promo: { borderRadius: radius.lg, flexDirection: 'row', overflow: 'hidden', minHeight: 170 },
  promoText: { flex: 1, padding: 18, justifyContent: 'center' },
  promoTag: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  promoTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 6, lineHeight: 23 },
  promoSub: { fontSize: 12, color: colors.body, marginTop: 4 },
  promoImg: { width: 120, height: 170, alignSelf: 'flex-end', marginRight: 4 },

  docCard: { width: 148, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginRight: 12, ...shadow.soft },
  docName: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 10 },
  docSpec: { fontSize: 12, color: colors.body, marginTop: 2 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  docRating: { fontSize: 12, fontWeight: '800', color: colors.ink },
  docReviews: { fontSize: 12, color: colors.muted },
  emptyText: { color: colors.body, paddingVertical: 16 },

  whyRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  whyItem: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  whyA: { fontSize: 13, fontWeight: '800', color: colors.ink, marginTop: 6 },
  whyB: { fontSize: 11, color: colors.body },

  enquiryDesc: { fontSize: 13, color: colors.body, marginBottom: 12, lineHeight: 19 },
  input: { backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, height: 50, paddingHorizontal: 14, fontSize: 14, color: colors.ink, marginBottom: 10 },

  // modals
  overlayCenter: { flex: 1, backgroundColor: 'rgba(6,30,34,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  alertBox: { backgroundColor: '#fff', borderRadius: radius.xl, padding: 24, alignItems: 'center', width: '100%', maxWidth: 360 },
  alertIcon: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  alertTitle: { fontSize: 19, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  alertMsg: { fontSize: 14, color: colors.body, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  later: { color: colors.body, fontWeight: '700', fontSize: 13 },

  overlay: { flex: 1, backgroundColor: 'rgba(6,30,34,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  sheetSub: { fontSize: 12, color: colors.body, marginTop: 2 },

  callRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  callIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  callLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  callSub: { fontSize: 12, color: colors.body },
  callNum: { fontSize: 14, fontWeight: '800' },
  tips: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 14, marginTop: 14 },
  tipsTitle: { fontWeight: '800', color: colors.ink, marginBottom: 6 },
  tipsText: { color: colors.body, fontSize: 13, lineHeight: 21 },

  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },

  notif: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  notifIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  notifMsg: { fontSize: 13, color: colors.body, marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
