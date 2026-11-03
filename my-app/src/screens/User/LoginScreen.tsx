import React, { useState } from 'react';
import { Alert, ActivityIndicator, View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    const identifier = email.trim();
    if (!identifier || !password) {
      Alert.alert('Missing details', 'Enter your email or Student ID and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (identifier.includes('@')) {
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier.toLowerCase(),
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.functions.invoke<{
          session: { access_token: string; refresh_token: string };
        }>('student-login', {
          body: { identifier, password },
        });
        if (error) throw error;
        if (!data?.session?.access_token || !data.session.refresh_token) {
          throw new Error('The login service returned an invalid session.');
        }

        const { error: sessionError } = await supabase.auth.setSession(data.session);
        if (sessionError) throw sessionError;
      }
    } catch (error) {
      Alert.alert(
        'Unable to log in',
        error instanceof Error ? error.message : 'Check your details and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.content}>
          <View style={styles.brandingContainer}>
            <Image 
              source={require('../../assets/logo/Park-IT Logo.png')}
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            <Text style={styles.brandTitle}>Park-IT</Text>
            <Text style={styles.brandSubtitle}>USTP-CDO PARKING SPACE</Text>
          </View>

          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subWelcomeText}>Log in to check parking availability</Text>

          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Email or Student ID"
              placeholderTextColor="#475569"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#475569"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* UPDATED: Added onPress navigation to ForgotPassword */}
          <TouchableOpacity 
            style={styles.forgotPassword} 
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Log In</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupText}>New student? <Text style={styles.signupEmphasis}>Create an account</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  keyboardView: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  brandingContainer: { alignItems: 'center', marginBottom: 40 },
  logoImage: { width: 80, height: 80, backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, alignSelf: 'center' },
  brandTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  brandSubtitle: { color: '#94a3b8', fontSize: 12, letterSpacing: 1, marginTop: 4 },
  welcomeText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subWelcomeText: { color: '#94a3b8', fontSize: 14, marginBottom: 30 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, height: 55 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 30 },
  forgotPasswordText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  loginBtn: { backgroundColor: '#ef4444', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  signupLink: { alignItems: 'center', marginTop: 22, padding: 8 },
  signupText: { color: '#94a3b8', fontSize: 14 },
  signupEmphasis: { color: '#fbbf24', fontWeight: 'bold' },
});