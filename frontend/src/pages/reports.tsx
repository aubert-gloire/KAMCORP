import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Button from '@/components/Button';
import { Select } from '@/components/Input';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/utils/api';
import toast from 'react-hot-toast';

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

interface SalesReportData {
  totals: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    pendingRevenue: number;
    pendingOrders: number;
  };
  timeline: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;
}

interface StockReportData {
  totals: {
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
  };
  allProducts: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    stockQuantity: number;
    unitPriceTZS: number;
    costPriceTZS: number;
    stockValue: number;
    isLowStock: boolean;
  }>;
}

interface PurchasesReportData {
  totals: {
    totalPurchases: number;
    totalSpend: number;
    averagePurchaseValue: number;
  };
  timeline: Array<{
    period: string;
    spend: number;
    purchases: number;
  }>;
}

interface ExpensesReportData {
  totals: {
    totalExpenses: number;
    totalAmount: number;
    averageExpenseAmount: number;
  };
  timeline: Array<{
    period: string;
    amount: number;
    count: number;
  }>;
}

type DateRange = '7days' | '30days' | '90days' | 'all';
type ReportType = 'sales' | 'stock' | 'purchases' | 'expenses';
type GroupBy = 'day' | 'week' | 'month';

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');

  const getDateRangeParams = () => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  // Fetch sales report
  const { data: salesReport, isLoading: salesLoading } = useQuery<SalesReportData>({
    queryKey: ['salesReport', dateRange, groupBy],
    queryFn: async () => {
      const { startDate, endDate } = getDateRangeParams();
      const response = await api.get('/reports/sales', {
        params: { startDate, endDate, groupBy },
      });
      return response.data.data;
    },
    enabled: reportType === 'sales',
  });

  // Fetch stock report
  const { data: stockReport, isLoading: stockLoading } = useQuery<StockReportData>({
    queryKey: ['stockReport'],
    queryFn: async () => {
      const response = await api.get('/reports/stock');
      return response.data.data;
    },
    enabled: reportType === 'stock',
  });

  // Fetch purchases report
  const { data: purchasesReport, isLoading: purchasesLoading } = useQuery<PurchasesReportData>({
    queryKey: ['purchasesReport', dateRange, groupBy],
    queryFn: async () => {
      const { startDate, endDate } = getDateRangeParams();
      const response = await api.get('/reports/purchases', {
        params: { startDate, endDate, groupBy },
      });
      return response.data.data;
    },
    enabled: reportType === 'purchases',
  });

  // Fetch expenses report
  const { data: expensesReport, isLoading: expensesLoading } = useQuery<ExpensesReportData>({
    queryKey: ['expensesReport', dateRange, groupBy],
    queryFn: async () => {
      const { startDate, endDate } = getDateRangeParams();
      const response = await api.get('/reports/expenses', {
        params: { startDate, endDate, groupBy },
      });
      return response.data.data;
    },
    enabled: reportType === 'expenses',
  });

  const exportToCSV = async () => {
    try {
      const { startDate, endDate } = getDateRangeParams();
      let endpoint = '';

      if (reportType === 'sales') {
        endpoint = `/reports/sales/export?startDate=${startDate}&endDate=${endDate}`;
      } else if (reportType === 'stock') {
        endpoint = '/reports/stock/export';
      } else if (reportType === 'purchases') {
        endpoint = `/reports/purchases/export?startDate=${startDate}&endDate=${endDate}`;
      } else if (reportType === 'expenses') {
        endpoint = `/reports/expenses/export?startDate=${startDate}&endDate=${endDate}`;
      }

      // Download CSV from backend
      const response = await api.get(endpoint, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const exportToPDF = async () => {
    try {
      const { startDate, endDate } = getDateRangeParams();
      let endpoint = '';

      if (reportType === 'sales') {
        endpoint = `/reports/sales/export/pdf?startDate=${startDate}&endDate=${endDate}`;
      } else if (reportType === 'stock') {
        endpoint = '/reports/stock/export/pdf';
      } else if (reportType === 'purchases') {
        endpoint = `/reports/purchases/export/pdf?startDate=${startDate}&endDate=${endDate}`;
      } else if (reportType === 'expenses') {
        endpoint = `/reports/expenses/export/pdf?startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await api.get(endpoint, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const exportToExcel = async () => {
    try {
      const { startDate, endDate } = getDateRangeParams();
      let endpoint = '';

      if (reportType === 'sales') {
        endpoint = `/reports/sales/export/xlsx?startDate=${startDate}&endDate=${endDate}`;
      } else if (reportType === 'stock') {
        endpoint = '/reports/stock/export/xlsx';
      } else if (reportType === 'purchases') {
        endpoint = `/reports/purchases/export/xlsx?startDate=${startDate}&endDate=${endDate}`;
      } else if (reportType === 'expenses') {
        endpoint = `/reports/expenses/export/xlsx?startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await api.get(endpoint, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Excel exported successfully!');
    } catch (error) {
      console.error('Export Excel error:', error);
      toast.error('Failed to export Excel');
    }
  };

  const isLoading = salesLoading || stockLoading || purchasesLoading || expensesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient">Reports</h1>
          <p className="text-text-secondary mt-1">Analyze your business performance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="success"
            onClick={exportToCSV}
            disabled={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            CSV
          </Button>
          <Button
            variant="error"
            onClick={exportToPDF}
            disabled={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          >
            PDF
          </Button>
          <Button
            variant="primary"
            onClick={exportToExcel}
            disabled={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
          >
            Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Report Type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              <option value="sales">Sales Report</option>
              <option value="stock">Stock Report</option>
              <option value="purchases">Purchases Report</option>
              <option value="expenses">Expenses Report</option>
            </Select>

            {reportType !== 'stock' && (
              <>
                <Select
                  label="Date Range"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="all">All Time</option>
                </Select>

                <Select
                  label="Group By"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </Select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Guide Card - Show when no report is loaded */}
      {!isLoading && !salesReport && !stockReport && !purchasesReport && !expensesReport && (
        <Card>
          <CardContent className="p-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="w-20 h-20 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  Welcome to Reports & Analytics
                </h3>
                <p className="text-text-secondary text-lg">
                  Generate comprehensive business reports with just a few clicks
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                <div className="text-left p-4 bg-surface-hover rounded-xl">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-success">1</span>
                  </div>
                  <h4 className="font-semibold text-text-primary mb-2">Select Report Type</h4>
                  <p className="text-sm text-text-secondary">
                    Choose from Sales, Stock, or Purchases reports to analyze specific business metrics
                  </p>
                </div>

                <div className="text-left p-4 bg-surface-hover rounded-xl">
                  <div className="w-10 h-10 bg-accent-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-accent-primary">2</span>
                  </div>
                  <h4 className="font-semibold text-text-primary mb-2">Set Date Range</h4>
                  <p className="text-sm text-text-secondary">
                    Filter data by 7, 30, or 90 days, or view all-time statistics
                  </p>
                </div>

                <div className="text-left p-4 bg-surface-hover rounded-xl">
                  <div className="w-10 h-10 bg-accent-secondary/10 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-accent-secondary">3</span>
                  </div>
                  <h4 className="font-semibold text-text-primary mb-2">Export & Share</h4>
                  <p className="text-sm text-text-secondary">
                    Download reports in CSV, PDF, or Excel format for offline analysis
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <p className="text-sm text-text-secondary mb-4">
                  <strong className="text-text-primary">Available Reports:</strong>
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <span className="px-4 py-2 bg-success/10 text-success rounded-lg text-sm font-medium">
                    📊 Sales Report - Revenue & orders analysis
                  </span>
                  <span className="px-4 py-2 bg-accent-primary/10 text-accent-primary rounded-lg text-sm font-medium">
                    📦 Stock Report - Inventory & valuation
                  </span>
                  <span className="px-4 py-2 bg-error/10 text-error rounded-lg text-sm font-medium">
                    🛒 Purchases Report - Cost & supplier trends
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-xs text-text-tertiary">
                  💡 Tip: Reports are generated automatically based on your filter selections above
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Report */}
      {reportType === 'sales' && salesReport && !salesLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">Total Revenue (Paid)</p>
                    <div className="group relative inline-block">
                      <p className="text-lg font-bold text-success truncate cursor-help">
                        TZS {formatNumber(salesReport.totals.totalRevenue)}
                      </p>
                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                        <p className="text-sm text-text-primary font-semibold">
                          TZS {salesReport.totals.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      {salesReport.totals.totalOrders} orders
                    </p>
                  </div>
                  <div className="bg-success/10 text-success p-2 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">Pending Revenue</p>
                    <div className="group relative inline-block">
                      <p className="text-lg font-bold text-warning truncate cursor-help">
                        TZS {formatNumber(salesReport.totals.pendingRevenue || 0)}
                      </p>
                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                        <p className="text-sm text-text-primary font-semibold">
                          TZS {(salesReport.totals.pendingRevenue || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      {salesReport.totals.pendingOrders || 0} orders
                    </p>
                  </div>
                  <div className="bg-warning/10 text-warning p-2 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">Total Orders</p>
                    <p className="text-lg font-bold text-accent-primary truncate">
                      {(salesReport.totals.totalOrders + (salesReport.totals.pendingOrders || 0))}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      All statuses
                    </p>
                  </div>
                  <div className="bg-accent-primary/10 text-accent-primary p-2 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">Avg Order Value</p>
                    <div className="group relative inline-block">
                      <p className="text-lg font-bold text-accent-secondary truncate cursor-help">
                        TZS {formatNumber(salesReport.totals.averageOrderValue)}
                      </p>
                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                        <p className="text-sm text-text-primary font-semibold">
                          TZS {salesReport.totals.averageOrderValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      Paid orders only
                    </p>
                  </div>
                  <div className="bg-accent-secondary/10 text-accent-secondary p-2 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Revenue Trend</h2>
            </CardHeader>
            <CardContent>
              {salesReport.timeline.length > 0 ? (
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={salesReport.timeline.map(item => ({
                        ...item,
                        displayPeriod: new Date(item.period).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }),
                      }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis 
                        dataKey="displayPeriod" 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f3f4f6'
                        }}
                        formatter={(value: number) => [`TZS ${value.toLocaleString()}`, 'Revenue']}
                        labelFormatter={(label) => `Period: ${label}`}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        name="Revenue (TZS)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-text-secondary">
                  No sales data available for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders Chart */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Orders Trend</h2>
            </CardHeader>
            <CardContent>
              {salesReport.timeline.length > 0 ? (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesReport.timeline.map(item => ({
                        ...item,
                        displayPeriod: new Date(item.period).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }),
                      }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis 
                        dataKey="displayPeriod" 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f3f4f6'
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'orders') return [value, 'Orders'];
                          return [value, 'Quantity'];
                        }}
                        labelFormatter={(label) => `Period: ${label}`}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Bar dataKey="orders" fill="#8b5cf6" name="Orders" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="quantity" fill="#ec4899" name="Quantity Sold" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-text-secondary">
                  No sales data available for this period
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Stock Report */}
      {reportType === 'stock' && stockReport && !stockLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total Products</p>
                    <p className="text-2xl font-bold text-accent-primary">
                      {stockReport.totals.totalProducts}
                    </p>
                  </div>
                  <div className="bg-accent-primary/10 text-accent-primary p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total Stock Value</p>
                    <p className="text-2xl font-bold text-success">
                      TZS {stockReport.totals.totalStockValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-success/10 text-success p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Low Stock Items</p>
                    <p className="text-2xl font-bold text-error">
                      {stockReport.totals.lowStockCount}
                    </p>
                  </div>
                  <div className="bg-error/10 text-error p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Table */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Stock Details</h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Product</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">SKU</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Category</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Stock</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Cost</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Selling</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockReport.allProducts.map((product) => (
                      <tr key={product.id} className="border-b border-border hover:bg-surface-hover">
                        <td className="py-3 px-4 text-sm text-text-primary font-medium">
                          {product.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-secondary">{product.sku}</td>
                        <td className="py-3 px-4 text-sm text-text-primary">{product.category}</td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span className={`font-medium ${product.isLowStock ? 'text-error' : 'text-success'}`}>
                            {product.stockQuantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-text-primary text-right">
                          TZS {product.costPriceTZS.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-accent-primary font-medium text-right">
                          TZS {product.unitPriceTZS.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {product.isLowStock ? (
                            <span className="px-2 py-1 text-xs font-medium bg-error/10 text-error rounded-lg">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-success/10 text-success rounded-lg">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Purchases Report */}
      {reportType === 'purchases' && purchasesReport && !purchasesLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total Purchases</p>
                    <p className="text-2xl font-bold text-accent-primary">
                      {purchasesReport.totals.totalPurchases}
                    </p>
                  </div>
                  <div className="bg-accent-primary/10 text-accent-primary p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total Cost</p>
                    <p className="text-2xl font-bold text-error">
                      TZS {purchasesReport.totals.totalSpend.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-error/10 text-error p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Avg Purchase Cost</p>
                    <p className="text-2xl font-bold text-accent-secondary">
                      TZS {purchasesReport.totals.averagePurchaseValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-accent-secondary/10 text-accent-secondary p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchases Chart */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Purchase Cost Trend</h2>
            </CardHeader>
            <CardContent>
              {purchasesReport.timeline.length > 0 ? (
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={purchasesReport.timeline.map(item => ({
                        ...item,
                        displayPeriod: new Date(item.period).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }),
                      }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis 
                        dataKey="displayPeriod" 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f3f4f6'
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'spend') return [`TZS ${value.toLocaleString()}`, 'Cost'];
                          return [value, 'Purchases'];
                        }}
                        labelFormatter={(label) => `Period: ${label}`}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Line
                        type="monotone"
                        dataKey="spend"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={{ fill: '#ef4444', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Cost (TZS)"
                      />
                      <Line
                        type="monotone"
                        dataKey="purchases"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Purchase Count"
                        yAxisId="right"
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-text-secondary">
                  No purchase data available for this period
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Expenses Report */}
      {reportType === 'expenses' && expensesReport && !expensesLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-warning">
                      {expensesReport.totals.totalExpenses}
                    </p>
                  </div>
                  <div className="bg-warning/10 text-warning p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-error">
                      TZS {expensesReport.totals.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-error/10 text-error p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Avg Expense Amount</p>
                    <p className="text-2xl font-bold text-accent-secondary">
                      TZS {expensesReport.totals.averageExpenseAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-accent-secondary/10 text-accent-secondary p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expenses Chart */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Expenses Trend</h2>
            </CardHeader>
            <CardContent>
              {expensesReport.timeline.length > 0 ? (
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={expensesReport.timeline.map(item => ({
                        ...item,
                        displayPeriod: new Date(item.period).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }),
                      }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis 
                        dataKey="displayPeriod" 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f3f4f6'
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'amount') return [`TZS ${value.toLocaleString()}`, 'Amount'];
                          return [value, 'Count'];
                        }}
                        labelFormatter={(label) => `Period: ${label}`}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#f59e0b"
                        fill="url(#expenseGradient)"
                        strokeWidth={3}
                        name="Expense Amount (TZS)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-text-secondary">
                  No expense data available for this period
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
