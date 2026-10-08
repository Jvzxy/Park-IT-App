import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function ReportScreen() {
  const [selectedZone, setSelectedZone] = useState('A');
  const [issueText, setIssueText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [amPm, setAmPm] = useState('AM');

  const handleSubmit = () => {
    Alert.alert('Report Submitted', 'Thank you for helping keep USTP-CDO parking organized!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBox} />
            <View>
              <Text style={styles.headerTitle}>Park-IT</Text>
              <Text style={styles.headerSubtitle}>USTP-CDO PARKING SPACE</Text>
            </View>
          </View>
        </View>

        <Text style={styles.pageTitle}>Report parking issue</Text>

        {/* Zones Selector */}
        <Text style={styles.label}><Feather name="grid" size={14} color="#94a3b8" /> Zones</Text>
        <View style={styles.zoneSelectorRow}>
          <TouchableOpacity 
            style={[styles.zoneBox, selectedZone === 'A' && styles.zoneBoxActive]} 
            onPress={() => setSelectedZone('A')}
          >
            <Text style={styles.zoneBoxTextTitle}>A</Text>
            <Text style={styles.zoneBoxTextSub}>Zone</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.zoneBox, selectedZone === 'B' && styles.zoneBoxActive]} 
            onPress={() => setSelectedZone('B')}
          >
            <Text style={styles.zoneBoxTextTitle}>B</Text>
            <Text style={styles.zoneBoxTextSub}>Zone</Text>
          </TouchableOpacity>
        </View>

        {/* Issue Field */}
        <Text style={styles.label}><Feather name="info" size={14} color="#94a3b8" /> Issue</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Blocked pathway" 
          placeholderTextColor="#475569"
          value={issueText}
          onChangeText={setIssueText}
        />

        {/* Time Field */}
        <Text style={styles.label}><Feather name="clock" size={14} color="#94a3b8" /> Time</Text>
        <View style={styles.timeRow}>
          <TextInput 
            style={[styles.input, { flex: 1, marginBottom: 0 }]} 
            placeholder="Time" 
            placeholderTextColor="#475569"
            value={timeText}
            onChangeText={setTimeText}
          />
          <TouchableOpacity 
            style={styles.amPmDropdown} 
            onPress={() => setAmPm(amPm === 'AM' ? 'PM' : 'AM')}
          >
            <Text style={styles.amPmText}>{amPm}</Text>
            <Ionicons name="chevron-down" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Picture Upload Area */}
        <Text style={styles.label}><Feather name="camera" size={14} color="#94a3b8" /> Picture</Text>
        <TouchableOpacity style={styles.uploadCard} activeOpacity={0.7}>
          <Ionicons name="cloud-upload-sharp" size={48} color="#fff" />
          <Text style={styles.uploadMainText}>Click to upload photo</Text>
          <Text style={styles.uploadSubText}>(file size: 100MB)</Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Submit report</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', marginBottom: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 5, marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 10 },

  pageTitle: { color: '#ef4444', fontSize: 22, fontWeight: 'bold', marginBottom: 25 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', marginBottom: 10, marginTop: 15 },
  
  zoneSelectorRow: { flexDirection: 'row', gap: 15, marginBottom: 10 },
  zoneBox: { flex: 1, backgroundColor: '#1e293b', height: 90, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  zoneBoxActive: { borderColor: '#3b82f6', backgroundColor: '#0f172a' },
  zoneBoxTextTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  zoneBoxTextSub: { color: '#94a3b8', fontSize: 12 },

  input: { backgroundColor: '#1e293b', borderRadius: 10, padding: 15, color: '#fff', fontSize: 14, marginBottom: 10 },
  timeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  amPmDropdown: { backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  amPmText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  uploadCard: { backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#475569', borderStyle: 'dashed', borderRadius: 15, height: 180, justifyContent: 'center', alignItems: 'center', marginVertical: 15 },
  uploadMainText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginTop: 10 },
  uploadSubText: { color: '#64748b', fontSize: 11, marginTop: 4 },

  submitBtn: { backgroundColor: '#ef4444', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});