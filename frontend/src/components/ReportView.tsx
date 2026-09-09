import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Section from "./Section";

export default function ReportView({
  report,
  approved,
  revisionCount,
}: {
  report: string | null;
  approved: boolean | null;
  revisionCount: number;
}) {
  if (!report) return null;

  return (
    <Section
      title="Final report"
      subtitle={
        approved === null
          ? undefined
          : `${approved ? "Approved" : "Delivered after revision"} • ${revisionCount} revision cycle(s)`
      }
    >
      <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-table:text-xs">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
      </article>
    </Section>
  );
}
