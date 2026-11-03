import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface ReportHistoryItem {
  id: number;
  zoneName: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  photoUrl: string | null;
  remarks: string[];
}

export default function ReportHistoryScreen({ navigation }: any) {
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    const { data: reportRows, error: reportsError } = await supabase
      .from('parking_reports')
      .select('id, zone_id, category, description, status, photo_url, created_at')
      .order('created_at', { ascending: false });

    if (reportsError) {
      setErrorMessage(reportsError.message);
      setIsLoading(false);
      return;
    }

    const [zonesResult, updatesResult] = await Promise.all([
      supabase.from('parking_zones').select('id, name'),
      supabase.from('report_updates').select('report_id, remark, created_at').order('created_at'),
    ]);

    if (zonesResult.error || updatesResult.error) {
      setErrorMessage(zonesResult.error?.message ?? updatesResult.error?.message ?? 'Unable to load report details.');
      setIsLoading(false);
      return;
    }

    const zoneNames = new Map((zonesResult.data ?? []).map((zone) => [zone.id, zone.name]));
    const updateRemarks = new Map<number, string[]>();
    for (const update of updatesResult.data ?? []) {
      const current = updateRemarks.get(update.report_id) ?? [];
      current.push(update.remark);
      updateRemarks.set(update.report_id, current);
    }

    const items = await Promise.all((reportRows ?? []).map(async (report) => {
      let photoUrl: string | null = null;
      if (report.photo_url) {
        const { data, error } = await supabase.storage.from('report-photos').createSignedUrl(report.photo_url, 300);
        if (error) {
          setErrorMessage(error.message);
        } else {
          photoUrl = data.signedUrl;
        }
      }

      return {
        id: report.id,
        zoneName: zoneNames.get(report.zone_id) ?? 'Unknown zone',
        category: report.category,
        description: report.description ?? '',
        status: report.status,
        createdAt: report.created_at,
        photoUrl,
        remarks: updateRemarks.get(report.id) ?? [],
      };
    }));

    setErrorMessage(null);
    setReports(items);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadReports();
    }, [loadReports]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadReports} tintColor="#fbbf24" />}
      >
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {isLoading ? <ActivityIndicator color="#fbbf24" /> : null}
        {!isLoading && !reports.length ? <Text style={styles.emptyText}>You haven’t submitted any reports yet.</Text> : null}
        {reports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.reportCategory}>{report.category}</Text>
              <View style={[styles.statusBadge, report.status === 'Resolved' ? styles.resolvedBadge : report.status === 'Rejected' ? styles.rejectedBadge : styles.pendingBadge]}>
                <Text style={styles.statusText}>{report.status}</Text>
              </View>
            </View>
            <Text style={styles.reportDetail}>
              {report.zoneName} · {new Date(report.createdAt).toLocaleString()}
            </Text>
            <Text style={styles.reportDesc}>{report.description}</Text>
            {report.photoUrl ? <Image source={{ uri: report.photoUrl }} style={styles.reportPhoto} /> : null}
            {report.remarks.map((remark, index) => (
              <Text key={`${report.id}-${index}`} style={styles.remark}>Update: {remark}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { padding: 5 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  reportCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  reportCategory: { color: '#fff', fontSize: 15, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pendingBadge: { backgroundColor: 'rgba(251, 191, 36, 0.2)' },
  resolvedBadge: { backgroundColor: 'rgba(52, 211, 153, 0.2)' },
  rejectedBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusText: { color: '#fbbf24', fontSize: 11, fontWeight: 'bold' },
  reportDetail: { color: '#94a3b8', fontSize: 11, marginBottom: 8 },
  reportDesc: { color: '#f8fafc', fontSize: 13, lineHeight: 18 },
  reportPhoto: { width: '100%', height: 190, borderRadius: 8, marginTop: 12 },
  remark: { color: '#cbd5e1', fontSize: 12, marginTop: 10 },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 50 },
  errorText: { color: '#fca5a5', marginBottom: 12 },
});
