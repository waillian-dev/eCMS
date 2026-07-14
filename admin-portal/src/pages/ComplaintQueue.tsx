import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Eye, ShieldAlert, ArrowUpDown, Filter } from 'lucide-react';

interface ComplaintItem {
  _id: string;
  complaintNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  categoryId: { name: string };
  departmentId: { name: string; code: string };
  assignedOfficerId?: { name: string };
  licensePlate?: string;
}

export const ComplaintQueue: React.FC = () => {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints', {
        params: {
          search,
          status: statusFilter,
          priority: priorityFilter,
          page,
          limit: 10,
        },
      });
      setComplaints(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (error) {
      console.error('Failed to get complaints list', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [search, statusFilter, priorityFilter, page]);

  const priorityColors: Record<string, string> = {
    Low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    High: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const statusColors: Record<string, string> = {
    Submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    UnderReview: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    Assigned: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    InProgress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    WaitingForCustomer: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    Resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    Escalated: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Complaint Queue</h1>
          <p className="text-slate-500 mt-1">Review, assign, and process citizen complaints in real-time.</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by ticket #, description..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap w-full md:w-auto gap-4 items-center ml-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="UnderReview">Under Review</option>
              <option value="Assigned">Assigned</option>
              <option value="InProgress">In Progress</option>
              <option value="WaitingForCustomer">Waiting for Customer</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Escalated">Escalated</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket #</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Taxi Plate</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Department</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Priority</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Assignee</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Date Filed</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 text-sm animate-pulse">
                    Retrieving tickets from operational queue...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 text-sm">
                    No complaints match the specified filter query.
                  </td>
                </tr>
              ) : (
                complaints.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-all">
                    <td className="p-4 font-mono text-xs text-blue-600 font-semibold">{item.complaintNumber}</td>
                    <td className="p-4 max-w-xs truncate text-sm font-medium text-slate-800">{item.title}</td>
                    <td className="p-4 text-sm font-mono text-slate-700 font-semibold">{item.licensePlate || 'N/A'}</td>
                    <td className="p-4 text-sm text-slate-600">{item.categoryId?.name}</td>
                    <td className="p-4 text-sm">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                        {item.departmentId?.code}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${priorityColors[item.priority] || ''}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusColors[item.status] || ''}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{item.assignedOfficerId?.name || 'Unassigned'}</td>
                    <td className="p-4 text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => navigate(`/complaints/${item._id}`)}
                        className="p-2 hover:bg-blue-50 active:bg-blue-100 text-blue-600 rounded-xl transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-medium">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 disabled:opacity-50 hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 disabled:opacity-50 hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
