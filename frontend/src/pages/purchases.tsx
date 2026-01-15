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

interface Product {
  _id: string;
  name: string;
  sku: string;
  costPrice: number;
  stockQuantity: number;
}

interface Purchase {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  } | null;
  productSnapshot: {
    name: string;
    sku: string;
  };
  quantity: number;
  costPrice: number;
  totalCost: number;
  supplier: string;
  purchaseDate: string;
  createdBy: {
    fullName: string;
  };
}

const purchaseSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  costPrice: z.number().positive('Cost price must be positive'),
  supplier: z.string().min(1, 'Supplier is required'),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export default function Purchases() {
  const { isAdmin, isStock } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PurchaseFormData>>({});
  const [formData, setFormData] = useState<Partial<PurchaseFormData>>({
    quantity: 1,
    costPrice: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PurchaseFormData, string>>>({});
  const [selectedProductId, setSelectedProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const canCreatePurchase = isAdmin() || isStock();

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data.data;
    },
  });

  // Fetch purchases
  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({
    queryKey: ['purchases', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/purchases?${params.toString()}`);
      return response.data.data;
    },
  });

  // Create purchase mutation
  const createMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const response = await api.post('/purchases', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Purchase recorded successfully!');
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to record purchase';
      toast.error(errorMessage);
    },
  });

  // Update purchase mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseFormData> }) => {
      const requestData: any = {};
      if (data.quantity) requestData.quantity = data.quantity;
      if (data.costPrice) requestData.costPrice = data.costPrice;
      if (data.supplier) requestData.supplier = data.supplier;
      
      const response = await api.put(`/purchases/${id}`, requestData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Purchase updated successfully!');
      setIsEditModalOpen(false);
      setSelectedPurchase(null);
      setEditFormData({});
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to update purchase';
      toast.error(errorMessage);
    },
  });

  // Delete purchase mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/purchases/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Purchase deleted and stock adjusted!');
      setIsDeleteModalOpen(false);
      setSelectedPurchase(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to delete purchase';
      toast.error(errorMessage);
    },
  });

  const resetForm = () => {
    setFormData({
      quantity: 1,
      costPrice: 0,
    });
    setSelectedProductId('');
    setErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'productId') {
      setSelectedProductId(value);
      setFormData((prev) => ({ ...prev, productId: value }));
      
      // Auto-fill cost price from product
      const product = products.find((p) => p._id === value);
      if (product) {
        setFormData((prev) => ({ ...prev, productId: value, costPrice: product.costPrice }));
      }
    } else if (name === 'quantity') {
      setFormData((prev) => ({ ...prev, quantity: parseInt(value) || 1 }));
    } else if (name === 'costPrice') {
      setFormData((prev) => ({ ...prev, costPrice: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    if (errors[name as keyof PurchaseFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = purchaseSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof PurchaseFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof PurchaseFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    createMutation.mutate(result.data);
  };

  const selectedProduct = products.find((p) => p._id === selectedProductId);
  const totalCost = formData.costPrice && formData.quantity
    ? formData.costPrice * formData.quantity
    : 0;

  // Calculate statistics
  const totalPurchaseCost = purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);
  const todayPurchases = purchases.filter(
    (purchase) => new Date(purchase.purchaseDate).toDateString() === new Date().toDateString()
  );
  const todayPurchaseCost = todayPurchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);

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
          <h1 className="text-3xl font-display font-bold text-gradient">Purchases</h1>
          <p className="text-text-secondary mt-1">Record and track inventory purchases</p>
        </div>
        {canCreatePurchase && (
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
            New Purchase
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
                <p className="text-xs text-text-secondary mb-1">Today's Purchases</p>
                <p className="text-lg font-bold text-text-primary truncate">{todayPurchases.length}</p>
              </div>
              <div className="bg-accent-primary/10 text-accent-primary p-2 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary mb-1">Today's Cost</p>
                <div className="group relative inline-block">
                  <p className="text-lg font-bold text-error truncate cursor-help">
                    TZS {formatNumber(todayPurchaseCost)}
                  </p>
                  <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                    <p className="text-sm text-text-primary font-semibold">
                      TZS {todayPurchaseCost.toLocaleString()}
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
                <p className="text-xs text-text-secondary mb-1">Total Purchase Cost</p>
                <div className="group relative inline-block">
                  <p className="text-lg font-bold text-accent-secondary truncate cursor-help">
                    TZS {formatNumber(totalPurchaseCost)}
                  </p>
                  <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-surface-hover border border-border rounded-lg p-3 shadow-lg z-10 whitespace-nowrap">
                    <p className="text-sm text-text-primary font-semibold">
                      TZS {totalPurchaseCost.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-accent-secondary/10 text-accent-secondary p-2 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Recent Purchases</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">SKU</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Qty</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Unit Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Total Cost</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Supplier</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Recorded By</th>
                  {canCreatePurchase && (
                    <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {purchases.slice(0, 50).map((purchase) => (
                  <motion.tr
                    key={purchase._id}
                    className="border-b border-border hover:bg-surface-hover transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td className="py-3 px-4 text-sm text-text-primary">
                      {new Date(purchase.purchaseDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary font-medium">
                      {purchase.productSnapshot?.name || (purchase.product?.name) || '[Deleted Product]'}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {purchase.productSnapshot?.sku || (purchase.product?.sku) || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">
                      {purchase.quantity}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">
                      TZS {purchase.costPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-error font-medium text-right">
                      TZS {purchase.totalCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary">
                      {purchase.supplier}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {purchase.createdBy.fullName}
                    </td>
                    {canCreatePurchase && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedPurchase(purchase);
                              setEditFormData({
                                quantity: purchase.quantity,
                                costPrice: purchase.costPrice,
                                supplier: purchase.supplier,
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="text-accent-primary hover:bg-accent-primary/10 p-1.5 rounded-lg transition-colors"
                            title="Edit Purchase"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPurchase(purchase);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors"
                            title="Delete Purchase"
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
            {purchases.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                No purchases recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Purchase Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Record New Purchase"
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
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name} - {product.sku} (Current Stock: {product.stockQuantity})
              </option>
            ))}
          </Select>

          {selectedProduct && (
            <div className="p-4 bg-surface rounded-xl border border-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">Current Cost Price:</span>
                <span className="text-text-primary font-medium">
                  TZS {selectedProduct.costPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Current Stock:</span>
                <span className="text-text-primary font-medium">
                  {selectedProduct.stockQuantity} units
                </span>
              </div>
            </div>
          )}

          <Input
            label="Quantity"
            name="quantity"
            type="number"
            min="1"
            value={formData.quantity || 1}
            onChange={handleChange}
            error={errors.quantity}
          />

          <Input
            label="Cost Price per Unit (TZS)"
            name="costPrice"
            type="number"
            min="0"
            step="0.01"
            value={formData.costPrice || 0}
            onChange={handleChange}
            error={errors.costPrice}
          />

          <Input
            label="Supplier"
            name="supplier"
            value={formData.supplier || ''}
            onChange={handleChange}
            error={errors.supplier}
            placeholder="Enter supplier name"
          />

          {totalCost > 0 && (
            <div className="p-4 bg-error/10 rounded-xl border border-error">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Total Cost:</span>
                <span className="text-2xl font-bold text-error">
                  TZS {totalCost.toLocaleString()}
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
              variant="primary"
              fullWidth
              loading={createMutation.isPending}
            >
              Record Purchase
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Purchase Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPurchase(null);
          setEditFormData({});
        }}
        title="Edit Purchase"
      >
        {selectedPurchase && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: selectedPurchase._id, data: editFormData });
            }}
            className="space-y-4"
          >
            <div className="p-4 bg-surface rounded-xl border border-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">Product:</span>
                <span className="text-text-primary font-medium">
                  {selectedPurchase.productSnapshot?.name || selectedPurchase.product?.name || '[Deleted Product]'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">SKU:</span>
                <span className="text-text-secondary">
                  {selectedPurchase.productSnapshot?.sku || selectedPurchase.product?.sku || 'N/A'}
                </span>
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
              label="Cost Price per Unit (TZS)"
              name="costPrice"
              type="number"
              min="0"
              step="0.01"
              value={editFormData.costPrice || ''}
              onChange={(e) => setEditFormData({ ...editFormData, costPrice: parseFloat(e.target.value) || 0 })}
            />

            <Input
              label="Supplier"
              name="supplier"
              value={editFormData.supplier || ''}
              onChange={(e) => setEditFormData({ ...editFormData, supplier: e.target.value })}
              placeholder="Enter supplier name"
            />

            {editFormData.costPrice && editFormData.quantity && (
              <div className="p-4 bg-error/10 rounded-xl border border-error">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">New Total Cost:</span>
                  <span className="text-2xl font-bold text-error">
                    TZS {(editFormData.costPrice * editFormData.quantity).toLocaleString()}
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
                  setSelectedPurchase(null);
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
                Update Purchase
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
          setSelectedPurchase(null);
        }}
        title="Delete Purchase"
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
                  This will permanently delete this purchase record and remove {selectedPurchase?.quantity} unit(s) from inventory.
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {selectedPurchase && (
            <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Product:</span>
                <span className="text-text-primary font-medium">
                  {selectedPurchase.productSnapshot?.name || selectedPurchase.product?.name || '[Deleted Product]'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Quantity:</span>
                <span className="text-text-primary font-medium">{selectedPurchase.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Total Cost:</span>
                <span className="text-text-primary font-medium">TZS {selectedPurchase.totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Supplier:</span>
                <span className="text-text-primary font-medium">{selectedPurchase.supplier}</span>
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
                setSelectedPurchase(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="error"
              fullWidth
              loading={deleteMutation.isPending}
              onClick={() => selectedPurchase && deleteMutation.mutate(selectedPurchase._id)}
            >
              Delete Purchase
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
