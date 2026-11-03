import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

interface ResetPasswordScreenProps {
  onComplete: () => void;
}

export default function ResetPasswordScreen({ onComplete }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const savePassword = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      Alert.alert('Passwords do not match', 'Re-enter the same password in both fields.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password updated', 'You can now sign in with your new password.');
      onComplete();
    } catch (error) {
      Alert.alert('Unable to reset password', error instanceof Error ? error.message : 'Open the latest reset email and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>Park-IT</Text>
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.subtitle}>Your reset link has been verified. Set a new password for your account.</Text>
        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="At least 8 characters"
          placeholderTextColor="#64748b"
        />
        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="Re-enter your password"
          placeholderTextColor="#64748b"
        />
        <TouchableOpacity style={styles.button} onPress={savePassword} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#0b1120" /> : <Text style={styles.buttonText}>Update password</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120', justifyContent: 'center' },
  content: { padding: 24 },
  brand: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold', marginBottom: 24 },
  title: { color: '#fff', fontSize: 25, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 14, lineHeight: 21, marginBottom: 28 },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1e293b', borderRadius: 10, padding: 15, color: '#fff', fontSize: 15, marginBottom: 20 },
  button: { backgroundColor: '#fbbf24', height: 54, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#0b1120', fontWeight: 'bold', fontSize: 15 },
});
