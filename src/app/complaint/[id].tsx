import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../services/authContext';
import { api } from '../../services/api';
import { io, Socket } from 'socket.io-client';
import { Feather, AntDesign } from '@expo/vector-icons';

interface HistoryItem {
  _id: string;
  previousStatus: string;
  newStatus: string;
  remarks?: string;
  createdAt: string;
  changedBy: { name: string };
}

interface MessageItem {
  _id?: string;
  senderId: string;
  messageText: string;
  createdAt: string;
}

export default function ComplaintDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [complaint, setComplaint] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat forms
  const [chatText, setChatText] = useState('');
  const [typing, setTyping] = useState(false);
  const [officerTyping, setOfficerTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Rating forms
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data.complaint);
      setHistory(res.data.history);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/complaints/${id}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDetails(), fetchMessages()]);
      setLoading(false);
    };
    init();

    // Setup socket connection
    const socket = io(Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001');
    socketRef.current = socket;

    socket.emit('join_complaint_room', id);

    socket.on('new_message', (msg: MessageItem) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('typing_status', ({ isTyping }: { isTyping: boolean }) => {
      setOfficerTyping(isTyping);
    });

    return () => {
      socket.emit('leave_complaint_room', id);
      socket.disconnect();
    };
  }, [id]);

  const sendChatMessage = async () => {
    if (!chatText.trim()) return;

    const msgPayload = {
      complaintId: id,
      senderId: user!.id,
      messageText: chatText,
      createdAt: new Date().toISOString(),
    };

    try {
      socketRef.current?.emit('send_message', msgPayload);
      await api.post(`/complaints/${id}/messages`, { messageText: chatText });
      setMessages((prev) => [...prev, msgPayload]);
      setChatText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleChatTyping = (text: string) => {
    setChatText(text);

    if (!typing) {
      setTyping(true);
      socketRef.current?.emit('typing', { complaintId: id, userId: user!.id, userName: user!.name, isTyping: true });
    }

    const timer = setTimeout(() => {
      setTyping(false);
      socketRef.current?.emit('typing', { complaintId: id, userId: user!.id, userName: user!.name, isTyping: false });
    }, 2000);

    return () => clearTimeout(timer);
  };

  const submitFeedback = async () => {
    setSubmittingRating(true);
    try {
      await api.post(`/complaints/${id}/rate`, {
        ratingValue: rating,
        resolutionQuality: rating,
        officerBehavior: rating,
        responseSpeed: rating,
        overallExperience: rating,
        comments,
      });
      Alert.alert('Thank you!', 'Your satisfaction feedback has been recorded.', [
        { text: 'OK', onPress: () => fetchDetails() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3B82F6" size="small" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>{complaint.complaintNumber}</Text>
              <Text style={styles.sub}>{complaint.title}</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.card}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{complaint.description}</Text>

            <View style={styles.divider} />

            <Text style={styles.label}>Location Address</Text>
            <Text style={styles.value}>{complaint.location?.address}</Text>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View>
                <Text style={styles.label}>Status</Text>
                <Text style={styles.valueHighlight}>{complaint.status}</Text>
              </View>
              <View style={{ marginLeft: 'auto' }}>
                <Text style={styles.label}>Priority</Text>
                <Text style={styles.value}>{complaint.priority}</Text>
              </View>
            </View>
          </View>

          {/* Taxi Ride & Driver Details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ride Details</Text>
            
            <View style={styles.row}>
              <View>
                <Text style={styles.label}>License Plate</Text>
                <Text style={[styles.value, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#3B82F6', fontWeight: 'bold' }]}>
                  {complaint.licensePlate || 'N/A'}
                </Text>
              </View>
              <View style={{ marginLeft: 32 }}>
                <Text style={styles.label}>Driver Name</Text>
                <Text style={styles.value}>{complaint.driverName || 'Not Reported'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.label}>Trip / Booking Reference</Text>
            <Text style={[styles.value, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
              {complaint.tripId || complaint.bookingReference || 'N/A'}
            </Text>

            {(complaint.routeFrom || complaint.routeTo) && (
              <>
                <View style={styles.divider} />
                <Text style={styles.label}>Route</Text>
                <Text style={styles.value}>
                  {complaint.routeFrom || 'Start'} &rarr; {complaint.routeTo || 'End'}
                </Text>
              </>
            )}
          </View>

          {/* Timeline tracking */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Status Timeline</Text>
            {history.map((step, idx) => (
              <View key={step._id} style={styles.timelineRow}>
                <View style={styles.timelinePoint} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineStatus}>Shift: {step.newStatus}</Text>
                  <Text style={styles.timelineRemarks}>{step.remarks}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(step.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Resolution satisfaction feedback card */}
          {['Resolved', 'Closed'].includes(complaint.status) && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Submit Satisfaction Feedback</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity key={val} onPress={() => setRating(val)}>
                    <AntDesign
                      name="star"
                      size={28}
                      color={val <= rating ? '#F59E0B' : '#334155'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.textInput}
                value={comments}
                onChangeText={setComments}
                placeholder="Share any additional comments about the service resolution..."
                placeholderTextColor="#64748B"
                multiline
              />
              <TouchableOpacity
                style={styles.submitRatingButton}
                onPress={submitFeedback}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitRatingText}>Send Satisfaction Review</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Chat feed container */}
          <View style={[styles.card, { minHeight: 250, marginBottom: 40 }]}>
            <Text style={styles.sectionTitle}>Support Chat Feed</Text>
            <View style={styles.chatFeed}>
              {messages.map((msg, index) => {
                const isOwn = msg.senderId === user!.id;
                return (
                  <View key={index} style={[styles.msgRow, isOwn ? styles.msgOwn : styles.msgOther]}>
                    <Text style={styles.msgText}>{msg.messageText}</Text>
                  </View>
                );
              })}
              {officerTyping && (
                <Text style={styles.typingIndicator}>Support agent is typing...</Text>
              )}
            </View>

            <View style={styles.chatBar}>
              <TextInput
                style={styles.chatInput}
                value={chatText}
                onChangeText={handleChatTyping}
                placeholder="Type response..."
                placeholderTextColor="#64748B"
              />
              <TouchableOpacity style={styles.sendButton} onPress={sendChatMessage}>
                <Feather name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090D16',
  },
  scroll: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sub: {
    fontSize: 12,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  valueHighlight: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10B981',
  },
  row: {
    flexDirection: 'row',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B/55',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#1E293B',
    marginLeft: 6,
    paddingLeft: 16,
    paddingBottom: 16,
  },
  timelinePoint: {
    position: 'absolute',
    left: -4.5,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  timelineStatus: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timelineRemarks: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  timelineDate: {
    fontSize: 10,
    color: '#475569',
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 12,
  },
  textInput: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    height: 60,
  },
  submitRatingButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitRatingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chatFeed: {
    minHeight: 120,
    gap: 8,
  },
  msgRow: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  msgOwn: {
    backgroundColor: '#2563EB',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  msgOther: {
    backgroundColor: '#1E293B',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  msgText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  typingIndicator: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  chatBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 13,
    height: 40,
  },
  sendButton: {
    backgroundColor: '#2563EB',
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
