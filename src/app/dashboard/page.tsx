import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { brand } from "@/lib/config";
import { signOutAction } from "@/app/auth/actions";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Projects" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = getDataSource();
  const projects = await data.listProjects(user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10 flex items-baseline justify-between">
        <span className="font-display text-xl">{brand.name}</span>
        <span className="flex items-baseline gap-3">
          <span className="text-ink-faint text-sm">{user.email}</span>
          {!user.isDemo && (
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-ink-faint hover:text-ink text-sm underline"
              >
                Sign out
              </button>
            </form>
          )}
        </span>
      </div>

      <PageHeader
        title="Your projects"
        subtitle="Each project turns one training library into one course."
        action={
          <Link
            href="/projects/new"
            className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            New project
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Create a project, upload five to ten trainings on one topic, and the refinery gets to work."
          action={
            <Link href="/projects/new" className="text-accent text-sm font-medium">
              Create your first project →
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="hover:border-ink-faint h-full transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl">{p.name}</h2>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-ink-soft mt-2 line-clamp-2 text-sm">
                  {p.intake.topic}
                </p>
                <p className="text-ink-faint mt-4 text-xs">
                  Updated {new Date(p.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
