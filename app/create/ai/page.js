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
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI Post Generator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Drop a product image, describe the scene, get an AI-generated creative</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Input */}
        <div className="space-y-5">
          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {preview ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Product" className="w-full h-full object-contain" />
                <button
                  onClick={() => { setFile(null); setImages([]); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  dragging ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-gray-50 hover:border-violet-400 hover:bg-violet-50/40'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Drop product image here</p>
                  <p className="text-xs text-gray-400 mt-0.5">or click to browse</p>
                </div>
                <p className="text-xs text-gray-400">JPEG · PNG · WebP</p>
              </label>
            )}
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scene Description</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. a modern kitchen with marble countertops and soft natural light coming through the window"
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-colors resize-none"
            />
          </div>

          {/* Style pills */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Quick styles</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_PROMPTS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setPrompt(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    prompt === s.value
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={generating || !file || !prompt.trim()}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-md shadow-violet-500/20 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Creative
              </>
            )}
          </button>
        </div>

        {/* Right: Generated images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Generated Creatives</label>
          {generating ? (
            <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
              <p className="text-sm text-gray-500">Generating your creatives…</p>
              <p className="text-xs text-gray-400">This takes about 15–30 seconds</p>
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {images.map((url, i) => (
                <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Variation ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => useImage(url)}
                      className="px-4 py-2 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                    >
                      Use This
                    </button>
                  </div>
                  <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">No creatives yet</p>
                <p className="text-xs text-gray-400 mt-1">Upload a product image and describe the scene to generate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
