'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';
import { useAuth } from '@/lib/auth';
import ActionLoader from '@/components/ActionLoader';

export default function AdminPage() {
  const { token, isAdmin, loading: authLoading } = useAuth();
  
  // States
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete confirm modal state
  const [deleteUserId, setDeleteUserId] = useState(null);

  useEffect(() => {
    if (token && isAdmin) {
      loadData();
    }
  }, [token, isAdmin]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.listUsers({ limit: 100 })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteUserId) return;
    const userId = deleteUserId;
    setDeleteUserId(null);
    try {
      setLoading(true);
      await adminApi.deleteUser(userId);
      await loadData();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lord-text-main">Admin Dashboard</h1>
          <p className="text-lord-text-muted mt-1 text-[15px]">Manage users, view stats, and link workflow configurations.</p>
        </div>
        <Link
          href="/admin/create-user"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lord-green text-lord-text-main text-sm font-semibold hover:bg-lord-green-dark transition-all shadow-sm"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create User
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-semibold">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-lord-green" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-lord-border shadow-sm">
              <p className="text-lord-text-muted text-[13.5px] font-semibold uppercase tracking-wider">Total Users</p>
              <h3 className="text-3xl font-black text-lord-text-main mt-2">{stats?.totalUsers ?? 0}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-lord-border shadow-sm">
              <p className="text-lord-text-muted text-[13.5px] font-semibold uppercase tracking-wider">Total Workflows</p>
              <h3 className="text-3xl font-black text-lord-text-main mt-2">{stats?.totalWorkflows ?? 0}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-lord-border shadow-sm">
              <p className="text-lord-text-muted text-[13.5px] font-semibold uppercase tracking-wider">Total Comments</p>
              <h3 className="text-3xl font-black text-lord-text-main mt-2">{stats?.totalComments ?? 0}</h3>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-lord-border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-lord-border bg-lord-card text-xs font-bold text-lord-text-muted uppercase tracking-wider">
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Workflows</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lord-border text-sm">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-lord-bg transition-colors">
                      <td className="px-5 py-4 align-middle font-bold text-lord-text-main">{u.firstName} {u.lastName}</td>
                      <td className="px-5 py-4 align-middle text-lord-text-muted">{u.email}</td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <span className={`px-3.5 py-1.5 rounded-full border text-[13px] font-bold ${
                          u.role === 'admin' 
                            ? 'bg-lord-teal/10 text-lord-teal border-lord-teal/20' 
                            : 'bg-lord-green-light text-lord-green-dark border-lord-green-dark/20'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle font-bold text-lord-text-main">{u.workflowCount}</td>
                      <td className="px-5 py-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link
                            href={`/admin/users/${u.id}/edit`}
                            className="px-3.5 py-2 rounded-xl bg-lord-card border border-lord-border text-lord-text-main text-[13px] font-bold hover:bg-lord-bg transition-colors shadow-sm"
                            title="Edit user details"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="px-3.5 py-2 rounded-xl bg-lord-green text-lord-text-main text-[13px] font-bold hover:bg-lord-green-dark transition-colors shadow-sm"
                            title="View user details and link workflows"
                          >
                            View
                          </Link>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => setDeleteUserId(u.id)}
                              className="px-3.5 py-2 rounded-xl bg-red-50 border border-red-200/60 text-red-600 text-[13px] font-bold hover:bg-red-100 transition-colors shadow-sm"
                              title="Delete user"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteUserId && (
        <DeleteConfirmModal
          title="Delete User Account"
          message="Are you sure you want to delete this user? All their workflows and comments will be permanently deleted."
          onConfirm={confirmDeleteUser}
          onCancel={() => setDeleteUserId(null)}
        />
      )}
    </div>
  );
}

function DeleteConfirmModal({ title, message, onConfirm, onCancel }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-lord-border p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
          </svg>
        </div>
        <div className="space-y-1.5 text-left">
          <h3 className="text-base font-bold text-lord-text-main">{title || 'Confirm Action'}</h3>
          <p className="text-xs text-lord-text-muted leading-relaxed">
            {message || 'Are you sure you want to proceed?'}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-lord-border text-xs font-bold text-lord-text-muted hover:bg-lord-card transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
