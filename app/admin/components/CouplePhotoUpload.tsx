'use client';

import { ChangeEvent, useCallback, useRef, useState } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_DIMENSION = 1600;
const ASPECT_RATIO = 3 / 4;

interface CouplePhotoUploadProps {
  currentUrl: string;
  onSaved: (url: string) => void;
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

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9));
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

export default function CouplePhotoUpload({ currentUrl, onSaved }: CouplePhotoUploadProps) {
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
      if (currentUrl) body.append('oldUrl', currentUrl);
      body.append('pathPrefix', 'settings/couple-photo');

      const uploadRes = await fetch('/admin/api/upload-photo', { method: 'POST', body });
      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadJson?.error || 'Failed to upload photo.');

      const publicUrl = uploadJson.url as string;

      const settingsRes = await fetch('/admin/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_photo_url: publicUrl }),
      });
      const settingsJson = await settingsRes.json().catch(() => ({}));
      if (!settingsRes.ok) throw new Error(settingsJson?.message || 'Failed to save couple photo.');

      onSaved(publicUrl);
      closeCropModal();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 text-sm text-slate-300">
      {currentUrl ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className="group relative w-full max-w-xs cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90"
          style={{ aspectRatio: ASPECT_RATIO }}
        >
          <img src={currentUrl} alt="Couple photo" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100 group-active:bg-black/50 group-active:opacity-100">
            <span className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950">
              Change photo
            </span>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className="flex w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 text-slate-500 transition hover:border-amber-300/60"
          style={{ aspectRatio: ASPECT_RATIO }}
        >
          <UploadIcon />
          <span className="text-sm">Upload couple photo</span>
        </div>
      )}

      {error && !imageSrc ? <p className="text-xs text-rose-400">{error}</p> : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {imageSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-6">
            <p className="mb-4 text-sm font-semibold text-white">Crop couple photo</p>
            <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ height: 400 }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={ASPECT_RATIO}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.25em] text-slate-500">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-amber-300"
              />
            </div>
            {error ? (
              <div className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={uploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {uploading ? (
                  <>
                    <Spinner />
                    Uploading...
                  </>
                ) : (
                  'Confirm crop'
                )}
              </button>
              <button
                type="button"
                onClick={closeCropModal}
                disabled={uploading}
                className="rounded-full border border-white/15 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
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
