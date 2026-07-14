import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { ShieldAlert, Users, Ticket, BellRing, Clock, CheckCircle } from 'lucide-react';

interface AnalyticsData {
  counts: {
    totalComplaints: number;
    totalUsers: number;
    totalOverdue: number;
  };
  statuses: Record<string, number>;
  priorities: Record<string, number>;
  departments: { name: string; count: number }[];
  ratings: {
    avgRating: number;
    resolutionQuality: number;
    officerBehavior: number;
    responseSpeed: number;
    overallExperience: number;
    totalRatings: number;
  };
}

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/admin/analytics');
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading system metrics dashboard...</div>
      </div>
    );
  }

  if (!data) return <div className="text-slate-400">Error loading metrics.</div>;

  const priorityColors = {
    Low: '#10B981',     // Green
    Medium: '#3B82F6',  // Blue
    High: '#F59E0B',    // Orange
    Critical: '#EF4444',// Red
  };

  const pieData = Object.entries(data.priorities).map(([key, val]) => ({
    name: key,
    value: val,
  }));

  const mockTrendData = [
    { name: 'Jan', volume: 12 },
    { name: 'Feb', volume: 19 },
    { name: 'Mar', volume: 32 },
    { name: 'Apr', volume: 21 },
    { name: 'May', volume: 45 },
    { name: 'Jun', volume: data.counts.totalComplaints },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Operations</h1>
        <p className="text-slate-500 mt-1">
          Welcome back, {user?.name}. Overseeing operational response timelines.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Total Filed</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 block">{data.counts.totalComplaints}</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <Ticket className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">SLA Breaches</span>
            <span className="text-3xl font-extrabold text-red-600 mt-1 block">{data.counts.totalOverdue}</span>
          </div>
          <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Avg Rating</span>
            <span className="text-3xl font-extrabold text-amber-600 mt-1 block">
              {data.ratings.avgRating ? data.ratings.avgRating.toFixed(1) : '5.0'} ⭐
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Registered Users</span>
            <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">{data.counts.totalUsers}</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid for charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Department chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Volume by Department</h2>
          <div className="h-80">
            {data.departments.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">No department data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#0F172A' }} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Priority distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Tickets by Priority</h2>
          <div className="h-60 relative flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-slate-400 text-sm">No priority data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(priorityColors as any)[entry.name] || '#3B82F6'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#0F172A' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {Object.keys(priorityColors).map((priority) => (
              <div key={priority} className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: (priorityColors as any)[priority] }} />
                <span>
                  {priority}: {data.priorities[priority] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Monthly Ingestion Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#0F172A' }} />
                <Line type="monotone" dataKey="volume" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality feedback details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Customer Experience Index</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Resolution Quality</span>
                  <span>{data.ratings.resolutionQuality ? data.ratings.resolutionQuality.toFixed(1) : '5.0'} / 5.0</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(data.ratings.resolutionQuality || 5) * 20}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Response Speed</span>
                  <span>{data.ratings.responseSpeed ? data.ratings.responseSpeed.toFixed(1) : '5.0'} / 5.0</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(data.ratings.responseSpeed || 5) * 20}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Officer Professionalism</span>
                  <span>{data.ratings.officerBehavior ? data.ratings.officerBehavior.toFixed(1) : '5.0'} / 5.0</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(data.ratings.officerBehavior || 5) * 20}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 mt-6 text-center">
            <span className="text-xs text-slate-400 font-medium">
              Total satisfaction indices aggregated from {data.ratings.totalRatings || 0} reviews.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
