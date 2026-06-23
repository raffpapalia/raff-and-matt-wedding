import { Fraunces, Bricolage_Grotesque, DM_Mono } from 'next/font/google';
import './v4/design.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-bricolage',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
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
