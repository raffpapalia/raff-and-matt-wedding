'use client';

import { ChangeEvent, useCallback, useRef, useState } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_DIMENSION = 1600;

interface PhotoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  aspectRatio: number;
  label: string;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, cropArea: Area): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');

  let outputWidth = cropArea.width;
  let outputHeight = cropArea.height;
  if (outputWidth > MAX_OUTPUT_DIMENSION || outputHeight > MAX_OUTPUT_DIMENSION) {
    const scale = MAX_OUTPUT_DIMENSION / Math.max(outputWidth, outputHeight);
    outputWidth = Math.round(outputWidth * scale);
    outputHeight = Math.round(outputHeight * scale);
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85));
}

export default function PhotoUpload({ value, onChange, aspectRatio, label }: PhotoUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setImageSrc(URL.createObjectURL(file));
  };

  const closeCropModal = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
  };

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    setError(null);

    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      if (!blob) throw new Error('Failed to process image.');

      const body = new FormData();
      body.append('file', blob, 'photo.jpg');
      if (value) body.append('oldUrl', value);

      const res = await fetch('/admin/api/upload-photo', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to upload photo.');

      onChange(json.url);
      closeCropModal();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 text-sm text-slate-100">
      <p>{label}</p>
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90"
        style={{ aspectRatio }}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.25em] text-slate-500">
            No photo
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full border border-white/10 bg-amber-300/15 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-300/20"
        >
          {value ? 'Change photo' : 'Upload photo'}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-full bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/15"
          >
            Remove photo
          </button>
        ) : null}
      </div>

      {error && !imageSrc ? (
        <p className="text-xs" style={{ color: '#C4621A' }}>{error}</p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {imageSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#06120B] p-6 shadow-xl shadow-slate-950/40">
            <p className="mb-4 text-sm font-semibold text-white">Crop {label.toLowerCase()}</p>
            <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-slate-950">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-emerald-400"
              />
            </div>
            {error ? (
              <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={uploading}
                className="flex-1 rounded-3xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {uploading ? 'Uploading...' : 'Save photo'}
              </button>
              <button
                type="button"
                onClick={closeCropModal}
                disabled={uploading}
                className="rounded-3xl border border-white/10 px-5 py-3 text-sm text-white transition hover:bg-white/5 disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
