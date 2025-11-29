import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import api from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';

// Format large numbers with B/M/K notation
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

interface Expense {
  _id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod: string;
  receiptNumber?: string;
  createdBy: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

interface ExpenseStats {
  totals: {
    totalAmount: number;
    totalCount: number;
    averageExpense: number;
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
    count: number;
    percentage: string;
  }>;
  topExpenses: Expense[];
  monthlyTrend: Array<{
    month: string;
    total: number;
    count: number;
  }>;
}

const CATEGORY_OPTIONS = [
  { value: 'transport', label: 'Transport', icon: '🚗', color: 'text-blue-500' },
  { value: 'food', label: 'Food', icon: '🍔', color: 'text-orange-500' },
  { value: 'maintenance', label: 'Maintenance Services', icon: '🔧', color: 'text-purple-500' },
  { value: 'taxes', label: 'Taxes', icon: '💰', color: 'text-red-500' },
  { value: 'other', label: 'Other', icon: '📦', color: 'text-gray-500' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
];

export default function Expenses() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');

  const [formData, setFormData] = useState({
    category: 'transport',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    receiptNumber: '',
  });

  // Get date range
  const getDateRangeParams = () => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        return {};
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  // Fetch expenses
  const { data: expensesData, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', filterCategory, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      const dateParams = getDateRangeParams();
      if (dateParams.startDate) params.append('startDate', dateParams.startDate);
      if (dateParams.endDate) params.append('endDate', dateParams.endDate);
      
      const response = await api.get(`/expenses?${params.toString()}`);
      return response.data;
    },
  });

  // Fetch expense stats
  const { data: statsData } = useQuery({
    queryKey: ['expense-stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      const dateParams = getDateRangeParams();
      if (dateParams.startDate) params.append('startDate', dateParams.startDate);
      if (dateParams.endDate) params.append('endDate', dateParams.endDate);
      
      const response = await api.get(`/expenses/stats/summary?${params.toString()}`);
      return response.data.data as ExpenseStats;
    },
  });

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/expenses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense created successfully!');
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to create expense');
    },
  });

  // Update expense mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await api.put(`/expenses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense updated successfully!');
      setShowModal(false);
      setEditingExpense(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update expense');
    },
  });

  // Delete expense mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/expenses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to delete expense');
    },
  });

  const resetForm = () => {
    setFormData({
      category: 'transport',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      receiptNumber: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      date: new Date(expense.date).toISOString().split('T')[0],
      paymentMethod: expense.paymentMethod,
      receiptNumber: expense.receiptNumber || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteMutation.mutate(id);
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORY_OPTIONS.find(opt => opt.value === category) || CATEGORY_OPTIONS[4];
  };

  const expenses = expensesData?.data || [];
  const stats = statsData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Expenses</h1>
            <p className="text-text-secondary mt-1">Track and manage business expenses</p>
          </div>
          <Button onClick={() => { resetForm(); setEditingExpense(null); setShowModal(true); }}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-2">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">Total Expenses</p>
                    <div className="group relative inline-block">
                      <p className="text-lg font-bold text-error truncate cursor-help">
                        TZS {formatNumber(stats.totals.totalAmount)}
                      </p>
                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                        <p className="text-sm text-text-primary font-semibold">
                          TZS {stats.totals.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-error/10 text-error p-2 rounded-lg flex-shrink-0">
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
                    <p className="text-xs text-text-secondary mb-1">Total Count</p>
                    <p className="text-lg font-bold text-accent-primary truncate">
                      {stats.totals.totalCount}
                    </p>
                  </div>
                  <div className="bg-accent-primary/10 text-accent-primary p-2 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">Average Expense</p>
                    <div className="group relative inline-block">
                      <p className="text-lg font-bold text-accent-secondary truncate cursor-help">
                        TZS {formatNumber(stats.totals.averageExpense)}
                      </p>
                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                        <p className="text-sm text-text-primary font-semibold">
                          TZS {stats.totals.averageExpense.toLocaleString()}
                        </p>
                      </div>
                    </div>
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
        )}

        {/* Category Breakdown & Top Expenses */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Category Breakdown</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.categoryBreakdown.map((item) => {
                    const catInfo = getCategoryInfo(item.category);
                    return (
                      <div key={item.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{catInfo.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-text-primary">{catInfo.label}</span>
                              <span className="text-xs text-text-secondary">{item.percentage}%</span>
                            </div>
                            <div className="w-full bg-surface-hover rounded-full h-2">
                              <div 
                                className="bg-gradient-accent h-2 rounded-full transition-all"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-error">TZS {item.total.toLocaleString()}</p>
                            <p className="text-xs text-text-secondary">{item.count} items</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top 5 Expenses */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Top 5 Highest Expenses</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topExpenses.map((expense, index) => {
                    const catInfo = getCategoryInfo(expense.category);
                    return (
                      <motion.div
                        key={expense._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-accent text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="text-xl">{catInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{expense.description}</p>
                          <p className="text-xs text-text-secondary">
                            {new Date(expense.date).toLocaleDateString()} • {catInfo.label}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-error whitespace-nowrap">
                          TZS {expense.amount.toLocaleString()}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">All Expenses</h2>
          </CardHeader>
          <CardContent>
            {loadingExpenses ? (
              <div className="text-center py-8 text-text-secondary">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">No expenses found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Category</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Description</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Payment</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Created By</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense: Expense) => {
                      const catInfo = getCategoryInfo(expense.category);
                      return (
                        <tr key={expense._id} className="border-b border-border hover:bg-surface-hover">
                          <td className="py-3 px-4 text-sm text-text-primary">
                            {new Date(expense.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span>{catInfo.icon}</span>
                              <span className={`text-sm font-medium ${catInfo.color}`}>{catInfo.label}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-text-primary max-w-xs truncate">
                            {expense.description}
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-error text-right">
                            TZS {expense.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-text-secondary capitalize">
                            {expense.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-4 text-sm text-text-secondary">
                            {expense.createdBy.fullName}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(expense)}
                                className="p-1 text-accent-primary hover:bg-accent-primary/10 rounded"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {isAdmin() && (
                                <button
                                  onClick={() => handleDelete(expense._id)}
                                  className="p-1 text-error hover:bg-error/10 rounded"
                                  disabled={deleteMutation.isPending}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Modal 
          isOpen={showModal} 
          onClose={() => { setShowModal(false); setEditingExpense(null); resetForm(); }}
          title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
          size="lg"
        >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              required
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Amount (TZS)</label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter expense description"
              className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
              required
            />
            <p className="text-xs text-text-tertiary mt-1">{formData.description.length}/500 characters</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                required
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Receipt Number (Optional)</label>
            <Input
              type="text"
              value={formData.receiptNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, receiptNumber: e.target.value })}
              placeholder="Enter receipt number"
              maxLength={100}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setShowModal(false); setEditingExpense(null); resetForm(); }}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
              fullWidth
            >
              {editingExpense ? 'Update' : 'Create'} Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
