"use client";

/**
 * Scheme Library Component
 * 
 * Displays a teacher's saved schemes with options to view, edit, and export.
 * Integrates with the Rust/Axum backend for scheme persistence and IPFS.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Edit,
  Eye,
  Search,
  Calendar,
  BookOpen,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { SchemeV2 } from '@/types/curriculum';
import { getTeacherSchemes } from '@/lib/scheme-v2-client';
import { loadSchemeIntoWizard, validateSchemeForLoading } from '@/lib/scheme-loader';
import { useSchemeWizardStore } from '@/stores/scheme-wizard-store';
import { ExportSchemeDialog } from '@/components/scheme-wizard/export-scheme-dialog';
import { useToast } from '@/hooks/use-toast';

interface SchemeLibraryProps {
  teacherId: string;
  token: string;
  teacherName?: string;
  schoolName?: string;
  onViewScheme?: (scheme: SchemeV2) => void;
  onEditScheme?: (scheme: SchemeV2) => void;
  onExportScheme?: (scheme: SchemeV2) => void;
}

export function SchemeLibrary({
  teacherId,
  token,
  teacherName,
  schoolName,
  onViewScheme,
  onEditScheme,
  onExportScheme,
}: SchemeLibraryProps) {
  const [schemes, setSchemes] = useState<SchemeV2[]>([]);
  const [filteredSchemes, setFilteredSchemes] = useState<SchemeV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [schemeToExport, setSchemeToExport] = useState<SchemeV2 | null>(null);
  const { toast } = useToast();
  
  // Access wizard store for loading schemes
  const {
    setGrade,
    setSubject,
    setTerm,
    setStrands,
    setWeeklyMode,
    setTeacherInputs,
    setGeneratedScheme,
    setSavedSchemeId,
    goToStep,
  } = useSchemeWizardStore();

  // Load schemes on mount
  useEffect(() => {
    loadSchemes();
  }, [teacherId, token]);

  // Filter schemes when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSchemes(schemes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = schemes.filter(scheme =>
      scheme.subject.toLowerCase().includes(query) ||
      scheme.grade.toLowerCase().includes(query) ||
      scheme.term.toLowerCase().includes(query)
    );
    setFilteredSchemes(filtered);
  }, [searchQuery, schemes]);

  const loadSchemes = async () => {
    try {
      setLoading(true);
      const data = await getTeacherSchemes(teacherId, token);
      setSchemes(data);
      setFilteredSchemes(data);
    } catch (error) {
      console.error('Failed to load schemes:', error);
      toast({
        title: "Error",
        description: "Failed to load your schemes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTermBadgeColor = (term: string) => {
    switch (term) {
      case 'Term1':
      case '1':
        return 'bg-blue-100 text-blue-800';
      case 'Term2':
      case '2':
        return 'bg-green-100 text-green-800';
      case 'Term3':
      case '3':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLoadScheme = (scheme: SchemeV2) => {
    // Validate scheme before loading
    const validation = validateSchemeForLoading(scheme);
    if (!validation.valid) {
      toast({
        title: "Cannot Load Scheme",
        description: validation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    try {
      // Load scheme data into wizard store
      const wizardData = loadSchemeIntoWizard(scheme);
      
      setGrade(wizardData.selectedGrade);
      setSubject(wizardData.selectedSubject);
      setTerm(wizardData.selectedTerm);
      setStrands(wizardData.selectedStrands);
      setWeeklyMode(wizardData.useWeeklyMode);
      setTeacherInputs(wizardData.teacherInputs);
      setGeneratedScheme(wizardData.generatedScheme);
      setSavedSchemeId(wizardData.savedSchemeId);
      
      // Navigate to preview step
      goToStep('preview');
      
      toast({
        title: "Scheme Loaded",
        description: `${scheme.subject} scheme loaded successfully. You can now edit or export it.`,
      });
      
      // Call the edit callback if provided
      onEditScheme?.(scheme);
    } catch (error) {
      console.error('Failed to load scheme:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load scheme into editor. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportClick = (scheme: SchemeV2) => {
    setSchemeToExport(scheme);
    setExportDialogOpen(true);
    onExportScheme?.(scheme);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading your schemes...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>My Scheme Library</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {schemes.length} scheme{schemes.length !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>
          <Button onClick={loadSchemes} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject, grade, or term..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Schemes Table */}
        {filteredSchemes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {searchQuery ? 'No schemes found' : 'No schemes yet'}
            </p>
            <p className="text-sm mt-2">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first scheme to get started'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>IPFS</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchemes.map((scheme) => (
                  <TableRow key={scheme.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        {scheme.subject}
                      </div>
                    </TableCell>
                    <TableCell>{scheme.grade}</TableCell>
                    <TableCell>
                      <Badge className={getTermBadgeColor(scheme.term)}>
                        Term {scheme.term.replace('Term', '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {scheme.scheme_rows.length} lesson{scheme.scheme_rows.length !== 1 ? 's' : ''}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(scheme.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {scheme.ipfs_cid ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => {
                            navigator.clipboard.writeText(scheme.ipfs_cid!);
                            toast({
                              title: "Copied!",
                              description: "IPFS CID copied to clipboard",
                            });
                          }}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          CID
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewScheme?.(scheme)}
                          title="View scheme"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoadScheme(scheme)}
                          title="Edit scheme"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportClick(scheme)}
                          title="Export scheme"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Export Dialog */}
      <ExportSchemeDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        scheme={schemeToExport}
        defaultTeacherName={teacherName}
        defaultSchoolName={schoolName}
      />
    </Card>
  );
}
