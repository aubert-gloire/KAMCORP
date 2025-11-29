import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card, { CardHeader, CardContent } from '@/components/Card';
import LoadingSpinner from '@/components/LoadingSpinner';
import NotificationSettings from '@/components/NotificationSettings';
import api from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';

// Utility function to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
};

interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  topProductToday: {
    name: string;
    sku: string;
    quantity: number;
  } | null;
  lowStockCount: number;
  pendingPayments: number;
  monthlyRevenueChart: Array<{ date: string; revenue: number }>;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/reports/dashboard');
      return response.data.dashboard;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error">Failed to load dashboard data</p>
      </div>
    );
  }

  const stats = [
    {
      title: "Today's Revenue",
      value: data?.todayRevenue || 0,
      displayValue: `TZS ${formatNumber(data?.todayRevenue || 0)}`,
      fullValue: `TZS ${(data?.todayRevenue || 0).toLocaleString()}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-success',
      bgColor: 'bg-success/10',
      hasTooltip: true,
    },
    {
      title: "Today's Orders",
      value: data?.todayOrders || 0,
      displayValue: data?.todayOrders || 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'text-accent-primary',
      bgColor: 'bg-accent-primary/10',
      hasTooltip: false,
    },
    {
      title: 'Top Product',
      value: data?.topProductToday?.name || 'N/A',
      displayValue: data?.topProductToday?.name || 'N/A',
      subtitle: data?.topProductToday ? `${data.topProductToday.quantity} sold` : '',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      color: 'text-accent-secondary',
      bgColor: 'bg-accent-secondary/10',
      hasTooltip: false,
    },
    {
      title: 'Low Stock Items',
      value: data?.lowStockCount || 0,
      displayValue: data?.lowStockCount || 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'text-error',
      bgColor: 'bg-error/10',
      hasTooltip: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-gradient mb-2">
          Welcome back, {user?.fullName}!
        </h1>
        <p className="text-text-secondary">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Notification Settings */}
      <NotificationSettings />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">
                      {stat.title}
                    </p>
                    {stat.hasTooltip ? (
                      <div className="group relative inline-block">
                        <p className={`text-lg font-bold ${stat.color} truncate cursor-help`}>
                          {stat.displayValue}
                        </p>
                        <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                          <p className="text-sm text-text-primary font-semibold">
                            {stat.fullValue}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-lg font-bold ${stat.color} truncate ${
                        typeof stat.displayValue === 'string' && stat.displayValue.length > 20 
                          ? 'text-sm' 
                          : ''
                      }`}>
                        {stat.displayValue}
                      </p>
                    )}
                    {stat.subtitle && (
                      <p className="text-xs text-text-tertiary mt-1">
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg flex-shrink-0`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Monthly Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Monthly Revenue Trend</h2>
          </CardHeader>
          <CardContent>
            {data?.monthlyRevenueChart && data.monthlyRevenueChart.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.monthlyRevenueChart.map(item => ({
                      ...item,
                      displayDate: new Date(item.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      }),
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) {
                          return `${(value / 1000000).toFixed(1)}M`;
                        } else if (value >= 1000) {
                          return `${(value / 1000).toFixed(1)}K`;
                        }
                        return value;
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f3f4f6',
                        padding: '12px'
                      }}
                      formatter={(value: number) => [`TZS ${value.toLocaleString()}`, 'Revenue']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#dashboardRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-text-secondary">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Quick Actions</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'New Sale', href: '/sales', icon: '💰', role: ['admin', 'sales'] },
                { name: 'Add Product', href: '/products', icon: '📦', role: ['admin', 'stock'] },
                { name: 'New Purchase', href: '/purchases', icon: '🛒', role: ['admin', 'stock'] },
                { name: 'View Reports', href: '/reports', icon: '📊', role: ['admin', 'sales', 'stock'] },
              ]
                .filter((action) => action.role.includes(user?.role || ''))
                .map((action, index) => (
                  <motion.a
                    key={action.name}
                    href={action.href}
                    className="flex flex-col items-center justify-center p-6 bg-surface-hover rounded-xl hover:bg-accent-primary/10 hover:border-accent-primary border border-transparent transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                  >
                    <span className="text-3xl mb-2">{action.icon}</span>
                    <span className="text-sm font-medium text-text-primary">
                      {action.name}
                    </span>
                  </motion.a>
                ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
