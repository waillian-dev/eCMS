import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Clock, Send, Shield, User, FileText, ArrowLeft, CheckCircle2, MessageSquare } from 'lucide-react';

interface HistoryItem {
  _id: string;
  previousStatus: string;
  newStatus: string;
  remarks?: string;
  createdAt: string;
  changedBy: { name: string; email: string; role: string };
}

interface MessageItem {
  _id?: string;
  senderId: string;
  messageText: string;
  createdAt: string;
}

export const ComplaintDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isManagerOrAdmin } = useAuth();
  const [complaint, setComplaint] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Status & Assignee forms
  const [statusInput, setStatusInput] = useState('');
  const [remarks, setRemarks] = useState('');
  const [officerInput, setOfficerInput] = useState('');
  const [officersList, setOfficersList] = useState<any[]>([]);

  // Chat forms & Socket
  const [chatText, setChatText] = useState('');
  const [typing, setTyping] = useState(false);
  const [citizenTyping, setCitizenTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const fetchComplaintDetails = async () => {
    try {
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data.complaint);
      setHistory(res.data.history);
      setStatusInput(res.data.complaint.status);
      setOfficerInput(res.data.complaint.assignedOfficerId?._id || '');
    } catch (error) {
      console.error('Failed to get complaint detail', error);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const res = await api.get(`/complaints/${id}/messages`);
      setMessages(res.data);
    } catch (error) {
      console.error('Failed to retrieve chat messages', error);
    }
  };

  const fetchOfficers = async () => {
    if (!isManagerOrAdmin) return;
    try {
      const res = await api.get('/admin/users');
      // Filter users who are SUPPORT_OFFICER
      const supportOfficers = res.data.filter((u: any) => u.roleId?.name === 'SUPPORT_OFFICER');
      setOfficersList(supportOfficers);
    } catch (error) {
      console.error('Failed to retrieve support officers list', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchComplaintDetails(), fetchChatMessages(), fetchOfficers()]);
      setLoading(false);
    };
    init();

    // 1. Configure socket.io connection
    const socket = io('http://localhost:5001');
    socketRef.current = socket;

    socket.emit('join_complaint_room', id);

    socket.on('new_message', (msg: MessageItem) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    socket.on('typing_status', ({ isTyping }: { isTyping: boolean }) => {
      setCitizenTyping(isTyping);
    });

    return () => {
      socket.emit('leave_complaint_room', id);
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/complaints/${id}/status`, {
        status: statusInput,
        remarks,
      });
      setRemarks('');
      fetchComplaintDetails();
    } catch (error) {
      console.error('Status transition failure', error);
    }
  };

  const handleAssignmentUpdate = async (val: string) => {
    setOfficerInput(val);
    try {
      await api.patch(`/complaints/${id}/status`, {
        status: complaint.status, // Keep current status or trigger Assigned automatically in backend
        assignedOfficerId: val,
        remarks: 'Complaint ticket reassigned by Department Manager.',
      });
      fetchComplaintDetails();
    } catch (error) {
      console.error('Officer assignment failure', error);
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;

    const messagePayload = {
      complaintId: id,
      senderId: user!.id,
      messageText: chatText,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Broadcast over socket instantly
      socketRef.current?.emit('send_message', messagePayload);

      // 2. Persist to server REST DB
      await api.post(`/complaints/${id}/messages`, {
        messageText: chatText,
      });

      setMessages((prev) => [...prev, messagePayload]);
      setChatText('');
      scrollToBottom();
    } catch (error) {
      console.error('Failed to dispatch message', error);
    }
  };

  const handleChatTyping = (text: string) => {
    setChatText(text);

    if (!typing) {
      setTyping(true);
      socketRef.current?.emit('typing', { complaintId: id, userId: user!.id, userName: user!.name, isTyping: true });
    }

    // Debounce typing status clear
    const timeout = setTimeout(() => {
      setTyping(false);
      socketRef.current?.emit('typing', { complaintId: id, userId: user!.id, userName: user!.name, isTyping: false });
    }, 2000);

    return () => clearTimeout(timeout);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading complaint workspace...</div>
      </div>
    );
  }

  if (!complaint) return <div className="text-slate-400">Complaint not found.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header back bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/complaints')}
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-900 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-xs font-mono text-blue-600 font-bold block">{complaint.complaintNumber}</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">{complaint.title}</h1>
        </div>
      </div>

      {/* Grid split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2-column detailed view */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Description</h3>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Filed By</h3>
                <div className="flex items-center gap-2 text-sm text-slate-800">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{complaint.isAnonymous ? 'Anonymous Citizen' : complaint.citizenId?.name}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Location / Address</h3>
                <p className="text-sm text-slate-700">{complaint.location?.address}</p>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  GPS: {complaint.location?.coordinates[1]}, {complaint.location?.coordinates[0]}
                </span>
              </div>
            </div>

            {/* Evidence Attachments */}
            {complaint.attachments && complaint.attachments.length > 0 && (
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Evidence Attachments</h3>
                <div className="grid grid-cols-3 gap-4">
                  {complaint.attachments.map((file: any, index: number) => (
                    <a
                      key={index}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden aspect-video flex flex-col justify-center items-center gap-2 cursor-pointer hover:border-blue-500/40 transition-all"
                    >
                      {file.fileType === 'image' ? (
                        <img src={file.url} alt="Evidence" className="object-cover w-full h-full group-hover:scale-105 transition-all" />
                      ) : (
                        <>
                          <FileText className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-all" />
                          <span className="text-[10px] text-slate-400 max-w-[90%] truncate">{file.fileName}</span>
                        </>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Taxi Ride & Driver Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              <span>Ride & Driver Details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">License Plate</h3>
                <p className="text-sm font-mono text-blue-600 font-bold">{complaint.licensePlate || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Driver Name</h3>
                <p className="text-sm text-slate-800 font-medium">{complaint.driverName || 'Not Reported'}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Trip / Booking ID</h3>
                <p className="text-sm font-mono text-slate-600">{complaint.tripId || complaint.bookingReference || 'N/A'}</p>
              </div>
            </div>
            {(complaint.routeFrom || complaint.routeTo) && (
              <div className="border-t border-slate-100 mt-4 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Trip Route</h3>
                <p className="text-sm text-slate-700">
                  {complaint.routeFrom || 'Start Location'} &rarr; {complaint.routeTo || 'End Location'}
                </p>
              </div>
            )}
          </div>

          {/* Timeline History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              <span>Status Tracking Timeline</span>
            </h2>
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-6">
              {history.map((step) => (
                <div key={step._id} className="relative pl-6">
                  {/* Circle dot marker */}
                  <div className="absolute -left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          Status: {step.newStatus}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (from {step.previousStatus})
                        </span>
                      </div>
                      {step.remarks && (
                        <p className="text-xs text-slate-500 mt-1">{step.remarks}</p>
                      )}
                      <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                        Updated by {step.changedBy?.name} ({step.changedBy?.role})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                      {new Date(step.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column sidebar (Assignee, Status state machine and live chat drawer) */}
        <div className="space-y-6">
          {/* Status & Assignment Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Action Control</h2>

            {/* Department Manager Reassignment Form */}
            {isManagerOrAdmin && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">Assign Support Officer</label>
                <select
                  value={officerInput}
                  onChange={(e) => handleAssignmentUpdate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {officersList.map((off) => (
                    <option key={off._id} value={off._id}>
                      {off.name} ({off.departmentId?.code || 'SAFE'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Workflow state transition form */}
            <form onSubmit={handleStatusUpdate} className="space-y-4 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">Transition Status</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="UnderReview">Under Review</option>
                  <option value="Assigned">Assigned</option>
                  <option value="InProgress">In Progress</option>
                  <option value="WaitingForCustomer">Waiting for Customer</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">Action Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Describe status updates or steps taken..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl py-2.5 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Status Change</span>
              </button>
            </form>
          </div>

          {/* Real-time chat console */}
          <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[500px] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-slate-900">Citizen Chat Channel</span>
            </div>

            {/* Chat feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-xs text-center px-4 font-medium">
                  No chat history. Submit a message to coordinate with the citizen.
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwnMessage = msg.senderId === user!.id;
                  return (
                    <div
                      key={index}
                      className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {msg.messageText}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 font-medium">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              {citizenTyping && (
                <div className="text-slate-400 text-[10px] animate-pulse pl-1 font-medium">
                  Citizen is typing...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Form messaging bar */}
            <form onSubmit={sendChatMessage} className="p-4 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => handleChatTyping(e.target.value)}
                placeholder="Type response to citizen..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
