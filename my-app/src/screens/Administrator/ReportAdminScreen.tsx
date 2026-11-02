import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function ReportAdminScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Report Administration</Text>
        
        <View style={styles.card}>
          <Text style={styles.name}>Report #102: Blocked Lane</Text>
          <Text style={styles.info}>Guard Action: Marked Resolved (Santos)</Text>
          <Text style={styles.info}>Audit: No duplicate found.</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionTxt}>Reopen</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#ef4444'}]}><Text style={styles.actionTxt}>Delete (Spam)</Text></TouchableOpacity>
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
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8 },
  name: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  info: { color: '#94a3b8', fontSize: 12, marginVertical: 2 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { backgroundColor: '#334155', padding: 8, borderRadius: 5 },
  actionTxt: { color: '#fff', fontSize: 12 }
});