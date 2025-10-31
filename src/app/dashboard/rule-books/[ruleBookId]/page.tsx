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
import { ArrowLeft } from 'lucide-react';
import { ReferenceTableDialog } from '../components/reference-table-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

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

export default function RuleBookDetailPage() {
  const params = useParams();
  const ruleBookId = params.ruleBookId as string;
  const { t } = useLanguage();

  const [details, setDetails] = React.useState<RuleBookDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedTable, setSelectedTable] = React.useState<ReferenceTable | null>(null);

  React.useEffect(() => {
    if (!ruleBookId) return;

    async function fetchDetails() {
      try {
        setLoading(true);
        const fetchedDetails = await getRuleBookDetails(ruleBookId);
        setDetails(fetchedDetails);
      } catch (err) {
        setError('Failed to load rule book details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [ruleBookId]);

  const handleOpenReferenceTable = (tableName: string) => {
    const table = details?.referenceTables.find((t) => t.name === tableName);
    if (table) setSelectedTable(table);
  };

  const getColumnStyle = (header: string): React.CSSProperties => {
    const style: React.CSSProperties = { minWidth: '150px' };

    if (header === 'Text') {
      style.maxWidth = '500px';
    } else if (header === 'Gliederung') {
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
  if (!details) return <div className="text-center p-8">Rule book not found.</div>;

  const originalHeaders =
    details.entries.length > 0 ? Object.keys(details.entries[0].data) : [];

  const headers = [...originalHeaders].sort((a, b) => {
    const indexA = columnOrder.indexOf(a);
    const indexB = columnOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Fixed Header */}
      <div className="flex items-start gap-4 shrink-0">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/rule-books">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-headline">{details.ruleBook.name}</h1>
          <p className="text-muted-foreground">Detailed view of the imported rule book.</p>
        </div>
      </div>

      {/* Table Container with fixed height and scroll */}
      <div className="flex-1 relative overflow-auto border rounded-lg">
        <Table className="w-full border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead 
                className="sticky left-0 z-20 bg-card border-r"
                style={{
                  width: '80px',
                  minWidth: '80px',
                }}
              >
                Sl No.
              </TableHead>
              {headers.map((header) => (
                <TableHead
                  key={header}
                  className="border-r whitespace-nowrap"
                  style={getColumnStyle(header)}
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.entries.map((entry, index) => (
              <TableRow key={entry.id} className="hover:bg-muted/50 group">
                <TableCell 
                  className="sticky left-0 z-10 bg-card group-hover:bg-muted/50 border-r"
                  style={{
                    width: '80px',
                    minWidth: '80px',
                  }}
                >
                  {index + 1}
                </TableCell>
                {headers.map((header) => {
                  const cellValue = entry.data[header];
                  const isRefColumn = header === 'Referenztabelle';
                  const isTextColumn = header === 'Text' || header === 'Gliederung';

                  return (
                    <TableCell
                      key={`${entry.id}-${header}`}
                      className="align-top border-r"
                      style={getColumnStyle(header)}
                    >
                      {isRefColumn && typeof cellValue === 'string' ? (
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
                                  {cellValue.includes(',') && partIndex < cellValue.split(/, | /).length - 1 ? ', ' : ''}
                                </React.Fragment>
                              );
                            }
                            return <span key={partIndex}>{part}</span>;
                          })}
                        </div>
                      ) : (
                        <div className={isTextColumn ? "whitespace-normal" : "whitespace-nowrap"}>
                          {String(cellValue ?? '')}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReferenceTableDialog
        isOpen={!!selectedTable}
        onOpenChange={() => setSelectedTable(null)}
        table={selectedTable}
      />
    </div>
  );
}
