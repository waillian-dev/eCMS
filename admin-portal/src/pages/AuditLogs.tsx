import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Activity, ShieldCheck, Terminal } from 'lucide-react';

interface AuditLogItem {
  _id: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
  userId: { name: string; email: string; role: string };
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        setLogs(res.data);
      } catch (error) {
        console.error('Failed to get audit logs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <span>System Audit Logs</span>
        </h1>
        <p className="text-slate-500 mt-1">
          Review system transitions, administrative updates, and security logs.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Timestamp</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Actor</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Target Type</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Details / ID</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Connection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 text-sm animate-pulse">
                    Retrieving operations journal...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 text-sm">
                    No system log records present.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-all">
                    <td className="p-4 text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-800">{log.userId?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.userId?.role}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-xs font-mono uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-500">{log.targetType}</td>
                    <td className="p-4 text-xs max-w-sm truncate text-slate-600">
                      {log.details || `ID: ${log.targetId || 'N/A'}`}
                    </td>
                    <td className="p-4">
                      <div className="text-[10px] font-mono text-slate-400">IP: {log.ipAddress || '127.0.0.1'}</div>
                      <div className="text-[9px] text-slate-400 max-w-[150px] truncate" title={log.userAgent}>
                        {log.userAgent || 'Chrome/MacOS'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
