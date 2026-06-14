'use client';

import { ChangeEvent, useCallback, useRef, useState } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_DIMENSION = 1600;

const DARK_GREEN = '#0A1F14';
const GOLD = '#D4A83A';
const CREAM = '#F2E8D0';

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

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
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
      setError('Invalid file type. Please upload a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('File too large. Maximum size is 5MB.');
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
      if (!res.ok) throw new Error(json?.error || 'Failed to upload photo.');

      onChange(json.url);
      closeCropModal();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 text-sm" style={{ color: CREAM }}>
      <p>{label}</p>

      {value ? (
        <div className="space-y-2">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            className="group relative w-full max-w-md cursor-pointer overflow-hidden rounded-2xl border"
            style={{ aspectRatio, borderColor: 'rgba(242,232,208,0.15)', backgroundColor: DARK_GREEN }}
          >
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100 group-active:bg-black/50 group-active:opacity-100">
              <span
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: GOLD, color: DARK_GREEN }}
              >
                Change photo
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs underline transition hover:opacity-80"
            style={{ color: CREAM, opacity: 0.6 }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition hover:border-[#D4A83A]/60"
          style={{ aspectRatio, borderColor: 'rgba(242,232,208,0.25)', color: 'rgba(242,232,208,0.6)' }}
        >
          <UploadIcon />
          <span className="text-sm">Upload photo</span>
        </div>
      )}

      {error && !imageSrc ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {imageSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ backgroundColor: DARK_GREEN, border: '1px solid rgba(242,232,208,0.1)' }}>
            <p className="mb-4 text-sm font-semibold" style={{ color: CREAM }}>Crop {label.toLowerCase()}</p>
            <div className="relative h-80 w-full overflow-hidden rounded-xl bg-black">
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
              <span className="text-xs uppercase tracking-[0.25em]" style={{ color: 'rgba(242,232,208,0.5)' }}>Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: GOLD }}
              />
            </div>
            {error ? (
              <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={uploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: GOLD, color: DARK_GREEN }}
              >
                {uploading ? (
                  <>
                    <Spinner />
                    Uploading...
                  </>
                ) : (
                  'Crop & Upload'
                )}
              </button>
              <button
                type="button"
                onClick={closeCropModal}
                disabled={uploading}
                className="rounded-full border px-5 py-3 text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                style={{ borderColor: 'rgba(242,232,208,0.3)', color: CREAM }}
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
