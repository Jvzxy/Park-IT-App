import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface StudentProfile {
  id: string;
  full_name: string | null;
  student_id: string | null;
  email: string;
}

interface StudentVehicle {
  id: string;
  plate_number: string;
  make_model: string;
  color: string | null;
}

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [vehicles, setVehicles] = useState<StudentVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  const loadProfile = useCallback(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setErrorMessage(userError?.message ?? 'Sign in again to view your profile.');
      setIsLoading(false);
      return;
    }

    const [profileResult, vehiclesResult] = await Promise.all([
      supabase.from('users').select('id, full_name, student_id, email').eq('id', userData.user.id).single(),
      supabase.from('student_vehicles').select('id, plate_number, make_model, color').eq('student_id', userData.user.id).order('created_at'),
    ]);

    if (profileResult.error || vehiclesResult.error) {
      setErrorMessage(profileResult.error?.message ?? vehiclesResult.error?.message ?? 'Unable to load profile.');
    } else {
      setErrorMessage(null);
      setProfile(profileResult.data);
      setVehicles(vehiclesResult.data ?? []);
    }
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadProfile();
    }, [loadProfile]),
  );

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Unable to log out', error.message);
  };

  const addVehicle = async () => {
    if (!profile) return;
    if (!plateNumber.trim() || !makeModel.trim()) {
      Alert.alert('Vehicle details required', 'Enter a plate number and make/model.');
      return;
    }

    setIsSavingVehicle(true);
    const { data, error } = await supabase
      .from('student_vehicles')
      .insert({
        student_id: profile.id,
        plate_number: plateNumber.trim().toUpperCase(),
        make_model: makeModel.trim(),
        color: vehicleColor.trim() || null,
      })
      .select('id, plate_number, make_model, color')
      .single();
    setIsSavingVehicle(false);

    if (error) {
      Alert.alert('Unable to save vehicle', error.message);
      return;
    }
    setVehicles((current) => [...current, data]);
    setPlateNumber('');
    setMakeModel('');
    setVehicleColor('');
    setShowVehicleForm(false);
  };

  const removeVehicle = async (vehicleId: string) => {
    const { error } = await supabase.from('student_vehicles').delete().eq('id', vehicleId);
    if (error) {
      Alert.alert('Unable to remove vehicle', error.message);
      return;
    }
    setVehicles((current) => current.filter((vehicle) => vehicle.id !== vehicleId));
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator style={styles.loader} color="#fbbf24" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarBox}><Ionicons name="person" size={48} color="#94a3b8" /></View>
          <Text style={styles.userName}>{profile?.full_name || `Student ${profile?.student_id ?? ''}`}</Text>
          <Text style={styles.studentId}>ID: {profile?.student_id ?? 'Not available'}</Text>
          <Text style={styles.userEmail}>{profile?.email ?? ''}</Text>
        </View>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="create-outline" size={22} color="#fff" />
            <Text style={styles.menuText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowVehicleForm((visible) => !visible)}>
            <Ionicons name="car-outline" size={22} color="#fff" />
            <Text style={styles.menuText}>My Vehicle Details</Text>
            <Ionicons name={showVehicleForm ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
          </TouchableOpacity>
          {vehicles.map((vehicle) => (
            <View key={vehicle.id} style={styles.vehicleRow}>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{vehicle.make_model}</Text>
                <Text style={styles.vehicleDetail}>{vehicle.plate_number}{vehicle.color ? ` · ${vehicle.color}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => void removeVehicle(vehicle.id)} accessibilityRole="button" accessibilityLabel={`Remove ${vehicle.plate_number}`}>
                <Ionicons name="trash-outline" size={20} color="#f87171" />
              </TouchableOpacity>
            </View>
          ))}
          {showVehicleForm ? (
            <View style={styles.vehicleForm}>
              <TextInput style={styles.input} placeholder="Plate number" placeholderTextColor="#64748b" value={plateNumber} onChangeText={setPlateNumber} autoCapitalize="characters" />
              <TextInput style={styles.input} placeholder="Make / model" placeholderTextColor="#64748b" value={makeModel} onChangeText={setMakeModel} />
              <TextInput style={styles.input} placeholder="Color (optional)" placeholderTextColor="#64748b" value={vehicleColor} onChangeText={setVehicleColor} />
              <TouchableOpacity style={styles.addVehicleButton} onPress={addVehicle} disabled={isSavingVehicle}>
                {isSavingVehicle ? <ActivityIndicator color="#fff" /> : <Text style={styles.addVehicleText}>Save Vehicle</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ReportHistory')}>
            <Ionicons name="document-text-outline" size={22} color="#fff" />
            <Text style={styles.menuText}>My Reports & Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChangePassword')}>
            <Ionicons name="lock-closed-outline" size={22} color="#fff" />
            <Text style={styles.menuText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={() => void handleLogout()}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text style={[styles.menuText, styles.logoutText]}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  content: { padding: 20, paddingBottom: 36 },
  loader: { marginTop: 40 },
  header: { alignItems: 'center', marginTop: 20, marginBottom: 28 },
  avatarBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  userName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  studentId: { color: '#34d399', fontSize: 13, marginTop: 5, fontWeight: '600' },
  userEmail: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  menuGroup: { backgroundColor: '#1e293b', borderRadius: 15, paddingHorizontal: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  menuText: { color: '#fff', fontSize: 15, marginLeft: 15, flex: 1 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 36, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  vehicleInfo: { flex: 1 },
  vehicleName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  vehicleDetail: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  vehicleForm: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  input: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 10 },
  addVehicleButton: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  addVehicleText: { color: '#fff', fontWeight: 'bold' },
  logoutItem: { borderBottomWidth: 0 },
  logoutText: { color: '#ef4444' },
  errorText: { color: '#fca5a5', marginBottom: 12 },
});
