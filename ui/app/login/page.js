'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import OtpInput from '@/components/auth/OtpInput';
import { authApi } from '@/lib/authApi';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isReg = new URLSearchParams(window.location.search).get('registered') === 'true';
      if (isReg) {
        setRegistered(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('registered');
        window.history.replaceState({}, '', url.pathname + url.search);

        const timer = setTimeout(() => {
          setRegistered(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  async function handleSubmitCredentials(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.resendOtp(email, 'login');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(code) {
    setError('');
    setLoading(true);
    try {
      function getCookie(name) {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      }
      const unipileAccountId = getCookie('unipile_account_id');
      const data = await authApi.verifyLogin(email, code, unipileAccountId);
      login(data.token, data.user);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setResending(true);
    try {
      await authApi.resendOtp(email, 'login');
    } catch {
      // Silently fail
    } finally {
      setTimeout(() => setResending(false), 30000);
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle={step === 'credentials' ? 'Sign in to your account' : 'Enter the verification code sent to your email'}
    >
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          {error}
        </div>
      )}

      {step === 'credentials' && registered && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Account created successfully! Please sign in.
        </div>
      )}

      {step === 'credentials' ? (
        <form onSubmit={handleSubmitCredentials} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-lord-text-main mb-1.5">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border-2 border-lord-border bg-white text-lord-text-main placeholder-gray-400 focus:border-lord-green focus:ring-2 focus:ring-lord-green/20 outline-none transition-all text-[15px]"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-lord-green hover:bg-lord-green-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-lord-green/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[15px]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>
                Sending OTP…
              </span>
            ) : 'Send OTP'}
          </button>

          <p className="text-center text-sm text-lord-text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-lord-green hover:text-lord-green-dark font-semibold transition-colors">
              Create Account
            </Link>
          </p>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-lord-text-muted mb-1">We sent a code to</p>
            <p className="font-semibold text-lord-text-main">{email}</p>
          </div>

          <OtpInput onComplete={handleVerifyOtp} disabled={loading} />

          {loading && (
            <div className="flex justify-center">
              <svg className="animate-spin h-6 w-6 text-lord-green" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleResendOtp}
              disabled={resending}
              className="text-sm text-lord-green hover:text-lord-green-dark font-medium transition-colors disabled:text-lord-text-muted disabled:cursor-not-allowed"
            >
              {resending ? 'OTP resent — wait 30s' : 'Resend OTP'}
            </button>
          </div>

          <button
            onClick={() => { setStep('credentials'); setError(''); }}
            className="w-full py-3 text-sm text-lord-text-muted hover:text-lord-text-main transition-colors font-medium"
          >
            ← Back to login
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
