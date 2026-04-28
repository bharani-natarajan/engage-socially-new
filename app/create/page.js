'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const STEPS = { idle: 'idle', uploading: 'uploading', publishing: 'publishing', done: 'done' };

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  { value: 'facebook',  label: 'Facebook',  color: 'bg-[#1877F2]' },
  { value: 'both',      label: 'Instagram + Facebook', color: 'bg-lord-green' },
];

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

  useEffect(() => {
    const url = searchParams.get('imageUrl');
    if (url) { setAiImageUrl(url); setPreview(url); }
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
        const liOrgId = localStorage.getItem('li_org_id');
        const orgUrn = liOrgId ? `urn:li:organization:${liOrgId}` : null;
        const res = await fetch('/api/linkedin/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, caption, orgUrn }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'LinkedIn publish failed');
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
              <label className="block text-sm font-semibold text-lord-text-main">Image</label>
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
                    <p className="text-xs text-lord-text-muted mt-0.5">or click to browse</p>
                  </div>
                  <p className="text-xs text-lord-text-muted">JPEG · PNG · WebP</p>
                </label>
              )}
            </div>

            {/* Right: Caption + actions */}
            <div className="bg-lord-card rounded-[32px] shadow-sm p-6 flex flex-col space-y-5">

              {/* Publish to dropdown */}
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
    </div>
  );
}
