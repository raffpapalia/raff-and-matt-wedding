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

// Only plain path segments, no traversal or absolute paths.
const SAFE_PATH_PREFIX = /^[a-zA-Z0-9/_-]+$/;

function sanitizePathPrefix(prefix: unknown): string | null {
  if (typeof prefix !== 'string' || !prefix) return null;
  if (!SAFE_PATH_PREFIX.test(prefix) || prefix.includes('..')) return null;
  return prefix;
}

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured for writes: SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const oldUrl = formData.get('oldUrl');
  const pathPrefix = sanitizePathPrefix(formData.get('pathPrefix'));

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: 'Invalid file type. Please upload a JPG, PNG or WebP image.' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
  }

  if (typeof oldUrl === 'string' && oldUrl.includes('supabase.co/storage')) {
    const oldPath = storagePathFromUrl(oldUrl);
    if (oldPath) {
      const removeRes = await supabaseServer.storage.from(BUCKET).remove([oldPath]);
      if (removeRes.error) {
        console.error('[admin:upload-photo] failed to delete old photo', removeRes.error);
      }
    }
  }

  const filename = pathPrefix ? `${pathPrefix}-${Date.now()}.${extension}` : `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadRes = await supabaseServer.storage.from(BUCKET).upload(filename, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadRes.error) {
    console.error('[admin:upload-photo] upload failed', uploadRes.error);
    return NextResponse.json({ error: 'Failed to upload photo.' }, { status: 500 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;

  return NextResponse.json({ url: publicUrl });
}
