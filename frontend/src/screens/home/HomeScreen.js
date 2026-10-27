import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, FlatList, Dimensions, Linking, Alert,
  ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../api/axiosInstance';
import Avatar from '../../components/Avatar';
import BrandLogo from '../../components/BrandLogo';
import { doctorName } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation, currentUser, onLogout }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!currentUser);
  const [topDoctors, setTopDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [topDoctorsY, setTopDoctorsY] = useState(0);
  const scrollRef = useRef(null);
  const bannerTimer = useRef(null);

  // Enquiry Form State
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', type: 'success' });

  const handleEnquirySubmit = () => {
    if (!enquiryName || !enquiryPhone || !enquiryMessage) {
      setCustomAlert({
        visible: true,
        title: 'Missing Info',
        message: 'Please fill in all fields so we can assist you better.',
        type: 'warning'
      });
      return;
    }
    setCustomAlert({
      visible: true,
      title: 'Enquiry Sent! ✅',
      message: 'Thank you for reaching out. Our medical support team will contact you shortly.',
      type: 'success'
    });
    setEnquiryName('');
    setEnquiryPhone('');
    setEnquiryMessage('');
  };

  const initializeData = useCallback(() => {
    if (currentUser) {
      setIsLoggedIn(true);
      fetchNotifications();
      if (currentUser.role === 'patient') {
        checkUnratedAppointments();
      }
    } else {
      setIsLoggedIn(false);
    }
  }, [currentUser]);

  const checkUnratedAppointments = async () => {
    try {
      const aptRes = await axiosInstance.get('/appointments/my-appointments/patient');
      const completed = (aptRes.data || []).filter(a => a.status?.toLowerCase() === 'completed');
      // Only prompt once per completed visit (previously it popped up on every Home visit)
      const seenKey = `ratingPromptSeen_${currentUser?.id || currentUser?._id || ''}`;
      let seen = [];
      try { seen = JSON.parse((await AsyncStorage.getItem(seenKey)) || '[]'); } catch (_) {}
      const unseen = completed.filter(a => !seen.includes(a._id));

      if (unseen.length > 0) {
        await AsyncStorage.setItem(seenKey, JSON.stringify([...seen, ...unseen.map(a => a._id)]));
        setCustomAlert({
          visible: true,
          title: 'Rate Your Visit ⭐️',
          message: 'You have completed appointments! Please take a moment to rate your experience.',
          type: 'rating'
        });
      }
    } catch (err) {
      console.log('Unrated check error:', err);
    }
  };

  useEffect(() => {
    initializeData();
    fetchTopDoctors();
    const timer = bannerTimer.current;
    return () => clearInterval(timer);
  }, [initializeData]);

  const fetchNotifications = async () => {
    const notifs = [];

    // ── 1. Appointments ───────────────────────────────────────────────────────
    try {
      const res = await axiosInstance.get('/appointments/my-appointments/patient');
      const apps = res.data || [];

      apps.forEach(app => {
        let docName = app.doctorId?.name || '';
        if (docName) docName = doctorName(docName);
        const dateStr = new Date(app.date).toLocaleDateString();

        // Status notifications
        if (app.status === 'Confirmed') {
          notifs.push({ id: app._id + '_conf', title: '✅ Appointment Confirmed', message: `Your appointment with ${docName} on ${dateStr} at ${app.time} has been confirmed.`, date: app.updatedAt, type: 'success' });
        } else if (app.status === 'Cancelled') {
          notifs.push({ id: app._id + '_canc', title: '❌ Appointment Cancelled', message: `Your appointment with ${docName} on ${dateStr} at ${app.time} was cancelled.`, date: app.updatedAt, type: 'error' });
        }

        // Reschedule notification
        if (app.isRescheduled) {
          notifs.push({ id: app._id + '_resch', title: '🔄 Appointment Rescheduled', message: `Your appointment with ${docName} was rescheduled to ${dateStr} at ${app.time}. ${app.rescheduleNote || ''}`, date: app.updatedAt, type: 'warning' });
        }

        // Bill ready notification (hasBill flag set by backend when invoice is created)
        if (app.hasBill || app.billingId) {
          notifs.push({ id: app._id + '_bill', title: '🧾 Bill Ready', message: `Your invoice for the appointment with ${docName} on ${dateStr} is now available.`, date: app.updatedAt, type: 'info' });
        }

        // Prescription notification (hasPrescription flag set by backend when doctor adds one)
        if (app.hasPrescription || app.prescriptionId) {
          notifs.push({ id: app._id + '_presc', title: '💊 Prescription Added', message: `${docName} has added a prescription for your appointment on ${dateStr}.`, date: app.updatedAt, type: 'success' });
        }
      });
    } catch (_) {}

    // ── 2. Billing — paid updates ─────────────────────────────────────────────
    try {
      const billingRes = await axiosInstance.get('/billing/my-billing');
      const bills = billingRes.data || [];
      bills.forEach(bill => {
        let docName = bill.doctorId?.name || '';
        if (docName) docName = doctorName(docName);
        const dateStr = bill.appointmentId?.date ? new Date(bill.appointmentId.date).toLocaleDateString() : '';
        // Paid confirmation
        if (bill.status === 'Paid') {
          notifs.push({ id: bill._id + '_paid', title: '✅ Payment Confirmed', message: `Your bill of Rs. ${bill.amount || ''} for ${docName}${dateStr ? ` on ${dateStr}` : ''} has been marked as paid.`, date: bill.paidAt || bill.updatedAt, type: 'success' });
        }
        // Pending bill reminder (not yet paid)
        if (bill.status === 'Pending') {
          notifs.push({ id: bill._id + '_pending', title: '💳 Payment Pending', message: `You have an outstanding bill of Rs. ${bill.amount || ''} for ${docName}${dateStr ? ` on ${dateStr}` : ''}. Please pay at your earliest convenience.`, date: bill.createdAt, type: 'warning' });
        }
      });
    } catch (_) {}

    // ── 3. Prescriptions ──────────────────────────────────────────────────────
    try {
      const prescRes = await axiosInstance.get('/prescriptions/my-prescriptions');
      const prescriptions = prescRes.data || [];
      prescriptions.forEach(presc => {
        let docName = presc.doctorId?.name || '';
        if (docName) docName = doctorName(docName);
        const dateStr = presc.appointmentId?.date ? new Date(presc.appointmentId.date).toLocaleDateString() : '';
        notifs.push({ id: presc._id + '_rx', title: '💊 Prescription Available', message: `${docName} has issued a prescription${dateStr ? ` for your appointment on ${dateStr}` : ''}. View your medications in the Appointments section.`, date: presc.createdAt, type: 'success' });
      });
    } catch (_) {}

    // Sort newest first, deduplicate by id, then update state
    const seen = new Set();
    const unique = notifs.filter(n => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    unique.sort((a, b) => new Date(b.date) - new Date(a.date));
    setNotifications(unique);
  };



  const fetchTopDoctors = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/doctors');
      setTopDoctors(res.data?.slice(0, 5) || []);
    } catch (_) {} finally { setLoading(false); }
  };

  const handleBooking = () => {
    if (isLoggedIn) {
      navigation.navigate('Doctors');
    } else {
      navigation.navigate('Login');
    }
  };

  const menuItems = [
    { label: 'About Us', icon: 'information-circle-outline', onPress: () => { setShowMenu(false); Alert.alert('About Us', 'MediCare is a modern clinic management platform providing world-class healthcare services.'); } },
    { label: 'Services / Clinic', icon: 'medical-outline', onPress: () => { setShowMenu(false); navigation.navigate(isLoggedIn ? 'Doctors' : 'Login'); } },
    { label: 'News & Media', icon: 'newspaper-outline', onPress: () => { setShowMenu(false); Alert.alert('News & Media', 'Coming soon – latest news and health blogs from MediCare.'); } },
    { label: 'Contact Us', icon: 'call-outline', onPress: () => { setShowMenu(false); navigation.navigate('Contact'); } },
  ];

  if (isLoggedIn) {
    menuItems.push({ 
      label: 'Feedback & Rating', 
      icon: 'star-outline', 
      onPress: () => { setShowMenu(false); navigation.navigate('Rating'); } 
    });
    menuItems.push({ 
      label: 'Log Out', 
      icon: 'log-out-outline', 
      onPress: () => { 
        setShowMenu(false); 
        if (onLogout) onLogout();
        else Alert.alert('Error', 'Logout function not available');
      } 
    });
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* ── TOP NAV BAR ── */}
      <View style={s.navbar}>
        {/* Logo + Name */}
        <View style={s.logoWrap}>
          <BrandLogo size={36} style={s.brandTile} />
          <Text style={s.logoText}>MediCare</Text>
        </View>

        {/* Right actions */}
        <View style={s.navRight}>
          {/* Emergency */}
          <TouchableOpacity style={s.emergencyBtn} onPress={() => setShowEmergency(true)}>
            <Ionicons name="alert-circle" size={14} color="#fff" />
            <Text style={s.emergencyBtnText}>Emergency</Text>
          </TouchableOpacity>

          {/* Notifications (logged in only) */}
          {isLoggedIn && (
            <TouchableOpacity style={s.iconBtn} onPress={() => { fetchNotifications(); setShowNotifications(true); }}>
              <Ionicons name="notifications-outline" size={20} color="#0DB591" />
              {notifications.length > 0 && <View style={s.notifDot} />}
            </TouchableOpacity>
          )}

          {/* Login (logged out only) */}
          {!isLoggedIn && (
            <TouchableOpacity style={s.loginNavBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={s.loginNavText}>Login</Text>
            </TouchableOpacity>
          )}

          {/* Menu */}
          <TouchableOpacity style={s.iconBtn} onPress={() => setShowMenu(true)}>
            <Ionicons name="menu" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        ref={scrollRef}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={s.scroll}
      >

        {/* ── WELCOME BANNER ── */}
        <View style={s.welcomeBanner}>
          {/* Background hospital image */}
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=800&auto=format&fit=crop' }}
            style={s.bannerBgImage}
            resizeMode="cover"
          />
          {/* Dark overlay */}
          <View style={s.bannerOverlay} />

          {/* Left: text content */}
          <View style={s.welcomeLeft}>
            <Text style={s.welcomeTitle}>{currentUser?.name ? `Hi, ${currentUser.name.split(' ')[0]}!` : 'Welcome!'}</Text>
            <Text style={s.welcomeBrand}>MediCare Clinic</Text>
            <Text style={s.welcomeSub}>Your health, our priority.</Text>
            <TouchableOpacity style={s.welcomeBtn} onPress={handleBooking}>
              <Ionicons name="calendar-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text style={s.welcomeBtnText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>

          {/* Right: image */}
          <Image
            source={require('../../images/welcome.png')}
            style={s.welcomeImg}
            resizeMode="cover"
          />
        </View>

        {/* ── QUICK CATEGORIES ── */}
        <View style={s.catRow}>
          {[
            { 
              icon: 'stethoscope', 
              color: '#0DB591', 
              bg: '#E8F5F1', 
              label: 'Doctors', 
              onPress: () => {
                if (scrollRef.current && topDoctorsY > 0) {
                  scrollRef.current.scrollTo({ y: topDoctorsY - 10, animated: true });
                }
              } 
            },
            { icon: 'ambulance', color: '#E91E63', bg: '#FDECEE', label: 'Ambulance', onPress: () => Linking.openURL('tel:0115577111') },
            { icon: 'hospital-building', color: '#FF9800', bg: '#FFF4E5', label: 'Hospital', onPress: () => navigation.navigate('Contact') },
            { icon: 'file-document-outline', color: '#9C27B0', bg: '#F4F0FF', label: 'Records', onPress: () => navigation.navigate(isLoggedIn ? 'MedicalRecords' : 'Login') },
          ].map((cat, i) => (
            <TouchableOpacity key={i} style={s.catItem} onPress={cat.onPress}>
              <View style={[s.catIcon, { backgroundColor: cat.bg }]}>
                <MaterialCommunityIcons name={cat.icon} size={26} color={cat.color} />
              </View>
              <Text style={s.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── HOSPITAL INFO SECTION ── */}
        <View style={s.infoSection}>
          <Text style={s.infoTitle}>Channel a specialist, without the wait</Text>
          
          <Text style={s.infoText}>
            Welcome to <Text style={{fontWeight: '700', color: '#0DB591'}}>MediCare Clinic</Text> — trusted, patient-focused care in Sri Lanka.
          </Text>
          
          <Text style={s.infoText}>
            We offer fast access to expert consultants, modern diagnostics, and safe, patient-focused treatment.
          </Text>
          
          <Text style={s.infoText}>
            If you’re looking to channel a doctor in Sri Lanka, receive prompt treatment, or plan a medical visit with confidence, <Text style={{fontWeight: '700'}}>MediCare clinic</Text> is your trusted choice.
          </Text>

          <View style={s.infoActionRow}>
            <TouchableOpacity 
              style={s.infoChannelBtn} 
              onPress={() => navigation.navigate(isLoggedIn ? 'Doctors' : 'Login')}
            >
              <Text style={s.infoChannelBtnText}>Channel a Doctor Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => Linking.openURL('tel:0115777777')}>
              <Text style={s.infoCallText}>Call 0115 777 777</Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* ── TOP DOCTORS ── */}
        <View 
          style={s.sectionRow} 
          onLayout={(event) => setTopDoctorsY(event.nativeEvent.layout.y)}
        >
          <Text style={s.sectionTitle}>Top Doctors</Text>
          <TouchableOpacity onPress={() => navigation.navigate(isLoggedIn ? 'Doctors' : 'Login')}>
            <Text style={s.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#0DB591" style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {topDoctors.length > 0 ? topDoctors.map(doc => (
              <TouchableOpacity key={doc._id} style={s.docCard} onPress={() => isLoggedIn ? navigation.navigate('DoctorDetail', { doctor: doc }) : navigation.navigate('Login')}>
                <Avatar name={doc.name} photo={doc.profilePhoto} size={64} style={s.docImg} />
                <Text style={s.docName} numberOfLines={2}>
                  {doctorName(doc.name)}
                </Text>
                <Text style={s.docSpec} numberOfLines={1}>{doc.specialization}</Text>
                <View style={s.docRating}>
                  <Ionicons name="star" size={11} color="#FF9800" />
                  <Text style={s.docRatText}>{doc.averageRating || '5.0'}</Text>
                  <Text style={s.docActive}> · {doc.totalReviews || 0} reviews</Text>
                </View>
              </TouchableOpacity>
            )) : <Text style={{ color: 'gray', padding: 20 }}>No doctors available yet.</Text>}
          </ScrollView>
        )}

        <View style={{ height: 20 }} />

        {/* ── ONLINE ENQUIRY FORM ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Online Enquiry</Text>
        </View>
        <View style={s.enquiryCard}>
          <Text style={s.enquiryDesc}>Have a question or need assistance? Fill out the form below and we will get back to you.</Text>
          
          <TextInput
            style={s.enquiryInput}
            placeholder="Your Name"
            placeholderTextColor="#94A3B8"
            value={enquiryName}
            onChangeText={setEnquiryName}
          />
          <TextInput
            style={s.enquiryInput}
            placeholder="Phone Number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={enquiryPhone}
            onChangeText={setEnquiryPhone}
          />
          <TextInput
            style={[s.enquiryInput, s.enquiryTextArea]}
            placeholder="How can we help you?"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={enquiryMessage}
            onChangeText={setEnquiryMessage}
          />
          
          <TouchableOpacity style={s.enquiryBtn} onPress={handleEnquirySubmit}>
            <Text style={s.enquiryBtnText}>Submit Enquiry</Text>
          </TouchableOpacity>
        </View>


        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── CUSTOM ALERT ── */}
      <Modal visible={customAlert.visible} transparent animationType="fade" onRequestClose={() => setCustomAlert({ ...customAlert, visible: false })}>
        <View style={s.alertOverlay}>
          <View style={s.alertBox}>
            <View style={s.alertIcon}>
              <Ionicons 
                name={customAlert.type === 'success' ? "checkmark-circle" : customAlert.type === 'warning' ? "warning" : "star"} 
                size={34} 
                color={customAlert.type === 'success' ? "#0DB591" : customAlert.type === 'warning' ? "#FF9800" : "#FFB300"} 
              />
            </View>
            <Text style={s.alertTitle}>{customAlert.title}</Text>
            <Text style={s.alertMsg}>{customAlert.message}</Text>
            <TouchableOpacity 
              style={s.alertBtn} 
              onPress={() => {
                setCustomAlert({ ...customAlert, visible: false });
                if (customAlert.type === 'rating') navigation.navigate('Ratings');
              }}
            >
              <Text style={s.alertBtnText}>{customAlert.type === 'rating' ? 'Rate Now' : 'Great, Thanks!'}</Text>
            </TouchableOpacity>
            {customAlert.type === 'rating' && (
              <TouchableOpacity 
                style={{ marginTop: 15 }} 
                onPress={() => setCustomAlert({ ...customAlert, visible: false })}
              >
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>Maybe Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ── EMERGENCY MODAL ── */}
      <Modal visible={showEmergency} transparent animationType="fade" onRequestClose={() => setShowEmergency(false)}>
        <View style={s.overlay}>
          <View style={s.emergencyModal}>
            <View style={s.emergencyHeader}>
              <Ionicons name="alert-circle" size={28} color="#FF3B30" />
              <Text style={s.emergencyTitle}>Emergency Contacts</Text>
              <TouchableOpacity onPress={() => setShowEmergency(false)}><Ionicons name="close" size={22} color="#333" /></TouchableOpacity>
            </View>
            <Text style={s.emergencySubtitle}>MediCare Clinic · Available 24/7</Text>
            {[
              { icon: 'call', color: '#FF3B30', label: 'Ambulance / Emergency', num: '1990', sub: 'National Ambulance Hotline' },
              { icon: 'call', color: '#0DB591', label: 'Hospital General Line', num: '0115 577 111', sub: 'All Departments' },
              { icon: 'call', color: '#007AFF', label: 'Channeling Hotline', num: '0115 777 888', sub: 'Book / Reschedule Appointments' },
            ].map((c, i) => (
              <TouchableOpacity key={i} style={s.emergencyRow} onPress={() => Linking.openURL(`tel:${c.num.replace(/\s/g, '')}`)}>
                <View style={[s.emergencyIcon, { backgroundColor: c.color + '20' }]}>
                  <Ionicons name={c.icon} size={20} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.emergencyRowLabel}>{c.label}</Text>
                  <Text style={s.emergencyRowSub}>{c.sub}</Text>
                </View>
                <Text style={[s.emergencyNum, { color: c.color }]}>{c.num}</Text>
              </TouchableOpacity>
            ))}
            <View style={s.emergencyTips}>
              <Text style={s.tipsTitle}>Quick First-Aid Tips</Text>
              <Text style={s.tipsText}>• Stay calm and keep the patient still{'\n'}• Call ambulance before anything else{'\n'}• Do NOT move a patient with suspected spinal injury{'\n'}• For choking, use Heimlich manoeuvre{'\n'}• For burns, run cool water for 10+ minutes</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MENU MODAL ── */}
      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={s.menuDrawer}>
            <View style={s.menuHeader}>
              <View style={s.logoBubble}><Ionicons name="medkit" size={16} color="#fff" /></View>
              <Text style={s.menuBrand}>MediCare</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}><Ionicons name="close" size={22} color="#333" /></TouchableOpacity>
            </View>
            {menuItems.map((item, i) => (
              <TouchableOpacity key={i} style={s.menuItem} onPress={item.onPress}>
                <Ionicons name={item.icon} size={20} color="#0DB591" />
                <Text style={s.menuItemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
            <View style={s.menuFooter}>
              <Text style={s.menuFooterText}>📍 MediCare Clinic, Colombo</Text>
              <Text style={s.menuFooterText}>📞 0115 577 111</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── NOTIFICATIONS MODAL ── */}
      <Modal visible={showNotifications} transparent animationType="slide" onRequestClose={() => setShowNotifications(false)}>
        <View style={s.overlay}>
          <View style={s.notifModal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}><Ionicons name="close" size={22} color="#333" /></TouchableOpacity>
            </View>
            {notifications.length > 0 ? (
              <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={[s.notifCard, { borderLeftColor: item.type === 'success' ? '#0DB591' : item.type === 'error' ? '#FF5252' : item.type === 'info' ? '#3A7BFF' : '#FF9800' }]}>
                    <Text style={s.notifCardTitle}>{item.title}</Text>
                    <Text style={s.notifCardMsg}>{item.message}</Text>
                    <Text style={s.notifCardTime}>{new Date(item.date).toLocaleString()}</Text>
                  </View>
                )}
              />
            ) : (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                <Text style={{ color: '#999', marginTop: 12, fontSize: 15 }}>No notifications yet.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { paddingBottom: 20 },

  // ── NAVBAR
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBubble: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0DB591', alignItems: 'center', justifyContent: 'center' },
  brandTile: { borderWidth: 1, borderColor: '#DCEBE8' },
  logoText: { fontSize: 17, fontWeight: '900', color: '#0A6B5B', letterSpacing: 0.3 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emergencyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, gap: 3 },
  emergencyBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  loginNavBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#0DB591' },
  loginNavText: { color: '#0DB591', fontSize: 12, fontWeight: '700' },
  iconBtn: { padding: 4, position: 'relative' },
  notifDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30', borderWidth: 1, borderColor: '#fff' },

  // ── WELCOME BANNER
  welcomeBanner: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#004237', minHeight: 200, overflow: 'hidden' },
  bannerBgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 50, 42, 0.72)' },
  welcomeLeft: { flex: 1, paddingHorizontal: 20, paddingVertical: 28, justifyContent: 'center', zIndex: 1 },
  welcomeTitle: { fontSize: 34, fontWeight: '900', color: '#fff', lineHeight: 40, marginBottom: 2 },
  welcomeBrand: { fontSize: 22, fontWeight: '800', color: '#0DB591', marginBottom: 6 },
  welcomeSub: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.7)', marginBottom: 20 },
  welcomeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0DB591', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 25, alignSelf: 'flex-start', elevation: 4, shadowColor: '#0DB591', shadowOpacity: 0.45, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  welcomeBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  welcomeImg: { width: SCREEN_WIDTH * 0.42, height: '100%', zIndex: 1 },

  // ── CATEGORIES
  catRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 20, backgroundColor: '#fff', marginTop: 2 },
  catItem: { alignItems: 'center', gap: 6 },
  catIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 12, color: '#555', fontWeight: '600' },

  // ── SECTIONS
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12, marginTop: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A2E2A' },
  seeAll: { fontSize: 13, color: '#0DB591', fontWeight: '600' },

  // ── DOCTOR CARD
  docCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginLeft: 16, width: 130, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, alignItems: 'center', marginBottom: 15 },
  docImg: { width: 64, height: 64, borderRadius: 32, marginBottom: 8 },
  docName: { fontSize: 13, fontWeight: '700', color: '#222', textAlign: 'center', marginBottom: 3, height: 36 },
  docSpec: { fontSize: 11, color: '#888', marginBottom: 6, textAlign: 'center' },
  docRating: { flexDirection: 'row', alignItems: 'center' },
  docRatText: { fontSize: 11, fontWeight: '700', color: '#333', marginLeft: 3 },
  docActive: { fontSize: 11, color: 'gray' },

  // ── MODALS / OVERLAYS
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },

  // Custom Alert
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { backgroundColor: '#fff', borderRadius: 24, padding: 25, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20 },
  alertIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5F1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  alertTitle: { fontSize: 20, fontWeight: '800', color: '#1A2E2A', marginBottom: 8, textAlign: 'center' },
  alertMsg: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  alertBtn: { backgroundColor: '#0DB591', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, elevation: 4, shadowColor: '#0DB591', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  alertBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Emergency modal
  emergencyModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  emergencyTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#FF3B30' },
  emergencySubtitle: { fontSize: 12, color: '#888', marginBottom: 18 },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F9F9F9', borderRadius: 14, marginBottom: 10, gap: 12 },
  emergencyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emergencyRowLabel: { fontSize: 13, fontWeight: '700', color: '#222' },
  emergencyRowSub: { fontSize: 11, color: '#888', marginTop: 2 },
  emergencyNum: { fontSize: 13, fontWeight: '800' },
  emergencyTips: { backgroundColor: '#FFF9F0', borderRadius: 14, padding: 14, marginTop: 10 },
  tipsTitle: { fontSize: 13, fontWeight: '800', color: '#FF9800', marginBottom: 8 },
  tipsText: { fontSize: 12, color: '#555', lineHeight: 20 },

  // Menu drawer
  menuDrawer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuBrand: { flex: 1, fontSize: 16, fontWeight: '800', color: '#0A2E2A' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 14 },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#222' },
  menuFooter: { marginTop: 20, gap: 6 },
  menuFooterText: { fontSize: 12, color: '#888', lineHeight: 18 },

  // Notifications modal
  notifModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: '50%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A2E2A' },
  notifCard: { backgroundColor: '#F9F9F9', padding: 14, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4 },
  notifCardTitle: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 4 },
  notifCardMsg: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 6 },
  notifCardTime: { fontSize: 11, color: '#aaa' },

  // ── HOSPITAL INFO SECTION
  infoSection: { paddingHorizontal: 20, paddingVertical: 24, backgroundColor: '#fff', marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoTitle: { fontSize: 20, fontWeight: '900', color: '#0A2E2A', marginBottom: 16, lineHeight: 28 },
  infoText: { fontSize: 14, color: '#444', lineHeight: 23, marginBottom: 12 },
  infoActionRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 8 },
  infoChannelBtn: { backgroundColor: '#0DB591', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, elevation: 2, shadowColor: '#0DB591', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  infoChannelBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  infoCallText: { color: '#0DB591', fontWeight: '700', fontSize: 15, textDecorationLine: 'underline' },
  
  // ── ENQUIRY FORM
  enquiryCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  enquiryDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  enquiryInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#334155',
    marginBottom: 12,
  },
  enquiryTextArea: {
    minHeight: 80,
  },
  enquiryBtn: {
    backgroundColor: '#0DB591',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0DB591',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  enquiryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
