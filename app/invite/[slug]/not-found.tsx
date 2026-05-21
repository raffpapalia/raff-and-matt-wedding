export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0A1F14]">
      <div className="text-center">
        <h1 className="text-6xl font-light text-white mb-4">404</h1>
        <p className="text-xl text-green-200 font-light mb-8">
          Invitation not found
        </p>
        <p className="text-green-300/60 text-sm">
          This invite link may be incorrect or expired.
        </p>
      </div>
    </div>
  );
}
