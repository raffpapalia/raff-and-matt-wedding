'use client';

import ImmediatePhotoUpload from './ImmediatePhotoUpload';

interface CouplePhotoUploadProps {
  currentUrl: string;
  onSaved: (url: string) => void;
}

export default function CouplePhotoUpload({ currentUrl, onSaved }: CouplePhotoUploadProps) {
  return (
    <ImmediatePhotoUpload
      settingsKey="couple_photo_url"
      pathPrefix="settings/couple-photo"
      aspectRatio={3 / 4}
      currentUrl={currentUrl}
      onSaved={onSaved}
    />
  );
}
