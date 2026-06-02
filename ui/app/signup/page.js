'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import OtpInput from '@/components/auth/OtpInput';
import { authApi } from '@/lib/authApi';
import { useAuth } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const ic = "w-full px-4 py-3 rounded-xl border-2 border-lord-border bg-white text-lord-text-main placeholder-gray-400 focus:border-lord-green focus:ring-2 focus:ring-lord-green/20 outline-none transition-all text-[15px]";

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.signup({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, password: 'StaticPassword123!' });
      router.push('/login?registered=true');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function onVerify(code) {
    setError(''); setLoading(true);
    try {
      const d = await authApi.verifySignup(form.email, code);
      login(d.token, d.user); router.push('/');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function onResend() {
    setResending(true);
    try { await authApi.resendOtp(form.email, 'signup'); } catch {}
    finally { setTimeout(() => setResending(false), 30000); }
  }

  const spinner = <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>;

  return (
    <AuthLayout title={step === 'form' ? 'Create Account' : 'Verify Email'} subtitle={step === 'form' ? 'Join Engage Socially' : 'Enter the code sent to your email'}>
      {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}
      {step === 'form' ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-lord-text-main mb-1.5">First Name</label><input id="signup-firstname" required value={form.firstName} onChange={e=>up('firstName',e.target.value)} placeholder="John" className={ic}/></div>
            <div><label className="block text-sm font-semibold text-lord-text-main mb-1.5">Last Name</label><input id="signup-lastname" required value={form.lastName} onChange={e=>up('lastName',e.target.value)} placeholder="Doe" className={ic}/></div>
          </div>
          <div><label className="block text-sm font-semibold text-lord-text-main mb-1.5">Email</label><input id="signup-email" type="email" required value={form.email} onChange={e=>up('email',e.target.value)} placeholder="you@example.com" className={ic}/></div>
          <div><label className="block text-sm font-semibold text-lord-text-main mb-1.5">Phone</label><input id="signup-phone" type="tel" value={form.phone} onChange={e=>up('phone',e.target.value)} placeholder="+91 98765 43210" className={ic}/></div>
          <button id="signup-submit" type="submit" disabled={loading} className="w-full py-3.5 bg-lord-green hover:bg-lord-green-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-lord-green/25 transition-all disabled:opacity-50 text-[15px] mt-2">
            {loading ? <span className="flex items-center justify-center gap-2">{spinner}Creating…</span> : 'Create Account'}
          </button>
          
          <div className="bg-lord-card p-3 rounded-xl border border-lord-border text-center text-xs text-lord-text-muted">
            Static OTP for testing: <span className="font-bold text-lord-green">758369</span>
          </div>

          <p className="text-center text-sm text-lord-text-muted">Already have an account? <Link href="/login" className="text-lord-green font-semibold">Sign In</Link></p>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="text-center"><p className="text-sm text-lord-text-muted mb-1">Code sent to</p><p className="font-semibold text-lord-text-main">{form.email}</p></div>
          <OtpInput onComplete={onVerify} disabled={loading}/>
          {loading && <div className="flex justify-center">{spinner}</div>}
          <div className="text-center"><button onClick={onResend} disabled={resending} className="text-sm text-lord-green font-medium disabled:text-lord-text-muted">{resending?'Resent — wait 30s':'Resend OTP'}</button></div>
          
          <div className="bg-lord-card p-3 rounded-xl border border-lord-border text-center text-xs text-lord-text-muted">
            Static OTP for testing: <span className="font-bold text-lord-green">758369</span>
          </div>

          <button onClick={()=>{setStep('form');setError('');}} className="w-full py-3 text-sm text-lord-text-muted hover:text-lord-text-main font-medium">← Back</button>
        </div>
      )}
    </AuthLayout>
  );
}
