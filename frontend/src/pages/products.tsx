import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { z } from 'zod';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Button from '@/components/Button';
import Input, { Select, Textarea } from '@/components/Input';
import Modal, { ConfirmModal } from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  isLowStock: boolean;
  createdAt: string;
}

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  costPrice: z.number().positive('Cost price must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  stockQuantity: z.number().int().min(0, 'Stock must be non-negative'),
  reorderLevel: z.number().int().min(0, 'Reorder level must be non-negative'),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function Products() {
  const { user, isAdmin, isStock } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<ProductFormData>>({
    costPrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    reorderLevel: 10,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  // Fetch products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data.data;
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await api.get('/products/categories');
        return response.data?.data || [];
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        return [];
      }
    },
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await api.post('/products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Product created successfully!');
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to create product';
      toast.error(errorMessage);
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      const response = await api.put(`/products/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully!');
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update product';
      toast.error(errorMessage);
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to delete product';
      toast.error(errorMessage);
    },
  });

  const canEdit = isAdmin() || isStock();

  const resetForm = () => {
    setFormData({
      costPrice: 0,
      sellingPrice: 0,
      stockQuantity: 0,
      reorderLevel: 10,
    });
    setErrors({});
    setSelectedProduct(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ['costPrice', 'sellingPrice', 'stockQuantity', 'reorderLevel'];
    
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value,
    }));
    
    if (errors[name as keyof ProductFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = productSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProductFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ProductFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (selectedProduct) {
      updateMutation.mutate({ id: selectedProduct._id, data: result.data });
    } else {
      createMutation.mutate(result.data);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      reorderLevel: product.reorderLevel,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteMutation.mutate(selectedProduct._id);
    }
  };

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
          <h1 className="text-3xl font-display font-bold text-gradient">Products</h1>
          <p className="text-text-secondary mt-1">
            Manage your product inventory
          </p>
        </div>
        {canEdit && (
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
            Add Product
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-text-secondary">{product.sku}</p>
                  </div>
                  {product.isLowStock && (
                    <span className="px-2 py-1 text-xs font-medium bg-error/10 text-error rounded-lg">
                      Low Stock
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Category:</span>
                    <span className="text-text-primary font-medium">{product.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Stock:</span>
                    <span className={`font-medium ${product.isLowStock ? 'text-error' : 'text-success'}`}>
                      {product.stockQuantity} units
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Cost Price:</span>
                    <span className="text-text-primary">TZS {product.costPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Selling Price:</span>
                    <span className="text-accent-primary font-medium">
                      TZS {product.sellingPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => handleEdit(product)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="error"
                      size="sm"
                      fullWidth
                      onClick={() => handleDelete(product)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-text-secondary">No products found</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={selectedProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            error={errors.name}
            placeholder="Enter product name"
          />

          <Input
            label="SKU"
            name="sku"
            value={formData.sku || ''}
            onChange={handleChange}
            error={errors.sku}
            placeholder="e.g., PROD001"
          />

          <Select
            label="Category"
            name="category"
            value={formData.category || ''}
            onChange={handleChange}
            error={errors.category}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
            <option value="Electronics">Electronics</option>
            <option value="Clothing">Clothing</option>
            <option value="Food">Food</option>
            <option value="Furniture">Furniture</option>
            <option value="Other">Other</option>
          </Select>

          <Textarea
            label="Description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Product description (optional)"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cost Price (TZS)"
              name="costPrice"
              type="number"
              value={formData.costPrice || 0}
              onChange={handleChange}
              error={errors.costPrice}
              placeholder="0"
            />

            <Input
              label="Selling Price (TZS)"
              name="sellingPrice"
              type="number"
              value={formData.sellingPrice || 0}
              onChange={handleChange}
              error={errors.sellingPrice}
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stock Quantity"
              name="stockQuantity"
              type="number"
              value={formData.stockQuantity || 0}
              onChange={handleChange}
              error={errors.stockQuantity}
              placeholder="0"
            />

            <Input
              label="Reorder Level"
              name="reorderLevel"
              type="number"
              value={formData.reorderLevel || 10}
              onChange={handleChange}
              error={errors.reorderLevel}
              placeholder="10"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {selectedProduct ? 'Update' : 'Create'} Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Product?"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="error"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
