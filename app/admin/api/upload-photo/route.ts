import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

const BUCKET = 'household-photos';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
}

function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ message: 'Server not configured for writes: SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const oldUrl = formData.get('oldUrl');

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: 'No file provided.' }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ message: 'Unsupported file type. Please upload a JPG, PNG, or WEBP image.' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ message: 'File is too large. Maximum size is 5MB.' }, { status: 400 });
  }

  const path = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadRes = await supabaseServer.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadRes.error) {
    console.error('[admin:upload-photo] upload failed', uploadRes.error);
    return NextResponse.json({ message: 'Failed to upload photo.' }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseServer.storage.from(BUCKET).getPublicUrl(path);

  if (typeof oldUrl === 'string' && oldUrl) {
    const oldPath = storagePathFromUrl(oldUrl);
    if (oldPath) {
      const removeRes = await supabaseServer.storage.from(BUCKET).remove([oldPath]);
      if (removeRes.error) {
        console.error('[admin:upload-photo] failed to delete old photo', removeRes.error);
      }
    }
  }

  return NextResponse.json({ url: publicUrlData.publicUrl });
}
