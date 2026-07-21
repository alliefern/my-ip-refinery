"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { submitFeedbackAction, type FeedbackState } from "@/app/feedback/actions";

const initialState: FeedbackState = { ok: false };

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("general");
  const [message, setMessage] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [state, formAction, isPending] = useActionState(
    submitFeedbackAction,
    initialState,
  );
  const pathname = usePathname();

  useEffect(() => {
    if (state.ok) {
      setMessage("");
      setJustSubmitted(true);
    }
  }, [state.ok]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setJustSubmitted(false);
          setOpen(true);
        }}
        className="text-ink-faint hover:text-ink text-sm underline"
      >
        Send feedback
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-surface border-line w-full max-w-sm rounded-lg border p-5 shadow-lg">
            {justSubmitted ? (
              <div className="text-center">
                <p className="text-sm">Thanks — got it.</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-accent mt-4 text-sm font-medium hover:underline"
                >
                  Close
                </button>
              </div>
            ) : (
              <form action={formAction} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 id="feedback-heading" className="text-lg">
                    Send feedback
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="text-ink-faint hover:text-ink text-lg leading-none"
                  >
                    &times;
                  </button>
                </div>
                <p className="text-ink-soft text-xs">
                  Found a bug, or want to leave a testimonial? Either way,
                  goes straight to us.
                </p>
                <input type="hidden" name="pagePath" value={pathname} />
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="feedback-type"
                  >
                    Type
                  </label>
                  <select
                    id="feedback-type"
                    name="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="border-line focus:border-ink w-full rounded-md border bg-white px-3 py-2 text-sm"
                  >
                    <option value="general">General feedback</option>
                    <option value="bug">Bug report</option>
                    <option value="testimonial">Testimonial</option>
                  </select>
                </div>
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="feedback-message"
                  >
                    Message
                  </label>
                  <textarea
                    id="feedback-message"
                    name="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    maxLength={4000}
                    className="border-line focus:border-ink w-full rounded-md border bg-white px-3 py-2 text-sm"
                  />
                </div>
                {state.error && (
                  <p className="text-danger text-sm" role="alert">
                    {state.error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-ink text-paper w-full rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? "Sending…" : "Send"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
