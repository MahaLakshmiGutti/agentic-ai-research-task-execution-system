import { ExternalLink, Globe } from "lucide-react";
import { useState } from "react";
import type { Source } from "../types";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function SourceCard({ source }: { source: Source }) {
  const [faviconError, setFaviconError] = useState(false);
  const domain = domainOf(source.url);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      title={source.snippet || source.title}
      className="group flex items-start gap-2.5 rounded-lg border border-border bg-surface-2/50 p-3 transition duration-150 hover:border-accent/40 hover:bg-surface-2"
    >
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-surface text-text-muted">
        {faviconError ? (
          <Globe size={13} />
        ) : (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            className="h-3.5 w-3.5"
            onError={() => setFaviconError(true)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-text-primary">{source.title || domain}</p>
        <p className="truncate text-[11px] text-text-muted">{domain}</p>
      </div>
      <ExternalLink
        size={13}
        className="mt-0.5 shrink-0 text-text-muted opacity-0 transition duration-150 group-hover:opacity-100"
      />
    </a>
  );
}
