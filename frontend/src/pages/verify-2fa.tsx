import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import Button from '@/components/Button';

export default function Verify2FA() {
  const router = useRouter();
  const { userId } = router.query;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Only check after router is fully ready
    if (!router.isReady) return;
    
    console.log('Verify2FA - Router ready. UserId:', userId);
    
    // Redirect if no userId after router is ready
    if (!userId) {
      console.log('No userId found, redirecting to login');
      router.replace('/login');
    }
  }, [router.isReady, userId, router]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = pastedData.split('');
    while (newCode.length < 6) newCode.push('');
    setCode(newCode);
    
    // Focus last filled input
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-2fa', {
        userId,
        code: fullCode
      });

      console.log('2FA verification response:', response.data);
      
      if (response.data.ok || response.data.token) {
        const token = response.data.token;
        const user = response.data.user;
        
        console.log('Storing token and user:', { token: token ? 'present' : 'missing', user });
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        toast.success('Verification successful!');
        
        // Small delay for toast, then redirect with page reload to ensure auth state updates
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
        return;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle, #9333ea 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
            <img src="/logo.svg" alt="KAMCORP Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-text-primary mb-2 px-4">
            Two-Factor Authentication
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm px-4">
            We've sent a 6-digit code to your email
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-surface rounded-xl p-4 sm:p-8 border border-border shadow-metallic">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Code Inputs */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-text-primary mb-3 sm:mb-4 text-center">
                Enter Verification Code
              </label>
              <div className="flex gap-2 sm:gap-3 justify-center" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-10 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-background border-2 border-border rounded-lg focus:border-accent-primary focus:outline-none transition-colors text-text-primary"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-background rounded-lg p-4 border border-border/50">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    The code expires in <strong className="text-warning">10 minutes</strong>. 
                    Didn't receive it? Check your spam folder or contact support.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              fullWidth
              disabled={code.join('').length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </Button>

            {/* Back to Login */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                ← Back to login
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-tertiary mt-6">
          © 2024 KAMCORP. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
