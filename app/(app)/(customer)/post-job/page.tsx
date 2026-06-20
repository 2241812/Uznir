import type { Metadata } from "next";
import { PostJobForm } from "./PostJobForm";

export const metadata: Metadata = {
  title: "Post a job",
};

export default function PostJobPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Post a job</h1>
      <p className="mt-1 text-muted-foreground">
        Describe what you need and workers near you will see it.
      </p>

      <div className="mt-8">
        <PostJobForm />
      </div>
    </div>
  );
}
