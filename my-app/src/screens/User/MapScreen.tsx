import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface ParkingZone {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  current_occupancy: number;
  status: string;
}

export default function MapScreen() {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ParkingZone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadZones = useCallback(async () => {
    const { data, error } = await supabase
      .from('parking_zones')
      .select('id, name, description, capacity, current_occupancy, status')
      .eq('is_active', true)
      .order('name');

    if (error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage(null);
      setZones(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadZones();
    }, [loadZones]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo/Park-IT Logo.png')}
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            <View>
              <Text style={styles.headerTitle}>Park-IT</Text>
              <Text style={styles.headerSubtitle}>USTP-CDO PARKING SPACE</Text>
            </View> 
          </View>
        </View>

        <Text style={styles.pageTitle}>PARKING LOT MAP</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {isLoading ? <ActivityIndicator color="#fbbf24" /> : null}
        <View style={styles.mapContainer}>
          <View style={styles.shapesWrapper}>
            {zones.slice(0, 4).map((zone, index) => {
              const availability = zone.capacity - zone.current_occupancy;
              const statusColor = availability === 0 ? '#ef4444' : availability / zone.capacity <= 0.1 ? '#fbbf24' : '#34d399';
              return (
                <TouchableOpacity
                  key={zone.id}
                  style={[styles.zoneShape, { backgroundColor: statusColor, top: Math.floor(index / 2) * 125, left: (index % 2) * 110 }]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedZone(zone)}
                  accessibilityRole="button"
                  accessibilityLabel={`${zone.name}, ${availability} spaces available`}
                >
                  <Text style={styles.zoneLabel}>{zone.name}</Text>
                  <Text style={styles.zoneCount}>{availability} available</Text>
                </TouchableOpacity>
              );
            })}
            {!isLoading && zones.length === 0 ? <Text style={styles.emptyText}>No active parking zones.</Text> : null}
          </View>
        </View>

        <Text style={styles.instructionsText}>
          Tap a zone to view its live availability and location details. Zone status updates when guards record occupancy.
        </Text>
      </ScrollView>

      <Modal visible={selectedZone !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedZone(null)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedZone?.name}</Text>
            {selectedZone ? (
              <>
                <Text style={styles.modalStatus}>{selectedZone.status}</Text>
                <Text style={styles.modalDescription}>{selectedZone.description ?? 'Campus parking area'}</Text>
                <Text style={styles.modalDescription}>
                  {selectedZone.capacity - selectedZone.current_occupancy} of {selectedZone.capacity} spaces available
                </Text>
              </>
            ) : null}
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
  logoImage: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 5, marginRight: 10, alignSelf: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 10 },
  pageTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 20, letterSpacing: 1 },
  mapContainer: { width: '100%', height: 350, borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
  shapesWrapper: { width: 220, height: 260, position: 'relative' },
  zoneShape: { position: 'absolute', width: 105, height: 110, borderRadius: 16, justifyContent: 'center', alignItems: 'center', padding: 8 },
  zoneLabel: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  zoneCount: { color: '#0f172a', fontSize: 12, marginTop: 4, fontWeight: '600' },
  instructionsText: { color: '#94a3b8', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 20, paddingHorizontal: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#f8fafc', width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
  closeBtn: { alignSelf: 'flex-start', padding: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginVertical: 15 },
  floorPlanBg: { width: '100%', height: 320, backgroundColor: '#1e293b', borderRadius: 15, padding: 20, justifyContent: 'center', alignItems: 'center' },
  trafficFlowContainer: { width: 140, height: 260, backgroundColor: '#0f172a', borderRadius: 10, padding: 15, justifyContent: 'space-between', alignItems: 'center' },
  yellowLine: { position: 'absolute', left: '50%', top: 20, bottom: 20, width: 2, backgroundColor: '#eab308' },
  arrowRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  entranceExitRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  errorText: { color: '#fca5a5', textAlign: 'center', marginBottom: 10 },
  emptyText: { color: '#94a3b8', alignSelf: 'center', marginTop: 100 },
  modalStatus: { color: '#334155', fontWeight: 'bold', marginBottom: 6 },
  modalDescription: { color: '#475569', textAlign: 'center', marginBottom: 4 },
});