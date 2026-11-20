import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles } from "lucide-react";

interface Props {
  onStart: () => void;
}

const DashboardEmptyState = ({ onStart }: Props) => (
  <Card className="p-12 text-center max-w-xl mx-auto animate-fade-in">
    {/* Custom inline SVG illustration */}
    <div className="relative mx-auto mb-6 w-32 h-32">
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bookGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="hsl(var(--muted))" />
        <rect
          x="55"
          y="60"
          width="90"
          height="100"
          rx="6"
          fill="url(#bookGradient)"
        />
        <rect x="65" y="78" width="60" height="3" rx="1.5" fill="hsl(var(--card))" opacity="0.8" />
        <rect x="65" y="92" width="70" height="3" rx="1.5" fill="hsl(var(--card))" opacity="0.6" />
        <rect x="65" y="106" width="50" height="3" rx="1.5" fill="hsl(var(--card))" opacity="0.6" />
        <rect x="65" y="120" width="65" height="3" rx="1.5" fill="hsl(var(--card))" opacity="0.6" />
        <circle cx="155" cy="55" r="14" fill="hsl(var(--kenya-gold))" />
        <text
          x="155"
          y="60"
          textAnchor="middle"
          fill="hsl(var(--background))"
          fontSize="14"
          fontWeight="700"
        >
          A+
        </text>
      </svg>
    </div>
    <h2 className="text-xl font-semibold mb-2">No exam attempts yet</h2>
    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
      Once a pupil takes an exam, their scores appear here with breakdowns by
      subject, strand, and time taken.
    </p>
    <Button onClick={onStart} size="lg" className="gap-1.5">
      <Sparkles className="w-4 h-4" />
      Start an exam
    </Button>
    <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
      <BookOpen className="w-3 h-3" /> Tip: share the exam link with your pupils
      to collect scores remotely
    </p>
  </Card>
);

export default DashboardEmptyState;
