import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import api from '@/utils/api';
import toast from 'react-hot-toast';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading || user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.requires2FA) {
        toast.success(response.data.message || 'Verification code sent to your email');
        router.replace(`/verify-2fa?userId=${response.data.userId}`);
        return;
      }
      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Login successful!');
        window.location.href = '/dashboard';
      } else {
        setIsLoading(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branded */}
      <motion.div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{
          background: 'linear-gradient(145deg, #080c18 0%, #0e1530 60%, #131c3a 100%)',
          clipPath: 'polygon(0 0, 92% 0, 100% 100%, 0 100%)',
        }}
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* Background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5" style={{ background: '#9aaad0', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-5" style={{ background: '#9aaad0', transform: 'translate(-30%, 30%)' }} />

        {/* Top — Wordmark */}
        <div>
          <h1 className="text-4xl font-display font-black tracking-widest text-white">
            KAM<span style={{ color: '#9aaad0' }}>CORP</span>
          </h1>
          <p className="text-sm tracking-widest uppercase mt-1" style={{ color: '#9aaad0', opacity: 0.7 }}>
            Track · Manage · Grow
          </p>
        </div>

        {/* Middle — Headline + Features */}
        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-display font-bold text-white leading-tight mb-2">
              Run your business<br />
              <span style={{ color: '#9aaad0' }}>smarter.</span>
            </h2>
            <p className="text-sm" style={{ color: 'rgba(192,200,224,0.6)' }}>
              Know your numbers, grow your profit.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: '📊', text: 'Track every product in real-time' },
              { icon: '💰', text: 'See profit on every sale instantly' },
              { icon: '🔐', text: 'Manage staff with role-based access' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'rgba(154,170,208,0.1)', border: '1px solid rgba(154,170,208,0.2)' }}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgba(192,200,224,0.85)' }}>
                  {item.text}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom — Trust line */}
        <p className="text-xs" style={{ color: 'rgba(154,170,208,0.4)' }}>
          Trusted by automotive businesses across Tanzania
        </p>
      </motion.div>

      {/* Right Panel — Form */}
      <motion.div
        className="w-full lg:flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 bg-surface lg:-ml-12 relative z-10"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Mobile wordmark */}
        <div className="lg:hidden mb-10 text-center">
          <h1 className="text-4xl font-display font-black tracking-widest text-text-primary">
            KAM<span className="text-accent-primary">CORP</span>
          </h1>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-1">Welcome back</h2>
            <p className="text-text-secondary text-sm">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Email address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />
            </div>

            <Button type="submit" variant="primary" loading={isLoading} fullWidth>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Roles */}
          <div className="mt-8 p-4 rounded-xl border border-border bg-background">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">User Roles</p>
            <div className="space-y-2">
              {[
                { role: 'Admin', desc: 'Full system control & user management', color: '#9aaad0' },
                { role: 'Sales', desc: 'Record sales & view reports', color: '#50c88c' },
                { role: 'Stock', desc: 'Manage inventory & purchases', color: '#50c88c' },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: r.color }} />
                  <div>
                    <span className="text-xs font-semibold block" style={{ color: r.color }}>{r.role}</span>
                    <span className="text-xs text-text-tertiary">{r.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-text-tertiary mt-8">
            © 2025 KAMCORP. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
