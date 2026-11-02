import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function GuardAlertsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Alerts & Announcements</Text>
        
        <View style={styles.card}>
          <Text style={styles.subHeader}>Broadcast Announcement</Text>
          <TextInput style={styles.input} placeholder="Notify students (e.g. Zone A closed)..." placeholderTextColor="#64748b" multiline />
          <TouchableOpacity style={styles.sendBtn}><Text style={styles.btnText}>Send to All Students</Text></TouchableOpacity>
        </View>

        <Text style={styles.subHeader}>System Alerts</Text>
        <View style={styles.alertItem}><Text style={styles.alertText}>🚨 Zone A is Overcrowded</Text></View>
        <View style={styles.alertItem}><Text style={styles.alertText}>📩 New Blocked Lane Report</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  padding: { padding: 20 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  subHeader: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8, marginBottom: 20 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 8, height: 80, textAlignVertical: 'top' },
  sendBtn: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  alertItem: { backgroundColor: '#ef444420', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ef4444' },
  alertText: { color: '#fff', fontWeight: 'bold' }
});