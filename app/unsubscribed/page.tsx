export const metadata = { title: 'Unsubscribed — Matt & Raff' };

export default function UnsubscribedPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F6EEDD',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '420px', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '28px',
            color: '#0B2118',
            marginBottom: '16px',
          }}
        >
          You&apos;re unsubscribed
        </h1>
        <p
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#0B2118',
          }}
        >
          You won&apos;t receive any more email updates from us. Your invite link still works, and this
          doesn&apos;t affect any text messages. If this was a mistake, just reply to any of our emails and
          we&apos;ll turn it back on.
        </p>
      </div>
    </div>
  );
}
