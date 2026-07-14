import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuth } from '../../services/authContext';
import { Feather } from '@expo/vector-icons';

export default function ComplaintsList() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/complaints');
      setComplaints(res.data.data);
    } catch (err) {
      console.error('Failed to get complaints list', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
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
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Retrieving filed reports...</Text>
        </View>
      ) : complaints.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="list" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>No tickets found</Text>
              <Text style={styles.emptySub}>You haven't submitted any complaints yet. Drag down to refresh or file a new one.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
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
                <Text style={styles.ticketCategory}>{item.categoryId?.name}</Text>
                <Text style={styles.ticketDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketNum: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#2563EB',
    fontWeight: 'bold',
  },
  statusTag: {
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 'auto',
    backgroundColor: 'rgba(37,99,235,0.15)',
    borderColor: 'rgba(37,99,235,0.3)',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
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
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  ticketCategory: {
    fontSize: 12,
    color: '#64748B',
  },
  ticketDate: {
    fontSize: 11,
    color: '#475569',
    marginLeft: 'auto',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  emptySub: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
