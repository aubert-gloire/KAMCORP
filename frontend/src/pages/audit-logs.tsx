import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Card, { CardHeader, CardContent } from '@/components/Card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Select } from '@/components/Input';
import api from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';

interface AuditLog {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  action: string;
  entityType: string;
  entityId?: string;
  meta?: any;
  createdAt: string;
}

export default function AuditLogsPage() {
  const { user: currentUser } = useAuth();
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntityType, setFilterEntityType] = useState('all');

  // Fetch audit logs (admin only)
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', filterAction, filterEntityType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterAction !== 'all') params.append('action', filterAction);
      if (filterEntityType !== 'all') params.append('entityType', filterEntityType);
      
      const response = await api.get(`/auth/audit-logs?${params.toString()}`);
      return response.data.data;
    },
    enabled: currentUser?.role === 'admin',
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-error">Access denied. Admin only.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-success/20 text-success',
      update: 'bg-accent-secondary/20 text-accent-secondary',
      delete: 'bg-error/20 text-error',
      login: 'bg-accent-primary/20 text-accent-primary',
      reset_password: 'bg-error/20 text-error',
    };
    return colors[action] || 'bg-surface text-text-secondary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-gradient mb-2">
          Audit Logs
        </h1>
        <p className="text-text-secondary">
          View all system activities and changes
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Filter by Action"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="reset_password">Password Reset</option>
            </Select>

            <Select
              label="Filter by Entity"
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
            >
              <option value="all">All Entities</option>
              <option value="product">Products</option>
              <option value="sale">Sales</option>
              <option value="purchase">Purchases</option>
              <option value="user">Users</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Activity Log</h2>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-text-secondary font-medium">
                      Date & Time
                    </th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium">
                      Action
                    </th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium">
                      Entity
                    </th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <motion.tr
                      key={log._id}
                      className="border-b border-border hover:bg-surface-hover transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <td className="py-3 px-4 text-text-secondary text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-text-primary font-medium">
                            {log.user?.fullName || 'System'}
                          </div>
                          <div className="text-text-tertiary text-xs">
                            {log.user?.email || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-primary capitalize">
                        {log.entityType}
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-sm">
                        {log.meta ? (
                          <pre className="text-xs">
                            {JSON.stringify(log.meta, null, 2).slice(0, 100)}
                            {JSON.stringify(log.meta).length > 100 ? '...' : ''}
                          </pre>
                        ) : (
                          'No details'
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-text-secondary">
              No audit logs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
