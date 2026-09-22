import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  unansweredCount: number;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
  onJumpToFirst: () => void;
}

const UnansweredWarning = ({
  open,
  unansweredCount,
  onOpenChange,
  onConfirm,
  onJumpToFirst,
}: Props) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          {unansweredCount} unanswered question{unansweredCount === 1 ? "" : "s"}
        </AlertDialogTitle>
        <AlertDialogDescription>
          You haven&apos;t answered every question yet. You can go back and try
          them, or submit anyway and see your score.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onJumpToFirst}>
          Go back &amp; finish
        </AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Submit anyway</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default UnansweredWarning;
