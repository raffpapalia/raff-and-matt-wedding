'use client';

import Cropper from 'react-easy-crop';
import { PHOTO_DEFAULT_MAX_OUTPUT_DIMENSION, Spinner, UploadIcon, usePhotoCropper } from '@/lib/photo/useCropUpload';

interface ImmediatePhotoUploadProps {
  settingsKey: string;
  pathPrefix: string;
  aspectRatio: number;
  currentUrl: string;
  onSaved: (url: string) => void;
  maxOutputDimension?: number;
}

// Crop-and-upload flow shared by every settings-driven photo slot (couple photo, story
// photo, band photo, ...). Uploads to the household-photos bucket under pathPrefix, then
// immediately PATCHes { [settingsKey]: url } to /admin/api/settings — no separate "Save"
// step, unlike the form-batched PhotoUpload.tsx used elsewhere in this file.
export default function ImmediatePhotoUpload({
  settingsKey,
  pathPrefix,
  aspectRatio,
  currentUrl,
  onSaved,
  maxOutputDimension = PHOTO_DEFAULT_MAX_OUTPUT_DIMENSION,
}: ImmediatePhotoUploadProps) {
  const cropper = usePhotoCropper();
  const { imageSrc, crop, setCrop, zoom, setZoom, croppedAreaPixels, onCropComplete, uploading, error } = cropper;

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    cropper.setUploading(true);
    cropper.setError(null);

    try {
      const blob = await cropper.getCroppedBlob({ maxOutputDimension, quality: 0.9 });
      if (!blob) throw new Error('Failed to process image.');

      const body = new FormData();
      body.append('file', blob, 'photo.jpg');
      if (currentUrl) body.append('oldUrl', currentUrl);
      body.append('pathPrefix', pathPrefix);

      const uploadRes = await fetch('/admin/api/upload-photo', { method: 'POST', body });
      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadJson?.error || 'Failed to upload photo.');

      const publicUrl = uploadJson.url as string;

      const settingsRes = await fetch('/admin/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingsKey]: publicUrl }),
      });
      const settingsJson = await settingsRes.json().catch(() => ({}));
      if (!settingsRes.ok) throw new Error(settingsJson?.message || 'Failed to save photo.');

      onSaved(publicUrl);
      cropper.closeCropModal();
    } catch (err: any) {
      cropper.setError(err?.message || 'Failed to upload photo.');
    } finally {
      cropper.setUploading(false);
    }
  };

  return (
    <div className="space-y-3 text-sm text-slate-300">
      {currentUrl ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => cropper.fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') cropper.fileInputRef.current?.click();
          }}
          className="group relative w-full max-w-xs cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90"
          style={{ aspectRatio }}
        >
          <img src={currentUrl} alt="" className="h-full w-full object-cover" />
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
          onClick={() => cropper.fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') cropper.fileInputRef.current?.click();
          }}
          className="flex w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 text-slate-500 transition hover:border-amber-300/60"
          style={{ aspectRatio }}
        >
          <UploadIcon />
          <span className="text-sm">Upload photo</span>
        </div>
      )}

      {error && !imageSrc ? <p className="text-xs text-rose-400">{error}</p> : null}

      <input
        ref={cropper.fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={cropper.handleFileSelect}
        className="hidden"
      />

      {imageSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-6">
            <p className="mb-4 text-sm font-semibold text-white">Crop photo</p>
            <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ height: 400 }}>
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
                onClick={cropper.closeCropModal}
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
