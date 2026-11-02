import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView } from 'react-native';

export default function UserManagementScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Student Management</Text>
        <TextInput style={styles.input} placeholder="Search students..." placeholderTextColor="#64748b" />
        <TouchableOpacity style={styles.addBtn}><Text style={styles.btnText}>+ Add Student Account</Text></TouchableOpacity>
        
        <View style={styles.card}>
          <Text style={styles.name}>Juan Dela Cruz</Text>
          <Text style={styles.info}>ID: 2023-01928 • Active</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionTxt}>Edit</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionTxt}>Reset Pass</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionTxt}>Deactivate</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  padding: { padding: 20 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 },
  addBtn: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8 },
  name: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  info: { color: '#94a3b8', fontSize: 12, marginVertical: 5 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { backgroundColor: '#334155', padding: 8, borderRadius: 5 },
  actionTxt: { color: '#fff', fontSize: 12 }
});