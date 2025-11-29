import React from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && !loading) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Show nothing while loading or redirecting
  if (loading || user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle, #9333ea 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 text-center max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Logo */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="w-70 h-70 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
            <Image 
              src="/logo.svg" 
              alt="KAMCORP Logo" 
              width={288} 
              height={288}
              priority
              className="drop-shadow-2xl"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-text-primary mb-3">
            Welcome to KAMCORP
          </h1>
          <p className="text-text-secondary text-lg">
            Accounting & Inventory Management System
          </p>
        </motion.div>

        {/* Description */}
        <motion.p
          className="text-text-tertiary text-base mb-10 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Streamline your business operations with powerful analytics and real-time inventory tracking.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <Button 
            variant="primary" 
            onClick={() => router.push('/login')}
            className="text-lg px-10 py-6"
          >
            Get Started
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-text-tertiary text-sm mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          © 2025 KAMCORP. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
}
