import { Check, Copy, Download, FileCheck2, Plus } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "./Button";

export default function ReportViewer({
  report,
  objective,
  approved,
  revisionCount,
  sourcesCount,
  generatedAt,
  onNewResearch,
}: {
  report: string;
  objective: string;
  approved: boolean | null;
  revisionCount: number;
  sourcesCount: number;
  generatedAt: string | null;
  onNewResearch?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable; silently ignore
    }
  }

  function handleDownload() {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "research-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download size={14} />
          Download
        </Button>
        {onNewResearch && (
          <Button variant="primary" size="sm" onClick={onNewResearch}>
            <Plus size={14} />
            New Research
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-subtle">
        <div className="border-b border-border px-6 py-5 sm:px-10 sm:py-8">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
            <FileCheck2 size={14} />
            Final Report
          </div>
          <h1 className="mt-2 text-xl font-semibold leading-snug text-text-primary sm:text-2xl">{objective}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
            {generatedAt && (
              <span>
                Generated{" "}
                {new Date(generatedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            <span>{sourcesCount} sources</span>
            {approved !== null && (
              <span className={approved ? "text-success" : "text-text-muted"}>
                {approved ? "Approved" : "Delivered after revision"} · {revisionCount} revision
                {revisionCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-6 sm:px-10 sm:py-8">
          <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-accent prose-table:text-xs prose-thead:border-border prose-tr:border-border prose-code:text-text-primary prose-pre:bg-surface-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}
