'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { workflowApi } from '@/lib/workflowApi';

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
    pending:  { label: 'Pending',   cls: 'text-lord-orange border-lord-orange/40 bg-lord-orange/5' },
    approved: { label: 'Scheduled', cls: 'text-[#0A66C2] border-[#0A66C2]/30 bg-[#0A66C2]/5' },
    posted:   { label: 'Posted',    cls: 'text-lord-green border-lord-green/40 bg-lord-green/5' },
    failed:   { label: 'Failed',    cls: 'text-lord-red border-lord-red/40 bg-lord-red/5' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
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
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
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
      {comment.status === 'approved' && comment.scheduledAt && (
        <div className="flex items-center gap-1.5 text-[12px] text-[#0A66C2] font-medium">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Scheduled for {formatScheduled(comment.scheduledAt, timezone)}
        </div>
      )}
      {comment.status === 'posted' && comment.postedAt && (
        <p className="text-[12px] text-lord-green font-semibold flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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

  const [userId, setUserId] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [posting, setPosting] = useState({});
  const [timezone, setTimezone] = useState('UTC');

  // keep a ref so the auto-poster interval always sees the latest comments
  const commentsRef = useRef(comments);
  useEffect(() => { commentsRef.current = comments; }, [comments]);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    fetch('/api/me')
      .then(r => r.json())
      .then(async d => {
        if (!d.userId) { router.push('/engage?tab=workflows'); return; }
        setUserId(d.userId);
        const [wfRes, cmRes] = await Promise.all([
          workflowApi.list(d.userId),
          workflowApi.listComments(d.userId, id),
        ]);
        const wf = (wfRes.data ?? []).find(w => w.id === id);
        if (!wf) { router.push('/engage?tab=workflows'); return; }
        setWorkflow(wf);
        setComments(cmRes.data ?? []);
      })
      .catch(() => router.push('/engage?tab=workflows'))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Auto-post: check every 30 s for approved comments whose scheduled time has passed
  useEffect(() => {
    if (!userId) return;
    const tick = setInterval(async () => {
      const now = new Date();
      const due = commentsRef.current.filter(c =>
        c.status === 'approved' &&
        c.scheduledAt &&
        new Date(c.scheduledAt) <= now
      );
      if (!due.length) return;

      for (const c of due) {
        setPosting(p => ({ ...p, [c.id]: true }));
        try {
          const res = await fetch('/api/linkedin/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: c.postId, message: c.commentText }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Post failed');
          const postedAt = new Date().toISOString();
          await workflowApi.updateComment(userId, c.id, { status: 'posted', postedAt });
          setComments(prev => prev.map(x => x.id === c.id ? { ...x, status: 'posted', postedAt } : x));
        } catch (err) {
          await workflowApi.updateComment(userId, c.id, { status: 'failed', errorMessage: err.message });
          setComments(prev => prev.map(x => x.id === c.id ? { ...x, status: 'failed', errorMessage: err.message } : x));
        } finally {
          setPosting(p => ({ ...p, [c.id]: false }));
        }
      }
    }, 30_000);
    return () => clearInterval(tick);
  }, [userId]);

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
        posts = posts.filter(p => !existingPostIds.has(p.id)).slice(0, 10);
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
            };
          } catch { return null; }
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
    const scheduledAt = getScheduledTime(timezone);
    await workflowApi.updateComment(userId, commentId, { status: 'approved', scheduledAt });
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'approved', scheduledAt } : c));
  }

  async function postNow(commentId) {
    if (!userId) return;
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    setPosting(p => ({ ...p, [commentId]: true }));
    try {
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
      setPosting(p => ({ ...p, [commentId]: false }));
    }
  }

  async function deleteComment(commentId) {
    if (!userId) return;
    await workflowApi.removeComment(userId, commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin text-lord-text-muted" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    </div>
  );

  if (!workflow) return null;

  const pending   = comments.filter(c => c.status === 'pending').length;
  const scheduled = comments.filter(c => c.status === 'approved').length;
  const posted    = comments.filter(c => c.status === 'posted').length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push('/engage?tab=workflows')}
          className="mt-1 p-2 rounded-xl hover:bg-lord-card transition-colors text-lord-text-muted flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-lord-text-main">{workflow.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
              workflow.type === 'keyword'
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
        <button
          onClick={generateComments}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A66C2] text-white text-[13px] font-semibold hover:bg-[#004182] transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {generating ? (
            <>
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Generating…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Generate Comments
            </>
          )}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Approval', value: pending,   color: 'text-lord-orange' },
          { label: 'Scheduled',        value: scheduled, color: 'text-[#0A66C2]'  },
          { label: 'Posted',           value: posted,    color: 'text-lord-green'  },
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

      {/* Scheduling notice */}
      {scheduled > 0 && (
        <div className="p-3.5 rounded-xl bg-[#0A66C2]/5 border border-[#0A66C2]/15 flex items-start gap-2.5">
          <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <p className="text-[12px] text-[#0A66C2] font-medium">
            {scheduled} comment{scheduled !== 1 ? 's' : ''} scheduled. Keep this tab open — auto-posting checks every 30 seconds.
          </p>
        </div>
      )}

      {/* Workflow type rule */}
      <div className="p-3.5 rounded-xl bg-lord-card border border-lord-border flex items-start gap-2.5">
        <svg className="mt-0.5 flex-shrink-0 text-lord-text-muted" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[12px] text-lord-text-muted">
          {workflow.type === 'keyword'
            ? 'Keyword workflow: up to 10 comments per run, max 1 comment per post, posted at random times between 9 AM–9 PM in your timezone.'
            : 'Creator workflow: 1 comment per day, posted at a random time between 9 AM–9 PM in your timezone.'}
        </p>
      </div>

      {/* Empty state */}
      {comments.length === 0 && !generating && (
        <div className="bg-lord-card rounded-2xl border border-lord-border p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-lord-border flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-lord-text-main">No comments yet</p>
          <p className="text-xs text-lord-text-muted mt-1">Click "Generate Comments" to search for posts and create AI-drafted comments</p>
        </div>
      )}

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              timezone={timezone}
              onApprove={() => approveComment(comment.id)}
              onPostNow={() => postNow(comment.id)}
              onDelete={() => deleteComment(comment.id)}
              isPosting={!!posting[comment.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
