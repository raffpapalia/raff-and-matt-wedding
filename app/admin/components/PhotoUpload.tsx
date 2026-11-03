'use client';

import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Spinner, UploadIcon, usePhotoCropper } from '@/lib/photo/useCropUpload';

export interface AspectOption {
  label: string;
  ratio: number;
}

interface PhotoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  aspectRatio: number;
  label: string;
  uploadPathPrefix?: string;
  // When set, the crop step offers these shapes (e.g. landscape / portrait) and starts on
  // whichever is closest to the chosen image. The saved photo is then shown at its own
  // shape instead of being boxed into `aspectRatio`, which only sizes the empty state.
  aspectOptions?: AspectOption[];
}

export default function PhotoUpload({ value, onChange, aspectRatio, label, uploadPathPrefix, aspectOptions }: PhotoUploadProps) {
  const cropper = usePhotoCropper();
  const { imageSrc, crop, setCrop, zoom, setZoom, croppedAreaPixels, onCropComplete, uploading, error } = cropper;
  const [optionIndex, setOptionIndex] = useState(0);
  const cropAspect = aspectOptions ? aspectOptions[optionIndex].ratio : aspectRatio;
  const naturalPreview = Boolean(aspectOptions);

  useEffect(() => {
    if (!imageSrc || !aspectOptions) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const imageRatio = img.naturalWidth / img.naturalHeight;
      let best = 0;
      let bestDistance = Infinity;
      aspectOptions.forEach((opt, i) => {
        const distance = Math.abs(Math.log(opt.ratio / imageRatio));
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setOptionIndex(best);
    };
    img.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc, aspectOptions]);

  function chooseOption(i: number) {
    setOptionIndex(i);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

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
    <div className="space-y-3 text-sm text-admin-ink">
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
            className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-admin-sand/30 bg-admin-ink/5 ${
              naturalPreview ? 'w-fit max-w-full' : 'w-full max-w-md'
            }`}
            style={naturalPreview ? undefined : { aspectRatio }}
          >
            <img
              src={value}
              alt={label}
              className={naturalPreview ? 'block max-h-56 w-auto max-w-full' : 'h-full w-full object-cover'}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100 group-active:bg-black/50 group-active:opacity-100">
              <span className="rounded-full bg-admin-green px-4 py-2 text-sm font-semibold text-admin-bone">
                Change photo
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-admin-ink/60 underline transition hover:opacity-80"
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
          className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-admin-ink/25 text-admin-ink/60 transition hover:border-admin-green/60"
          style={{ aspectRatio }}
        >
          <UploadIcon />
          <span className="text-sm">Upload photo</span>
        </div>
      )}

      {error && !imageSrc ? (
        <p className="text-xs text-admin-persimmon">{error}</p>
      ) : null}

      <input
        ref={cropper.fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={cropper.handleFileSelect}
        className="hidden"
      />

      {imageSrc ? (
        /* Crop modal deliberately stays dark — focused editing surface. */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-admin-ink p-6">
            <p className="mb-4 text-sm font-semibold text-admin-bone">Crop {label.toLowerCase()}</p>
            <div className="relative h-80 w-full overflow-hidden rounded-xl bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={cropAspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            {aspectOptions && aspectOptions.length > 1 ? (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.25em] text-admin-bone/50">Shape</span>
                <div className="flex gap-2" role="radiogroup" aria-label="Crop shape">
                  {aspectOptions.map((opt, i) => (
                    <button
                      key={opt.label}
                      type="button"
                      role="radio"
                      aria-checked={optionIndex === i}
                      onClick={() => chooseOption(i)}
                      className={`rounded-full px-4 py-1.5 text-xs transition ${
                        optionIndex === i
                          ? 'bg-admin-green font-semibold text-admin-bone'
                          : 'border border-admin-bone/30 text-admin-bone hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.25em] text-admin-bone/50">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-admin-green"
              />
            </div>
            {error ? (
              <div className="mt-4 rounded-xl bg-admin-persimmon/10 px-4 py-3 text-sm text-admin-persimmon">{error}</div>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={uploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-admin-green px-5 py-3 text-sm font-semibold text-admin-bone transition disabled:cursor-not-allowed disabled:opacity-70"
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
                className="rounded-full border border-admin-bone/30 px-5 py-3 text-sm text-admin-bone transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
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
