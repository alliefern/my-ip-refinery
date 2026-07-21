import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { isDemoMode } from "@/lib/config";
import { answerGapQuestionAction, skipGapQuestionAction } from "./actions";

export const metadata = { title: "Gap Questions" };

export default async function GapsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const questions = await getDataSource().listGapQuestions(user.id, id);

  return (
    <div>
      <PageHeader
        title="Gap questions"
        subtitle="Your trainings don't quite cover everything the course promises. Rather than inventing the missing pieces, the refinery asks you. Answers become labelled source material."
      />

      <div className="space-y-5">
        {questions.map((q, i) => (
          <Card key={q.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-medium">
                {i + 1}. {q.question}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  q.status === "ANSWERED"
                    ? "bg-ok-soft text-ok"
                    : q.status === "SKIPPED"
                      ? "bg-warn-soft text-warn"
                      : "bg-accent-soft text-accent"
                }`}
              >
                {q.status === "ANSWERED"
                  ? "Answered"
                  : q.status === "SKIPPED"
                    ? "Skipped"
                    : "Open"}
              </span>
            </div>
            <p className="text-ink-faint mt-2 text-sm">
              <span className="font-medium">Why this matters:</span> {q.reason}
            </p>

            {q.status === "ANSWERED" && q.answer ? (
              <blockquote className="border-accent text-ink-soft mt-3 border-l-2 pl-3 text-sm">
                {q.answer}
              </blockquote>
            ) : (
              <form action={answerGapQuestionAction} className="mt-4">
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="questionId" value={q.id} />
                <label className="sr-only" htmlFor={`answer-${q.id}`}>
                  Your answer
                </label>
                <textarea
                  id={`answer-${q.id}`}
                  name="answer"
                  rows={3}
                  required
                  placeholder="Answer in your own words — this text becomes course source material."
                  className="border-line focus:border-ink w-full rounded-md border bg-white px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="bg-ink text-paper mt-2 rounded-md px-4 py-1.5 text-sm font-medium hover:opacity-90"
                >
                  Save answer
                </button>
              </form>
            )}
            {q.status === "OPEN" && !isDemoMode() && (
              <form action={skipGapQuestionAction} className="mt-2">
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="questionId" value={q.id} />
                <button
                  type="submit"
                  className="text-ink-faint text-xs hover:underline"
                >
                  Skip — mark as unresolved
                </button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
