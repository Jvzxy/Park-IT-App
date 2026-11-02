import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileScreen({ navigation }: any) {
  const [name, setName] = useState('USTP Student');
  const [email, setEmail] = useState('student@ustp.edu.ph');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBox}>
            <Ionicons name="person" size={50} color="#94a3b8" />
          </View>
          <TouchableOpacity>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#475569" />

        <Text style={styles.label}>Student ID (Non-editable)</Text>
        <TextInput style={[styles.input, styles.disabledInput]} value="2023-01928" editable={false} />

        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor="#475569" />

        <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
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
  scrollContent: { padding: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  avatarBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  changePhotoText: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold' },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#1e293b', borderRadius: 10, padding: 15, color: '#fff', fontSize: 15, marginBottom: 20 },
  disabledInput: { backgroundColor: '#0f172a', color: '#64748b' },
  saveBtn: { backgroundColor: '#ef4444', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});