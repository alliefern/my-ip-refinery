import Link from "next/link";
import Image from "next/image";
import type { ProjectStatus, SupportType } from "@/lib/types";
import { PROJECT_STATUS_LABELS, USER_ACTION_STATUSES } from "@/lib/status";
import { brand } from "@/lib/config";

export function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt={brand.name}
      width={1885}
      height={345}
      className={`self-start ${className}`}
      priority
    />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface border-line rounded-lg border p-5 shadow-[0_1px_2px_rgba(28,26,23,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {subtitle && <p className="text-ink-soft mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const needsUser = USER_ACTION_STATUSES.includes(status);
  const tone =
    status === "FAILED"
      ? "bg-danger-soft text-danger"
      : status === "COMPLETE"
        ? "bg-ok-soft text-ok"
        : needsUser
          ? "bg-accent-soft text-accent"
          : "bg-paper text-ink-soft border border-line";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

export function SupportBadge({ type }: { type: SupportType }) {
  const map: Record<SupportType, { label: string; cls: string }> = {
    source: { label: "Source-grounded", cls: "bg-ok-soft text-ok" },
    creator_answer: { label: "Creator-supplied", cls: "bg-accent-soft text-accent" },
    inferred: { label: "Inferred", cls: "bg-warn-soft text-warn" },
    suggested: { label: "Suggested addition", cls: "bg-warn-soft text-warn" },
  };
  const { label, cls } = map[type];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-ink-faint w-32 shrink-0">{label}</span>
      <div
        className="bg-line h-1.5 w-24 overflow-hidden rounded-full"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="bg-accent h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-ink-soft tabular-nums">{pct}</span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-line rounded-lg border border-dashed p-10 text-center">
      <h3 className="text-lg">{title}</h3>
      <p className="text-ink-soft mx-auto mt-1 max-w-md text-sm">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-ink-faint hover:text-ink text-sm transition-colors"
    >
      ← {label}
    </Link>
  );
}
