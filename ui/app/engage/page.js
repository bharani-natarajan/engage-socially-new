'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { workflowApi } from '@/lib/workflowApi';

// ─── shared helpers ────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return '';
  const ms = typeof ts === 'number' ? (ts < 1e11 ? ts * 1000 : ts) : new Date(ts).getTime();
  if (isNaN(ms)) return '';
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 0) return '';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Search tab ────────────────────────────────────────────────────────────────

const DATE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: 'past_day', label: 'Past 24 h' },
  { value: 'past_week', label: 'Past week' },
  { value: 'past_month', label: 'Past month' },
];

function AuthorAvatar({ name, url }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  const inner = (
    <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
      {initial}
    </div>
  );
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{inner}</a> : inner;
}

function PostCard({ post }) {
  const [expanded, setExpanded] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState('');

  const isLong = post.text.length > 280;
  const displayText = isLong && !expanded ? post.text.slice(0, 280) + '…' : post.text;

  async function suggestComment() {
    setAiLoading(true); setError('');
    try {
      const res = await fetch('/api/instagram/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText: post.text,
          username: post.author.name,
          postCaption: post.text,
          brandContext: localStorage.getItem('setting_ai_context') ?? '',
          tone: localStorage.getItem('setting_ai_tone') ?? 'professional',
          avoid: localStorage.getItem('setting_ai_avoid') ?? '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI failed');
      setCommentText(data.suggestion);
    } catch (err) { setError(err.message); }
    finally { setAiLoading(false); }
  }

  async function postComment() {
    if (!commentText.trim()) return;
    setPosting(true); setError('');
    try {
      const res = await fetch('/api/linkedin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, message: commentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');
      setPosted(true); setCommenting(false); setCommentText('');
    } catch (err) { setError(err.message); }
    finally { setPosting(false); }
  }

  return (
    <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm p-5 space-y-3">
      <div className="flex items-start gap-3">
        <AuthorAvatar name={post.author.name} url={post.author.profile_url} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {post.author.profile_url ? (
              <a href={post.author.profile_url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold text-lord-text-main hover:text-[#0A66C2] transition-colors">
                {post.author.name}
              </a>
            ) : (
              <span className="text-sm font-semibold text-lord-text-main">{post.author.name}</span>
            )}
            {post.timestamp && <span className="text-xs text-lord-text-muted">{timeAgo(post.timestamp)}</span>}
          </div>
          {post.author.headline && <p className="text-xs text-lord-text-muted truncate">{post.author.headline}</p>}
        </div>
        {post.share_url && (
          <a href={post.share_url} target="_blank" rel="noopener noreferrer"
            className="text-lord-text-muted hover:text-[#0A66C2] flex-shrink-0 transition-colors" title="View on LinkedIn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        )}
      </div>
      <div>
        <p className="text-sm text-lord-text-main leading-relaxed whitespace-pre-wrap">{displayText}</p>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-lord-green font-semibold mt-1 hover:underline">
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      {post.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.media_url} alt="" className="w-full rounded-xl object-cover max-h-60" />
      )}
      <div className="flex items-center justify-between pt-1 border-t border-lord-border/50">
        <div className="flex items-center gap-4 text-xs text-lord-text-muted">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f43f5e"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {(post.reaction_count ?? 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {(post.comment_count ?? 0).toLocaleString()}
          </span>
        </div>
        {posted ? (
          <span className="text-xs text-lord-green font-semibold flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Commented
          </span>
        ) : (
          <button onClick={() => setCommenting(!commenting)} className="text-xs font-semibold text-[#0A66C2] hover:underline">
            {commenting ? 'Cancel' : 'Comment'}
          </button>
        )}
      </div>
      {commenting && (
        <div className="space-y-2 pt-1">
          <textarea rows={3} value={commentText} onChange={e => setCommentText(e.target.value)}
            placeholder="Write a comment…"
            className="w-full rounded-xl border border-lord-border bg-white px-3 py-2 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 resize-none" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2 justify-end">
            <button onClick={suggestComment} disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-lord-green text-lord-green text-xs font-semibold hover:bg-lord-green hover:text-white transition-colors disabled:opacity-50">
              {aiLoading
                ? <><svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Generating…</>
                : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>AI Suggest</>}
            </button>
            <button onClick={postComment} disabled={posting || !commentText.trim()}
              className="px-4 py-1.5 rounded-full bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors disabled:opacity-40">
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchTab() {
  const [keywords, setKeywords] = useState('');
  const [datePosted, setDatePosted] = useState('');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function search(append = false) {
    if (!keywords.trim()) return;
    if (append) setLoadingMore(true);
    else { setLoading(true); setPosts([]); setCursor(null); }
    setError('');
    try {
      const res = await fetch('/api/linkedin/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywords.trim(), datePosted: datePosted || null, cursor: append ? cursor : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setPosts(prev => append ? [...prev, ...(data.data ?? [])] : (data.data ?? []));
      setCursor(data.cursor ?? null);
      setSearched(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setLoadingMore(false); }
  }

  return (
    <div className="space-y-5">
      <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="e.g. real estate Chennai, SaaS startup…"
              className="w-full rounded-xl border border-lord-border bg-white pl-9 pr-4 py-2.5 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30" />
          </div>
          <button onClick={() => search()} disabled={loading || !keywords.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] transition-colors disabled:opacity-40">
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-lord-text-muted font-medium">Date:</span>
          {DATE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setDatePosted(opt.value)}
              className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                datePosted === opt.value
                  ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                  : 'bg-white text-lord-text-muted border-lord-border hover:border-[#0A66C2]/40'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-lord-card rounded-2xl border border-lord-border p-5 space-y-3">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                  <div className="h-2.5 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 bg-gray-200 rounded animate-pulse" />
                <div className="h-2.5 bg-gray-200 rounded animate-pulse w-4/5" />
                <div className="h-2.5 bg-gray-200 rounded animate-pulse w-3/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length > 0 && (
        <>
          <p className="text-xs text-lord-text-muted font-medium">{posts.length} posts found</p>
          <div className="space-y-4">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
          {cursor && (
            <div className="flex justify-center pt-2">
              <button onClick={() => search(true)} disabled={loadingMore}
                className="px-6 py-2.5 rounded-full border border-lord-border text-sm font-semibold text-lord-text-main hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors disabled:opacity-50">
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {!loading && searched && posts.length === 0 && !error && (
        <div className="bg-lord-card rounded-2xl border border-lord-border p-12 text-center">
          <p className="text-sm font-semibold text-lord-text-main">No posts found</p>
          <p className="text-xs text-lord-text-muted mt-1">Try different keywords or a wider date range</p>
        </div>
      )}
    </div>
  );
}

// ─── Workflows tab ─────────────────────────────────────────────────────────────

const WORKFLOW_TYPES = [
  {
    id: 'keyword',
    label: 'Keyword',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    desc: 'Comment on LinkedIn posts that match a keyword. Up to 10 comments per run.',
  },
  {
    id: 'creator',
    label: 'Creator',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    desc: 'Comment on posts by a specific LinkedIn creator. 1 comment per day.',
  },
];

function WorkflowCard({ workflow, commentCount, onDelete, onOpen }) {
  return (
    <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          workflow.type === 'keyword' ? 'bg-lord-teal/10 text-lord-teal' : 'bg-[#0A66C2]/10 text-[#0A66C2]'
        }`}>
          {workflow.type === 'keyword' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-bold text-lord-text-main">{workflow.name}</h3>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
              workflow.type === 'keyword'
                ? 'bg-lord-teal/10 text-lord-teal border-lord-teal/20'
                : 'bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20'
            }`}>
              {workflow.type === 'keyword' ? 'Keyword' : 'Creator'}
            </span>
          </div>
          <p className="text-[12px] text-lord-text-muted mt-0.5 truncate">
            {workflow.type === 'keyword'
              ? <>Keyword: <span className="font-medium text-lord-text-main">"{workflow.keyword}"</span></>
              : <>Creator: <span className="font-medium text-lord-text-main">{workflow.creatorName}</span></>
            }
          </p>
        </div>
        <button onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 text-lord-text-muted hover:text-lord-red transition-colors flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-[12px] text-lord-text-muted">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {commentCount} comment{commentCount !== 1 ? 's' : ''}
          </span>
          {workflow.lastRunAt && (
            <span>Last run {timeAgo(workflow.lastRunAt)}</span>
          )}
        </div>
        <button onClick={onOpen}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0A66C2] text-white text-[12px] font-semibold hover:bg-[#004182] transition-colors">
          View Comments
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function CreateWorkflowModal({ onClose, onCreate }) {
  const [step, setStep] = useState(1); // 1 = name+type, 2 = details
  const [name, setName] = useState('');
  const [type, setType] = useState('keyword');
  const [keyword, setKeyword] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorUrl, setCreatorUrl] = useState('');
  const [error, setError] = useState('');

  function next() {
    if (!name.trim()) { setError('Please enter a workflow name.'); return; }
    setError('');
    setStep(2);
  }

  function save() {
    setError('');
    if (type === 'keyword' && !keyword.trim()) { setError('Please enter a keyword.'); return; }
    if (type === 'creator') {
      if (!creatorName.trim()) { setError('Please enter the creator\'s name.'); return; }
      if (!creatorUrl.trim()) { setError('Please enter the creator\'s LinkedIn URL.'); return; }
    }

    const urlMatch = creatorUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
    const creatorIdentifier = urlMatch ? urlMatch[1] : creatorName.trim().toLowerCase().replace(/\s+/g, '-');

    onCreate({
      name: name.trim(),
      type,
      keyword: type === 'keyword' ? keyword.trim() : '',
      creatorName: type === 'creator' ? creatorName.trim() : '',
      creatorUrl: type === 'creator' ? creatorUrl.trim() : '',
      creatorIdentifier: type === 'creator' ? creatorIdentifier : '',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="px-6 pt-6 pb-4 border-b border-lord-border flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-lord-text-main">New Workflow</h2>
            <p className="text-[12px] text-lord-text-muted mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-lord-card transition-colors text-lord-text-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {step === 1 ? (
            <>
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-lord-text-main">Workflow name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                  placeholder="e.g. Real Estate Engagement"
                  autoFocus
                  className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-[13px] text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-lord-text-main">Workflow type</label>
                <div className="grid grid-cols-2 gap-3">
                  {WORKFLOW_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={`flex flex-col gap-2 text-left p-4 rounded-2xl border-2 transition-all ${
                        type === t.id
                          ? 'border-[#0A66C2] bg-[#0A66C2]/5'
                          : 'border-lord-border bg-white hover:border-[#0A66C2]/40'
                      }`}
                    >
                      <span className={`${type === t.id ? 'text-[#0A66C2]' : 'text-lord-text-muted'}`}>
                        {t.icon}
                      </span>
                      <span className={`text-[13px] font-bold ${type === t.id ? 'text-[#0A66C2]' : 'text-lord-text-main'}`}>
                        {t.label}
                      </span>
                      <span className="text-[11px] text-lord-text-muted leading-snug">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: details */}
              {type === 'keyword' ? (
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-lord-text-main">Keyword</label>
                  <p className="text-[12px] text-lord-text-muted">LinkedIn posts matching this keyword will be targeted.</p>
                  <input
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && save()}
                    placeholder="e.g. real estate Chennai"
                    autoFocus
                    className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-[13px] text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-lord-text-main">Creator name</label>
                    <input
                      type="text"
                      value={creatorName}
                      onChange={e => setCreatorName(e.target.value)}
                      placeholder="e.g. John Smith"
                      autoFocus
                      className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-[13px] text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-lord-text-main">LinkedIn profile URL</label>
                    <input
                      type="text"
                      value={creatorUrl}
                      onChange={e => setCreatorUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && save()}
                      placeholder="https://www.linkedin.com/in/john-smith/"
                      className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-[13px] text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30"
                    />
                    <p className="text-[11px] text-lord-text-muted">Used to identify and filter the creator's posts.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {error && <p className="text-[12px] text-red-500">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            {step === 2 && (
              <button onClick={() => { setStep(1); setError(''); }}
                className="px-4 py-2.5 rounded-xl border border-lord-border text-[13px] font-semibold text-lord-text-muted hover:border-lord-text-muted transition-colors">
                Back
              </button>
            )}
            <button
              onClick={step === 1 ? next : save}
              className="flex-1 py-2.5 rounded-xl bg-[#0A66C2] text-white text-[13px] font-bold hover:bg-[#004182] transition-colors"
            >
              {step === 1 ? 'Next →' : 'Create Workflow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowsTab() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.userId) {
          setUserId(d.userId);
          return workflowApi.list(d.userId);
        }
      })
      .then(res => { if (res) setWorkflows(res.data ?? []); })
      .catch(err => setApiError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(payload) {
    try {
      const res = await workflowApi.create(userId, payload);
      setWorkflows(prev => [res.data, ...prev]);
      setShowCreate(false);
    } catch (err) { setApiError(err.message); }
  }

  async function handleDelete(id) {
    try {
      await workflowApi.remove(userId, id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch (err) { setApiError(err.message); }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-lord-card rounded-2xl border border-lord-border p-5 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-lord-text-muted font-medium">
          {workflows.length === 0 ? 'No workflows yet' : `${workflows.length} workflow${workflows.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A66C2] text-white text-[13px] font-semibold hover:bg-[#004182] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Workflow
        </button>
      </div>

      {apiError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{apiError}</div>
      )}

      {/* Empty state */}
      {workflows.length === 0 && !apiError && (
        <div className="bg-lord-card rounded-2xl border border-lord-border p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-lord-border flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-lord-text-main">No workflows</p>
          <p className="text-xs text-lord-text-muted mt-1 max-w-xs mx-auto">
            Create a workflow to automatically generate and schedule LinkedIn comments by keyword or creator.
          </p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 px-5 py-2 rounded-full bg-[#0A66C2] text-white text-[13px] font-semibold hover:bg-[#004182] transition-colors">
            Create your first workflow
          </button>
        </div>
      )}

      {/* Workflow cards */}
      <div className="space-y-3">
        {workflows.map(wf => (
          <WorkflowCard
            key={wf.id}
            workflow={wf}
            commentCount={wf.commentCount ?? 0}
            onDelete={() => handleDelete(wf.id)}
            onOpen={() => router.push(`/engage/workflows/${wf.id}`)}
          />
        ))}
      </div>

      {showCreate && (
        <CreateWorkflowModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// ─── root page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'search', label: 'Search & Engage' },
  { id: 'workflows', label: 'Workflows' },
];

export default function EngagePage() {
  const [tab, setTab] = useState('search');

  // Read initial tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'workflows') setTab('workflows');
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-lord-text-main">Engage</h1>
        <p className="text-sm text-lord-text-muted mt-0.5">Search LinkedIn posts or automate engagement with workflows</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-lord-card rounded-2xl border border-lord-border p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              tab === t.id
                ? 'bg-white text-lord-text-main shadow-sm border border-lord-border'
                : 'text-lord-text-muted hover:text-lord-text-main'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'search' ? <SearchTab /> : <WorkflowsTab />}
    </div>
  );
}
