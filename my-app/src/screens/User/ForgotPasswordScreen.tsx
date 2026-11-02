import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Image source={require('../assets/logo/Park-IT Logo.png')} style={styles.logoImage} resizeMode="contain" />
          
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your registered student email. We will send you instructions to reset your password.</Text>

          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#475569"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>Send Reset Link</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  keyboardView: { flex: 1 },
  backBtn: { padding: 20, alignSelf: 'flex-start' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 50 },
  logoImage: { width: 60, height: 60, backgroundColor: '#fff', borderRadius: 12, marginBottom: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 30, lineHeight: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 20, paddingHorizontal: 15, height: 55 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  submitBtn: { backgroundColor: '#ef4444', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});