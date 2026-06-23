import Stamp from './Stamp';

interface BoardingPassProps {
  serial: string;
  coupleNames: string;
  admitting: string;
  date: string;
  doors: string;
  venue: string;
  hashtag: string;
  stampLine?: string;
  stampSub?: string;
  // "10 · 07 · 27" — the stub's short date, kept distinct from `date` (which is
  // the longer "Sat 10 Jul 2027" shown in the meta row).
  stubDate: string;
}

// Smaller "boarding pass" card for the pre-wedding page — same bone/ink/persimmon
// ticket language as the invitation's Ticket, but more compact (max-width ~580px)
// and with a confirmed-guests stub instead of an RSVP CTA.
export default function BoardingPass({
  serial,
  coupleNames,
  admitting,
  date,
  doors,
  venue,
  hashtag,
  stampLine,
  stampSub,
  stubDate,
}: BoardingPassProps) {
  const [name1, name2] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];
  const seal = `${name1[0] || ''}&${name2[0] || ''}`;

  return (
    <div className="mr-pass">
      <div className="mr-pass-main">
        <div className="mr-pass-toprow">
          <span>{serial}</span>
          <span className="mr-pass-toprow-r">{coupleNames}</span>
        </div>
        <div className="mr-pass-label">Admitting</div>
        <div className="mr-pass-who">{admitting}</div>
        <div className="mr-pass-meta">
          <div>
            <div className="mr-pass-meta-l">Date</div>
            <div className="mr-pass-meta-v">{date}</div>
          </div>
          <div>
            <div className="mr-pass-meta-l">Doors</div>
            <div className="mr-pass-meta-v">{doors}</div>
          </div>
          <div>
            <div className="mr-pass-meta-l">Venue</div>
            <div className="mr-pass-meta-v">{venue}</div>
          </div>
        </div>
        <div className="mr-pass-barcode" aria-hidden="true" />
        <div className="mr-pass-barcode-cap">{hashtag}</div>
        {stampLine && <Stamp line={stampLine} sub={stampSub} />}
      </div>
      <div className="mr-pass-perf">
        <span className="mr-pass-notch-b" />
      </div>
      <div className="mr-pass-stub">
        <div className="mr-pass-seal">{seal}</div>
        <div className="mr-pass-conf">Confirmed ✓</div>
        <div className="mr-pass-sd">{stubDate}</div>
      </div>
    </div>
  );
}
