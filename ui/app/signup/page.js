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
  const [fieldErrors, setFieldErrors] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const ic = "w-full px-4 py-3 rounded-xl border-2 border-lord-border bg-white text-lord-text-main placeholder-gray-400 focus:border-lord-green focus:ring-2 focus:ring-lord-green/20 outline-none transition-all text-[15px]";

  const handlePhoneChange = (e) => {
    const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 10);
    up('phone', cleanValue);
    if (fieldErrors.phone) {
      setFieldErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleFirstNameChange = (e) => {
    const val = e.target.value;
    up('firstName', val);
    if (fieldErrors.firstName) {
      setFieldErrors(prev => ({ ...prev, firstName: '' }));
    }
  };

  const handleLastNameChange = (e) => {
    const val = e.target.value;
    up('lastName', val);
    if (fieldErrors.lastName) {
      setFieldErrors(prev => ({ ...prev, lastName: '' }));
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    up('email', val);
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    
    const errors = { firstName: '', lastName: '', email: '', phone: '' };
    let hasFieldErrors = false;

    const fName = form.firstName.trim();
    const lName = form.lastName.trim();
    const emailStr = form.email.trim();
    const phoneStr = form.phone.trim();

    if (!fName) {
      errors.firstName = 'First Name is required.';
      hasFieldErrors = true;
    } else if (/^\d/.test(fName)) {
      errors.firstName = 'First Name cannot start with a number.';
      hasFieldErrors = true;
    }

    if (lName && /^\d/.test(lName)) {
      errors.lastName = 'Last Name cannot start with a number.';
      hasFieldErrors = true;
    }

    if (!emailStr) {
      errors.email = 'Email is required.';
      hasFieldErrors = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        errors.email = 'Please enter a valid email address.';
        hasFieldErrors = true;
      }
    }

    if (phoneStr && phoneStr.length !== 10) {
      errors.phone = 'Phone number must be exactly 10 digits.';
      hasFieldErrors = true;
    }

    setFieldErrors(errors);
    if (hasFieldErrors) {
      return;
    }

    setLoading(true);
    try {
      await authApi.signup({ firstName: fName, lastName: lName, email: emailStr, phone: phoneStr, password: 'StaticPassword123!' });
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
            <div>
              <label className="block text-sm font-semibold text-lord-text-main mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <input id="signup-firstname" required value={form.firstName} onChange={handleFirstNameChange} placeholder="John" className={ic}/>
              {fieldErrors.firstName && <span className="text-red-500 text-xs mt-1 block font-medium">{fieldErrors.firstName}</span>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-lord-text-main mb-1.5">
                Last Name
              </label>
              <input id="signup-lastname" value={form.lastName} onChange={handleLastNameChange} placeholder="Doe" className={ic}/>
              {fieldErrors.lastName && <span className="text-red-500 text-xs mt-1 block font-medium">{fieldErrors.lastName}</span>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-lord-text-main mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input id="signup-email" type="email" required value={form.email} onChange={handleEmailChange} placeholder="you@example.com" className={ic}/>
            {fieldErrors.email && <span className="text-red-500 text-xs mt-1 block font-medium">{fieldErrors.email}</span>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-lord-text-main mb-1.5">
              Phone
            </label>
            <input id="signup-phone" type="tel" maxLength={10} value={form.phone} onChange={handlePhoneChange} placeholder="e.g. 9876543210" className={ic}/>
            {fieldErrors.phone && <span className="text-red-500 text-xs mt-1 block font-medium">{fieldErrors.phone}</span>}
          </div>
          <button id="signup-submit" type="submit" disabled={loading} className="w-full py-3.5 bg-lord-green hover:bg-lord-green-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-lord-green/25 transition-all disabled:opacity-50 text-[15px] mt-2">
            {loading ? <span className="flex items-center justify-center gap-2">{spinner}Creating…</span> : 'Create Account'}
          </button>
          
          <p className="text-center text-sm text-lord-text-muted">Already have an account? <Link href="/login" className="text-lord-green font-semibold">Sign In</Link></p>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="text-center"><p className="text-sm text-lord-text-muted mb-1">Code sent to</p><p className="font-semibold text-lord-text-main">{form.email}</p></div>
          <OtpInput onComplete={onVerify} disabled={loading}/>
          {loading && <div className="flex justify-center">{spinner}</div>}
          <div className="text-center"><button onClick={onResend} disabled={resending} className="text-sm text-lord-green font-medium disabled:text-lord-text-muted">{resending?'Resent — wait 30s':'Resend OTP'}</button></div>
          
          <button onClick={()=>{setStep('form');setError('');}} className="w-full py-3 text-sm text-lord-text-muted hover:text-lord-text-main font-medium">← Back</button>
        </div>
      )}
    </AuthLayout>
  );
}
