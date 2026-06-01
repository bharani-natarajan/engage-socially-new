'use client';

import { useState, useEffect, useRef } from 'react';
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

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return new Date(isoStr).toLocaleDateString();
  }
}

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

// ─── Sub-Components ───────────────────────────────────────────────────────────

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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// Custom interactive SVG dual Y-axis Line Chart matching screenshot layout
function SVGChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-lord-text-muted text-xs border border-lord-border rounded-2xl bg-white">
        No data available
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const paddingLeft = 40;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxComments = Math.max(...data.map(d => d.comments), 1);
  const maxImpressions = Math.max(...data.map(d => d.impressions), 1);

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const yComm = height - paddingBottom - (d.comments / maxComments) * chartHeight;
    const yImp = height - paddingBottom - (d.impressions / maxImpressions) * chartHeight;
    return { x, yComm, yImp, raw: d };
  });

  let pathImp = '';
  let pathComm = '';
  points.forEach((p, i) => {
    if (i === 0) {
      pathImp = `M ${p.x} ${p.yImp}`;
      pathComm = `M ${p.x} ${p.yComm}`;
    } else {
      pathImp += ` L ${p.x} ${p.yImp}`;
      pathComm += ` L ${p.x} ${p.yComm}`;
    }
  });

  return (
    <div className="relative bg-white border border-lord-border rounded-3xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-lord-text-main">Comments & Impressions</h4>
          <p className="text-[11px] text-lord-text-muted mt-0.5">Performance over time</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
            <span className="text-lord-text-muted">Impressions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
            <span className="text-lord-text-muted">Comments</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="gradientImp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="gradientComm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map((r, i) => {
          const y = paddingTop + r * chartHeight;
          return (
            <line
              key={i}
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke="#efefef"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Area under Impressions */}
        {pathImp && points.length > 0 && (
          <path
            d={`${pathImp} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`}
            fill="url(#gradientImp)"
          />
        )}

        {/* Area under Comments */}
        {pathComm && points.length > 0 && (
          <path
            d={`${pathComm} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`}
            fill="url(#gradientComm)"
          />
        )}

        {/* Impressions Line */}
        {pathImp && (
          <path
            d={pathImp}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Comments Line */}
        {pathComm && (
          <path
            d={pathComm}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover overlay markers */}
        {points.map((p, i) => (
          <g
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-pointer"
          >
            <rect
              x={p.x - chartWidth / Math.max(data.length * 2, 1)}
              y={paddingTop}
              width={chartWidth / Math.max(data.length, 1)}
              height={chartHeight}
              fill="transparent"
            />
            {hoveredIdx === i && (
              <>
                <line
                  x1={p.x}
                  y1={paddingTop}
                  x2={p.x}
                  y2={height - paddingBottom}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <circle cx={p.x} cy={p.yImp} r="5" fill="#8b5cf6" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx={p.x} cy={p.yComm} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
              </>
            )}
          </g>
        ))}

        {/* Labels X Axis */}
        {data.map((d, i) => {
          const step = Math.max(Math.ceil(data.length / 6), 1);
          if (i % step !== 0 && i !== data.length - 1) return null;
          const p = points[i];
          return (
            <text
              key={i}
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              className="text-[9px] fill-lord-text-muted font-bold"
            >
              {p.raw.label}
            </text>
          );
        })}

        {/* Left Y Axis (Impressions) */}
        <text x={paddingLeft - 8} y={paddingTop + 4} textAnchor="end" className="text-[9px] fill-lord-text-muted font-bold">
          {Math.round(maxImpressions)}
        </text>
        <text x={paddingLeft - 8} y={paddingTop + chartHeight / 2 + 4} textAnchor="end" className="text-[9px] fill-lord-text-muted font-bold">
          {Math.round(maxImpressions / 2)}
        </text>
        <text x={paddingLeft - 8} y={height - paddingBottom + 4} textAnchor="end" className="text-[9px] fill-lord-text-muted font-bold">
          0
        </text>

        {/* Right Y Axis (Comments) */}
        <text x={width - paddingRight + 8} y={paddingTop + 4} textAnchor="start" className="text-[9px] fill-lord-text-muted font-bold">
          {Math.round(maxComments)}
        </text>
        <text x={width - paddingRight + 8} y={paddingTop + chartHeight / 2 + 4} textAnchor="start" className="text-[9px] fill-lord-text-muted font-bold">
          {Math.round(maxComments / 2)}
        </text>
        <text x={width - paddingRight + 8} y={height - paddingBottom + 4} textAnchor="start" className="text-[9px] fill-lord-text-muted font-bold">
          0
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute z-10 bg-white border border-lord-border rounded-2xl p-4 shadow-xl text-xs space-y-2"
          style={{
            left: `${Math.min(70, Math.max(5, ((points[hoveredIdx].x - paddingLeft) / chartWidth) * 80 + 5))}%`,
            top: '60px',
          }}
        >
          <p className="font-bold text-lord-text-main border-b border-lord-border pb-1 mb-1">
            {points[hoveredIdx].raw.label}
          </p>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#3b82f6] inline-block" />
              <span className="text-lord-text-muted">Comments:</span>
            </div>
            <span className="font-bold text-[#3b82f6]">{points[hoveredIdx].raw.comments}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#8b5cf6] inline-block" />
              <span className="text-lord-text-muted">Impressions:</span>
            </div>
            <span className="font-bold text-[#8b5cf6]">{points[hoveredIdx].raw.impressions}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-lord-orange inline-block" />
              <span className="text-lord-text-muted">Likes:</span>
            </div>
            <span className="font-bold text-lord-orange">{points[hoveredIdx].raw.likes}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-lord-red inline-block" />
              <span className="text-lord-text-muted">Replies:</span>
            </div>
            <span className="font-bold text-lord-red">{points[hoveredIdx].raw.replies}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline creation & edit form (NO MODAL, NO SEPARATE SECTION CARD) ─────────

function WorkflowForm({ workflow, onCancel, onSave }) {
  const isEdit = !!workflow;
  const [name, setName] = useState(workflow?.name ?? '');
  const [type, setType] = useState(workflow?.type ?? 'keyword');
  const [keyword, setKeyword] = useState(workflow?.keyword ?? '');
  const [creatorName, setCreatorName] = useState(workflow?.creatorName ?? '');
  const [creatorUrl, setCreatorUrl] = useState(workflow?.creatorUrl ?? '');
  const [autoPost, setAutoPost] = useState(workflow?.autoPost ?? false);
  const [commentLength, setCommentLength] = useState(workflow?.commentLength ?? 'medium');
  const [commentsPerDay, setCommentsPerDay] = useState(workflow?.commentsPerDay ?? (type === 'creator' ? 1 : 20));
  const [error, setError] = useState('');

  useEffect(() => {
    if (type === 'creator') {
      setCommentsPerDay(1);
    } else {
      if (commentsPerDay === 1) setCommentsPerDay(20);
    }
  }, [type]);

  function handleSave() {
    if (!name.trim()) { setError('Workflow name is required'); return; }
    if (type === 'keyword' && !keyword.trim()) { setError('Keyword is required'); return; }
    if (type === 'creator') {
      if (!creatorName.trim()) { setError('Creator name is required'); return; }
      if (!creatorUrl.trim()) { setError('Creator LinkedIn URL is required'); return; }
    }

    const urlMatch = creatorUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
    const creatorIdentifier = urlMatch ? urlMatch[1] : creatorName.trim().toLowerCase().replace(/\s+/g, '-');

    const payload = {
      name: name.trim(),
      type,
      keyword: type === 'keyword' ? keyword.trim() : '',
      creatorName: type === 'creator' ? creatorName.trim() : '',
      creatorUrl: type === 'creator' ? creatorUrl.trim() : '',
      creatorIdentifier: type === 'creator' ? creatorIdentifier : '',
      autoPost,
      commentLength,
      commentsPerDay: parseInt(commentsPerDay, 10),
    };

    onSave(payload);
  }

  return (
    <div className="bg-white rounded-3xl border border-lord-border p-6 shadow-sm">
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-lord-border">
          <div>
            <h3 className="text-base font-bold text-lord-text-main">
              {isEdit ? 'Edit Workflow' : 'Create New Workflow'}
            </h3>
            <p className="text-xs text-lord-text-muted mt-0.5">Configure your automated comment generation campaign</p>
          </div>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-lord-card border border-lord-border text-xs font-bold text-lord-text-main hover:bg-lord-border transition-colors shadow-sm"
          >
            Back
          </button>
        </div>

        <div className="space-y-5">
          {/* Workflow Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-lord-text-main">Workflow Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Chennai Real Estate Leads"
              className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green"
            />
          </div>

          {/* Workflow Type Selector (Only if Create Mode) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-lord-text-main">Workflow Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'keyword', label: 'Keyword Target', desc: 'Auto-comment by keyword' },
                  { id: 'creator', label: 'Creator Target', desc: 'Auto-comment by creator' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${type === t.id
                      ? 'border-lord-green bg-lord-green-light/40 font-bold'
                      : 'border-lord-border hover:border-lord-green/40'
                      }`}
                  >
                    <p className={`text-sm font-bold ${type === t.id ? 'text-lord-green-dark' : 'text-lord-text-main'}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-lord-text-muted leading-tight">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Keyword Target field */}
          {type === 'keyword' ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-lord-text-main">Keyword Target</label>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="e.g. real estate, Chennai, SaaS startup (comma separated)"
                className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-lord-text-main">Creator Name</label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={e => setCreatorName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-lord-text-main">Creator Profile URL</label>
                <input
                  type="text"
                  value={creatorUrl}
                  onChange={e => setCreatorUrl(e.target.value)}
                  placeholder="e.g. https://www.linkedin.com/in/johndoe"
                  className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green"
                />
              </div>
            </div>
          )}

          {/* Comment Length & Count Configuration (integrated, full width, matching height/border) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-lord-text-main">Comment Length</label>
              <select
                value={commentLength}
                onChange={e => setCommentLength(e.target.value)}
                className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-sm text-lord-text-main focus:outline-none focus:ring-2 focus:ring-lord-green"
              >
                <option value="short">Short (1 sentence)</option>
                <option value="medium">Medium (1-2 sentences)</option>
                <option value="long">Long (3-4 sentences)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-lord-text-main">
                Comments Per Day (Limit {type === 'creator' ? 1 : 20})
              </label>
              <input
                type="number"
                min="1"
                max={type === 'creator' ? "1" : "20"}
                value={commentsPerDay}
                onChange={e => setCommentsPerDay(Math.min(type === 'creator' ? 1 : 20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                disabled={type === 'creator'}
                className="w-full rounded-xl border border-lord-border bg-lord-bg px-4 py-2.5 text-sm text-lord-text-main focus:outline-none focus:ring-2 focus:ring-lord-green disabled:opacity-50"
              />
            </div>
          </div>

          {/* Auto Post Toggle (closed box, half width) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-lord-border bg-lord-card/20">
              <div className="pr-3">
                <label className="text-xs font-bold text-lord-text-main block">Auto-Post Comments</label>
                <p className="text-[10px] text-lord-text-muted mt-0.5 leading-tight">
                  Automatically post comments once they are approved
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoPost(!autoPost)}
                style={{ width: '40px', height: '22px' }}
                className={`rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${autoPost ? 'bg-lord-green' : 'bg-gray-200'
                  }`}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    transform: autoPost ? 'translateX(18px)' : 'translateX(0px)'
                  }}
                  className="rounded-full bg-white transition-transform shadow inline-block"
                />
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-lord-red font-semibold">{error}</p>}
        </div>

        {/* Form Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-lord-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-lord-border text-sm font-semibold text-lord-text-muted hover:bg-lord-card transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-lord-green text-lord-text-main text-sm font-bold hover:bg-lord-green-dark transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoPostConfirmModal({ workflowName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-lord-border p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-lord-green-light text-lord-green-dark flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-lord-text-main">Enable Auto-Post?</h3>
          <p className="text-xs text-lord-text-muted leading-relaxed">
            By enabling Auto-Post for <strong className="text-lord-text-main">"{workflowName}"</strong>, all generated comments will be automatically scheduled and posted on LinkedIn between <strong className="text-lord-text-main">9 AM and 9 PM</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-lord-border text-xs font-bold text-lord-text-muted hover:bg-lord-card transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-lord-green text-lord-text-main text-xs font-bold hover:bg-lord-green-dark transition-colors shadow-sm"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Main Sub-views ───────────────────────────────────────────────────────────

function AnalyticsView({ userId }) {
  const [range, setRange] = useState('7d');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    workflowApi.getAnalytics(userId, range)
      .then(res => {
        setStats(res);
        setError('');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId, range]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-32 ml-auto" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-lord-card h-28 rounded-3xl" />
          ))}
        </div>
        <div className="bg-lord-card h-72 rounded-3xl" />
      </div>
    );
  }

  const summary = stats?.summary ?? { comments: 0, impressions: 0, likes: 0, replies: 0 };

  return (
    <div className="space-y-6">
      {/* Title + Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-lord-text-main">Analytics Dashboard</h2>
          <p className="text-sm text-lord-text-muted mt-0.5">Track automated and manual engagement metrics</p>
        </div>
        <select
          value={range}
          onChange={e => setRange(e.target.value)}
          className="rounded-xl border border-lord-border bg-white px-3 py-2 text-sm font-semibold text-lord-text-main focus:outline-none focus:ring-2 focus:ring-lord-green shadow-sm"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

      {/* Metric Cards (Wording exactly matching screenshotted format) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { header: 'COMMENTS', label: 'Comments today', value: summary.comments, color: 'text-lord-green-dark', bg: 'bg-lord-green-light' },
          { header: 'IMPRESSIONS', label: 'Impressions today', value: summary.impressions.toLocaleString(), color: 'text-lord-teal-dark', bg: 'bg-lord-teal/10' },
          { header: 'LIKES', label: 'Likes today', value: summary.likes.toLocaleString(), color: 'text-lord-orange', bg: 'bg-lord-orange/10' },
          { header: 'REPLIES', label: 'Replies today', value: summary.replies.toLocaleString(), color: 'text-lord-red', bg: 'bg-lord-red/10' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-lord-border rounded-3xl p-5 shadow-sm space-y-2">
            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.color}`}>
              {c.header}
            </span>
            <p className="text-2xl font-bold text-lord-text-main">{c.value}</p>
            <p className="text-xs text-lord-text-muted font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <SVGChart data={stats?.data ?? []} />
    </div>
  );
}

function WorkflowSidebar({ workflow, userId, onClose, setWorkflows }) {
  const router = useRouter();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!workflow || !userId) return;
    setLoading(true);
    workflowApi.listComments(userId, workflow.id)
      .then(res => {
        setComments(res.data ?? []);
        setError('');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [workflow, userId]);

  async function handleApprove(commentId) {
    try {
      const scheduledAt = getScheduledTime(timezone);
      await workflowApi.updateComment(userId, commentId, { status: 'approved', scheduledAt });
      
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'approved', scheduledAt } : c));
      
      setWorkflows(prev => prev.map(w => {
        if (w.id === workflow.id) {
          const updatedComments = (w.comments ?? []).map(c => c.id === commentId ? { ...c, status: 'approved', scheduledAt } : c);
          const updatedPending = (w.pendingComments ?? []).filter(c => c.id !== commentId);
          return {
            ...w,
            comments: updatedComments,
            pendingComments: updatedPending,
          };
        }
        return w;
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReject(commentId) {
    if (!confirm('Are you sure you want to reject this comment draft?')) return;
    try {
      await workflowApi.updateComment(userId, commentId, { status: 'rejected' });
      
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'rejected' } : c));
      
      setWorkflows(prev => prev.map(w => {
        if (w.id === workflow.id) {
          const updatedComments = (w.comments ?? []).map(c => c.id === commentId ? { ...c, status: 'rejected' } : c);
          const updatedPending = (w.pendingComments ?? []).filter(c => c.id !== commentId);
          return {
            ...w,
            comments: updatedComments,
            pendingComments: updatedPending,
          };
        }
        return w;
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] transition-opacity duration-300"
      />
      
      <div className="fixed top-0 left-0 h-full w-full max-w-md bg-white shadow-2xl z-[9999] border-r border-lord-border flex flex-col transform transition-transform duration-300 ease-out animate-slide-in">
        <div className="p-5 border-b border-lord-border flex items-center justify-between bg-lord-card/25">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lord-text-main text-base truncate">{workflow.name}</h3>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${
                workflow.type === 'keyword'
                  ? 'bg-lord-teal/10 text-lord-teal border-lord-teal/20'
                  : 'bg-lord-green-light text-lord-green-dark border-lord-green-dark/20'
              }`}>
                {workflow.type === 'keyword' ? 'Keyword' : 'Creator'}
              </span>
            </div>
            <p className="text-xs text-lord-text-muted mt-0.5 truncate">
              {workflow.type === 'keyword' ? `Keyword: "${workflow.keyword}"` : `Creator: "${workflow.creatorName}"`}
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-lord-card text-lord-text-muted hover:text-lord-text-main transition-colors border border-lord-border ml-3 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4 py-8">
              {[1, 2].map(n => (
                <div key={n} className="animate-pulse space-y-2 border border-lord-border rounded-2xl p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-10 bg-gray-200 rounded" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-lord-card border border-lord-border flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-lord-text-main">No comments generated yet</p>
              <p className="text-xs text-lord-text-muted mt-1">
                Go to the workflow detail page and click "Generate Comments" to start generating comments.
              </p>
            </div>
          ) : (
            comments.map(c => (
              <div 
                key={c.id} 
                className="border border-lord-border rounded-2xl p-4 space-y-3 bg-lord-card/10 hover:bg-lord-card/20 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                    {c.postAuthor?.[0]?.toUpperCase() ?? 'L'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-lord-text-main text-xs truncate">@{c.postAuthor}</p>
                    <p className="text-[10px] text-lord-text-muted truncate mt-0.5">{c.postAuthorHeadline}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <p className="text-[11px] text-lord-text-muted line-clamp-2 italic bg-lord-bg/40 p-2 rounded-lg border border-lord-border/40">
                  "{c.postText}"
                </p>

                <div className="bg-white rounded-xl border border-lord-border p-3">
                  <p className="text-xs text-lord-text-main font-semibold leading-relaxed">
                    {c.commentText}
                  </p>
                </div>

                {c.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(c.id)}
                      className="flex-1 py-2 rounded-xl bg-lord-green text-lord-text-main text-xs font-bold hover:bg-lord-green-dark transition-colors shadow-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(c.id)}
                      className="py-2 px-3 rounded-xl hover:bg-red-50 text-lord-text-muted hover:text-lord-red transition-colors border border-lord-border text-xs font-bold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-lord-border bg-lord-card/15 flex items-center justify-center">
          <button
            onClick={() => {
              onClose();
              router.push(`/engage/workflows/${workflow.id}`);
            }}
            className="w-full py-2.5 rounded-xl border border-lord-border bg-white text-lord-text-main hover:bg-lord-card text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>View All Comments / Generate Comments</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
}

function WorkflowsView({ userId }) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalWorkflow, setModalWorkflow] = useState(null); // workflow object to edit
  const [viewState, setViewState] = useState('list'); // 'list' | 'create' | 'edit'
  const [confirmAutoPostWorkflow, setConfirmAutoPostWorkflow] = useState(null);
  const [subTab, setSubTab] = useState('workflows'); // 'workflows' | 'scheduled' | 'posted'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('subtab');
      if (sub === 'scheduled') {
        setSubTab('scheduled');
      } else if (sub === 'posted') {
        setSubTab('posted');
      } else {
        setSubTab('workflows');
      }
    }
  }, [router]);

  async function handleToggleAutoPost(wf) {
    if (!wf.autoPost) {
      setConfirmAutoPostWorkflow(wf);
    } else {
      try {
        await workflowApi.update(userId, wf.id, { autoPost: false });
        setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, autoPost: false } : w));
      } catch (err) {
        setError(err.message);
      }
    }
  }

  async function confirmEnableAutoPost() {
    if (!confirmAutoPostWorkflow) return;
    const wf = confirmAutoPostWorkflow;
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await workflowApi.update(userId, wf.id, { autoPost: true, timezone });
      setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, autoPost: true } : w));
      setConfirmAutoPostWorkflow(null);
    } catch (err) {
      setError(err.message);
      setConfirmAutoPostWorkflow(null);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await workflowApi.list(userId);
      const list = res.data ?? [];
      setWorkflows(list);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  async function handleSaveWorkflow(payload) {
    try {
      if (viewState === 'edit' && modalWorkflow && modalWorkflow.id) {
        // Edit Mode
        const res = await workflowApi.update(userId, modalWorkflow.id, payload);
        setWorkflows(prev => prev.map(w => w.id === modalWorkflow.id ? {
          ...res.data,
          commentCount: w.commentCount,
          comments: w.comments,
          pendingComments: w.pendingComments
        } : w));
      } else {
        // Create Mode
        const res = await workflowApi.create(userId, payload);
        setWorkflows(prev => [res.data, ...prev]);
      }
      setViewState('list');
      setModalWorkflow(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this workflow? All associated comments will be lost.')) return;
    try {
      await workflowApi.remove(userId, id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApproveWorkflowComment(workflowId, commentId) {
    if (!userId) return;
    try {
      await workflowApi.updateComment(userId, commentId, { status: 'approved' });
      setWorkflows(prev => prev.map(w => {
        if (w.id === workflowId) {
          const updatedPending = (w.pendingComments ?? []).filter(c => c.id !== commentId);
          return { ...w, pendingComments: updatedPending, commentCount: Math.max(0, w.commentCount - 1) };
        }
        return w;
      }));
      setSubTab('scheduled');
      router.push('/engage?tab=workflows&subtab=scheduled');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRejectWorkflowComment(workflowId, commentId) {
    if (!userId) return;
    if (!confirm('Are you sure you want to reject this comment draft?')) return;
    try {
      await workflowApi.updateComment(userId, commentId, { status: 'rejected' });
      setWorkflows(prev => prev.map(w => {
        if (w.id === workflowId) {
          const updatedPending = (w.pendingComments ?? []).filter(c => c.id !== commentId);
          const updatedComments = (w.comments ?? []).map(c => c.id === commentId ? { ...c, status: 'rejected' } : c);
          return {
            ...w,
            pendingComments: updatedPending,
            comments: updatedComments,
            commentCount: Math.max(0, w.commentCount - 1)
          };
        }
        return w;
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-32 ml-auto" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-lord-card h-28 rounded-3xl" />
        ))}
      </div>
    );
  }

  // Render form inline instead of modal
  if (viewState === 'create' || viewState === 'edit') {
    return (
      <WorkflowForm
        workflow={viewState === 'edit' ? modalWorkflow : null}
        onCancel={() => { setViewState('list'); setModalWorkflow(null); }}
        onSave={handleSaveWorkflow}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-lord-border gap-6">
        <button
          onClick={() => { setSubTab('workflows'); router.push('/engage?tab=workflows'); }}
          className={`pb-3 text-sm font-bold transition-all relative ${subTab === 'workflows'
            ? 'text-lord-teal font-extrabold border-b-2 border-lord-teal'
            : 'text-lord-text-muted hover:text-lord-text-main'
            }`}
        >
          Workflows
        </button>
        <button
          onClick={() => { setSubTab('scheduled'); router.push('/engage?tab=workflows&subtab=scheduled'); }}
          className={`pb-3 text-sm font-bold transition-all relative ${subTab === 'scheduled'
            ? 'text-lord-teal font-extrabold border-b-2 border-lord-teal'
            : 'text-lord-text-muted hover:text-lord-text-main'
            }`}
        >
          Scheduled Posts
        </button>
        <button
          onClick={() => { setSubTab('posted'); router.push('/engage?tab=workflows&subtab=posted'); }}
          className={`pb-3 text-sm font-bold transition-all relative ${subTab === 'posted'
            ? 'text-lord-teal font-extrabold border-b-2 border-lord-teal'
            : 'text-lord-text-muted hover:text-lord-text-main'
            }`}
        >
          Posted Comments
        </button>
      </div>

      {subTab === 'posted' ? (
        <PostedCommentsView userId={userId} />
      ) : subTab === 'scheduled' ? (
        <ScheduledPostsView userId={userId} />
      ) : (
        <>
          {/* Title + Action */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-lord-text-main">Workflows</h2>
              <p className="text-sm text-lord-text-muted mt-0.5">Manage automated campaigns and targets</p>
            </div>
            <button
              onClick={() => { setModalWorkflow(null); setViewState('create'); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lord-green text-lord-text-main text-sm font-semibold hover:bg-lord-green-dark transition-colors shadow-sm"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Workflow
            </button>
          </div>

          {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

          {/* Workflows Table */}
          {workflows.length === 0 ? (
            <div className="bg-lord-card rounded-2xl border border-lord-border p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-lord-border flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-lord-text-main">No workflows found</p>
              <p className="text-xs text-lord-text-muted mt-1">
                Create a new workflow to start tracking keywords or creators and generating comments.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-lord-border rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-lord-border bg-lord-card text-xs font-bold text-lord-text-muted uppercase tracking-wider">
                      <th className="px-5 py-4">Workflow Name</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Auto-Post</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lord-border text-sm">
                    {workflows.map(wf => {
                      const latestPending = wf.pendingComments?.[0];
                      const pendingCount = wf.pendingComments?.length ?? 0;
                      const latestComment = wf.comments?.[0];

                      return (
                        <tr key={wf.id} className="hover:bg-lord-bg transition-colors">
                          <td className="px-5 py-4 align-middle font-bold text-lord-text-main">
                            <div>
                              <p className="font-bold text-lord-text-main text-sm">{wf.name}</p>
                              <p className="text-xs text-lord-text-muted font-normal mt-0.5">
                                {wf.lastRunAt ? `Active ${timeAgo(wf.lastRunAt)}` : 'Never executed'}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-middle whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${wf.type === 'keyword'
                              ? 'bg-lord-teal/10 text-lord-teal border-lord-teal/20'
                              : 'bg-lord-green-light text-lord-green-dark border-lord-green-dark/20'
                              }`}>
                              {wf.type === 'keyword' ? 'Keyword' : 'Creator'}
                            </span>
                          </td>
                          <td className="px-5 py-4 align-middle whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleAutoPost(wf)}
                                style={{ width: '32px', height: '18px' }}
                                className={`rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${wf.autoPost ? 'bg-lord-green' : 'bg-gray-200'
                                  }`}
                              >
                                <span
                                  style={{
                                    width: '14px',
                                    height: '14px',
                                    transform: wf.autoPost ? 'translateX(14px)' : 'translateX(0px)'
                                  }}
                                  className="rounded-full bg-white transition-transform shadow inline-block"
                                />
                              </button>
                              <span className="text-xs font-bold text-lord-text-muted">{wf.autoPost ? 'On' : 'Off'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            {latestComment ? (
                              <StatusBadge status={latestComment.status} />
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full border text-xs font-bold bg-gray-100 text-gray-500 border-gray-200">
                                No comments
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 align-middle text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => router.push(`/engage/workflows/${wf.id}`)}
                                className="px-3 py-1.5 rounded-xl bg-lord-card text-lord-text-main text-[13px] font-bold hover:bg-lord-border transition-colors border border-lord-border shadow-sm"
                                title="View generated list of scheduled/pending comments"
                              >
                                View Comments
                              </button>
                              <button
                                onClick={() => { setModalWorkflow(wf); setViewState('edit'); }}
                                className="p-1.5 rounded-xl hover:bg-lord-card text-lord-text-muted hover:text-lord-teal transition-colors border border-lord-border"
                                title="Edit workflow settings"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(wf.id)}
                                className="p-1.5 rounded-xl hover:bg-red-50 text-lord-text-muted hover:text-[#f43f5e] transition-colors border border-lord-border"
                                title="Delete workflow"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
                                </svg>
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

          {confirmAutoPostWorkflow && (
            <AutoPostConfirmModal
              workflowName={confirmAutoPostWorkflow.name}
              onConfirm={confirmEnableAutoPost}
              onCancel={() => setConfirmAutoPostWorkflow(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

function CommentsView({ userId }) {
  const router = useRouter();
  const [comments, setComments] = useState([]);
  const [allComments, setAllComments] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState({});
  const [timezone, setTimezone] = useState('UTC');
  const [expandedCommentId, setExpandedCommentId] = useState(null);

  // Filter state
  const [filterWorkflow, setFilterWorkflow] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!userId) return;
    setLoading(true);
    Promise.all([
      workflowApi.listAllComments(userId),
      workflowApi.list(userId),
    ])
      .then(([commentsRes, workflowsRes]) => {
        const cmts = commentsRes.data ?? [];
        setAllComments(cmts);
        setComments(cmts);
        setWorkflows(workflowsRes.data ?? []);
        setError('');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  // Apply filters whenever filter state or allComments change
  useEffect(() => {
    let filtered = [...allComments];

    // Workflow filter
    if (filterWorkflow !== 'all') {
      filtered = filtered.filter(c => c.workflowId === filterWorkflow);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // Date From filter
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(c => new Date(c.createdAt) >= from);
    }

    // Date To filter
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(c => new Date(c.createdAt) <= to);
    }

    setComments(filtered);
  }, [filterWorkflow, filterStatus, filterDateFrom, filterDateTo, allComments]);

  function clearFilters() {
    setFilterWorkflow('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  }

  const hasActiveFilters = filterWorkflow !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo;

  async function handleApprove(commentId) {
    try {
      const scheduledAt = getScheduledTime(timezone);
      await workflowApi.updateComment(userId, commentId, { status: 'approved', scheduledAt });
      setAllComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'approved', scheduledAt } : c));
      router.push('/engage?tab=workflows&subtab=scheduled');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePostNow(commentId) {
    const comment = allComments.find(c => c.id === commentId);
    if (!comment) return;
    setPosting(p => ({ ...p, [commentId]: true }));
    try {
      const res = await fetch('/api/linkedin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: comment.postId, message: comment.commentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');
      const postedAt = new Date().toISOString();
      await workflowApi.updateComment(userId, commentId, { status: 'posted', postedAt });
      setAllComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'posted', postedAt } : c));
    } catch (err) {
      await workflowApi.updateComment(userId, commentId, { status: 'failed', errorMessage: err.message });
      setAllComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'failed', errorMessage: err.message } : c));
    } finally {
      setPosting(p => ({ ...p, [commentId]: false }));
    }
  }

  async function handleDelete(commentId) {
    if (!confirm('Are you sure you want to reject and delete this comment draft?')) return;
    try {
      await workflowApi.removeComment(userId, commentId);
      setAllComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4" />
        <div className="bg-lord-card h-64 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-lord-text-main">Comments Manager</h2>
        <p className="text-sm text-lord-text-muted mt-0.5">Review, approve, and track comment status across all automation flows</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-lord-border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-lord-text-muted uppercase tracking-wider">Workflow</label>
          <select
            value={filterWorkflow}
            onChange={(e) => setFilterWorkflow(e.target.value)}
            className="px-3 py-2 rounded-xl border border-lord-border bg-lord-bg text-sm text-lord-text-main font-medium focus:outline-none focus:border-lord-teal focus:ring-1 focus:ring-lord-teal/20 min-w-[180px]"
          >
            <option value="all">All Workflows</option>
            {workflows.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-lord-text-muted uppercase tracking-wider">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-lord-border bg-lord-bg text-sm text-lord-text-main font-medium focus:outline-none focus:border-lord-teal focus:ring-1 focus:ring-lord-teal/20 min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="posted">Posted</option>
            <option value="failed">Failed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-lord-text-muted uppercase tracking-wider">From Date</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-lord-border bg-lord-bg text-sm text-lord-text-main font-medium focus:outline-none focus:border-lord-teal focus:ring-1 focus:ring-lord-teal/20"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-lord-text-muted uppercase tracking-wider">To Date</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-lord-border bg-lord-bg text-sm text-lord-text-main font-medium focus:outline-none focus:border-lord-teal focus:ring-1 focus:ring-lord-teal/20"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-xl border border-lord-border text-xs font-bold text-lord-text-muted hover:text-lord-red hover:border-lord-red/30 transition-colors"
          >
            Clear Filters
          </button>
        )}
        <p className="text-[11px] text-lord-text-muted font-medium ml-auto">
          Showing {comments.length} of {allComments.length} comments
        </p>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

      {comments.length === 0 && (
        <div className="bg-white border border-lord-border rounded-3xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-lord-card border border-lord-border flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6f767e" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-lord-text-main">No comments generated yet</p>
          <p className="text-xs text-lord-text-muted mt-1">
            Comments will appear here once your workflows run and generate draft suggestions.
          </p>
        </div>
      )}

      {comments.length > 0 && (
        <div className="bg-white border border-lord-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-lord-border bg-lord-card text-xs font-bold text-lord-text-muted uppercase tracking-wider">
                  <th className="px-5 py-4">Workflow</th>
                  <th className="px-5 py-4">Target Post</th>
                  <th className="px-5 py-4">Draft Comment</th>
                  <th className="px-5 py-4">Status / Stats</th>
                  <th className="px-5 py-4">Generated Date</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lord-border text-sm">
                {comments.map(c => {
                  const isExpanded = expandedCommentId === c.id;
                  const shortComment = c.commentText.slice(0, 70);
                  const isLong = c.commentText.length > 70;

                  return (
                    <tr key={c.id} className="hover:bg-lord-bg transition-colors">
                      <td className="px-5 py-4 font-bold text-lord-text-main align-top whitespace-nowrap">
                        {c.workflow?.name || 'Manual'}
                      </td>
                      <td className="px-5 py-4 align-top max-w-[200px]">
                        <p className="font-bold text-lord-text-main truncate">{c.postAuthor}</p>
                        <p className="text-xs text-lord-text-muted line-clamp-2 mt-0.5">{c.postText}</p>
                      </td>
                      <td className="px-5 py-4 align-top max-w-[300px]">
                        <p className="text-lord-text-main leading-relaxed">
                          {isExpanded || !isLong ? c.commentText : `${shortComment}…`}
                        </p>
                        {isLong && (
                          <button
                            onClick={() => setExpandedCommentId(isExpanded ? null : c.id)}
                            className="text-[10px] text-lord-teal font-bold hover:underline mt-1 block"
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap space-y-1">
                        <StatusBadge status={c.status} />
                        {c.status === 'approved' && c.scheduledAt && (
                          <p className="text-[10px] text-lord-teal font-medium">
                            Scheduled: {formatDate(c.scheduledAt)}
                          </p>
                        )}
                        {c.status === 'posted' && c.postedAt && (
                          <p className="text-[10px] text-lord-green-dark font-medium">
                            Posted: {formatDate(c.postedAt)}
                          </p>
                        )}
                        {c.status === 'failed' && c.errorMessage && (
                          <p className="text-[10px] text-lord-red font-medium max-w-[140px] truncate" title={c.errorMessage}>
                            {c.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top text-xs text-lord-text-muted whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {c.postUrl && (
                            <a
                              href={c.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg border border-lord-border text-xs font-semibold text-lord-text-muted hover:text-lord-teal hover:border-lord-teal transition-colors"
                              title="View post link ↗"
                            >
                              Link
                            </a>
                          )}
                          {c.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(c.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-lord-green text-lord-text-main text-xs font-bold hover:bg-lord-green-dark transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {c.status === 'approved' && (
                            <button
                              onClick={() => handlePostNow(c.id)}
                              disabled={posting[c.id]}
                              className="px-2.5 py-1.5 rounded-lg bg-lord-teal text-white text-xs font-bold hover:bg-lord-teal-dark transition-colors disabled:opacity-50"
                            >
                              {posting[c.id] ? 'Posting' : 'Post Now'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-lord-text-muted hover:text-lord-red transition-colors border border-lord-border"
                            title="Reject and delete"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
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
  );
}

// ─── Search tab (Original Engage Panel) ──────────────────────────────────────────

const DATE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: 'past_day', label: 'Past 24 h' },
  { value: 'past_week', label: 'Past week' },
  { value: 'past_month', label: 'Past month' },
];

function AuthorAvatar({ name, url }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  const inner = (
    <div className="w-10 h-10 rounded-full bg-lord-teal text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
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
    <div className="bg-white rounded-3xl border border-lord-border shadow-sm p-5 space-y-3">
      <div className="flex items-start gap-3">
        <AuthorAvatar name={post.author.name} url={post.author.profile_url} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {post.author.profile_url ? (
              <a href={post.author.profile_url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold text-lord-text-main hover:text-lord-teal transition-colors">
                {post.author.name}
              </a>
            ) : (
              <span className="text-sm font-semibold text-lord-text-main">{post.author.name}</span>
            )}
            {post.timestamp && <span className="text-xs text-lord-text-muted font-medium">{timeAgo(post.timestamp)}</span>}
          </div>
          {post.author.headline && <p className="text-xs text-lord-text-muted truncate">{post.author.headline}</p>}
        </div>
        {post.share_url && (
          <a href={post.share_url} target="_blank" rel="noopener noreferrer"
            className="text-lord-text-muted hover:text-lord-teal flex-shrink-0 transition-colors" title="View on LinkedIn ↗">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
      </div>
      <div>
        <p className="text-sm text-lord-text-main leading-relaxed whitespace-pre-wrap">{displayText}</p>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-lord-teal font-semibold mt-1 hover:underline">
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      {post.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.media_url} alt="" className="w-full rounded-2xl object-cover max-h-60" />
      )}
      <div className="flex items-center justify-between pt-1 border-t border-lord-border/50">
        <div className="flex items-center gap-4 text-xs text-lord-text-muted font-semibold">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f43f5e"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            {(post.reaction_count ?? 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {(post.comment_count ?? 0).toLocaleString()}
          </span>
        </div>
        {posted ? (
          <span className="text-xs text-lord-green font-bold flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            Commented
          </span>
        ) : (
          <button onClick={() => setCommenting(!commenting)} className="text-xs font-bold text-lord-teal hover:underline">
            {commenting ? 'Cancel' : 'Comment'}
          </button>
        )}
      </div>
      {commenting && (
        <div className="space-y-2 pt-1">
          <textarea rows={3} value={commentText} onChange={e => setCommentText(e.target.value)}
            placeholder="Write a comment…"
            className="w-full rounded-2xl border border-lord-border bg-lord-bg px-4 py-3 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green/30 resize-none" />
          {error && <p className="text-xs text-lord-red font-semibold">{error}</p>}
          <div className="flex items-center gap-2 justify-end">
            <button onClick={suggestComment} disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-lord-green text-lord-green-dark text-xs font-semibold hover:bg-lord-green hover:text-lord-text-main transition-colors disabled:opacity-50">
              {aiLoading
                ? <><svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Generating…</>
                : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>AI Suggest</>}
            </button>
            <button onClick={postComment} disabled={posting || !commentText.trim()}
              className="px-4 py-1.5 rounded-full bg-lord-teal text-white text-xs font-semibold hover:bg-lord-teal-dark transition-colors disabled:opacity-40">
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
      <div>
        <h2 className="text-xl font-bold text-lord-text-main">Search & Engage</h2>
        <p className="text-sm text-lord-text-muted mt-0.5">Find LinkedIn posts matching your criteria and post comments directly</p>
      </div>

      <div className="bg-white rounded-3xl border border-lord-border shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="e.g. real estate Chennai, SaaS startup…"
              className="w-full rounded-xl border border-lord-border bg-lord-bg pl-9 pr-4 py-2.5 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green" />
          </div>
          <button onClick={() => search()} disabled={loading || !keywords.trim()}
            className="px-5 py-2.5 rounded-xl bg-lord-green text-lord-text-main text-sm font-semibold hover:bg-lord-green-dark transition-colors disabled:opacity-40">
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-lord-text-muted font-bold">Date:</span>
          {DATE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setDatePosted(opt.value)}
              className={`px-3 py-1 rounded-full border text-[11px] font-bold transition-colors ${datePosted === opt.value
                ? 'bg-lord-teal text-white border-lord-teal'
                : 'bg-lord-bg text-lord-text-muted border-lord-border hover:border-lord-teal/40'
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
            <div key={i} className="bg-white rounded-3xl border border-lord-border p-5 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 bg-gray-200 rounded" />
                <div className="h-2.5 bg-gray-200 rounded w-4/5" />
                <div className="h-2.5 bg-gray-200 rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length > 0 && (
        <>
          <p className="text-xs text-lord-text-muted font-bold">{posts.length} posts found</p>
          <div className="space-y-4">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
          {cursor && (
            <div className="flex justify-center pt-2">
              <button onClick={() => search(true)} disabled={loadingMore}
                className="px-6 py-2.5 rounded-full border border-lord-border text-sm font-semibold text-lord-text-main hover:border-lord-teal hover:text-lord-teal transition-colors disabled:opacity-50">
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {!loading && searched && posts.length === 0 && !error && (
        <div className="bg-white border border-lord-border rounded-3xl p-12 text-center shadow-sm">
          <p className="text-sm font-bold text-lord-text-main">No posts found</p>
          <p className="text-xs text-lord-text-muted mt-1">Try different keywords or a wider date range</p>
        </div>
      )}
    </div>
  );
}

// ─── Root Page ─────────────────────────────────────────────────────────────────

export default function EngagePage() {
  const [activeMenu, setActiveMenu] = useState('analytics');
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'workflows') setActiveMenu('workflows');
    else if (tab === 'comments') setActiveMenu('comments');
    else if (tab === 'engage') setActiveMenu('engage');

    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.userId) setUserId(d.userId);
      })
      .catch(console.error);
  }, []);

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
            onClick={() => setActiveMenu(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${activeMenu === item.id
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
      <div className="flex-1 min-w-0">
        {activeMenu === 'analytics' && <AnalyticsView userId={userId} />}
        {activeMenu === 'workflows' && <WorkflowsView userId={userId} />}
        {activeMenu === 'comments' && <CommentsView userId={userId} />}
        {activeMenu === 'engage' && <SearchTab />}
      </div>
    </div>
  );
}

function ScheduledPostsView({ userId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState({});
  const [expandedCommentId, setExpandedCommentId] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    workflowApi.listAllComments(userId)
      .then(res => {
        const filtered = (res.data ?? []).filter(c => c.status === 'approved' || c.status === 'scheduled');
        setComments(filtered);
        setError('');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handlePostNow(commentId) {
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
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');
      const postedAt = new Date().toISOString();
      await workflowApi.updateComment(userId, commentId, { status: 'posted', postedAt });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      await workflowApi.updateComment(userId, commentId, { status: 'failed', errorMessage: err.message });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'failed', errorMessage: err.message } : c));
    } finally {
      setPosting(p => ({ ...p, [commentId]: false }));
    }
  }

  async function handleDelete(commentId) {
    if (!confirm('Are you sure you want to cancel and delete this scheduled post?')) return;
    try {
      await workflowApi.removeComment(userId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-lord-card h-28 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

      {comments.length === 0 ? (
        <div className="bg-white border border-lord-border rounded-3xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-lord-card border border-lord-border flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6f767e" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-sm font-bold text-lord-text-main">No scheduled posts</p>
          <p className="text-xs text-lord-text-muted mt-1">
            Comments will appear here once approved from workflow details.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-lord-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-lord-border bg-lord-card text-xs font-bold text-lord-text-muted uppercase tracking-wider">
                  <th className="px-5 py-4">Workflow</th>
                  <th className="px-5 py-4">Target Post</th>
                  <th className="px-5 py-4">Draft Comment</th>
                  <th className="px-5 py-4">Scheduled For</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lord-border text-sm">
                {comments.map(c => {
                  const isExpanded = expandedCommentId === c.id;
                  const shortComment = c.commentText.slice(0, 70);
                  const isLong = c.commentText.length > 70;

                  return (
                    <tr key={c.id} className="hover:bg-lord-bg transition-colors">
                      <td className="px-5 py-4 font-bold text-lord-text-main align-top whitespace-nowrap text-sm">
                        {c.workflow?.name || 'Manual'}
                      </td>
                      <td className="px-5 py-4 align-top max-w-[200px]">
                        <p className="font-bold text-lord-text-main text-sm truncate">{c.postAuthor}</p>
                        <p className="text-[13px] text-lord-text-muted line-clamp-2 mt-0.5">{c.postText}</p>
                      </td>
                      <td className="px-5 py-4 align-top max-w-[300px]">
                        <p className="text-lord-text-main text-[13px] leading-relaxed">
                          {isExpanded || !isLong ? c.commentText : `${shortComment}…`}
                        </p>
                        {isLong && (
                          <button
                            onClick={() => setExpandedCommentId(isExpanded ? null : c.id)}
                            className="text-xs text-lord-teal font-bold hover:underline mt-1 block"
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap text-sm text-lord-teal font-bold">
                        {c.scheduledAt ? formatDate(c.scheduledAt) : 'Pending scheduling'}
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {c.postUrl && (
                            <a
                              href={c.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg border border-lord-border text-xs font-semibold text-lord-text-muted hover:text-lord-teal hover:border-lord-teal transition-colors"
                              title="View post link ↗"
                            >
                              Link
                            </a>
                          )}
                          <button
                            onClick={() => handlePostNow(c.id)}
                            disabled={posting[c.id]}
                            className="px-2.5 py-1.5 rounded-lg bg-lord-teal text-white text-xs font-bold hover:bg-lord-teal-dark transition-colors disabled:opacity-50"
                          >
                            {posting[c.id] ? 'Posting' : 'Post Now'}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-lord-text-muted hover:text-[#f43f5e] transition-colors border border-lord-border"
                            title="Reject and delete"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
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
  );
}

function PostedCommentsView({ userId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCommentId, setExpandedCommentId] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    workflowApi.listAllComments(userId)
      .then(res => {
        const filtered = (res.data ?? []).filter(c => c.status === 'posted');
        setComments(filtered);
        setError('');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-lord-card h-28 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

      {comments.length === 0 ? (
        <div className="bg-white border border-lord-border rounded-3xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-lord-card border border-lord-border flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6f767e" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p className="text-sm font-bold text-lord-text-main">No posted comments yet</p>
          <p className="text-xs text-lord-text-muted mt-1">
            Comments will appear here once they are successfully posted to LinkedIn.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-lord-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-lord-border bg-lord-card text-xs font-bold text-lord-text-muted uppercase tracking-wider">
                  <th className="px-5 py-4">Workflow</th>
                  <th className="px-5 py-4">Target Post</th>
                  <th className="px-5 py-4">Comment Text</th>
                  <th className="px-5 py-4">Posted At</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lord-border text-sm">
                {comments.map(c => {
                  const isExpanded = expandedCommentId === c.id;
                  const shortComment = c.commentText.slice(0, 70);
                  const isLong = c.commentText.length > 70;

                  return (
                    <tr key={c.id} className="hover:bg-lord-bg transition-colors">
                      <td className="px-5 py-4 font-bold text-lord-text-main align-middle whitespace-nowrap text-sm">
                        {c.workflow?.name || 'Manual'}
                      </td>
                      <td className="px-5 py-4 align-middle max-w-[200px]">
                        <p className="font-bold text-lord-text-main text-sm truncate">{c.postAuthor}</p>
                        <p className="text-[13px] text-lord-text-muted line-clamp-2 mt-0.5">{c.postText}</p>
                      </td>
                      <td className="px-5 py-4 align-middle max-w-[300px]">
                        <p className="text-lord-text-main text-[13px] leading-relaxed">
                          {isExpanded || !isLong ? c.commentText : `${shortComment}…`}
                        </p>
                        {isLong && (
                          <button
                            onClick={() => setExpandedCommentId(isExpanded ? null : c.id)}
                            className="text-xs text-lord-teal font-bold hover:underline mt-1 block"
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap text-sm text-lord-green-dark font-semibold">
                        {c.postedAt ? formatDate(c.postedAt) : 'N/A'}
                      </td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4 align-middle text-right whitespace-nowrap">
                        {c.postUrl && (
                          <a
                            href={c.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg border border-lord-border text-xs font-semibold text-lord-text-muted hover:text-lord-teal hover:border-lord-teal transition-colors inline-block"
                            title="View post link ↗"
                          >
                            View Post ↗
                          </a>
                        )}
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
  );
}
