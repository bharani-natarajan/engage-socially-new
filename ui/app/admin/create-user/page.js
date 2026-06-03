'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';
import { useAuth } from '@/lib/auth';
import ActionLoader from '@/components/ActionLoader';

export default function CreateUserPage() {
  const router = useRouter();
  const { token, isAdmin, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'user',
  });
  const [fieldErrors, setFieldErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) {
    return <ActionLoader message="Loading admin session..." />;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-red-600 font-semibold bg-red-50 rounded-2xl border border-red-200">
        Access Denied. Admin privileges required.
      </div>
    );
  }

  const handlePhoneChange = (e) => {
    const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((p) => ({ ...p, phone: cleanValue }));
    if (fieldErrors.phone) {
      setFieldErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleFirstNameChange = (e) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, firstName: val }));
    if (fieldErrors.firstName) {
      setFieldErrors(prev => ({ ...prev, firstName: '' }));
    }
  };

  const handleLastNameChange = (e) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, lastName: val }));
    if (fieldErrors.lastName) {
      setFieldErrors(prev => ({ ...prev, lastName: '' }));
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, email: val }));
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  };

  async function handleSubmit(e) {
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
      errors.email = 'Email Address is required.';
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
      await adminApi.createUser({ ...form, firstName: fName, lastName: lName, email: emailStr, phone: phoneStr });
      router.push('/admin');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Back to Admin */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="p-2 rounded-xl hover:bg-lord-card transition-colors text-lord-text-muted flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-lord-text-main">Create User Account</h1>
          <p className="text-xs text-lord-text-muted mt-0.5">Add a new user with manual configurations</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white border border-lord-border rounded-3xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-lord-text-muted mb-1.5 uppercase tracking-wider">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={form.firstName}
                onChange={handleFirstNameChange}
                placeholder="e.g. John"
                className="w-full px-4 py-3 rounded-xl border border-lord-border focus:border-lord-green focus:ring-1 focus:ring-lord-green/20 focus:outline-none text-[14px] transition-all bg-lord-bg/30 text-lord-text-main font-semibold"
              />
              {fieldErrors.firstName && <span className="text-red-500 text-xs mt-1 block font-semibold">{fieldErrors.firstName}</span>}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-lord-text-muted mb-1.5 uppercase tracking-wider">
                Last Name
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={handleLastNameChange}
                placeholder="e.g. Doe"
                className="w-full px-4 py-3 rounded-xl border border-lord-border focus:border-lord-green focus:ring-1 focus:ring-lord-green/20 focus:outline-none text-[14px] transition-all bg-lord-bg/30 text-lord-text-main font-semibold"
              />
              {fieldErrors.lastName && <span className="text-red-500 text-xs mt-1 block font-semibold">{fieldErrors.lastName}</span>}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-lord-text-muted mb-1.5 uppercase tracking-wider">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={handleEmailChange}
              placeholder="e.g. john.doe@example.com"
              className="w-full px-4 py-3 rounded-xl border border-lord-border focus:border-lord-green focus:ring-1 focus:ring-lord-green/20 focus:outline-none text-[14px] transition-all bg-lord-bg/30 text-lord-text-main font-semibold"
            />
            {fieldErrors.email && <span className="text-red-500 text-xs mt-1 block font-semibold">{fieldErrors.email}</span>}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-lord-text-muted mb-1.5 uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              maxLength={10}
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-3 rounded-xl border border-lord-border focus:border-lord-green focus:ring-1 focus:ring-lord-green/20 focus:outline-none text-[14px] transition-all bg-lord-bg/30 text-lord-text-main font-semibold"
            />
            {fieldErrors.phone && <span className="text-red-500 text-xs mt-1 block font-semibold">{fieldErrors.phone}</span>}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-lord-text-muted mb-1.5 uppercase tracking-wider">
              System Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-lord-border focus:border-lord-green focus:ring-1 focus:ring-lord-green/20 focus:outline-none text-[14px] bg-lord-bg/30 text-lord-text-main font-semibold cursor-pointer"
            >
              <option value="user">User (Standard Access)</option>
              <option value="admin">Admin (Full System Access)</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-lord-border/40">
            <Link
              href="/admin"
              className="px-6 py-2.5 border border-lord-border rounded-full text-[13.5px] font-bold text-lord-text-muted hover:bg-lord-card/50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-lord-green text-lord-text-main font-bold rounded-full text-[13.5px] disabled:opacity-50 hover:bg-lord-green-dark transition-colors shadow-sm"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>

      {loading && <ActionLoader message="Creating user account..." />}
    </div>
  );
}
