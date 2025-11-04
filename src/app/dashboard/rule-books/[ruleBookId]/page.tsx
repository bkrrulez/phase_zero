
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { getRuleBookDetails } from '../actions';
import { type RuleBook, type RuleBookEntry, type ReferenceTable } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { ReferenceTableDialog } from '../components/reference-table-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface RuleBookDetails {
  ruleBook: RuleBook;
  entries: RuleBookEntry[];
  referenceTables: ReferenceTable[];
}

const columnOrder = [
  'Gliederung',
  'Text',
  'Nutzung',
  'Spaltentyp',
  'Erfüllbarkeit',
  'Checkliste',
  'Referenztabelle',
];

const enColumnOrder = [
  'Structure',
  'Text',
  'Usage',
  'Column Type',
  'Fulfillment',
  'Checklist',
  'Reference Table',
];

export default function RuleBookDetailPage() {
  const params = useParams();
  const ruleBookId = params.ruleBookId as string;
  const { t } = useLanguage();
  const { toast } = useToast();

  const [details, setDetails] = React.useState<RuleBookDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedTable, setSelectedTable] = React.useState<ReferenceTable | null>(null);
  const [viewLanguage, setViewLanguage] = React.useState<'DE' | 'EN'>('DE');

  const fetchDetails = React.useCallback(async (id: string) => {
    try {
      setLoading(true);
      const fetchedDetails = await getRuleBookDetails(id);
      setDetails(fetchedDetails);
      const hasTranslations = fetchedDetails?.entries.every(e => e.translation);
      if (viewLanguage === 'EN' && !hasTranslations) {
          setViewLanguage('DE');
      }
    } catch (err) {
      setError(t('importErrorDesc'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t, viewLanguage]);

  React.useEffect(() => {
    if (ruleBookId) {
      fetchDetails(ruleBookId);
    }
  }, [ruleBookId, fetchDetails]);

  const handleLanguageToggle = async (checked: boolean) => {
    const newLang = checked ? 'EN' : 'DE';
    if (newLang === 'DE') {
        setViewLanguage('DE');
        return;
    }

    const hasMissingTranslations = details?.entries.some(e => !e.translation);

    if (newLang === 'EN' && hasMissingTranslations) {
      toast({ 
        variant: 'destructive', 
        title: "Translation Not Available", 
        description: "The AI module has been removed, so translations cannot be generated."
      });
      // Don't switch the view
    } else if (newLang === 'EN') {
        setViewLanguage('EN');
    }
  }

  const handleOpenReferenceTable = (tableName: string) => {
    const table = details?.referenceTables.find((t) => t.name === tableName);
    if (table) setSelectedTable(table);
  };

  const getColumnStyle = (header: string): React.CSSProperties => {
    const style: React.CSSProperties = { minWidth: '150px' };

    const isTextCol = viewLanguage === 'DE' ? header === 'Text' : header === 'Text';
    const isGliederungCol = viewLanguage === 'DE' ? header === 'Gliederung' : header === 'Structure';

    if (isTextCol) {
      style.maxWidth = '500px';
    } else if (isGliederungCol) {
      style.maxWidth = '400px';
    } else {
      style.maxWidth = '300px';
    }

    return style;
  };

  if (loading) {
    return (
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex items-center gap-4 shrink-0">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (error) return <div className="text-destructive text-center p-8">{error}</div>;
  if (!details) return <div className="text-center p-8">{t('noRuleBooks')}</div>;
  
  const isEnglishView = viewLanguage === 'EN';
  const hasTranslation = details.entries.length > 0 && details.entries.every(e => e.translation);

  const deHeaders = details.entries.length > 0 ? Object.keys(details.entries[0].data) : [];
  const enHeaders = hasTranslation && details.entries[0].translation ? Object.keys(details.entries[0].translation) : [];

  const getSortedHeaders = (headers: string[], order: string[]) => {
    return [...headers].sort((a, b) => {
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  };

  const headers = isEnglishView && hasTranslation 
    ? getSortedHeaders(enHeaders, enColumnOrder) 
    : getSortedHeaders(deHeaders, columnOrder);
  
  const originalHeadersSorted = getSortedHeaders(deHeaders, columnOrder);
  
  const headerMapping: Record<string, string> = isEnglishView && hasTranslation 
    ? Object.fromEntries(originalHeadersSorted.map((deHeader, i) => [headers[i] || deHeader, deHeader]))
    : {};

  return (
    <>
      <div className="flex flex-col gap-6" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Fixed Header */}
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-4">
            <Button asChild variant="outline" size="icon">
              <Link href="/dashboard/rule-books">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">{t('back')}</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-headline">{details.ruleBook.name}</h1>
              <p className="text-muted-foreground">{t('ruleBookDetailsDesc')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="translation-toggle" className={cn(viewLanguage === 'DE' ? 'text-foreground' : 'text-muted-foreground')}>DE (Original)</Label>
            <Switch
              id="translation-toggle"
              checked={viewLanguage === 'EN'}
              onCheckedChange={handleLanguageToggle}
            />
            <Label htmlFor="translation-toggle" className={cn(viewLanguage === 'EN' ? 'text-foreground' : 'text-muted-foreground')}>
                EN (Translated)
            </Label>
          </div>
        </div>

        {isEnglishView && (
          <div className="flex items-center gap-2 rounded-md border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            <AlertTriangle className="h-5 w-5" />
            <span>English version is not legally binding.</span>
          </div>
        )}

        {/* Table Container */}
        <div className="flex-1 border rounded-lg" style={{ overflow: 'auto', position: 'relative' }}>
          <table className="w-full border-collapse" style={{ display: 'table', tableLayout: 'auto' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'hsl(var(--card))' }}>
              <tr className="border-b">
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border-r"
                  style={{ 
                    position: 'sticky', 
                    left: 0, 
                    zIndex: 30, 
                    backgroundColor: 'hsl(var(--card))',
                    width: '80px',
                    minWidth: '80px'
                  }}
                >
                  {t('serialNumber')}
                </th>
                {headers.map((header) => (
                  <th
                    key={header}
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border-r whitespace-nowrap"
                    style={{ 
                      backgroundColor: 'hsl(var(--card))',
                      ...getColumnStyle(header)
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {details.entries.map((entry, index) => (
                <tr key={entry.id} className="border-b transition-colors hover:bg-muted/50">
                  <td 
                    className="p-4 align-top border-r font-medium"
                    style={{ 
                      position: 'sticky', 
                      left: 0, 
                      zIndex: 10, 
                      backgroundColor: 'hsl(var(--card))',
                      width: '80px',
                      minWidth: '80px'
                    }}
                  >
                    {index + 1}
                  </td>
                  {headers.map((header) => {
                    const dataObject = isEnglishView && entry.translation ? entry.translation : entry.data;
                    const cellValue = String(dataObject[header] ?? '');

                    const originalHeader = isEnglishView && hasTranslation ? (headerMapping[header] || header) : header;
                    const isTextColumn = ['Text', 'Gliederung', 'Nutzung', 'Spaltentyp', 'Erfüllbarkeit', 'Checkliste'].includes(originalHeader);
                    const isRefColumn = originalHeader === 'Referenztabelle';
                    
                    return (
                      <td
                        key={`${entry.id}-${header}`}
                        className="p-4 align-top border-r"
                        style={getColumnStyle(header)}
                      >
                         {isRefColumn && cellValue.includes('Tabelle') ? (
                          <div className="whitespace-normal">
                            {cellValue.split(/, | /).map((part, partIndex) => {
                              const trimmedPart = part.replace(/,$/, '');
                              const isRefTable = details.referenceTables.some(
                                (t) => t.name === trimmedPart
                              );
                              if (isRefTable) {
                                return (
                                  <React.Fragment key={partIndex}>
                                    <Button
                                      variant="link"
                                      className="p-0 h-auto text-left"
                                      onClick={() => handleOpenReferenceTable(trimmedPart)}
                                    >
                                      {trimmedPart}
                                    </Button>
                                    {partIndex < cellValue.split(/, | /).length - 1 ? ', ' : ''}
                                  </React.Fragment>
                                );
                              }
                              return (
                                <span key={partIndex}>{part}{partIndex < cellValue.split(/, | /).length - 1 ? ' ' : ''}</span>
                              );
                            })}
                          </div>
                        ) : (
                           <div className={isTextColumn ? "whitespace-normal" : "whitespace-nowrap"}>
                            {cellValue}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReferenceTableDialog
        isOpen={!!selectedTable}
        onOpenChange={() => setSelectedTable(null)}
        table={selectedTable}
      />
    </>
  );
}
