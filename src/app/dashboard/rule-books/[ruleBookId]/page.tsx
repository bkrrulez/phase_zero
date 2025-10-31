
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
    <>
      <div className="space-y-6 h-full flex flex-col">
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

        {/* Scrolling Container */}
        <div className="flex-1 relative border rounded-lg overflow-auto">
          <Table className="min-w-max">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
              <TableRow>
                <TableHead className="w-16">
                  Sl No.
                </TableHead>
                {headers.map((header) => (
                  <TableHead
                    key={header}
                    className="whitespace-nowrap"
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell className="w-16">
                    {index + 1}
                  </TableCell>
                  {headers.map((header) => {
                    const cellValue = entry.data[header];
                    const isRefTable = details.referenceTables.some(
                      (t) => t.name === cellValue
                    );
                    const isTextColumn = header === 'Text';
                    return (
                      <TableCell
                        key={`${entry.id}-${header}`}
                        className={cn(
                          'align-top whitespace-nowrap',
                          isTextColumn && 'max-w-[450px] truncate'
                        )}
                      >
                        {isRefTable ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => handleOpenReferenceTable(cellValue)}
                          >
                            {cellValue}
                          </Button>
                        ) : (
                          <span title={isTextColumn ? String(cellValue) : undefined}>
                            {String(cellValue)}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
