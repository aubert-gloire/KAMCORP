import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import api from '@/utils/api';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { user, loading } = useAuth();

  // Check if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Show nothing while loading or redirecting
  if (loading || user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await api.post('/auth/login', { email, password });
      console.log('Full login response:', response);
      console.log('Response data:', response.data);
      
      // Check if 2FA is required
      if (response.data && response.data.requires2FA) {
        const userId = response.data.userId;
        console.log('2FA required! Redirecting with userId:', userId);
        toast.success(response.data.message || 'Verification code sent to your email');
        
        // Use replace to avoid back button issues
        router.replace(`/verify-2fa?userId=${userId}`);
        return;
      }
      
      // Normal login for non-admin users
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Login successful!');
        
        // Reload the page to trigger useAuth to load from localStorage
        window.location.href = '/dashboard';
      } else {
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.error || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      {/* Subtle Static Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle, #9333ea 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Side - Branding & Info */}
        <motion.div
          className="hidden lg:block space-y-8"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="w-64 h-64 mb-8">
              <img src="/logo.svg" alt="KAMCORP Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
              KAMCORP
            </h1>
            <p className="text-text-secondary text-base">
              Accounting & Inventory Management
            </p>
          </motion.div>

          {/* Features */}
          <div className="space-y-5">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: "Real-time Analytics",
                desc: "Generate comprehensive business reports",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
                title: "Inventory Tracking",
                desc: "Automated stock alerts and controls",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: "Secure Platform",
                desc: "Role-based access for your team",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4 group"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                whileHover={{ x: 5 }}
              >
                <motion.div
                  className="w-11 h-11 bg-surface rounded-lg flex items-center justify-center flex-shrink-0 text-accent-primary"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {feature.icon}
                </motion.div>
                <div>
                  <h3 className="text-text-primary font-medium text-sm mb-0.5">
                    {feature.title}
                  </h3>
                  <p className="text-text-tertiary text-sm">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quote */}
          <motion.div
            className="pt-4 border-t border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <p className="text-text-tertiary italic text-sm leading-relaxed">
              "Streamline operations with powerful analytics and inventory management tools."
            </p>
          </motion.div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          {/* Mobile Logo */}
          <motion.div
            className="lg:hidden text-center mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="w-40 h-40 mx-auto mb-5">
              <img src="/logo.svg" alt="KAMCORP Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
              KAMCORP
            </h1>
            <p className="text-text-tertiary text-sm">Inventory Management</p>
          </motion.div>

          {/* Title */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h2 className="text-xl font-semibold text-text-primary mb-1">Welcome back</h2>
            <p className="text-text-tertiary text-xs">Sign in to continue to your dashboard</p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            className="bg-surface rounded-xl p-6 border border-border"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <label className="block text-xs font-medium text-text-primary mb-1.5">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  icon={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  }
                />
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
              >
                <label className="block text-xs font-medium text-text-primary mb-1.5">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  icon={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  }
                />
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="pt-1"
              >
                <Button
                  type="submit"
                  variant="primary"
                  loading={isLoading}
                  fullWidth
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </motion.div>
            </form>

            {/* Role Information */}
            <motion.div
              className="mt-5 p-3.5 bg-background rounded-lg border border-border/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 bg-accent-primary/10 rounded-md flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-text-primary">User Roles</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { role: "Admin", color: "accent-primary", desc: "Full system control & user management" },
                  { role: "Sales", color: "success", desc: "Record sales & view reports" },
                  { role: "Stock", color: "accent-secondary", desc: "Manage inventory & purchases" },
                ].map((account, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-2.5 p-2 bg-surface-hover/50 rounded-md hover:bg-surface-hover transition-colors"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1 + i * 0.05, duration: 0.3 }}
                    whileHover={{ x: 2 }}
                  >
                    <span className={`w-1.5 h-1.5 bg-${account.color} rounded-full mt-1.5 flex-shrink-0`}></span>
                    <div>
                      <span className={`text-xs font-medium text-${account.color} block mb-0.5`}>
                        {account.role}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        {account.desc}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Footer */}
          <motion.p
            className="text-center text-xs text-text-tertiary mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            © 2025 KAMCORP. All rights reserved.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
