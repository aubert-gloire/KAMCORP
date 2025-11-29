import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  id?: string; // Add optional id for compatibility
  email: string;
  fullName: string;
  role: 'admin' | 'sales' | 'stock';
  lastLoginAt?: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [resetModal, setResetModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'sales' as 'admin' | 'sales' | 'stock',
  });
  const [error, setError] = useState('');

  // Fetch all users (admin only)
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/auth/users');
      return response.data.users;
    },
    enabled: currentUser?.role === 'admin',
  });

  // Reset password mutation
  const resetMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const response = await api.post('/auth/reset-password', {
        userId,
        newPassword: password,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      setResetModal(false);
      setSelectedUser(null);
      setNewPassword('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to reset password');
      toast.error('Failed to reset password');
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/auth/register', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('User created successfully');
      setCreateModal(false);
      setFormData({ email: '', fullName: '', password: '', role: 'sales' });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create user');
      toast.error('Failed to create user');
    },
  });

  // Edit user mutation
  const editMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<typeof formData> }) => {
      const response = await api.put(`/auth/users/${userId}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      setEditModal(false);
      setSelectedUser(null);
      setFormData({ email: '', fullName: '', password: '', role: 'sales' });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update user');
      toast.error('Failed to update user');
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.delete(`/auth/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      setDeleteModal(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    },
  });

  const handleResetPassword = () => {
    if (!selectedUser) return;
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    resetMutation.mutate({
      userId: selectedUser._id,
      password: newPassword,
    });
  };

  const handleCreateUser = () => {
    if (!formData.email || !formData.fullName || !formData.password) {
      setError('All fields are required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    createMutation.mutate(formData);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;

    if (!formData.email || !formData.fullName) {
      setError('Email and full name are required');
      return;
    }

    editMutation.mutate({
      userId: selectedUser._id,
      data: {
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
      },
    });
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteMutation.mutate(selectedUser._id);
  };

  const openResetModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setError('');
    setResetModal(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      password: '',
    });
    setError('');
    setEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setDeleteModal(true);
  };

  const openCreateModal = () => {
    setFormData({ email: '', fullName: '', password: '', role: 'sales' });
    setError('');
    setCreateModal(true);
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient mb-2">
            User Management
          </h1>
          <p className="text-text-secondary">Manage system users and permissions</p>
        </div>
        <Button
          variant="primary"
          onClick={openCreateModal}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">All Users</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">
                    Last Login
                  </th>
                  <th className="text-right py-3 px-4 text-text-secondary font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user, index) => (
                  <motion.tr
                    key={user._id}
                    className="border-b border-border hover:bg-surface-hover transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="py-3 px-4 text-text-primary">{user.fullName}</td>
                    <td className="py-3 px-4 text-text-secondary">{user.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-accent-primary/20 text-accent-primary'
                            : user.role === 'sales'
                            ? 'bg-success/20 text-success'
                            : 'bg-accent-secondary/20 text-accent-secondary'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary text-sm">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditModal(user)}
                          disabled={user._id === currentUser?.id}
                          icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openResetModal(user)}
                          disabled={user._id === currentUser?.id}
                        >
                          Reset Password
                        </Button>
                        <Button
                          size="sm"
                          variant="error"
                          onClick={() => openDeleteModal(user)}
                          disabled={user._id === currentUser?.id}
                          icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {createModal && (
        <Modal
          isOpen={createModal}
          onClose={() => {
            setCreateModal(false);
            setFormData({ email: '', fullName: '', password: '', role: 'sales' });
            setError('');
          }}
          title="Create New User"
        >
          <div className="space-y-4">
            <Input
              type="text"
              label="Full Name"
              placeholder="Enter full name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />

            <Input
              type="email"
              label="Email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter password (min 6 characters)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-opacity-30 transition-all duration-200"
              >
                <option value="sales">Sales</option>
                <option value="stock">Stock Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {error && <p className="text-error text-sm">{error}</p>}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setCreateModal(false);
                  setFormData({ email: '', fullName: '', password: '', role: 'sales' });
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                loading={createMutation.isPending}
                onClick={handleCreateUser}
              >
                Create User
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editModal && selectedUser && (
        <Modal
          isOpen={editModal}
          onClose={() => {
            setEditModal(false);
            setSelectedUser(null);
            setFormData({ email: '', fullName: '', password: '', role: 'sales' });
            setError('');
          }}
          title="Edit User"
        >
          <div className="space-y-4">
            <Input
              type="text"
              label="Full Name"
              placeholder="Enter full name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />

            <Input
              type="email"
              label="Email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-opacity-30 transition-all duration-200"
              >
                <option value="sales">Sales</option>
                <option value="stock">Stock Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {error && <p className="text-error text-sm">{error}</p>}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setEditModal(false);
                  setSelectedUser(null);
                  setFormData({ email: '', fullName: '', password: '', role: 'sales' });
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                loading={editMutation.isPending}
                onClick={handleEditUser}
              >
                Update User
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Modal */}
      {deleteModal && selectedUser && (
        <Modal
          isOpen={deleteModal}
          onClose={() => {
            setDeleteModal(false);
            setSelectedUser(null);
          }}
          title="Delete User"
        >
          <div className="space-y-4">
            <p className="text-text-secondary">
              Are you sure you want to delete <strong className="text-text-primary">{selectedUser.fullName}</strong> ({selectedUser.email})?
              This action cannot be undone.
            </p>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setDeleteModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="error"
                fullWidth
                loading={deleteMutation.isPending}
                onClick={handleDeleteUser}
              >
                Delete User
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resetModal && selectedUser && (
        <Modal
          isOpen={resetModal}
          onClose={() => {
            setResetModal(false);
            setSelectedUser(null);
            setNewPassword('');
            setError('');
          }}
          title="Reset Password"
        >
          <div className="space-y-4">
            <div>
              <p className="text-text-secondary mb-4">
                Reset password for <strong className="text-text-primary">{selectedUser.fullName}</strong> ({selectedUser.email})
              </p>
            </div>

            <Input
              type="password"
              label="New Password"
              placeholder="Enter new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={error}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setResetModal(false);
                  setSelectedUser(null);
                  setNewPassword('');
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                loading={resetMutation.isPending}
                onClick={handleResetPassword}
              >
                Reset Password
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
