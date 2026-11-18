import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
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
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#ffffff' }}>
      {/* Blue left diagonal — clip-path cuts the diagonal edge */}
      <div className="absolute inset-0 hidden lg:block" style={{
        background: 'linear-gradient(160deg, #0e1530 0%, #1a2a5e 50%, #0e1a40 100%)',
        clipPath: 'polygon(0 0, 65% 0, 35% 100%, 0 100%)',
      }} />

      <div className="relative z-10 flex min-h-screen">
      {/* Left Panel — Branded */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative"
        style={{ background: 'transparent' }}
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
            KAM <span style={{ color: '#9aaad0' }}>CORP</span>
          </h1>
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
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                text: 'Track every product in real-time'
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                text: 'See profit on every sale instantly'
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
                text: 'Manage staff with role-based access'
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ color: 'rgba(154,170,208,0.6)' }}>
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
        className="w-full lg:flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20"
        style={{ background: 'transparent' }}
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
            <h2 className="text-2xl font-semibold mb-1" style={{ color: '#0e1530' }}>Welcome back</h2>
            <p className="text-sm" style={{ color: '#3a4a70' }}>Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#3a4a70' }}>
                Email address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="!bg-white !border-[#dde3f0] !text-[#0e1530] placeholder:!text-[#aab0c8] focus:!border-[#9aaad0]"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#3a4a70' }}>
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="!bg-white !border-[#dde3f0] !text-[#0e1530] placeholder:!text-[#aab0c8] focus:!border-[#9aaad0]"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all"
              style={{ background: isLoading ? '#7888b0' : '#0e1530', fontSize: '15px' }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs mt-8" style={{ color: '#8090b8' }}>
            © 2025 KAMCORP. All rights reserved.
          </p>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
