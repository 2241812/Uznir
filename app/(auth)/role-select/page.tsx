import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose your role",
};

export default function RoleSelectPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">How will you use Uznir?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You can always change this later in your profile settings.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center gap-4 rounded-xl border p-4 text-left hover:bg-muted transition-colors"
        >
          <span className="text-2xl">🔍</span>
          <div>
            <p className="font-semibold">I need help (Customer)</p>
            <p className="text-sm text-muted-foreground">
              Post jobs and find nearby workers
            </p>
          </div>
        </button>

        <button
          type="button"
          className="flex w-full items-center gap-4 rounded-xl border p-4 text-left hover:bg-muted transition-colors"
        >
          <span className="text-2xl">🛠️</span>
          <div>
            <p className="font-semibold">I want to work (Worker)</p>
            <p className="text-sm text-muted-foreground">
              Offer your skills and find jobs
            </p>
          </div>
        </button>

        <button
          type="button"
          className="flex w-full items-center gap-4 rounded-xl border p-4 text-left hover:bg-muted transition-colors"
        >
          <span className="text-2xl">🔄</span>
          <div>
            <p className="font-semibold">Both</p>
            <p className="text-sm text-muted-foreground">
              Post jobs and offer your skills
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
