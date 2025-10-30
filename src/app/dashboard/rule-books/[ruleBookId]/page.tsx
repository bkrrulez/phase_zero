
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { getRuleBookDetails } from '../actions';
import { type RuleBook, type RuleBookEntry, type ReferenceTable } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    'Referenztabelle'
];


export default function RuleBookDetailPage() {
    const params = useParams();
    const ruleBookId = params.ruleBookId as string;
    const { t } = useLanguage();
    
    const [details, setDetails] = React.useState<RuleBookDetails | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedTable, setSelectedTable] = React.useState<ReferenceTable | null>(null);
    const [importSettings, setImportSettings] = React.useState<any[]>([]);


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
        const table = details?.referenceTables.find(t => t.name === tableName);
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
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-48 w-full" /></CardContent>
                </Card>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-destructive text-center p-8">{error}</div>
    }

    if (!details) {
        return <div className="text-center p-8">Rule book not found.</div>;
    }
    
    const originalHeaders = details.entries.length > 0 ? Object.keys(details.entries[0].data) : [];
    
    // Sort headers according to the predefined order
    const headers = originalHeaders.sort((a, b) => {
        const indexA = columnOrder.indexOf(a);
        const indexB = columnOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b); // sort alphabetically if both not in order list
        if (indexA === -1) return 1; // move items not in list to the end
        if (indexB === -1) return -1;
        return indexA - indexB; // sort by index in order list
    });

    const isColumnFreeText = (header: string) => {
      return header.toLowerCase() === 'text';
    };

    return (
        <>
            <div className="space-y-6">
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

                 <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rule Book Name</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{details.ruleBook.name}</div>
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rows Imported</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{details.ruleBook.rowCount}</div>
                        </CardContent>
                    </Card>
                     <Card>
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Import Date</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{format(details.ruleBook.importedAt, 'PPP')}</div>
                        </CardContent>
                    </Card>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Rule Book Content</CardTitle>
                        <CardDescription>Content from the 'Main' sheet of the imported file.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="relative h-[70vh] overflow-y-auto border rounded-md">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                        <TableHead className="w-[50px] border-r">Sl No.</TableHead>
                                        {headers.map(header => (
                                            <TableHead key={header} className={cn("border-r last:border-r-0", isColumnFreeText(header) && "w-[60ch]")}>{header}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {details.entries.map((entry, index) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="w-[50px] border-r">{index + 1}</TableCell>
                                            {headers.map(header => {
                                                const cellValue = entry.data[header];
                                                const isRefTable = details.referenceTables.some(t => t.name === cellValue);
                                                
                                                return (
                                                    <TableCell key={`${entry.id}-${header}`} className={cn("border-r last:border-r-0 align-top break-words", isColumnFreeText(header) && "w-[60ch]")}>
                                                        {isRefTable ? (
                                                            <Button variant="link" className="p-0 h-auto" onClick={() => handleOpenReferenceTable(cellValue)}>
                                                                {cellValue}
                                                            </Button>
                                                        ) : (
                                                            cellValue
                                                        )}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <ReferenceTableDialog
                isOpen={!!selectedTable}
                onOpenChange={() => setSelectedTable(null)}
                table={selectedTable}
            />
        </>
    )
}
