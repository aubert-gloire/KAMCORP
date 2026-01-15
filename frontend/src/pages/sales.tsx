import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { z } from 'zod';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Button from '@/components/Button';
import Input, { Select } from '@/components/Input';
import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';
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

interface Product {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  stockQuantity: number;
}

interface Sale {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  productSnapshot: {
    name: string;
    sku: string;
    sellingPrice: number;
  };
  quantity: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'Mobile Money';
  paymentStatus: 'Paid' | 'Pending';
  saleDate: string;
  createdBy: {
    fullName: string;
  };
}

const saleSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  paymentMethod: z.enum(['Cash', 'Card', 'Mobile Money'], {
    errorMap: () => ({ message: 'Payment method is required' }),
  }),
  paymentStatus: z.enum(['Paid', 'Pending'], {
    errorMap: () => ({ message: 'Payment status is required' }),
  }),
});

type SaleFormData = z.infer<typeof saleSchema>;

export default function Sales() {
  const { isAdmin, isSales } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<SaleFormData>>({});
  const [formData, setFormData] = useState<Partial<SaleFormData>>({
    quantity: 1,
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SaleFormData, string>>>({});
  const [selectedProductId, setSelectedProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const canCreateSale = isAdmin() || isSales();

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data.data;
    },
  });

  // Fetch sales
  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ['sales', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/sales?${params.toString()}`);
      return response.data.data;
    },
  });

  // Create sale mutation
  const createMutation = useMutation({
    mutationFn: async (data: SaleFormData) => {
      // Convert payment method to lowercase format expected by backend
      const paymentMethodMap: { [key: string]: string } = {
        'Cash': 'cash',
        'Card': 'card',
        'Mobile Money': 'mobile'
      };
      
      const requestData = {
        productId: selectedProductId,
        quantity: data.quantity,
        sellingPrice: data.sellingPrice,
        paymentMethod: paymentMethodMap[data.paymentMethod] || 'cash',
        paymentStatus: data.paymentStatus.toLowerCase()
      };
      
      const response = await api.post('/sales', requestData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sale recorded successfully!');
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to record sale';
      toast.error(errorMessage);
    },
  });

  // Update payment status mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: string }) => {
      const response = await api.patch(`/sales/${id}/payment-status`, {
        paymentStatus: paymentStatus.toLowerCase(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Payment status updated!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to update payment status';
      toast.error(errorMessage);
    },
  });

  // Update sale mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SaleFormData> }) => {
      const paymentMethodMap: { [key: string]: string } = {
        'Cash': 'cash',
        'Card': 'card',
        'Mobile Money': 'mobile'
      };
      
      const requestData: any = {};
      if (data.quantity) requestData.quantity = data.quantity;
      if (data.sellingPrice) requestData.sellingPrice = data.sellingPrice;
      if (data.paymentMethod) requestData.paymentMethod = paymentMethodMap[data.paymentMethod] || 'cash';
      if (data.paymentStatus) requestData.paymentStatus = data.paymentStatus.toLowerCase();
      
      const response = await api.put(`/sales/${id}`, requestData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sale updated successfully!');
      setIsEditModalOpen(false);
      setSelectedSale(null);
      setEditFormData({});
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to update sale';
      toast.error(errorMessage);
    },
  });

  // Delete sale mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/sales/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sale deleted and stock restored!');
      setIsDeleteModalOpen(false);
      setSelectedSale(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to delete sale';
      toast.error(errorMessage);
    },
  });

  const resetForm = () => {
    setFormData({
      quantity: 1,
      paymentMethod: 'Cash',
      paymentStatus: 'Paid',
    });
    setSelectedProductId('');
    setErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'productId') {
      setSelectedProductId(value);
      setFormData((prev) => ({ ...prev, productId: value }));
      
      // Auto-fill suggested price when product is selected
      const product = products.find((p) => p._id === value);
      if (product) {
        setFormData((prev) => ({ ...prev, sellingPrice: product.sellingPrice }));
      }
    } else if (name === 'quantity') {
      setFormData((prev) => ({ ...prev, quantity: parseInt(value) || 1 }));
    } else if (name === 'sellingPrice') {
      setFormData((prev) => ({ ...prev, sellingPrice: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    if (errors[name as keyof SaleFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Additional validation for stock
    if (selectedProductId) {
      const selectedProduct = products.find((p) => p._id === selectedProductId);
      if (selectedProduct && formData.quantity && formData.quantity > selectedProduct.stockQuantity) {
        setErrors({ quantity: `Only ${selectedProduct.stockQuantity} units available in stock` });
        return;
      }
    }

    // Add productId to formData before validation
    const dataToValidate = {
      ...formData,
      productId: selectedProductId
    };

    const result = saleSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SaleFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof SaleFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    createMutation.mutate(result.data);
  };

  const selectedProduct = products.find((p) => p._id === selectedProductId);
  const totalAmount = formData.sellingPrice && formData.quantity
    ? formData.sellingPrice * formData.quantity
    : 0;

  // Calculate total revenue
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const todaySales = sales.filter(
    (sale) => new Date(sale.saleDate).toDateString() === new Date().toDateString()
  );
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient">Sales</h1>
          <p className="text-text-secondary mt-1">Record and manage sales transactions</p>
        </div>
        {canCreateSale && (
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            New Sale
          </Button>
        )}
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-medium">{showFilters ? 'Hide' : 'Show'} Date Filters</span>
            </button>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-sm text-text-secondary hover:text-error transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <div className="flex items-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const today = new Date();
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                    setStartDate(lastMonth.toISOString().split('T')[0]);
                    setEndDate(lastMonthEnd.toISOString().split('T')[0]);
                  }}
                  className="flex-1"
                >
                  Last Month
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const today = new Date();
                    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                  className="flex-1"
                >
                  This Month
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary mb-1">Today's Sales</p>
                <p className="text-lg font-bold text-text-primary truncate">{todaySales.length}</p>
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
                <p className="text-xs text-text-secondary mb-1">Today's Revenue</p>
                <div className="group relative inline-block">
                  <p className="text-lg font-bold text-success truncate cursor-help">
                    TZS {formatNumber(todayRevenue)}
                  </p>
                  <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                    <p className="text-sm text-text-primary font-semibold">
                      TZS {todayRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
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
                <p className="text-xs text-text-secondary mb-1">Total Revenue</p>
                <div className="group relative inline-block">
                  <p className="text-lg font-bold text-accent-secondary truncate cursor-help">
                    TZS {formatNumber(totalRevenue)}
                  </p>
                  <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                    <p className="text-sm text-text-primary font-semibold">
                      TZS {totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-accent-secondary/10 text-accent-secondary p-2 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Recent Sales</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">SKU</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Unit Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Qty</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Payment</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Sold By</th>
                  {canCreateSale && (
                    <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 50).map((sale) => (
                  <motion.tr
                    key={sale._id}
                    className="border-b border-border hover:bg-surface-hover transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td className="py-3 px-4 text-sm text-text-primary">
                      {new Date(sale.saleDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary font-medium">
                      {sale.productSnapshot.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {sale.productSnapshot.sku}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">
                      TZS {sale.productSnapshot.sellingPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">
                      {sale.quantity}
                    </td>
                    <td className="py-3 px-4 text-sm text-accent-primary font-medium text-right">
                      TZS {sale.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary">
                      {sale.paymentMethod}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-lg ${
                          sale.paymentStatus === 'Paid'
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {sale.createdBy.fullName}
                    </td>
                    {canCreateSale && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedSale(sale);
                              setEditFormData({
                                quantity: sale.quantity,
                                sellingPrice: sale.productSnapshot.sellingPrice,
                                paymentMethod: sale.paymentMethod,
                                paymentStatus: sale.paymentStatus,
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="text-accent-primary hover:bg-accent-primary/10 p-1.5 rounded-lg transition-colors"
                            title="Edit Sale"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSale(sale);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors"
                            title="Delete Sale"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {sales.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                No sales recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Sale Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Record New Sale"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Product"
            name="productId"
            value={selectedProductId}
            onChange={handleChange}
            error={errors.productId}
          >
            <option value="">Select a product</option>
            {products
              .filter((p) => p.stockQuantity > 0)
              .map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name} - {product.sku} (Stock: {product.stockQuantity})
                </option>
              ))}
          </Select>

          {selectedProduct && (
            <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Product:</span>
                <span className="text-text-primary font-medium">{selectedProduct.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">SKU:</span>
                <span className="text-text-secondary">{selectedProduct.sku}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Available Stock:</span>
                <span className={`font-medium ${selectedProduct.stockQuantity < 10 ? 'text-error' : 'text-success'}`}>
                  {selectedProduct.stockQuantity} units
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-text-secondary">Suggested Price:</span>
                <span className="text-accent-primary font-medium">
                  TZS {selectedProduct.sellingPrice.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <Input
            label="Selling Price (TZS)"
            name="sellingPrice"
            type="number"
            min="0"
            step="0.01"
            value={formData.sellingPrice || ''}
            onChange={handleChange}
            error={errors.sellingPrice}
            placeholder="Enter negotiated selling price"
          />

          <Input
            label="Quantity"
            name="quantity"
            type="number"
            min="1"
            value={formData.quantity || 1}
            onChange={handleChange}
            error={errors.quantity}
          />

          <Select
            label="Payment Method"
            name="paymentMethod"
            value={formData.paymentMethod || 'Cash'}
            onChange={handleChange}
            error={errors.paymentMethod}
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Mobile Money">Mobile Money</option>
          </Select>

          <Select
            label="Payment Status"
            name="paymentStatus"
            value={formData.paymentStatus || 'Paid'}
            onChange={handleChange}
            error={errors.paymentStatus}
          >
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </Select>

          {totalAmount > 0 && (
            <div className="p-4 bg-accent-primary/10 rounded-xl border border-accent-primary">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Total Amount:</span>
                <span className="text-2xl font-bold text-accent-primary">
                  TZS {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              fullWidth
              loading={createMutation.isPending}
            >
              Record Sale
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Sale Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSale(null);
          setEditFormData({});
        }}
        title="Edit Sale"
      >
        {selectedSale && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: selectedSale._id, data: editFormData });
            }}
            className="space-y-4"
          >
            <div className="p-4 bg-surface rounded-xl border border-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">Product:</span>
                <span className="text-text-primary font-medium">{selectedSale.productSnapshot.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">SKU:</span>
                <span className="text-text-secondary">{selectedSale.productSnapshot.sku}</span>
              </div>
            </div>

            <Input
              label="Quantity"
              name="quantity"
              type="number"
              min="1"
              value={editFormData.quantity || ''}
              onChange={(e) => setEditFormData({ ...editFormData, quantity: parseInt(e.target.value) || 1 })}
            />

            <Input
              label="Selling Price (TZS)"
              name="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={editFormData.sellingPrice || ''}
              onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: parseFloat(e.target.value) || 0 })}
            />

            <Select
              label="Payment Method"
              name="paymentMethod"
              value={editFormData.paymentMethod || 'Cash'}
              onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value as any })}
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Mobile Money">Mobile Money</option>
            </Select>

            <Select
              label="Payment Status"
              name="paymentStatus"
              value={editFormData.paymentStatus || 'Paid'}
              onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value as any })}
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </Select>

            {editFormData.sellingPrice && editFormData.quantity && (
              <div className="p-4 bg-accent-primary/10 rounded-xl border border-accent-primary">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">New Total Amount:</span>
                  <span className="text-2xl font-bold text-accent-primary">
                    TZS {(editFormData.sellingPrice * editFormData.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedSale(null);
                  setEditFormData({});
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={updateMutation.isPending}
              >
                Update Sale
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSale(null);
        }}
        title="Delete Sale"
      >
        <div className="space-y-4">
          <div className="p-4 bg-error/10 border border-error rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-error font-semibold mb-1">Are you sure?</h4>
                <p className="text-sm text-text-secondary">
                  This will permanently delete this sale record and restore {selectedSale?.quantity} unit(s) back to inventory.
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {selectedSale && (
            <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Product:</span>
                <span className="text-text-primary font-medium">{selectedSale.productSnapshot.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Quantity:</span>
                <span className="text-text-primary font-medium">{selectedSale.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Total Amount:</span>
                <span className="text-text-primary font-medium">TZS {selectedSale.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Payment Status:</span>
                <span className={`font-medium ${selectedSale.paymentStatus === 'Paid' ? 'text-success' : 'text-warning'}`}>
                  {selectedSale.paymentStatus}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedSale(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="error"
              fullWidth
              loading={deleteMutation.isPending}
              onClick={() => selectedSale && deleteMutation.mutate(selectedSale._id)}
            >
              Delete Sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
