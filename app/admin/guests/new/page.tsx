import { requireAdminAuth } from '@/lib/adminAuth';
import NewHouseholdForm from '@/app/admin/guests/new/NewHouseholdForm';

export default async function NewGuestHouseholdPage() {
  await requireAdminAuth();

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Add new household</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Create a new invite record</h1>
          </div>
          <a href="/admin/guests" className="rounded-full border border-admin-sand/40 bg-white px-5 py-3 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green">
            Back to guest list
          </a>
        </div>
      </div>
      <NewHouseholdForm />
    </div>
  );
}
