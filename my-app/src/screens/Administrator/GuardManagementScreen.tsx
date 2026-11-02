import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function GuardManagementScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Guard Management</Text>
        <TouchableOpacity style={styles.addBtn}><Text style={styles.btnText}>+ Create Guard Account</Text></TouchableOpacity>
        
        <View style={styles.card}>
          <Text style={styles.name}>Officer Santos</Text>
          <Text style={styles.info}>Assigned: Zone A • Permissions: Standard</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionTxt}>Edit Info</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionTxt}>Assign Zone</Text></TouchableOpacity>
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
  addBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8 },
  name: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  info: { color: '#94a3b8', fontSize: 12, marginVertical: 5 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { backgroundColor: '#334155', padding: 8, borderRadius: 5 },
  actionTxt: { color: '#fff', fontSize: 12 }
});