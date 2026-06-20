import type { Metadata } from "next";
import { RoleSelectForm } from "./RoleSelectForm";

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

      <RoleSelectForm />
    </div>
  );
}
