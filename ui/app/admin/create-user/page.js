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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.createUser(form);
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
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="e.g. John"
                className="w-full px-4 py-3 rounded-xl border border-lord-border focus:border-lord-green focus:ring-1 focus:ring-lord-green/20 focus:outline-none text-[14px] transition-all bg-lord-bg/30 text-lord-text-main font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-lord-text-muted mb-1.5 uppercase tracking-wider">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="e.g. Doe"
                className="w-full px-4 py-3 rounded-xl border border-lord-border focus:border-lord-green focus:ring-1 focus:ring-lord-green/20 focus:outline-none text-[14px] transition-all bg-lord-bg/30 text-lord-text-main font-semibold"
              />
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
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="e.g. john.doe@example.com"
              className="w-full px-4 py-3 rounded-xl border border-lord-border focus:border-lord-green focus:ring-1 focus:ring-lord-green/20 focus:outline-none text-[14px] transition-all bg-lord-bg/30 text-lord-text-main font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-lord-text-muted mb-1.5 uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="e.g. +1 (555) 000-0000"
              className="w-full px-4 py-3 rounded-xl border border-lord-border focus:border-lord-green focus:ring-1 focus:ring-lord-green/20 focus:outline-none text-[14px] transition-all bg-lord-bg/30 text-lord-text-main font-semibold"
            />
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
