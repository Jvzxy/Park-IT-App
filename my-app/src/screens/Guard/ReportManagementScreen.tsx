import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView } from 'react-native';

export default function ReportManagementScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Student Reports</Text>
        <TextInput style={styles.search} placeholder="Search reports or filter by zone..." placeholderTextColor="#64748b" />
        
        <View style={styles.card}>
          <Text style={styles.category}>Blocked Lane - Pending</Text>
          <Text style={styles.desc}>White sedan blocking Zone A exit.</Text>
          <Text style={styles.student}>Reported by: Student ID 2023-019</Text>
          <TextInput style={styles.remarkInput} placeholder="Add resolution remark..." placeholderTextColor="#64748b" />
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, {backgroundColor: '#3b82f6'}]}><Text style={styles.btnText}>In Progress</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, {backgroundColor: '#10b981'}]}><Text style={styles.btnText}>Resolve</Text></TouchableOpacity>
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
  search: { backgroundColor: '#1e293b', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 20 },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8, marginBottom: 15 },
  category: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
  desc: { color: '#fff', marginVertical: 5 },
  student: { color: '#94a3b8', fontSize: 12, marginBottom: 10 },
  remarkInput: { backgroundColor: '#0f172a', color: '#fff', padding: 10, borderRadius: 5, marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { padding: 8, borderRadius: 5, flex: 1, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});