interface ButtonProps {
  href: string;
  variant: 'solid' | 'ghost';
  children: React.ReactNode;
}

// Pill button. Hover/focus states live in design.css (.mr-btn-solid / .mr-btn-ghost).
export default function Button({ href, variant, children }: ButtonProps) {
  return (
    <a href={href} className={`mr-btn mr-btn-${variant}`}>
      {children}
    </a>
  );
}
