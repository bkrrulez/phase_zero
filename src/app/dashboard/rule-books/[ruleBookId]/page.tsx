
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

  const getColumnStyle = (header: string) => {
    const style: React.CSSProperties = { minWidth: '150px' };
    if (header === 'Text') {
      style.minWidth = '400px';
      style.maxWidth = '500px';
    } else if (header === 'Gliederung') {
      style.maxWidth = '400px';
    }
    return style;
  };

  return (
    <>
      <div className="flex flex-col gap-6" style={{ height: 'calc(100vh - 200px)' }}>
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
                  Sl No.
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
                    const cellValue = entry.data[header];
                    const isRefTable = details.referenceTables.some(
                      (t) => t.name === cellValue
                    );
                    const isTextColumn = header === 'Text' || header === 'Gliederung';
                    return (
                      <td
                        key={`${entry.id}-${header}`}
                        className="p-4 align-top border-r"
                        style={getColumnStyle(header)}
                      >
                        {isRefTable ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto whitespace-normal text-left"
                            onClick={() => handleOpenReferenceTable(cellValue)}
                          >
                            {cellValue}
                          </Button>
                        ) : (
                          <div className={isTextColumn ? "whitespace-normal" : "whitespace-nowrap"}>
                            {String(cellValue)}
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
