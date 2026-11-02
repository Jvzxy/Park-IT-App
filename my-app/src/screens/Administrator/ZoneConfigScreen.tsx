import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function ZoneConfigScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Parking Zone Configuration</Text>
        <TouchableOpacity style={styles.addBtn}><Text style={styles.btnText}>+ Add New Parking Zone</Text></TouchableOpacity>
        
        <View style={styles.card}>
          <Text style={styles.name}>Zone A</Text>
          <Text style={styles.info}>Capacity: 50 • Status: Active</Text>
          <Text style={styles.info}>Lanes: 1 Entry, 1 Exit • Guard: Santos</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionTxt}>Edit Capacity</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionTxt}>Set Inactive</Text></TouchableOpacity>
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
  addBtn: { backgroundColor: '#fbbf24', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  btnText: { color: '#000', fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8 },
  name: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  info: { color: '#94a3b8', fontSize: 12, marginVertical: 2 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { backgroundColor: '#334155', padding: 8, borderRadius: 5 },
  actionTxt: { color: '#fff', fontSize: 12 }
});