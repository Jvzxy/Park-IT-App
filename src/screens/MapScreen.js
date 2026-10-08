import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function MapScreen() {
  const [selectedZone, setSelectedZone] = useState(null); // 'A', 'B', or null

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

        <Text style={styles.pageTitle}>PARKING LOT MAP</Text>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <View style={styles.shapesWrapper}>
            {/* Zone A Shape Button */}
            <TouchableOpacity 
              style={styles.zoneAShape} 
              activeOpacity={0.8}
              onPress={() => setSelectedZone('A')}
            >
              <Text style={styles.zoneLabel}>A</Text>
            </TouchableOpacity>

            {/* Zone B Shape Button */}
            <TouchableOpacity 
              style={styles.zoneBShape} 
              activeOpacity={0.8}
              onPress={() => setSelectedZone('B')}
            >
              <Text style={styles.zoneLabel}>B</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.instructionsText}>
          Tap any parking zone on the map to view its location and check the available parking spaces. Choose a zone with vacant spaces before heading to the parking area.
        </Text>

      </ScrollView>

      {/* Zone Detail Modal */}
      <Modal visible={selectedZone !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedZone(null)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>ZONE {selectedZone}</Text>

            {/* Parking Map Floor Plan Visualization */}
            <View style={styles.floorPlanBg}>
              <View style={styles.trafficFlowContainer}>
                <View style={styles.yellowLine} />
                <View style={styles.arrowRow}>
                  <Feather name="arrow-up" size={24} color="#34d399" />
                  <Feather name="arrow-down" size={24} color="#ef4444" />
                </View>
                <View style={styles.arrowRow}>
                  <Feather name="arrow-up" size={24} color="#34d399" />
                  <Feather name="arrow-down" size={24} color="#ef4444" />
                </View>
                <View style={styles.entranceExitRow}>
                  <Text style={{ color: '#34d399', fontSize: 10, fontWeight: 'bold' }}>Entrance</Text>
                  <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: 'bold' }}>Exit</Text>
                </View>
              </View>
            </View>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  scrollContent: { padding: 20, alignItems: 'center' },
  header: { flexDirection: 'row', width: '100%', marginBottom: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 5, marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 10 },

  pageTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 20, letterSpacing: 1 },
  mapContainer: { width: '100%', height: 350, borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
  shapesWrapper: { width: 220, height: 260, position: 'relative' },
  zoneAShape: { position: 'absolute', top: 0, left: 0, width: 110, height: 220, backgroundColor: '#ef4444', borderTopLeftRadius: 10, justifyContent: 'center', alignItems: 'center' },
  zoneBShape: { position: 'absolute', top: 30, right: 0, width: 120, height: 200, backgroundColor: '#34d399', borderBottomRightRadius: 20, borderTopRightRadius: 40, justifyContent: 'center', alignItems: 'center' },
  zoneLabel: { color: '#fff', fontSize: 32, fontWeight: 'bold' },

  instructionsText: { color: '#94a3b8', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 20, paddingHorizontal: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#f8fafc', width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
  closeBtn: { alignSelf: 'flex-start', padding: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginVertical: 15 },
  floorPlanBg: { width: '100%', height: 320, backgroundColor: '#1e293b', borderRadius: 15, padding: 20, justifyContent: 'center', alignItems: 'center' },
  trafficFlowContainer: { width: 140, height: 260, backgroundColor: '#0f172a', borderRadius: 10, padding: 15, justifyContent: 'space-between', alignItems: 'center' },
  yellowLine: { position: 'absolute', left: '50%', top: 20, bottom: 20, width: 2, backgroundColor: '#eab308' },
  arrowRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  entranceExitRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }
});