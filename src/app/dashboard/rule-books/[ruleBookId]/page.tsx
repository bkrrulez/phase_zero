
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { getRuleBookDetails } from '../actions';
import { type RuleBook, type RuleBookEntry, type ReferenceTable } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

// Define the desired order of columns
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
  const [selectedTable, setSelectedTable] = React.useState<ReferenceTable | null>(
    null
  );

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
    if (table) {
      setSelectedTable(table);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-center p-8">{error}</div>;
  }

  if (!details) {
    return <div className="text-center p-8">Rule book not found.</div>;
  }

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

  const isColumnFreeText = (header: string) => {
    return header.toLowerCase() === 'text';
  };

  return (
    <>
      <div className="flex flex-col h-full space-y-6">
        <div className="shrink-0">
          <div className="flex items-center gap-4">
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
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle>Rule Book Content</CardTitle>
            <CardDescription>
              Content from the 'Main' sheet of the imported file.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                <TableRow>
                  <TableHead className="sticky left-0 w-[50px] border-r bg-card z-20">
                    Sl No.
                  </TableHead>
                  {headers.map((header) => (
                    <TableHead
                      key={header}
                      className={cn(
                        'border-r last:border-r-0 whitespace-nowrap',
                        isColumnFreeText(header) && 'min-w-[60ch]'
                      )}
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.entries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    <TableCell className="sticky left-0 w-[50px] border-r bg-card z-10">
                      {index + 1}
                    </TableCell>
                    {headers.map((header) => {
                      const cellValue = entry.data[header];
                      const isRefTable = details.referenceTables.some(
                        (t) => t.name === cellValue
                      );

                      return (
                        <TableCell
                          key={`${entry.id}-${header}`}
                          className={cn(
                            'border-r last:border-r-0 align-top',
                            isColumnFreeText(header)
                              ? 'min-w-[60ch] break-words whitespace-pre-wrap'
                              : 'break-words'
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
                            cellValue
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ReferenceTableDialog
        isOpen={!!selectedTable}
        onOpenChange={() => setSelectedTable(null)}
        table={selectedTable}
      />
    </>
  );
}
