'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const STYLE_PROMPTS = [
  { label: 'Modern Kitchen', value: 'a bright modern kitchen with marble countertops and natural light' },
  { label: 'Outdoor Garden', value: 'a lush green garden with soft sunlight and bokeh background' },
  { label: 'Studio White', value: 'a clean white studio background with soft diffused lighting' },
  { label: 'Wooden Table', value: 'a rustic wooden table with warm ambient lighting' },
  { label: 'Living Room', value: 'a cozy modern living room with warm lighting and neutral tones' },
  { label: 'Dark Luxury', value: 'a dark luxury background with dramatic studio lighting' },
];

export default function AIGeneratePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [dragging, setDragging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(f) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Only image files are supported.'); return; }
    setError('');
    setImages([]);
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function generate() {
    if (!file || !prompt.trim()) {
      setError('Please provide both an image and a prompt.');
      return;
    }
    setError('');
    setGenerating(true);
    setImages([]);

    try {
      // Step 1: Submit job
      const formData = new FormData();
      formData.append('image', file);
      formData.append('prompt', prompt.trim());

      const submitRes = await fetch('/api/generate', { method: 'POST', body: formData });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || 'Submission failed');

      const { pollingUrl } = submitData;

      // Step 2: Poll until ready (max ~105 seconds, 7s intervals)
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 7000));
        const statusRes = await fetch(`/api/generate/status?url=${encodeURIComponent(pollingUrl)}`);
        const statusData = await statusRes.json();

        if (!statusRes.ok) throw new Error(statusData.error || 'Status check failed');

        if (statusData.status === 'ready') {
          setImages([statusData.imageUrl]);
          return;
        }
        if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Generation failed');
        }
        // 'pending' — keep polling
      }
      throw new Error('Generation timed out after 90 seconds');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function useImage(url) {
    router.push(`/create?imageUrl=${encodeURIComponent(url)}`);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="bg-lord-card rounded-[32px] border border-none shadow-sm shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-lord-text-main mb-2">Product Image</label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
            {preview ? (
              <div className="relative rounded-[32px] overflow-hidden border border-none shadow-sm bg-gray-50 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Product" className="w-full h-full object-contain" />
                <button onClick={() => { setFile(null); setImages([]); }} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-lord-card shadow-md flex items-center justify-center text-lord-text-muted hover:text-red-500 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <label
                onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-square rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${dragging ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50/40'}`}
              >
                <div className="w-14 h-14 rounded-[32px] bg-lord-card shadow-sm border border-none shadow-sm flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-lord-text-main">Drop product image here</p>
                  <p className="text-xs text-lord-text-muted mt-0.5">or click to browse</p>
                </div>
                <p className="text-xs text-lord-text-muted">JPEG · PNG · WebP</p>
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-lord-text-main mb-2">Scene Description</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. a modern kitchen with marble countertops and soft natural light" rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-[24px] px-4 py-3 text-sm text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 transition-colors resize-none" />
          </div>

          <div>
            <p className="text-xs text-lord-text-muted mb-2 font-medium">Quick styles</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_PROMPTS.map((s) => (
                <button key={s.label} onClick={() => setPrompt(s.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${prompt === s.value ? 'bg-lord-green text-white border-lord-green' : 'bg-lord-card text-gray-600 border-gray-200 hover:border-green-300 hover:text-lord-green-dark'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="p-3 rounded-[24px] bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

          <button onClick={generate} disabled={generating || !file || !prompt.trim()} className="w-full py-3 bg-lord-green hover:bg-lord-green-dark text-white rounded-[24px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-green-500/30 flex items-center justify-center gap-2">
            {generating ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Generate Creative</>
            )}
          </button>
        </div>

        {/* Right: Result */}
        <div className="bg-lord-card rounded-[32px] border border-none shadow-sm shadow-sm p-6">
          <label className="block text-sm font-semibold text-lord-text-main mb-4">Generated Creative</label>
          {generating ? (
            <div className="aspect-square rounded-[32px] border-2 border-dashed border-none shadow-sm bg-gray-50 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-[3px] border-lord-green border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-lord-text-muted font-medium">Generating creative…</p>
              <p className="text-xs text-lord-text-muted">This takes about 30–60 seconds</p>
            </div>
          ) : images.length > 0 ? (
            <div className="flex justify-center">
              {images.map((url, i) => (
                <div key={i} className="group relative aspect-square w-full rounded-[24px] overflow-hidden border border-none shadow-sm bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Generated creative" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => useImage(url)} className="px-4 py-2 bg-lord-green text-white text-sm font-semibold rounded-[24px] hover:bg-lord-green-dark transition-colors shadow-lg">
                      Use This
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-square rounded-[32px] border-2 border-dashed border-none shadow-sm bg-gray-50 flex flex-col items-center justify-center gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-[32px] bg-lord-card border border-none shadow-sm shadow-sm flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">No creative yet</p>
                <p className="text-xs text-lord-text-muted mt-1">Upload an image and describe the scene</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
