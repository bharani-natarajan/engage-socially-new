'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const STEPS = { idle: 'idle', uploading: 'uploading', publishing: 'publishing', done: 'done' };

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  { value: 'facebook',  label: 'Facebook',  color: 'bg-[#1877F2]' },
  { value: 'linkedin',  label: 'LinkedIn',  color: 'bg-[#0A66C2]' },
  { value: 'both',      label: 'Instagram + Facebook', color: 'bg-lord-green' },
  { value: 'all',       label: 'Instagram + Facebook + LinkedIn', color: 'bg-lord-green' },
];

// ── Canva Design Picker Modal ─────────────────────────────────────────────────

function CanvaPickerModal({ onSelect, onClose }) {
  const [designs, setDesigns] = useState([]);
  const [continuation, setContinuation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(null); // designId being exported

  const fetchDesigns = useCallback(async (cont = null) => {
    const url = '/api/canva/designs' + (cont ? `?continuation=${encodeURIComponent(cont)}` : '');
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to load designs');
    return data;
  }, []);

  useEffect(() => {
    fetchDesigns()
      .then((data) => {
        setDesigns(data.items ?? []);
        setContinuation(data.continuation ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchDesigns]);

  async function loadMore() {
    if (!continuation || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchDesigns(continuation);
      setDesigns((prev) => [...prev, ...(data.items ?? [])]);
      setContinuation(data.continuation ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function selectDesign(design) {
    setExporting(design.id);
    try {
      const res = await fetch('/api/canva/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId: design.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Export failed');
      onSelect(data.url, design.title ?? 'Canva design');
    } catch (err) {
      setError(err.message);
      setExporting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#7d2ae8' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900">Pick from Canva</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-[#7d2ae8] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading your designs…</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {!loading && !error && designs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm font-semibold text-gray-700">No designs found</p>
              <p className="text-xs text-gray-400">Create a design in Canva and it will appear here.</p>
            </div>
          )}

          {!loading && designs.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {designs.map((design) => {
                  const isExporting = exporting === design.id;
                  return (
                    <button
                      key={design.id}
                      onClick={() => !exporting && selectDesign(design)}
                      disabled={!!exporting}
                      className="group relative flex flex-col rounded-2xl overflow-hidden border border-gray-100 hover:border-[#7d2ae8]/40 hover:shadow-md transition-all disabled:opacity-60 text-left"
                    >
                      <div className="aspect-video bg-gray-50 overflow-hidden relative">
                        {design.thumbnail?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={design.thumbnail.url}
                            alt={design.title ?? 'Design'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                        )}
                        {isExporting && (
                          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-1.5">
                            <div className="w-5 h-5 border-2 border-[#7d2ae8] border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] text-[#7d2ae8] font-semibold">Exporting…</span>
                          </div>
                        )}
                      </div>
                      <div className="px-2.5 py-2">
                        <p className="text-[11px] font-semibold text-gray-700 truncate">
                          {design.title ?? 'Untitled'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {continuation && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-5 py-2 rounded-full border border-gray-200 text-sm text-gray-600 hover:border-[#7d2ae8]/40 hover:text-[#7d2ae8] transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CreatePostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [aiImageUrl, setAiImageUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [step, setStep] = useState(STEPS.idle);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [canvaConnected, setCanvaConnected] = useState(false);
  const [showCanvaPicker, setShowCanvaPicker] = useState(false);

  useEffect(() => {
    const url = searchParams.get('imageUrl');
    if (url) { setAiImageUrl(url); setPreview(url); }

    if (searchParams.get('canva_connected')) setCanvaConnected(true);
    if (searchParams.get('canva_error')) setError(`Canva: ${searchParams.get('canva_error')}`);

    // Check cookie
    const match = document.cookie.match(/(?:^|;\s*)canva_connected=([^;]*)/);
    if (match) setCanvaConnected(true);
  }, [searchParams]);

  useEffect(() => {
    const input = fileInput.current;
    if (!input) return;
    const handler = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) { setError('Only image files are supported.'); return; }
      setError('');
      setFile(f);
    };
    input.addEventListener('change', handler);
    return () => input.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!file) { if (!aiImageUrl) setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, aiImageUrl]);

  function pickFile(f) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Only image files are supported.'); return; }
    setError('');
    setFile(f);
    setAiImageUrl(null);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  function removeImage(e) {
    e.preventDefault();
    setFile(null); setPreview(null); setAiImageUrl(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function handleCanvaSelect(url) {
    setAiImageUrl(url);
    setPreview(url);
    setFile(null);
    setShowCanvaPicker(false);
    setError('');
  }

  function openCanva() {
    if (canvaConnected) {
      setShowCanvaPicker(true);
    } else {
      window.location.href = '/api/auth/canva';
    }
  }

  async function publish() {
    if (!file && !aiImageUrl) { setError('Please select an image.'); return; }
    setError('');

    try {
      let imageUrl;

      if (aiImageUrl) {
        setStep(STEPS.publishing);
        imageUrl = aiImageUrl;
      } else {
        setStep(STEPS.uploading);
        setStatusMsg('Uploading image…');
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
        imageUrl = uploadData.url;
      }

      setStep(STEPS.publishing);

      if (platform === 'instagram' || platform === 'both') {
        setStatusMsg('Publishing to Instagram…');
        const res = await fetch('/api/instagram/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, caption }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Instagram publish failed');
      }

      if (platform === 'facebook' || platform === 'both') {
        setStatusMsg('Publishing to Facebook…');
        const res = await fetch('/api/facebook/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, caption }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Facebook publish failed');
      }

      if (platform === 'linkedin') {
        setStatusMsg('Publishing to LinkedIn…');
        const orgId = localStorage.getItem('li_org_id') || null;
        const res = await fetch('/api/linkedin/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, caption, orgId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'LinkedIn publish failed');
      }

      if (platform === 'all') {
        setStatusMsg('Publishing to Instagram…');
        const igRes = await fetch('/api/instagram/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, caption }),
        });
        const igData = await igRes.json();
        if (!igRes.ok) throw new Error(igData.error || 'Instagram publish failed');

        setStatusMsg('Publishing to Facebook…');
        const fbRes = await fetch('/api/facebook/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, caption }),
        });
        const fbData = await fbRes.json();
        if (!fbRes.ok) throw new Error(fbData.error || 'Facebook publish failed');

        if (imageUrl) {
          setStatusMsg('Publishing to LinkedIn…');
          const orgId = localStorage.getItem('li_org_id') || null;
          const liRes = await fetch('/api/linkedin/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl, caption, orgId }),
          });
          const liData = await liRes.json();
          if (!liRes.ok) throw new Error(liData.error || 'LinkedIn publish failed');
        }
      }

      setStep(STEPS.done);
      setTimeout(() => router.push('/posts'), 2000);
    } catch (err) {
      setError(err.message);
      setStep(STEPS.idle);
      setStatusMsg('');
    }
  }

  const isBusy = step === STEPS.uploading || step === STEPS.publishing;

  return (
    <div className="max-w-5xl mx-auto">
      {step === STEPS.done ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-lord-card rounded-[32px] shadow-sm">
          <div className="w-16 h-16 rounded-[32px] bg-green-50 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-lord-text-main mb-1">Published!</h2>
          <p className="text-lord-text-muted text-sm">Redirecting to Posts…</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Left: Image upload */}
            <div className="bg-lord-card rounded-[32px] shadow-sm p-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-lord-text-main">Image</label>
                {/* Source buttons */}
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="file-upload"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer transition-colors ${
                      isBusy ? 'opacity-50 pointer-events-none' : 'border-gray-200 text-gray-500 hover:border-lord-green hover:text-lord-green'
                    }`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Upload
                  </label>
                  <button
                    onClick={openCanva}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 text-[11px] font-semibold transition-colors hover:border-[#7d2ae8]/60 hover:text-[#7d2ae8] disabled:opacity-50"
                  >
                    {/* Canva logo mark */}
                    <svg width="10" height="10" viewBox="0 0 30 30" fill="none">
                      <circle cx="15" cy="15" r="15" fill="#7d2ae8"/>
                      <path d="M19.5 10.5C18.1 9.1 16.1 8.5 14 9c-3.3.8-5.5 4-5 7.4.4 2.7 2.4 4.9 5 5.5 1 .2 2 .2 3-.1v-2c-.8.3-1.7.4-2.6.2-1.8-.4-3.2-1.8-3.5-3.6-.4-2.4 1.1-4.7 3.4-5.3 1.4-.4 2.8 0 3.8 1l1.4-2.1z" fill="white"/>
                    </svg>
                    {canvaConnected ? 'From Canva' : 'Connect Canva'}
                  </button>
                  <a
                    href="/create/ai"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 text-[11px] font-semibold transition-colors hover:border-lord-green hover:text-lord-green"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    AI
                  </a>
                </div>
              </div>

              <input ref={fileInput} id="file-upload" type="file" accept="image/jpeg,image/png,image/webp" disabled={isBusy} className="hidden" />

              {preview ? (
                <div className="relative aspect-square rounded-[24px] overflow-hidden bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={removeImage} disabled={isBusy} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-lord-card shadow-md flex items-center justify-center text-lord-text-muted hover:text-red-500 transition-all disabled:opacity-40">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="file-upload"
                  onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className={`aspect-square rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors select-none ${isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${dragging ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50/40'}`}
                >
                  <div className="w-14 h-14 rounded-[20px] bg-lord-card shadow-sm flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-lord-text-main">Drop image here</p>
                    <p className="text-xs text-lord-text-muted mt-0.5">or click to browse · or use the buttons above</p>
                  </div>
                  <p className="text-xs text-lord-text-muted">JPEG · PNG · WebP</p>
                </label>
              )}
            </div>

            {/* Right: Caption + actions */}
            <div className="bg-lord-card rounded-[32px] shadow-sm p-6 flex flex-col space-y-5">

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-lord-text-main">Publish to</label>
                <div className="relative">
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    disabled={isBusy}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-lord-text-main focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 transition-colors disabled:opacity-50 pr-9"
                  >
                    {PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <label className="block text-sm font-semibold text-lord-text-main">Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption…"
                  rows={8}
                  maxLength={2200}
                  disabled={isBusy}
                  className="w-full bg-gray-50 border border-gray-200 rounded-[20px] px-4 py-3 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 transition-colors resize-none disabled:opacity-50"
                />
                <div className="flex justify-end">
                  <span className="text-xs text-lord-text-muted">{caption.length}/2200</span>
                </div>
              </div>

              {error && <div className="p-3 rounded-[20px] bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

              {isBusy && (
                <div className="flex items-center gap-3 p-4 rounded-[20px] bg-green-50 border border-green-100">
                  <div className="w-4 h-4 border-2 border-lord-green border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <p className="text-sm text-green-700">{statusMsg}</p>
                </div>
              )}

              <button
                onClick={publish}
                disabled={isBusy || (!file && !aiImageUrl)}
                className="w-full py-3 bg-lord-green hover:bg-lord-green-dark text-white rounded-[24px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isBusy ? statusMsg || 'Publishing…' : `Publish to ${PLATFORM_OPTIONS.find(o => o.value === platform)?.label}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCanvaPicker && (
        <CanvaPickerModal
          onSelect={handleCanvaSelect}
          onClose={() => setShowCanvaPicker(false)}
        />
      )}
    </div>
  );
}
