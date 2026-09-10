import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Section from "./Section";

export default function DraftView({
  draft,
  title = "Writer draft",
}: {
  draft: string | null;
  title?: string;
}) {
  if (!draft) return null;

  return (
    <Section title={title}>
      <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-accent prose-table:text-xs">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
      </article>
    </Section>
  );
}
