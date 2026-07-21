import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { brand } from "@/lib/config";
import { StatusBadge } from "@/components/ui";

const NAV = [
  { slug: "", label: "Overview" },
  { slug: "sources", label: "Sources" },
  { slug: "transcripts", label: "Transcripts" },
  { slug: "ip-map", label: "IP Map" },
  { slug: "opportunities", label: "Course Direction" },
  { slug: "gaps", label: "Gap Questions" },
  { slug: "blueprint", label: "Blueprint" },
  { slug: "course", label: "Course Editor" },
  { slug: "vault", label: "Bonus Vault" },
  { slug: "exports", label: "Exports" },
  { slug: "settings", label: "Settings" },
] as const;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const project = await getDataSource().getProject(user.id, id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-ink-faint hover:text-ink text-sm">
            {brand.name}
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="font-display text-lg">{project.name}</span>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <nav
        aria-label="Project sections"
        className="border-line mb-8 flex flex-wrap gap-1 border-b pb-px"
      >
        {NAV.map((item) => (
          <Link
            key={item.slug}
            href={`/projects/${id}${item.slug ? `/${item.slug}` : ""}`}
            className="text-ink-soft hover:text-ink hover:border-ink-faint -mb-px border-b-2 border-transparent px-3 py-2 text-sm transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
