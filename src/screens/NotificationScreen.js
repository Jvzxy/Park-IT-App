import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export default function NotificationScreen() {
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

        <Text style={styles.pageTitle}>Notifications</Text>

        {/* Card 1: Recent Zone Activity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RECENT ZONE ACTIVITY</Text>
          
          <View style={styles.listItem}>
            <View style={styles.bulletRed} />
            <Text style={styles.itemText}>1:04 PM - Zone B reached full capacity</Text>
          </View>
          <View style={styles.listItem}>
            <View style={styles.bulletRed} />
            <Text style={styles.itemText}>12:48 PM - Zone B reached full capacity</Text>
          </View>
          <View style={styles.listItem}>
            <View style={styles.bulletRed} />
            <Text style={styles.itemText}>12:15 PM - Zone A reached full capacity</Text>
          </View>
        </View>

        {/* Card 2: Spot Open! */}
        <View style={styles.card}>
          <Text style={styles.cardTitleWhite}>Spot Open!</Text>
          
          <View style={styles.listItem}>
            <View style={styles.bulletRed} />
            <Text style={styles.itemText}>1:58 PM - Zone B. 2 spaces just freed up.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={styles.bulletRed} />
            <Text style={styles.itemText}>2:30 PM - Zone A. 5 spaces just freed up.</Text>
          </View>
        </View>

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

  pageTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 15, padding: 20, marginBottom: 20 },
  cardTitle: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', letterSpacing: 1, marginBottom: 15 },
  cardTitleWhite: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bulletRed: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444', marginRight: 10 },
  itemText: { color: '#f8fafc', fontSize: 13, flex: 1 },
});