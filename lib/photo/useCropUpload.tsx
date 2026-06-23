'use client';

import { ChangeEvent, useCallback, useRef, useState } from 'react';
import type { Area, Point } from 'react-easy-crop';

export const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const PHOTO_DEFAULT_MAX_OUTPUT_DIMENSION = 1600;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = url;
  });
}

export async function cropImageToBlob(
  imageSrc: string,
  cropArea: Area,
  options: { maxOutputDimension?: number; quality?: number } = {}
): Promise<Blob | null> {
  const { maxOutputDimension = PHOTO_DEFAULT_MAX_OUTPUT_DIMENSION, quality = 0.85 } = options;
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');

  let outputWidth = cropArea.width;
  let outputHeight = cropArea.height;
  if (outputWidth > maxOutputDimension || outputHeight > maxOutputDimension) {
    const scale = maxOutputDimension / Math.max(outputWidth, outputHeight);
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

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality));
}

export function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

// Shared crop-modal mechanics (image load, file-select/validation, crop state, blob encode)
// used by both PhotoUpload (onChange-batched) and ImmediatePhotoUpload (immediate-PATCH).
// This hook produces a cropped blob — it has no opinion on how the result is saved.
export function usePhotoCropper() {
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

  const handleFileSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!PHOTO_ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > PHOTO_MAX_SIZE_BYTES) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setImageSrc(URL.createObjectURL(file));
  }, []);

  const closeCropModal = useCallback(() => {
    setImageSrc(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const getCroppedBlob = useCallback(
    (options?: { maxOutputDimension?: number; quality?: number }) => {
      if (!imageSrc || !croppedAreaPixels) return Promise.resolve(null);
      return cropImageToBlob(imageSrc, croppedAreaPixels, options);
    },
    [imageSrc, croppedAreaPixels]
  );

  return {
    imageSrc,
    crop,
    setCrop,
    zoom,
    setZoom,
    croppedAreaPixels,
    onCropComplete,
    uploading,
    setUploading,
    error,
    setError,
    fileInputRef,
    handleFileSelect,
    closeCropModal,
    getCroppedBlob,
  };
}
