import Link from "next/link";
import { NeoCard } from "@/components/ui/neo-card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="mb-8">
          <div className="inline-block bg-accent neo-border px-4 py-1 mb-4">
            <span className="font-mono text-sm font-bold uppercase tracking-widest">v1.0</span>
          </div>
          <h1 className="text-6xl font-black tracking-tight mb-2">DataForge</h1>
          <p className="text-lg text-muted-foreground font-medium">
            Personal form creation, data collection &amp; spreadsheet automation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeoCard hover className="group">
            <Link href="/admin" className="block">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Admin</p>
              <h2 className="text-xl font-bold mb-1">Dashboard →</h2>
              <p className="text-sm text-muted-foreground">Manage forms, submissions, and analytics.</p>
            </Link>
          </NeoCard>

          <NeoCard className="opacity-60">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Public</p>
            <h2 className="text-xl font-bold mb-1">Submit a Form</h2>
            <p className="text-sm text-muted-foreground">Use a form link to submit your response.</p>
          </NeoCard>
        </div>
      </div>
    </main>
  );
}
