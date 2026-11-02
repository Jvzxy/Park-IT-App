import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function GuardLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Guard Portal</Text>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#94a3b8" onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#94a3b8" secureTextEntry onChangeText={setPassword} />
        <TouchableOpacity style={styles.btn} onPress={() => navigation.replace('GuardDashboard')}>
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120', justifyContent: 'center' },
  content: { padding: 20 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15 },
  btn: { backgroundColor: '#fbbf24', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: 'bold' },
  link: { color: '#3b82f6', textAlign: 'center', marginTop: 15 }
});