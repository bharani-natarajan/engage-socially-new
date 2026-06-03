'use client';

import { use, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { workflowApi } from '@/lib/workflowApi';
import ActionLoader from '@/components/ActionLoader';
import { useAuth } from '@/lib/auth';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getScheduledTime(userTimezone) {
  try {
    const now = new Date();
    const localStr = now.toLocaleString('sv-SE', { timeZone: userTimezone });
    const utcStr = now.toLocaleString('sv-SE', { timeZone: 'UTC' });
    const currentHour = parseInt(localStr.split(' ')[1]?.split(':')[0] ?? '12');

    let targetHour, addDays = 0;
    if (currentHour >= 21) {
      addDays = 1;
      targetHour = 9 + Math.floor(Math.random() * 12);
    } else if (currentHour < 9) {
      targetHour = 9 + Math.floor(Math.random() * 12);
    } else {
      const minH = currentHour + 1;
      if (minH >= 21) { addDays = 1; targetHour = 9 + Math.floor(Math.random() * 12); }
      else targetHour = minH + Math.floor(Math.random() * (21 - minH));
    }
    const targetMin = Math.floor(Math.random() * 60);

    const localNow = new Date(localStr.replace(' ', 'T'));
    const utcNow = new Date(utcStr.replace(' ', 'T'));
    const offsetMinutes = (localNow.getTime() - utcNow.getTime()) / 60000;

    const totalTargetMin = targetHour * 60 + targetMin - offsetMinutes;
    let utcH = Math.floor(totalTargetMin / 60);
    const utcM = Math.round(((totalTargetMin % 60) + 60) % 60);
    let dayAdj = 0;
    if (utcH < 0) { utcH += 24; dayAdj = -1; }
    if (utcH >= 24) { utcH -= 24; dayAdj = 1; }

    const result = new Date(now);
    result.setDate(result.getDate() + addDays + dayAdj);
    result.setUTCHours(utcH, utcM, 0, 0);
    return result.toISOString();
  } catch {
    return new Date(Date.now() + 3600 * 1000).toISOString();
  }
}

function formatScheduled(isoStr, timezone) {
  try {
    return new Date(isoStr).toLocaleString('en-US', {
      timeZone: timezone,
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return new Date(isoStr).toLocaleString();
  }
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending', cls: 'text-amber-800 border-amber-300 bg-amber-50' },
    approved: { label: 'Scheduling', cls: 'text-amber-700 border-amber-200 bg-amber-50/50 animate-pulse' },
    scheduled: { label: 'Scheduled', cls: 'text-[#0A66C2] border-[#0A66C2]/20 bg-[#0A66C2]/5' },
    posting: { label: 'Posting...', cls: 'text-teal-700 border-teal-300 bg-teal-50 animate-pulse' },
    posted: { label: 'Posted', cls: 'text-emerald-700 border-emerald-300 bg-emerald-50' },
    failed: { label: 'Failed', cls: 'text-red-700 border-red-300 bg-red-50' },
    rejected: { label: 'Rejected', cls: 'text-red-700 border-red-300 bg-red-50' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[13px] font-bold ${s.cls}`}>
      {s.label}
    </span>
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
        <div className="space-y-1.5">
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

function CommentCard({ comment, timezone, onApprove, onPostNow, onDelete, isPosting }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (comment.postText?.length ?? 0) > 160;
  const displayText = isLong && !expanded ? (comment.postText?.slice(0, 160) + '…') : comment.postText;

  return (
    <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm p-5 space-y-4">
      {/* Post author + status */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {comment.postAuthor?.[0]?.toUpperCase() ?? 'L'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-lord-text-main leading-tight">{comment.postAuthor}</p>
          {comment.postAuthorHeadline && (
            <p className="text-[11px] text-lord-text-muted truncate mt-0.5">{comment.postAuthorHeadline}</p>
          )}
          <p className="text-[12px] text-lord-text-muted mt-1.5 leading-relaxed">{displayText}</p>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-lord-green font-semibold mt-0.5 hover:underline">
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={comment.status} />
          <button onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 text-lord-text-muted hover:text-lord-red transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="border-t border-lord-border/60" />

      {/* Generated comment */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-lord-text-muted uppercase tracking-widest">Your comment</p>
        <p className="text-sm text-lord-text-main leading-relaxed bg-white rounded-xl border border-lord-border px-4 py-3">
          {comment.commentText}
        </p>
      </div>

      {/* Scheduled / posted info */}
      {(comment.status === 'approved' || comment.status === 'scheduled') && comment.scheduledAt && (
        <div className="flex items-center gap-1.5 text-[12px] text-[#0A66C2] font-medium">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Scheduled for {formatScheduled(comment.scheduledAt, timezone)}
        </div>
      )}
      {comment.status === 'posted' && comment.postedAt && (
        <p className="text-[12px] text-lord-green font-semibold flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Posted {timeAgo(comment.postedAt)}
        </p>
      )}
      {comment.status === 'failed' && comment.errorMessage && (
        <p className="text-[12px] text-lord-red font-medium">Error: {comment.errorMessage}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {comment.postUrl && (
          <a href={comment.postUrl} target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full border border-lord-border text-[12px] font-semibold text-lord-text-muted hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors">
            View Post ↗
          </a>
        )}
        {comment.status === 'pending' && (
          <button onClick={onApprove}
            className="px-4 py-1.5 rounded-full bg-lord-green text-white text-[12px] font-bold hover:bg-lord-green-dark transition-colors">
            Approve
          </button>
        )}
        {comment.status === 'approved' && (
          <button onClick={onPostNow} disabled={isPosting}
            className="px-4 py-1.5 rounded-full bg-[#0A66C2] text-white text-[12px] font-bold hover:bg-[#004182] transition-colors disabled:opacity-50">
            {isPosting ? 'Posting…' : 'Post Now'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function WorkflowCommentsPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [userId, setUserId] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [posting, setPosting] = useState({});
  const [timezone, setTimezone] = useState('UTC');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [expandedCommentId, setExpandedCommentId] = useState(null);
  const [deleteCommentId, setDeleteCommentId] = useState(null);

  const showActionLoader = (msg) => {
    setActionMessage(msg);
    setActionLoading(true);
  };
  const hideActionLoader = () => {
    setActionLoading(false);
    setActionMessage('');
  };

  // keep a ref so the auto-poster interval always sees the latest comments
  const commentsRef = useRef(comments);
  useEffect(() => { commentsRef.current = comments; }, [comments]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const currentUserId = user.id;
    setUserId(currentUserId);
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

    async function loadData() {
      try {
        // Run the scheduler job immediately for this workflow in background (do not block render)
        const brandContext = localStorage.getItem('setting_ai_context') ?? '';
        const tone = localStorage.getItem('setting_ai_tone') ?? 'professional';
        const avoid = localStorage.getItem('setting_ai_avoid') ?? '';
        workflowApi.run(currentUserId, id, { brandContext, tone, avoid })
          .catch(runErr => console.error('[Workflow Run Error]', runErr));

        const [wfRes, cmRes] = await Promise.all([
          workflowApi.list(currentUserId),
          workflowApi.listComments(currentUserId, id),
        ]);
        const wf = (wfRes.data ?? []).find(w => w.id === id);
        if (!wf) { router.push('/engage?tab=workflows'); return; }
        setWorkflow(wf);
        setComments(cmRes.data ?? []);
      } catch (err) {
        console.error(err);
        router.push('/engage?tab=workflows');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router, user, authLoading]);

  if (authLoading) {
    return <ActionLoader message="Loading account session..." />;
  }

  if (!user || !userId) {
    return null;
  }



  async function generateComments() {
    if (!workflow || !userId) return;
    setGenerating(true);
    setGenError('');

    try {
      // 1. Search LinkedIn
      const keyword = workflow.type === 'creator' ? workflow.creatorName : workflow.keyword;
      const res = await fetch('/api/linkedin/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keyword, datePosted: 'past_week' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      let posts = data.data ?? [];

      // 2. Filter posts
      const existingPostIds = new Set(comments.map(c => c.postId));

      if (workflow.type === 'creator') {
        const slug = workflow.creatorIdentifier;
        posts = posts.filter(p =>
          p.author?.profile_url?.toLowerCase().includes(slug.toLowerCase())
        );
        const today = new Date().toISOString().slice(0, 10);
        const alreadyToday = comments.some(c =>
          (c.status === 'posted' || c.status === 'approved') &&
          c.createdAt?.slice(0, 10) === today
        );
        if (alreadyToday) {
          throw new Error('Already have a comment scheduled or posted for this creator today. Come back tomorrow.');
        }
        posts = posts.filter(p => !existingPostIds.has(p.id)).slice(0, 1);
      } else {
        // Count existing active (non-rejected, non-failed, non-posted) comments
        const activeCount = comments.filter(c => ['pending', 'approved', 'scheduled', 'posting'].includes(c.status)).length;
        const remaining = Math.max(0, (workflow.commentsPerDay || 20) - activeCount);
        posts = posts.filter(p => !existingPostIds.has(p.id)).slice(0, remaining);
      }

      if (!posts.length) {
        throw new Error('No new posts found. Try again later for fresh posts.');
      }

      // 3. Generate AI comments in parallel
      const brandContext = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_ai_context') ?? '') : '';
      const tone = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_ai_tone') ?? 'professional') : 'professional';
      const avoid = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_ai_avoid') ?? '') : '';

      const newComments = (await Promise.all(
        posts.map(async (post) => {
          try {
            const aiRes = await fetch('/api/linkedin/ai-comment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                postText: post.text,
                authorName: post.author?.name,
                brandContext, tone, avoid,
                commentLength: workflow.commentLength || 'medium',
              }),
            });
            const aiData = await aiRes.json();
            if (!aiRes.ok) throw new Error(aiData.error || 'AI failed');

            return {
              postId: post.id,
              postText: post.text?.slice(0, 220) ?? '',
              postAuthor: post.author?.name ?? 'LinkedIn Member',
              postAuthorHeadline: post.author?.headline ?? '',
              postUrl: post.share_url ?? null,
              commentText: aiData.suggestion,
              status: 'pending',
              scheduledAt: null,
            };
          } catch (err) {
            console.error('[AI comment gen failed]', err.message);
            return null;
          }
        })
      )).filter(Boolean);

      if (!newComments.length) throw new Error('Failed to generate any comments. Try again.');

      // 4. Save via API
      const saved = await workflowApi.addComments(userId, id, newComments);
      setComments(prev => [...(saved.data ?? []), ...prev]);

      // 5. Update workflow metadata
      const now = new Date().toISOString();
      await workflowApi.update(userId, id, {
        lastRunAt: now,
        commentsGenerated: (workflow.commentsGenerated ?? 0) + newComments.length,
      });
      setWorkflow(wf => wf ? {
        ...wf,
        lastRunAt: now,
        commentsGenerated: (wf.commentsGenerated ?? 0) + newComments.length,
      } : wf);

    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function approveComment(commentId) {
    if (!userId) return;
    try {
      showActionLoader('Approving & Scheduling Comment...');
      const scheduledAt = getScheduledTime(timezone);
      await workflowApi.updateComment(userId, commentId, { status: 'scheduled', scheduledAt });
      router.push('/engage?tab=comments&subtab=scheduled');
    } catch (err) {
      console.error(err);
    } finally {
      hideActionLoader();
    }
  }

  async function postNow(commentId) {
    if (!userId) return;
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    try {
      showActionLoader('Posting to LinkedIn...');
      const res = await fetch('/api/linkedin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: comment.postId, message: comment.commentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post');
      const postedAt = new Date().toISOString();
      await workflowApi.updateComment(userId, commentId, { status: 'posted', postedAt });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'posted', postedAt } : c));
    } catch (err) {
      await workflowApi.updateComment(userId, commentId, { status: 'failed', errorMessage: err.message });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'failed', errorMessage: err.message } : c));
    } finally {
      hideActionLoader();
    }
  }

  function deleteComment(commentId) {
    setDeleteCommentId(commentId);
  }

  async function confirmDeleteComment() {
    if (!deleteCommentId || !userId) return;
    const commentId = deleteCommentId;
    setDeleteCommentId(null);
    try {
      showActionLoader('Rejecting Comment...');
      await workflowApi.updateComment(userId, commentId, { status: 'rejected' });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'rejected' } : c));
    } catch (err) {
      console.error(err);
    } finally {
      hideActionLoader();
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin text-lord-text-muted" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  );

  if (!workflow) return null;

  const pending = comments.filter(c => c.status === 'pending').length;
  const scheduled = comments.filter(c => c.status === 'approved' || c.status === 'scheduled').length;
  const posted = comments.filter(c => c.status === 'posted').length;

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-140px)]">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 shrink-0 bg-white border border-lord-border rounded-3xl p-5 shadow-sm space-y-2 h-fit">
        <h2 className="text-[10px] font-bold text-lord-text-muted uppercase tracking-wider px-3.5 mb-4">
          Workflow Menu
        </h2>
        {[
          {
            id: 'analytics',
            label: 'Analytics',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="17" x2="9" y2="9" /><line x1="15" y1="17" x2="15" y2="13" />
              </svg>
            )
          },
          {
            id: 'workflows',
            label: 'Workflows',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            )
          },
          {
            id: 'comments',
            label: 'Comments',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            )
          },
          {
            id: 'engage',
            label: 'Search & Engage',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )
          }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(`/engage?tab=${item.id}`)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${item.id === 'workflows'
              ? 'bg-lord-green text-lord-text-main shadow-sm'
              : 'text-lord-text-muted hover:bg-lord-card hover:text-lord-text-main'
              }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/engage?tab=workflows')}
            className="mt-1 p-2 rounded-xl hover:bg-lord-card transition-colors text-lord-text-muted flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-lord-text-main">{workflow.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${workflow.type === 'keyword'
                  ? 'bg-lord-teal/10 text-lord-teal border-lord-teal/20'
                  : 'bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20'
                }`}>
                {workflow.type === 'keyword' ? '# Keyword' : '👤 Creator'}
              </span>
            </div>
            <p className="text-sm text-lord-text-muted mt-0.5">
              {workflow.type === 'keyword'
                ? <>Keyword: <span className="font-semibold text-lord-text-main">"{workflow.keyword}"</span></>
                : <>Creator: <span className="font-semibold text-lord-text-main">{workflow.creatorName}</span></>
              }
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending Approval', value: pending, color: 'text-lord-orange' },
            { label: 'Scheduled', value: scheduled, color: 'text-[#0A66C2]' },
            { label: 'Posted', value: posted, color: 'text-lord-green' },
          ].map(s => (
            <div key={s.label} className="bg-lord-card rounded-2xl border border-lord-border p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-lord-text-muted mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {genError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600">{genError}</div>
        )}

        {/* Empty state */}
        {comments.length === 0 && !generating && (
          <div className="bg-lord-card rounded-2xl border border-lord-border p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white border border-lord-border flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-lord-text-main">No comments yet</p>
            <p className="text-xs text-lord-text-muted mt-1">The background scheduler will automatically fetch LinkedIn posts and generate comment drafts.</p>
          </div>
        )}

        {/* Comments list */}
        {comments.length > 0 && (
          <div className="bg-white border border-lord-border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-lord-border bg-lord-card text-xs font-bold text-lord-text-muted uppercase tracking-wider">
                    <th className="px-5 py-4">Target Post</th>
                    <th className="px-5 py-4">Draft Comment</th>
                    <th className="px-5 py-4 text-center">Scheduled For</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lord-border text-sm">
                  {comments.map(c => {
                    const isExpanded = expandedCommentId === c.id;
                    const shortComment = c.commentText.slice(0, 80);
                    const isLong = c.commentText.length > 80;

                    return (
                      <tr key={c.id} className="hover:bg-lord-bg transition-colors">
                        <td className="px-5 py-4 align-top max-w-[220px]">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-6 h-6 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {c.postAuthor?.[0]?.toUpperCase() ?? 'L'}
                            </div>
                            <p className="font-bold text-lord-text-main truncate text-sm">@{c.postAuthor}</p>
                          </div>
                          <p className="text-[13px] text-lord-text-muted line-clamp-3 leading-relaxed">{c.postText}</p>
                          {c.postUrl && (
                            <a
                              href={c.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-blue-50 text-[#0A66C2] hover:bg-blue-100 border border-blue-100/50 font-bold text-[13px] transition-colors shadow-sm mt-2 inline-flex items-center gap-0.5"
                            >
                              View Post ↗
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top max-w-[320px]">
                          <div className="bg-lord-bg/30 rounded-xl border border-lord-border px-3.5 py-2.5">
                            <p className="text-[13px] text-lord-text-main leading-relaxed">
                              {isExpanded || !isLong ? c.commentText : `${shortComment}…`}
                            </p>
                            {isLong && (
                              <button
                                onClick={() => setExpandedCommentId(isExpanded ? null : c.id)}
                                className="text-[12px] text-lord-teal font-bold hover:underline mt-1.5 block"
                              >
                                {isExpanded ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle whitespace-nowrap text-sm text-lord-teal font-bold text-center">
                          {c.scheduledAt ? (
                            formatScheduled(c.scheduledAt, timezone)
                          ) : c.status === 'approved' ? (
                            <span className="text-amber-600 font-semibold animate-pulse text-[13px]">Scheduling...</span>
                          ) : c.postedAt ? (
                            <span className="text-emerald-700 font-semibold text-[13px]">Posted {timeAgo(c.postedAt)}</span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-5 py-4 align-middle whitespace-nowrap text-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <StatusBadge status={c.status} />
                            {c.status === 'failed' && c.errorMessage && (
                              <p className="text-[12px] text-lord-red font-semibold leading-tight max-w-[150px] truncate mx-auto" title={c.errorMessage}>
                                Error: {c.errorMessage}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {c.status === 'pending' && (
                              <button
                                onClick={() => approveComment(c.id)}
                                className="px-3.5 py-2 rounded-xl bg-lord-green text-lord-text-main text-[13px] font-bold hover:bg-lord-green-dark transition-colors shadow-sm"
                              >
                                Approve
                              </button>
                            )}
                            {(c.status === 'approved' || c.status === 'scheduled') && (
                              <button
                                onClick={() => postNow(c.id)}
                                disabled={!!posting[c.id]}
                                className="px-3.5 py-2 rounded-xl bg-[#0A66C2] text-white text-[13px] font-bold hover:bg-[#004182] transition-colors disabled:opacity-50 shadow-sm"
                              >
                                {posting[c.id] ? 'Posting' : 'Post Now'}
                              </button>
                            )}
                            <button
                              onClick={() => deleteComment(c.id)}
                              className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 text-[13px] font-bold transition-colors shadow-sm"
                              title="Reject and delete"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {deleteCommentId && (
        <DeleteConfirmModal
          title="Reject Comment"
          message="Are you sure you want to reject this comment draft?"
          onConfirm={confirmDeleteComment}
          onCancel={() => setDeleteCommentId(null)}
        />
      )}

      {actionLoading && <ActionLoader message={actionMessage} />}
    </div>
  );
}


