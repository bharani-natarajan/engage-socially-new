'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import OtpInput from '@/components/auth/OtpInput';
import { authApi } from '@/lib/authApi';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const ic = "w-full px-4 py-3 rounded-xl border-2 border-lord-border bg-white text-lord-text-main placeholder-gray-400 focus:border-lord-green focus:ring-2 focus:ring-lord-green/20 outline-none transition-all text-[15px]";
  const spinner = <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>;

  async function handleSendOtp(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await authApi.forgotPassword(email); setStep('otp'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleOtpComplete(code) {
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(email, code, 'StaticPassword123!');
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try { await authApi.resendOtp(email, 'reset'); } catch {}
    finally { setTimeout(() => setResending(false), 30000); }
  }

  const titles = { email: 'Forgot Password', otp: 'Verify OTP', done: 'Success!' };
  const subs = { email: 'Enter your email to receive a reset code', otp: 'Enter the code sent to your email', done: 'Your password has been reset' };

  return (
    <AuthLayout title={titles[step]} subtitle={subs[step]}>
      {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

      {step === 'email' && (
        <form onSubmit={handleSendOtp} className="space-y-5">
          <div><label className="block text-sm font-semibold text-lord-text-main mb-1.5">Email Address</label>
            <input id="forgot-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className={ic}/></div>
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-lord-green hover:bg-lord-green-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-lord-green/25 transition-all disabled:opacity-50 text-[15px]">
            {loading ? <span className="flex items-center justify-center gap-2">{spinner}Sending…</span> : 'Send OTP'}
          </button>
          <p className="text-center text-sm text-lord-text-muted"><Link href="/login" className="text-lord-green font-semibold">← Back to login</Link></p>
        </form>
      )}

      {step === 'otp' && (
        <div className="space-y-6">
          <div className="text-center"><p className="text-sm text-lord-text-muted mb-1">Code sent to</p><p className="font-semibold text-lord-text-main">{email}</p></div>
          <OtpInput onComplete={handleOtpComplete} disabled={loading}/>
          <div className="text-center"><button onClick={handleResend} disabled={resending} className="text-sm text-lord-green font-medium disabled:text-lord-text-muted">{resending?'Resent — wait 30s':'Resend OTP'}</button></div>
          <button onClick={()=>{setStep('email');setError('');}} className="w-full py-3 text-sm text-lord-text-muted hover:text-lord-text-main font-medium">← Back</button>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 mx-auto bg-lord-green-light rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#83d395" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <p className="text-lord-text-muted text-sm">Your password has been successfully reset.</p>
          <Link href="/login" className="inline-block w-full py-3.5 bg-lord-green hover:bg-lord-green-dark text-white font-semibold rounded-xl text-center text-[15px]">Go to Login</Link>
        </div>
      )}
    </AuthLayout>
  );
}
