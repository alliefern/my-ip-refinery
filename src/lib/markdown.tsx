/**
 * Minimal, dependency-free Markdown renderer for lesson content.
 * Input is escaped before any transformation, so user-edited content
 * cannot inject markup. Covers the subset the lesson generator emits:
 * headings, paragraphs, lists, blockquotes, bold, italic.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export function markdownToHtml(markdown: string): string {
  const lines = escapeHtml(markdown).split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }
    const h3 = trimmed.match(/^###\s+(.*)/);
    const h2 = trimmed.match(/^##\s+(.*)/);
    const quote = trimmed.match(/^&gt;\s?(.*)/);
    const ol = trimmed.match(/^\d+\.\s+(.*)/);
    const ul = trimmed.match(/^[-*]\s+(.*)/);

    if (h3) {
      flushParagraph(); closeList();
      out.push(`<h3>${inline(h3[1]!)}</h3>`);
    } else if (h2) {
      flushParagraph(); closeList();
      out.push(`<h2>${inline(h2[1]!)}</h2>`);
    } else if (quote) {
      flushParagraph(); closeList();
      out.push(`<blockquote><p>${inline(quote[1]!)}</p></blockquote>`);
    } else if (ol) {
      flushParagraph();
      if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
      out.push(`<li>${inline(ol[1]!)}</li>`);
    } else if (ul) {
      flushParagraph();
      if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
      out.push(`<li>${inline(ul[1]!)}</li>`);
    } else {
      paragraph.push(trimmed);
    }
  }
  flushParagraph();
  closeList();
  return out.join("\n");
}

export function LessonContent({ markdown }: { markdown: string }) {
  return (
    <div
      className="prose-lesson"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }}
    />
  );
}
