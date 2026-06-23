'use client';

import Cropper from 'react-easy-crop';
import { Spinner, UploadIcon, usePhotoCropper } from '@/lib/photo/useCropUpload';

const DARK_GREEN = '#0A1F14';
const GOLD = '#D4A83A';
const CREAM = '#F2E8D0';

interface PhotoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  aspectRatio: number;
  label: string;
  uploadPathPrefix?: string;
}

export default function PhotoUpload({ value, onChange, aspectRatio, label, uploadPathPrefix }: PhotoUploadProps) {
  const cropper = usePhotoCropper();
  const { imageSrc, crop, setCrop, zoom, setZoom, croppedAreaPixels, onCropComplete, uploading, error } = cropper;

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    cropper.setUploading(true);
    cropper.setError(null);

    try {
      const blob = await cropper.getCroppedBlob({ quality: 0.85 });
      if (!blob) throw new Error('Failed to process image.');

      const body = new FormData();
      body.append('file', blob, 'photo.jpg');
      if (value) body.append('oldUrl', value);
      if (uploadPathPrefix) body.append('pathPrefix', uploadPathPrefix);

      const res = await fetch('/admin/api/upload-photo', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to upload photo.');

      onChange(json.url);
      cropper.closeCropModal();
    } catch (err: any) {
      cropper.setError(err?.message || 'Failed to upload photo.');
    } finally {
      cropper.setUploading(false);
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
            onClick={() => cropper.fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') cropper.fileInputRef.current?.click();
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
          onClick={() => cropper.fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') cropper.fileInputRef.current?.click();
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
        ref={cropper.fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={cropper.handleFileSelect}
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
                onClick={cropper.closeCropModal}
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
