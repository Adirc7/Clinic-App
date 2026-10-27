import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import DoctorListScreen from '../screens/doctors/DoctorListScreen';
import DoctorDetailScreen from '../screens/doctors/DoctorDetailScreen'; // clear cache
import HomeScreen from '../screens/home/HomeScreen';
import PatientAppointmentsScreen from '../screens/home/PatientAppointmentsScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import DoctorDashboardScreen from '../screens/doctor/DoctorDashboardScreen';
import AllAppointmentsScreen from '../screens/doctor/AllAppointmentsScreen';
import AdminDoctorListScreen from '../screens/admin/AdminDoctorListScreen';
import EditDoctorScreen from '../screens/admin/EditDoctorScreen';
import AdminRescheduleRequestsScreen from '../screens/admin/AdminRescheduleRequestsScreen';
import AdminPatientListScreen from '../screens/admin/AdminPatientListScreen';
import AdminBillingListScreen from '../screens/admin/AdminBillingListScreen';
import AdminPrescriptionListScreen from '../screens/admin/AdminPrescriptionListScreen';
import AdminPrescriptionEditScreen from '../screens/admin/AdminPrescriptionEditScreen';
import AdminMedicalRecordListScreen from '../screens/admin/AdminMedicalRecordListScreen';
import AdminAppointmentListScreen from '../screens/admin/AdminAppointmentListScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import EditProfileScreen from '../screens/patients/EditProfileScreen';
import MyProfileScreen from '../screens/patients/MyProfileScreen';
import PatientBillingScreen from '../screens/home/PatientBillingScreen';
import AddPrescriptionScreen from '../screens/prescriptions/AddPrescriptionScreen';
import PrescriptionDetailScreen from '../screens/prescriptions/PrescriptionDetailScreen';
import ContactScreen from '../screens/home/ContactScreen';
import RatingScreen from '../screens/home/RatingScreen';
import RatingsListScreen from '../screens/home/RatingsListScreen';
import AdminCreateBillingScreen from '../screens/admin/AdminCreateBillingScreen';
import MedicalRecordsScreen from '../screens/patients/MedicalRecordsScreen';
import AddMedicalRecordScreen from '../screens/patients/AddMedicalRecordScreen';
import PatientPrescriptionsScreen from '../screens/patients/PatientPrescriptionsScreen';
import DoctorPatientRecordsScreen from '../screens/doctor/DoctorPatientRecordsScreen';
import axiosInstance, { onSessionExpired } from '../api/axiosInstance';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Home Stack (Nested within Home Tab) ─────────────────────────────────────────
function HomeStack({ currentUser, handleLogout }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreenMain">
        {(props) => <HomeScreen {...props} currentUser={currentUser} onLogout={handleLogout} />}
      </Stack.Screen>
      <Stack.Screen name="DoctorDetail">
        {(props) => <DoctorDetailScreen {...props} currentUser={currentUser} />}
      </Stack.Screen>
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="BillingDetail" component={PatientBillingScreen} />
      <Stack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} />
      <Stack.Screen name="Ratings" component={RatingsListScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
      <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} />
      <Stack.Screen name="AddMedicalRecord" component={AddMedicalRecordScreen} />
      <Stack.Screen name="PatientPrescriptions" component={PatientPrescriptionsScreen} />
    </Stack.Navigator>
  );
}

// ─── Doctors Stack (Nested within Doctors Tab) ───────────────────────────────────
function DoctorsStack({ currentUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DoctorListMain" component={DoctorListScreen} />
      <Stack.Screen name="DoctorDetail">
        {(props) => <DoctorDetailScreen {...props} currentUser={currentUser} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function ProfileStack({ currentUser, onLogout }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyProfileMain">
        {(props) => <MyProfileScreen {...props} currentUser={currentUser} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} />
      <Stack.Screen name="AddMedicalRecord" component={AddMedicalRecordScreen} />
      <Stack.Screen name="PatientPrescriptions" component={PatientPrescriptionsScreen} />
      <Stack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Patient tab navigator ─────────────────────────────────────────────────────
function PatientTabNavigator({ currentUser, onLogout }) {
  // Respect the phone's gesture bar / home indicator so labels are never clipped
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Doctors: focused ? 'search' : 'search-outline',
            Appointments: focused ? 'calendar' : 'calendar-outline',
            Bills: focused ? 'receipt' : 'receipt-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
        },
        tabBarActiveTintColor: '#0DB591',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          paddingBottom: bottomPad,
          paddingTop: 8,
          height: 60 + bottomPad,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: '#FFFFFF',
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Home" options={{ tabBarLabel: 'Home' }}>
        {(props) => <HomeStack {...props} currentUser={currentUser} handleLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Doctors" options={{ tabBarLabel: 'Doctors' }}>
        {(props) => <DoctorsStack {...props} currentUser={currentUser} />}
      </Tab.Screen>
      <Tab.Screen name="Appointments" component={PatientAppointmentsScreen} options={{ tabBarLabel: 'Bookings' }} />
      <Tab.Screen name="Bills" component={PatientBillingScreen} />
      <Tab.Screen name="Profile">
        {(props) => <ProfileStack {...props} currentUser={currentUser} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Root Navigator ────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        const accessToken = await AsyncStorage.getItem('accessToken');
        const cachedUserStr = await AsyncStorage.getItem('cachedUser');
        
        if (accessToken) {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          
          if (cachedUserStr) {
            // Load instantly from cache
            try {
              setCurrentUser(JSON.parse(cachedUserStr));
              setIsCheckingAuth(false);
            } catch (_e) {
              console.log('Failed to parse cached user');
            }
          }
          
          // Fetch fresh data in background
          const response = await axiosInstance.get('/auth/me');
          setCurrentUser(response.data.user);
          await AsyncStorage.setItem('cachedUser', JSON.stringify(response.data.user));
        }
      } catch (_err) {
        console.log('Auth check failed:', _err.message);
        // Only log out when the server actually rejected the session.
        // A network error / sleeping server keeps the cached user signed in.
        const status = _err.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'cachedUser']);
          setCurrentUser(null);
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuthToken();

    // Refresh token expired somewhere in the app → back to the login screens
    const unsubscribe = onSessionExpired(() => setCurrentUser(null));
    return unsubscribe;
  }, []);

  const handleLogin = async ({ user, token }) => {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
    setCurrentUser(user);
    await AsyncStorage.setItem('cachedUser', JSON.stringify(user));
  };

  const handleLogout = async () => {
    delete axiosInstance.defaults.headers.common.Authorization;
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'cachedUser']);
    setCurrentUser(null);
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0DB591" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {/* ── Not logged in ── */}
        {!currentUser ? (
          <>
            <Stack.Screen name="HomePublic" component={HomeScreen} />
            <Stack.Screen name="Contact" component={ContactScreen} />
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>

        /* ── Admin ── */
        ) : currentUser.role === 'admin' ? (
          <>
            <Stack.Screen name="AdminDashboard">
              {(props) => (
                <AdminDashboardScreen
                  {...props}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AdminDoctorList" component={AdminDoctorListScreen} />
            <Stack.Screen name="EditDoctor" component={EditDoctorScreen} />
            <Stack.Screen name="AdminRescheduleRequests" component={AdminRescheduleRequestsScreen} />
            <Stack.Screen name="AdminPatientList" component={AdminPatientListScreen} />
            <Stack.Screen name="AdminAppointmentList" component={AdminAppointmentListScreen} />
            <Stack.Screen name="AdminBillingList" component={AdminBillingListScreen} />
            <Stack.Screen name="AdminCreateBilling" component={AdminCreateBillingScreen} />
            <Stack.Screen name="AdminPrescriptionList" component={AdminPrescriptionListScreen} />
            <Stack.Screen name="AdminPrescriptionEdit" component={AdminPrescriptionEditScreen} />
            <Stack.Screen name="AdminMedicalRecordList" component={AdminMedicalRecordListScreen} />
            <Stack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
          </>

        /* ── Doctor ── */
        ) : currentUser.role === 'doctor' ? (
          <>
            <Stack.Screen name="DoctorDashboard">
              {(props) => (
                <DoctorDashboardScreen
                  {...props}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AllAppointments">
              {(props) => (
                <AllAppointmentsScreen {...props} currentUser={currentUser} />
              )}
            </Stack.Screen>
            <Stack.Screen name="AddPrescription" component={AddPrescriptionScreen} />
            <Stack.Screen name="AdminPrescriptionEdit" component={AdminPrescriptionEditScreen} />
            <Stack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} />
            <Stack.Screen name="DoctorPatientRecords" component={DoctorPatientRecordsScreen} />
            <Stack.Screen name="AddMedicalRecord" component={AddMedicalRecordScreen} />
          </>

        /* ── Patient ── */
        ) : currentUser.role === 'patient' ? (
          <>
            <Stack.Screen name="MainTabs">
              {(props) => (
                <PatientTabNavigator
                  {...props}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
          </>
        ) : null}

      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
});
