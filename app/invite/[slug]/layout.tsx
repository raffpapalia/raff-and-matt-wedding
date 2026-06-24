import localFont from 'next/font/local';
import './v4/design.css';

// Self-hosted — see ./fonts/. Swapped from next/font/google because the
// build-time fetch to fonts.gstatic.com is not guaranteed to succeed in every
// production build environment; a failed fetch there silently drops the
// @font-face rule (the CSS variable name still gets referenced everywhere,
// but never defined), so every guest phase falls back to the browser's
// default serif. Fraunces and Bricolage Grotesque are both variable fonts —
// one file each covers the full weight (and, for Fraunces, opsz) range,
// which also fixes Bricolage previously being loaded as 3 separate static
// weight instances (500/700/800) instead of one variable file.
const fraunces = localFont({
  src: [
    { path: './fonts/fraunces-normal-variable.woff2', weight: '100 900', style: 'normal' },
    { path: './fonts/fraunces-italic-variable.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

const bricolage = localFont({
  src: './fonts/bricolage-grotesque-variable.woff2',
  weight: '200 800',
  style: 'normal',
  variable: '--font-bricolage',
  display: 'swap',
});

const dmMono = localFont({
  src: [
    { path: './fonts/dm-mono-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/dm-mono-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-dm-mono',
  display: 'swap',
});

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fraunces.variable} ${bricolage.variable} ${dmMono.variable} mr-v4`}
      style={{ backgroundColor: '#0A1F14', minHeight: '100vh' }}
    >
      {/* Shared duotone filter for v4 TreatedPhoto — defined once, referenced via filter:url(#mr-duotone) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="mr-duotone">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR tableValues="0.043 0.965" />
            <feFuncG tableValues="0.180 0.933" />
            <feFuncB tableValues="0.133 0.867" />
          </feComponentTransfer>
        </filter>
      </svg>
      {children}
    </div>
  );
}
