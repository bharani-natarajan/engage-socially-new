'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const STEPS = { idle: 'idle', uploading: 'uploading', publishing: 'publishing', done: 'done' };

export default function CreatePostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [aiImageUrl, setAiImageUrl] = useState(null); // pre-filled from AI generator
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState(STEPS.idle);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  // Pre-fill from AI generator via ?imageUrl=...
  useEffect(() => {
    const url = searchParams.get('imageUrl');
    if (url) { setAiImageUrl(url); setPreview(url); }
  }, [searchParams]);

  // Bypass React's synthetic event system — attach native listener directly.
  // React's event delegation can misfire for file inputs when the page is
  // served through a proxy/tunnel (e.g. ngrok).
  useEffect(() => {
    const input = fileInput.current;
    if (!input) return;
    const handler = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) {
        setError('Only image files are supported.');
        return;
      }
      setError('');
      setFile(f);
    };
    input.addEventListener('change', handler);
    return () => input.removeEventListener('change', handler);
  }, []);

  // Derive preview URL after `file` state is committed to React.
  useEffect(() => {
    if (!file) {
      if (!aiImageUrl) setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, aiImageUrl]);

  function pickFile(f) {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Only image files are supported.');
      return;
    }
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
    setFile(null);
    setPreview(null);
    setAiImageUrl(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function publish() {
    if (!file && !aiImageUrl) {
      setError('Please select an image.');
      return;
    }
    setError('');

    try {
      let imageUrl;

      if (aiImageUrl) {
        // AI-generated image — already hosted, skip upload
        setStep(STEPS.publishing);
        imageUrl = aiImageUrl;
      } else {
        // Step 1: Upload image
        setStep(STEPS.uploading);
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
        imageUrl = uploadData.url;
      }

      // Step 2: Publish to Instagram
      setStep(STEPS.publishing);
      const publishRes = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, caption }),
      });
      const publishData = await publishRes.json();
      if (publishRes.status === 401) throw new Error('Not authenticated — please reconnect your Instagram account from the sidebar.');
      if (!publishRes.ok) throw new Error(publishData.error || 'Publish failed');

      setStep(STEPS.done);
      setTimeout(() => router.push('/posts'), 2000);
    } catch (err) {
      setError(err.message);
      setStep(STEPS.idle);
    }
  }

  const isBusy = step === STEPS.uploading || step === STEPS.publishing;

  return (
    <div className="max-w-5xl mx-auto">
      {step === STEPS.done ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Published!</h2>
          <p className="text-gray-400 text-sm">Redirecting to Posts…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Image upload */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <label className="block text-sm font-semibold text-gray-800">Image</label>
            <input ref={fileInput} id="file-upload" type="file" accept="image/jpeg,image/png,image/webp" disabled={isBusy} className="hidden" />

            {preview ? (
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={removeImage} disabled={isBusy} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-red-500 transition-all disabled:opacity-40">
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
                className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors select-none ${isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${dragging ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50/40'}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Drop image here</p>
                  <p className="text-xs text-gray-400 mt-0.5">or click to browse</p>
                </div>
                <p className="text-xs text-gray-400">JPEG · PNG · WebP · max 8 MB</p>
              </label>
            )}
          </div>

          {/* Right: Caption + actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col space-y-5">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-semibold text-gray-800">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption…"
                rows={8}
                maxLength={2200}
                disabled={isBusy}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 transition-colors resize-none disabled:opacity-50"
              />
              <div className="flex justify-end">
                <span className="text-xs text-gray-400">{caption.length}/2200</span>
              </div>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

            {isBusy && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <p className="text-sm text-green-700">{step === STEPS.uploading ? 'Uploading image…' : 'Publishing to Instagram…'}</p>
              </div>
            )}

            <button
              onClick={publish}
              disabled={isBusy || (!file && !aiImageUrl)}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-green-500/30"
            >
              {isBusy ? 'Publishing…' : 'Publish Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
