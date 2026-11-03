import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

interface SignupScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async () => {
    const normalizedStudentId = studentId.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^\d{6,20}$/.test(normalizedStudentId)) {
      Alert.alert('Check your Student ID', 'Enter the numeric Student ID provided by your school.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Re-enter the same password in both fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { student_id: normalizedStudentId } },
      });
      if (error) throw error;

      if (data.session) {
        Alert.alert('Account created', 'Your student account is ready.');
      } else {
        Alert.alert(
          'Check your email',
          'Your invitation was accepted. Verify your email before logging in.',
        );
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(
        'Could not create account',
        error instanceof Error
          ? error.message
          : 'Check that your email and Student ID match an administrator invitation.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableOpacity style={styles.backButton} onPress={navigation.goBack} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image
            source={require('../../assets/logo/Park-IT Logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Use the Student ID and email from your invitation.</Text>

          <Text style={styles.label}>Student ID</Text>
          <View style={styles.inputContainer}>
            <Feather name="hash" size={19} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Student ID"
              placeholderTextColor="#64748b"
              value={studentId}
              onChangeText={setStudentId}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              accessibilityLabel="Student ID"
            />
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={19} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="School email"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              accessibilityLabel="Email"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={19} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide passwords' : 'Show passwords'}
            >
              <Feather name={showPassword ? 'eye' : 'eye-off'} size={19} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={19} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#64748b"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              accessibilityLabel="Confirm password"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSignup}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Create Account</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.invitationNote}>Only students invited by an administrator can register.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  keyboardView: { flex: 1 },
  backButton: { padding: 18, alignSelf: 'flex-start' },
  content: { paddingHorizontal: 24, paddingBottom: 36 },
  logo: { width: 58, height: 58, backgroundColor: '#fff', borderRadius: 12, marginBottom: 18 },
  title: { color: '#fff', fontSize: 25, fontWeight: 'bold' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 7, marginBottom: 22 },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 7 },
  inputContainer: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 0 },
  submitButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  invitationNote: { color: '#64748b', textAlign: 'center', fontSize: 12, marginTop: 15 },
});
