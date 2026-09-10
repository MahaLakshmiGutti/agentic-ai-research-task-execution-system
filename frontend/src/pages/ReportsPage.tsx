import { Bot, FileText } from "lucide-react";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import ReportViewer from "../components/ReportViewer";

export default function ReportsPage({
  finalReport,
  objective,
  approved,
  revisionCount,
  sourcesCount,
  generatedAt,
  onNewResearch,
  onGoToActivity,
}: {
  finalReport: string | null;
  objective: string;
  approved: boolean | null;
  revisionCount: number;
  sourcesCount: number;
  generatedAt: string | null;
  onNewResearch: () => void;
  onGoToActivity: () => void;
}) {
  if (!finalReport) {
    return (
      <EmptyState
        icon={FileText}
        title="Report not ready yet"
        description="This research run hasn't produced an approved final report yet. Check its progress in Agent Activity."
        action={
          <Button size="sm" variant="outline" onClick={onGoToActivity}>
            <Bot size={14} />
            View Agent Activity
          </Button>
        }
      />
    );
  }

  return (
    <ReportViewer
      report={finalReport}
      objective={objective}
      approved={approved}
      revisionCount={revisionCount}
      sourcesCount={sourcesCount}
      generatedAt={generatedAt}
      onNewResearch={onNewResearch}
    />
  );
}
