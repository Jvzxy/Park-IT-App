import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function ReportsAnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Reports & Analytics</Text>
        
        <View style={styles.card}>
          <Text style={styles.name}>System Insights</Text>
          <Text style={styles.info}>• Peak Period: 8:00 AM - 9:30 AM</Text>
          <Text style={styles.info}>• Frequent Full Zone: Zone A</Text>
          <Text style={styles.info}>• Avg Resolution Time: 12 mins</Text>
          <Text style={styles.info}>• Top Complaint: Improper Parking</Text>
        </View>
        
        <TouchableOpacity style={styles.exportBtn}><Text style={styles.btnText}>Export to PDF/CSV</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  padding: { padding: 20 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 8, marginBottom: 20 },
  name: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  info: { color: '#fff', fontSize: 14, marginVertical: 4 },
  exportBtn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});