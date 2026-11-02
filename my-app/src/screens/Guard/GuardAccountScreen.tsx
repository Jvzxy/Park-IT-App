import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function GuardAccountScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.padding}>
        <Text style={styles.header}>Guard Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name:</Text><Text style={styles.val}>Officer Santos</Text>
          <Text style={styles.label}>Assigned Area:</Text><Text style={styles.val}>Zone A & B</Text>
          <Text style={styles.label}>Permissions:</Text><Text style={styles.val}>Report Management, Zone Access</Text>
        </View>
        <TouchableOpacity style={styles.btn}><Text style={styles.btnText}>Change Password</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, {backgroundColor: '#ef4444'}]} onPress={() => navigation.replace('Login')}><Text style={styles.btnText}>Logout</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  padding: { padding: 20 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 8, marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 12, marginTop: 10 },
  val: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btn: { backgroundColor: '#334155', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});