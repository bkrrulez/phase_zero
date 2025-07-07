import { PlusCircle } from "lucide-react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { holidayRequests, currentUser } from "@/lib/mock-data";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const getStatusVariant = (status: "Pending" | "Approved" | "Rejected"): "secondary" | "default" | "destructive" => {
    switch (status) {
        case "Approved":
            return "default";
        case "Pending":
            return "secondary";
        case "Rejected":
            return "destructive";
    }
};

export default function HolidaysPage() {
  const userHolidayRequests = holidayRequests.filter(req => req.userId === currentUser.id);

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Holidays</h1>
          <p className="text-muted-foreground">Manage your holiday requests and allowance.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Request Holiday
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
          <Card>
              <CardHeader>
                  <CardTitle>Total Allowance</CardTitle>
                  <CardDescription>Per year</CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-3xl font-bold">25 Days</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Taken</CardTitle>
                  <CardDescription>This year</CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-3xl font-bold">5 Days</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Remaining</CardTitle>
                  <CardDescription>This year</CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-3xl font-bold">20 Days</p>
              </CardContent>
          </Card>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>My Requests</CardTitle>
            <CardDescription>A list of your submitted holiday requests.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Dates</TableHead>
                        <TableHead className="hidden sm:table-cell">Duration</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {userHolidayRequests.map(req => (
                        <TableRow key={req.id}>
                           <TableCell className="font-medium">
                                {format(new Date(req.startDate), 'LLL dd, y')} - {format(new Date(req.endDate), 'LLL dd, y')}
                           </TableCell>
                           <TableCell className="hidden sm:table-cell">
                               {getDuration(req.startDate, req.endDate)}
                           </TableCell>
                           <TableCell>
                                <Badge variant={getStatusVariant(req.status)} className={cn(getStatusVariant(req.status) === 'default' && 'bg-green-600')}>{req.status}</Badge>
                           </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}
