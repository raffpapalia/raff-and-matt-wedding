import './perforation.css';

// Ticket perforation row. Pass `notch` as the surface colour behind the card so the
// notches read as holes cut out of its edges. The inset defaults to 32px; override
// it from CSS with --perf-inset on an ancestor (e.g. a narrower mobile padding).
export default function Perforation({ notch }: { notch?: string }) {
  return (
    <div
      className="mr-perforation"
      aria-hidden="true"
      style={notch ? ({ '--perf-notch': notch } as React.CSSProperties) : undefined}
    >
      <div className="mr-perforation__rule" />
    </div>
  );
}
