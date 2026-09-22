"use client";

/**
 * Export Scheme Dialog Component
 * 
 * Provides options to export schemes as DOCX or PDF.
 * Integrates with the existing export-docx utility.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, FileText, Printer, Loader2 } from "lucide-react";
import type { SchemeV2 } from '@/types/curriculum';
import { exportSchemeToDocx } from '@/lib/export-docx';
import { useToast } from '@/hooks/use-toast';

interface ExportSchemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheme: SchemeV2 | null;
  defaultTeacherName?: string;
  defaultSchoolName?: string;
}

export function ExportSchemeDialog({
  open,
  onOpenChange,
  scheme,
  defaultTeacherName = '',
  defaultSchoolName = '',
}: ExportSchemeDialogProps) {
  const [teacherName, setTeacherName] = useState(defaultTeacherName);
  const [schoolName, setSchoolName] = useState(defaultSchoolName);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExportDocx = async () => {
    if (!scheme) return;

    try {
      setExporting(true);

      await exportSchemeToDocx(
        scheme.scheme_rows,
        scheme.grade,
        scheme.subject,
        scheme.term,
        teacherName || undefined,
        schoolName || undefined
      );

      toast({
        title: "Export Successful",
        description: "Your scheme has been exported as a DOCX file.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to export scheme:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export scheme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = () => {
    if (!scheme) return;

    // Open print dialog (browser will handle PDF generation)
    window.print();
    
    toast({
      title: "Print Dialog Opened",
      description: "Use your browser's print dialog to save as PDF.",
    });
  };

  if (!scheme) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Scheme</DialogTitle>
          <DialogDescription>
            Export your {scheme.subject} scheme for {scheme.grade} - {scheme.term}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Teacher Name */}
          <div className="space-y-2">
            <Label htmlFor="teacherName">Teacher Name (Optional)</Label>
            <Input
              id="teacherName"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          {/* School Name */}
          <div className="space-y-2">
            <Label htmlFor="schoolName">School Name (Optional)</Label>
            <Input
              id="schoolName"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Enter school name"
            />
          </div>

          {/* Export Options */}
          <div className="space-y-3 pt-4">
            <div className="text-sm font-medium">Export Format</div>
            
            {/* DOCX Export */}
            <Button
              onClick={handleExportDocx}
              disabled={exporting}
              className="w-full justify-start"
              variant="outline"
              size="lg"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Export as DOCX</div>
                    <div className="text-xs text-muted-foreground">
                      Microsoft Word format with full formatting
                    </div>
                  </div>
                </>
              )}
            </Button>

            {/* PDF Export (via Print) */}
            <Button
              onClick={handlePrintPdf}
              disabled={exporting}
              className="w-full justify-start"
              variant="outline"
              size="lg"
            >
              <Printer className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Print / Save as PDF</div>
                <div className="text-xs text-muted-foreground">
                  Use browser print dialog to save as PDF
                </div>
              </div>
            </Button>
          </div>

          {/* Scheme Info */}
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground space-y-1">
              <div><strong>Lessons:</strong> {scheme.scheme_rows.length}</div>
              <div><strong>Weeks:</strong> {Math.max(...scheme.scheme_rows.map(r => r.week))}</div>
              {scheme.ipfs_cid && (
                <div className="text-xs">
                  <strong>IPFS CID:</strong> {scheme.ipfs_cid.substring(0, 20)}...
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
