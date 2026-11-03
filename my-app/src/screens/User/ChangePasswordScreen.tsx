import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function ChangePasswordScreen({ navigation }: any) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updatePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Re-enter the same new password.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user?.email) throw new Error('Sign in again before changing your password.');

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: currentPassword,
      });
      if (verifyError) throw new Error('The current password is incorrect.');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      Alert.alert('Password updated', 'Your password has been changed.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Unable to change password', error instanceof Error ? error.message : 'Try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Current Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry={!showPasswords}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholderTextColor="#475569"
          placeholder="Enter current password"
          autoComplete="current-password"
          textContentType="password"
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry={!showPasswords}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholderTextColor="#475569"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry={!showPasswords}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor="#475569"
          placeholder="Re-enter new password"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TouchableOpacity onPress={() => setShowPasswords((visible) => !visible)} style={styles.showPassword}>
          <Text style={styles.showPasswordText}>{showPasswords ? 'Hide passwords' : 'Show passwords'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={updatePassword} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { padding: 5 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingTop: 30 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#1e293b', borderRadius: 10, padding: 15, color: '#fff', fontSize: 15, marginBottom: 20 },
  showPassword: { alignSelf: 'flex-end', marginTop: -12, marginBottom: 16 },
  showPasswordText: { color: '#60a5fa', fontSize: 12 },
  saveBtn: { backgroundColor: '#ef4444', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
