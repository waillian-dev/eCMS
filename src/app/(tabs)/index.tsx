import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../services/authContext';
import { api } from '../../services/api';
import { AntDesign, Feather } from '@expo/vector-icons';

interface ComplaintSummary {
  total: number;
  submitted: number;
  inProgress: number;
  resolved: number;
}

export default function HomeDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<ComplaintSummary>({ total: 0, submitted: 0, inProgress: 0, resolved: 0 });

  const loadDashboardData = async () => {
    try {
      const res = await api.get('/complaints', { params: { limit: 5 } });
      const list = res.data.data;
      setComplaints(list);

      // Simple calculation of summaries from the returned list (or we can just calculate them locally)
      const counts = list.reduce(
        (acc: ComplaintSummary, cur: any) => {
          acc.total += 1;
          if (cur.status === 'Submitted') acc.submitted += 1;
          else if (['InProgress', 'Assigned', 'UnderReview'].includes(cur.status)) acc.inProgress += 1;
          else if (['Resolved', 'Closed'].includes(cur.status)) acc.resolved += 1;
          return acc;
        },
        { total: 0, submitted: 0, inProgress: 0, resolved: 0 }
      );
      setSummary(counts);
    } catch (err) {
      console.error('Failed to load citizen complaints summary', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const statusColors: Record<string, string> = {
    Submitted: '#3B82F6',
    UnderReview: '#6366F1',
    Assigned: '#A855F7',
    InProgress: '#F59E0B',
    WaitingForCustomer: '#06B6D4',
    Resolved: '#10B981',
    Closed: '#64748B',
    Escalated: '#EF4444',
    Rejected: '#EF4444',
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
    >
      {/* Welcome header snippet */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Hello, {user?.name}</Text>
        <Text style={styles.headerSubtext}>Have an issue? File it instantly for public review.</Text>
      </View>

      {/* Metrics board */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
          <Text style={styles.metricVal}>{summary.submitted}</Text>
          <Text style={styles.metricLabel}>Submitted</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}>
          <Text style={styles.metricVal}>{summary.inProgress}</Text>
          <Text style={styles.metricLabel}>Active</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: '#10B981' }]}>
          <Text style={styles.metricVal}>{summary.resolved}</Text>
          <Text style={styles.metricLabel}>Resolved</Text>
        </View>
      </View>

      {/* CTA Box to file a ticket */}
      <Link href="/complaint/create" asChild>
        <TouchableOpacity style={styles.ctaCard}>
          <View style={styles.ctaIconContainer}>
            <Feather name="plus" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.ctaTextContainer}>
            <Text style={styles.ctaTitle}>File a Municipal Complaint</Text>
            <Text style={styles.ctaDesc}>Select category, upload evidence, and pinpoint GPS location.</Text>
          </View>
          <AntDesign name="right" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </Link>

      {/* Recent submissions list */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Recent Tickets</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 24 }} />
        ) : complaints.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="folder" size={40} color="#334155" />
            <Text style={styles.emptyText}>You haven't submitted any complaints yet.</Text>
          </View>
        ) : (
          complaints.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.ticketCard}
              onPress={() => router.push(`/complaint/${item._id}`)}
            >
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketNum}>{item.complaintNumber}</Text>
                <View
                  style={[
                    styles.statusTag,
                    { backgroundColor: `${statusColors[item.status] || '#64748B'}15`, borderColor: `${statusColors[item.status] || '#64748B'}30` },
                  ]}
                >
                  <Text style={[styles.statusTagText, { color: statusColors[item.status] || '#64748B' }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.ticketTitle}>{item.title}</Text>
              <View style={styles.ticketFooter}>
                <Text style={styles.ticketDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.ticketPriority}>{item.priority} Priority</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  header: {
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSubtext: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ctaCard: {
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ctaDesc: {
    fontSize: 12,
    color: '#E0F2FE',
    marginTop: 4,
    lineHeight: 16,
  },
  listSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketNum: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2563EB',
    fontWeight: 'bold',
  },
  statusTag: {
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDate: {
    fontSize: 11,
    color: '#64748B',
  },
  ticketPriority: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 'auto',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
  },
});
