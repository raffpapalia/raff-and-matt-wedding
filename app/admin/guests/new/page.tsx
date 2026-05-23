import { requireAdminAuth } from '@/lib/adminAuth';
import NewHouseholdForm from '@/app/admin/guests/new/NewHouseholdForm';

export default async function NewGuestHouseholdPage() {
  await requireAdminAuth();

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Add new household</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Create a new invite record</h1>
          </div>
          <a href="/admin/guests" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10">
            Back to guest list
          </a>
        </div>
      </div>
      <NewHouseholdForm />
    </div>
  );
}
