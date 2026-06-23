'use client';

import { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Scroll-reveal wrapper, ported from the mockup's IntersectionObserver script:
// fades/slides an element in once it crosses ~12% into the viewport, then stops observing it.
export default function Reveal({ children, className, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isIn, setIsIn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIn(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal${isIn ? ' in' : ''}${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  );
}
