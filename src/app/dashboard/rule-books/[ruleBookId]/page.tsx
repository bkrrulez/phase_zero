
'use client';

import * as React from 'react';
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

interface RuleBookDetails {
    ruleBook: RuleBook;
    entries: RuleBookEntry[];
    referenceTables: ReferenceTable[];
}

export default function RuleBookDetailPage({ params }: { params: { ruleBookId: string } }) {
    const [details, setDetails] = React.useState<RuleBookDetails | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedTable, setSelectedTable] = React.useState<ReferenceTable | null>(null);

    React.useEffect(() => {
        async function fetchDetails() {
            try {
                setLoading(true);
                const fetchedDetails = await getRuleBookDetails(params.ruleBookId);
                setDetails(fetchedDetails);
            } catch (err) {
                setError('Failed to load rule book details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchDetails();
    }, [params.ruleBookId]);

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
    
    const headers = details.entries.length > 0 ? Object.keys(details.entries[0].data) : [];

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
                         <ScrollArea className="h-[60vh] w-full">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No.</TableHead>
                                        {headers.map(header => (
                                            <TableHead key={header}>{header}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {details.entries.map((entry, index) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            {headers.map(header => {
                                                const cellValue = entry.data[header];
                                                const isRefTable = details.referenceTables.some(t => t.name === cellValue);

                                                return (
                                                    <TableCell key={`${entry.id}-${header}`}>
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
                         </ScrollArea>
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
