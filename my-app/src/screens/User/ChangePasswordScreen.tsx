import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function ChangePasswordScreen({ navigation }: any) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Current Password</Text>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            secureTextEntry={!showPass}
            value={currentPass}
            onChangeText={setCurrentPass}
            placeholderTextColor="#475569"
            placeholder="Enter current password"
          />
        </View>

        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            secureTextEntry={!showPass}
            value={newPass}
            onChangeText={setNewPass}
            placeholderTextColor="#475569"
            placeholder="Enter new password"
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Feather name={showPass ? "eye" : "eye-off"} size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.saveBtnText}>Update Password</Text>
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
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, marginBottom: 20, paddingHorizontal: 15, height: 55 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  saveBtn: { backgroundColor: '#ef4444', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});