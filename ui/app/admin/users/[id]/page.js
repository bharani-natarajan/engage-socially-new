'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';
import { useAuth } from '@/lib/auth';
import ActionLoader from '@/components/ActionLoader';

export default function ViewUserPage({ params }) {
  const { id } = use(params);
  const { token, isAdmin, loading: authLoading } = useAuth();

  const [userData, setUserData] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && isAdmin && id) {
      loadData();
    }
  }, [token, isAdmin, id]);

  async function loadData() {
    setFetching(true);
    setError('');
    try {
      const userRes = await adminApi.getUser(id);
      setUserData(userRes.data);
    } catch (err) {
      setError(`Failed to load details: ${err.message}`);
    } finally {
      setFetching(false);
    }
  }

  if (authLoading || fetching) {
    return <ActionLoader message="Loading user details..." />;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-red-600 font-semibold bg-red-50 rounded-2xl border border-red-200">
        Access Denied. Admin privileges required.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Back Link */}
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
          <h1 className="text-xl font-bold text-lord-text-main">User Account Profile</h1>
          <p className="text-xs text-lord-text-muted mt-0.5">View user settings and their active workflow configurations</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      {userData && (
        <div className="space-y-6">
          {/* Profile Overview */}
          <div className="bg-white border border-lord-border rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-lord-text-main mb-4">Account Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13.5px]">
              <div>
                <span className="block text-[11px] font-bold text-lord-text-muted uppercase tracking-wider">Full Name</span>
                <span className="font-bold text-lord-text-main mt-1 block">{userData.firstName} {userData.lastName}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-lord-text-muted uppercase tracking-wider">Email Address</span>
                <span className="font-semibold text-lord-text-main mt-1 block truncate">{userData.email}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-lord-text-muted uppercase tracking-wider">Phone</span>
                <span className="font-semibold text-lord-text-main mt-1 block">{userData.phone || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-lord-text-muted uppercase tracking-wider">Role</span>
                <span className="font-bold text-lord-teal mt-1 block capitalize">{userData.role}</span>
              </div>
            </div>
          </div>

          {/* Workflow List Section */}
          <div className="bg-white border border-lord-border rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-lord-text-main">Assigned Workflows ({userData.workflows?.length ?? 0})</h2>
              <p className="text-xs text-lord-text-muted mt-0.5">Workflows running under this user's account</p>
            </div>
            
            <div className="border border-lord-border rounded-2xl divide-y divide-lord-border overflow-hidden bg-lord-card/10">
              {(userData.workflows ?? []).map(wf => (
                <div key={wf.id} className="flex items-center justify-between px-4 py-3 bg-white">
                  <div className="text-left">
                    <p className="text-[14px] font-bold text-lord-text-main leading-tight">{wf.name}</p>
                    <p className="text-[11px] font-semibold text-lord-text-muted capitalize mt-0.5">
                      {wf.type} &bull; {wf.creatorName || wf.keyword}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full bg-lord-bg border border-lord-border/40 text-[11px] font-bold text-lord-text-muted">
                      {wf._count?.comments ?? 0} Comments
                    </span>
                  </div>
                </div>
              ))}
              {(userData.workflows ?? []).length === 0 && (
                <p className="text-center py-8 text-[13.5px] text-lord-text-muted bg-white">No active workflows assigned to this user</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-lord-border/40">
              <Link
                href="/admin"
                className="px-6 py-2.5 bg-lord-green text-lord-text-main font-bold rounded-full text-[13.5px] hover:bg-lord-green-dark transition-colors shadow-sm"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
