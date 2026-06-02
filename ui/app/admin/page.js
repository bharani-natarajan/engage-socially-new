'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';
import { workflowApi } from '@/lib/workflowApi';
import { useAuth } from '@/lib/auth';

export default function AdminPage() {
  const { token, isAdmin } = useAuth();
  
  // States
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal / Form state for user creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'user' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Link workflows state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedWorkflows, setSelectedWorkflows] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    if (token && isAdmin) {
      loadData();
    }
  }, [token, isAdmin]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes, workflowsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.listUsers({ limit: 100 }),
        workflowApi.list()
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setWorkflows(workflowsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await adminApi.createUser(createUserForm);
      setShowCreateModal(false);
      setCreateUserForm({ firstName: '', lastName: '', email: '', phone: '', role: 'user' });
      loadData();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleLinkWorkflows(e) {
    e.preventDefault();
    if (!selectedUser || selectedWorkflows.length === 0) return;
    setLinkError('');
    setLinkLoading(true);
    try {
      await adminApi.linkWorkflows(selectedUser.id, selectedWorkflows);
      setShowLinkModal(false);
      setSelectedWorkflows([]);
      setSelectedUser(null);
      loadData();
    } catch (err) {
      setLinkError(err.message);
    } finally {
      setLinkLoading(false);
    }
  }

  function toggleWorkflowSelection(wfId) {
    setSelectedWorkflows(prev => 
      prev.includes(wfId) ? prev.filter(id => id !== wfId) : [...prev, wfId]
    );
  }

  async function handleDeleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? All their workflows and comments will be deleted.')) return;
    try {
      await adminApi.deleteUser(userId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lord-green text-lord-text-main text-sm font-semibold hover:bg-lord-green-dark transition-all shadow-sm"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create User
        </button>
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
            <div className="px-6 py-4.5 border-b border-lord-border">
              <h2 className="font-bold text-lord-text-main text-[16px]">All Users</h2>
            </div>
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
                        <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${u.role === 'admin' ? 'bg-lord-teal/10 text-lord-teal border-lord-teal/20' : 'bg-lord-green-light text-lord-green-dark border-lord-green-dark/20'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle font-bold text-lord-text-main">{u.workflowCount}</td>
                      <td className="px-5 py-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => { setSelectedUser(u); setShowLinkModal(true); }}
                            className="px-3 py-1.5 rounded-xl bg-lord-green text-lord-text-main text-[13px] font-bold hover:bg-lord-green-dark transition-colors shadow-sm"
                          >
                            Link Workflows
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="px-3 py-1.5 rounded-xl bg-lord-red/10 text-red-600 text-[13px] font-bold hover:bg-lord-red/30 hover:text-red-700 transition-colors border border-lord-red/20 shadow-sm"
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

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-lord-border shadow-xl">
            <h2 className="text-xl font-bold text-lord-text-main mb-4">Create User Account</h2>
            {createError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">{createError}</div>}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-lord-text-muted mb-1 uppercase tracking-wider">First Name</label>
                  <input
                    required
                    value={createUserForm.firstName}
                    onChange={e => setCreateUserForm(p => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-lord-border focus:border-lord-green focus:outline-none text-[14px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-lord-text-muted mb-1 uppercase tracking-wider">Last Name</label>
                  <input
                    required
                    value={createUserForm.lastName}
                    onChange={e => setCreateUserForm(p => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-lord-border focus:border-lord-green focus:outline-none text-[14px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-lord-text-muted mb-1 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={createUserForm.email}
                  onChange={e => setCreateUserForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-lord-border focus:border-lord-green focus:outline-none text-[14px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-lord-text-muted mb-1 uppercase tracking-wider">Phone</label>
                <input
                  type="tel"
                  value={createUserForm.phone}
                  onChange={e => setCreateUserForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-lord-border focus:border-lord-green focus:outline-none text-[14px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-lord-text-muted mb-1 uppercase tracking-wider">Role</label>
                <select
                  value={createUserForm.role}
                  onChange={e => setCreateUserForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-lord-border focus:border-lord-green focus:outline-none text-[14px] bg-white font-semibold text-lord-text-main"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-lord-border rounded-full text-[13.5px] font-bold text-lord-text-muted hover:bg-lord-card/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-lord-green text-white font-bold rounded-full text-[13.5px] disabled:opacity-50 hover:bg-lord-green-dark"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINK WORKFLOWS MODAL */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-lord-border shadow-xl">
            <h2 className="text-xl font-bold text-lord-text-main mb-2">Link Workflows</h2>
            <p className="text-lord-text-muted text-[13.5px] mb-4">Select workflows to assign to <strong className="text-lord-text-main">{selectedUser?.firstName} {selectedUser?.lastName}</strong>.</p>
            
            {linkError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">{linkError}</div>}
            
            <form onSubmit={handleLinkWorkflows} className="space-y-4">
              <div className="max-h-60 overflow-y-auto border border-lord-border rounded-2xl divide-y divide-lord-border p-2 bg-lord-card/10">
                {workflows.map(wf => (
                  <label key={wf.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-lord-card/25 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedWorkflows.includes(wf.id)}
                      onChange={() => toggleWorkflowSelection(wf.id)}
                      className="w-4.5 h-4.5 accent-lord-green"
                    />
                    <div className="text-left">
                      <p className="text-[14px] font-bold text-lord-text-main leading-tight">{wf.name}</p>
                      <p className="text-[11px] font-semibold text-lord-text-muted capitalize mt-0.5">{wf.type} &bull; {wf.creatorName || wf.keyword}</p>
                    </div>
                  </label>
                ))}
                {workflows.length === 0 && (
                  <p className="text-center py-6 text-[13.5px] text-lord-text-muted">No workflows found</p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => { setShowLinkModal(false); setSelectedWorkflows([]); }}
                  className="px-4 py-2 border border-lord-border rounded-full text-[13.5px] font-bold text-lord-text-muted hover:bg-lord-card/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkLoading || selectedWorkflows.length === 0}
                  className="px-4 py-2 bg-lord-teal text-white font-bold rounded-full text-[13.5px] disabled:opacity-50 hover:bg-lord-teal-dark"
                >
                  {linkLoading ? 'Linking...' : 'Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
