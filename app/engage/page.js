'use client';

import { useState } from 'react';

const DATE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: 'past_day', label: 'Past 24 hours' },
  { value: 'past_week', label: 'Past week' },
  { value: 'past_month', label: 'Past month' },
];

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

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
    setAiLoading(true);
    setError('');
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
    } catch (err) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function postComment() {
    if (!commentText.trim()) return;
    setPosting(true);
    setError('');
    try {
      const res = await fetch('/api/linkedin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, message: commentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');
      setPosted(true);
      setCommenting(false);
      setCommentText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm p-5 space-y-3">
      {/* Author */}
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
            {post.timestamp && (
              <span className="text-xs text-lord-text-muted">{timeAgo(post.timestamp)}</span>
            )}
          </div>
          {post.author.headline && (
            <p className="text-xs text-lord-text-muted truncate">{post.author.headline}</p>
          )}
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

      {/* Post text */}
      <div>
        <p className="text-sm text-lord-text-main leading-relaxed whitespace-pre-wrap">{displayText}</p>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs text-lord-green font-semibold mt-1 hover:underline">
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Media */}
      {post.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.media_url} alt="" className="w-full rounded-xl object-cover max-h-60" />
      )}

      {/* Metrics + actions */}
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
          <button onClick={() => setCommenting(!commenting)}
            className="text-xs font-semibold text-[#0A66C2] hover:underline">
            {commenting ? 'Cancel' : 'Comment'}
          </button>
        )}
      </div>

      {/* Comment box */}
      {commenting && (
        <div className="space-y-2 pt-1">
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment…"
            className="w-full rounded-xl border border-lord-border bg-white px-3 py-2 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 resize-none"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2 justify-end">
            <button onClick={suggestComment} disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-lord-green text-lord-green text-xs font-semibold hover:bg-lord-green hover:text-white transition-colors disabled:opacity-50">
              {aiLoading
                ? <><svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Generating…</>
                : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>AI Suggest</>
              }
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

export default function EngagePage() {
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
      setPosts((prev) => append ? [...prev, ...(data.data ?? [])] : (data.data ?? []));
      setCursor(data.cursor ?? null);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') search();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-lord-text-main">Search & Engage</h1>
        <p className="text-sm text-lord-text-muted mt-0.5">Find LinkedIn posts by keyword and comment on them</p>
      </div>

      {/* Search bar */}
      <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. real estate Chennai, plots for sale…"
              className="w-full rounded-xl border border-lord-border bg-white pl-9 pr-4 py-2.5 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30"
            />
          </div>
          <button
            onClick={() => search()}
            disabled={loading || !keywords.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] transition-colors disabled:opacity-40"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-lord-text-muted font-medium">Date:</span>
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDatePosted(opt.value)}
              className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                datePosted === opt.value
                  ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                  : 'bg-white text-lord-text-muted border-lord-border hover:border-[#0A66C2]/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
      )}

      {/* Loading skeleton */}
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

      {/* Results */}
      {!loading && posts.length > 0 && (
        <>
          <p className="text-xs text-lord-text-muted font-medium">{posts.length} posts found</p>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {cursor && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => search(true)}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-full border border-lord-border text-sm font-semibold text-lord-text-main hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && searched && posts.length === 0 && !error && (
        <div className="bg-lord-card rounded-2xl border border-lord-border p-12 text-center">
          <p className="text-sm font-semibold text-lord-text-main">No posts found</p>
          <p className="text-xs text-lord-text-muted mt-1">Try different keywords or a wider date range</p>
        </div>
      )}
    </div>
  );
}
