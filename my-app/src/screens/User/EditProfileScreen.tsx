import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function EditProfileScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (error) {
        Alert.alert('Unable to load profile', error.message);
        setIsLoading(false);
        return;
      }
      if (!data.user) {
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('full_name, student_id, email')
        .eq('id', data.user.id)
        .single();
      if (!isMounted) return;
      if (profileError) {
        Alert.alert('Unable to load profile', profileError.message);
      } else {
        setName(profile.full_name ?? '');
        setStudentId(profile.student_id ?? '');
        setEmail(profile.email);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveChanges = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      Alert.alert('Unable to save profile', userError?.message ?? 'Sign in again and retry.');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ full_name: name.trim() || null })
      .eq('id', userData.user.id);
    setIsSaving(false);

    if (error) {
      Alert.alert('Unable to save profile', error.message);
    } else {
      Alert.alert('Profile updated', 'Your profile information has been saved.');
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? <ActivityIndicator style={styles.loader} color="#fbbf24" /> : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.label}>Name (optional)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Add your name"
            placeholderTextColor="#64748b"
            maxLength={100}
          />

          <Text style={styles.label}>Student ID</Text>
          <TextInput style={[styles.input, styles.disabledInput]} value={studentId} editable={false} />

          <Text style={styles.label}>Email</Text>
          <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} />
          <Text style={styles.helperText}>To change your email, contact an administrator.</Text>

          <TouchableOpacity style={styles.saveBtn} onPress={saveChanges} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { padding: 5 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  loader: { marginTop: 40 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#1e293b', borderRadius: 10, padding: 15, color: '#fff', fontSize: 15, marginBottom: 20 },
  disabledInput: { backgroundColor: '#0f172a', color: '#64748b' },
  helperText: { color: '#64748b', fontSize: 12, marginTop: -14, marginBottom: 16 },
  saveBtn: { backgroundColor: '#ef4444', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
