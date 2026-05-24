export default function TestPage() {
  return (
    <div style={{ background: '#0A1F14', minHeight: '100vh', padding: '40px' }}>
      <button
        onClick={() => alert('tapped!')}
        style={{ background: 'gold', padding: '20px 40px', fontSize: '18px', display: 'block' }}
      >
        TAP ME
      </button>
    </div>
  );
}
