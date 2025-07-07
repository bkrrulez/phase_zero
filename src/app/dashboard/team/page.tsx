import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teamMembers, timeEntries } from "@/lib/mock-data";

export default function TeamPage() {
    const getLoggedHours = (userId: string) => {
        return timeEntries
            .filter(entry => entry.userId === userId && new Date(entry.date).getMonth() === new Date().getMonth())
            .reduce((acc, entry) => acc + entry.duration, 0)
            .toFixed(2);
    }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Team Overview</h1>
          <p className="text-muted-foreground">Manage your team members and view their progress.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Member
        </Button>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>A list of all employees in your team.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="hidden md:table-cell">Role</TableHead>
                        <TableHead className="hidden lg:table-cell">Contracted Hours</TableHead>
                        <TableHead>Logged (This Month)</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {teamMembers.map(member => (
                        <TableRow key={member.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person avatar"/>
                                        <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{member.name}</p>
                                        <p className="text-sm text-muted-foreground hidden sm:table-cell">{member.email}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                <Badge variant={member.role === 'Team Lead' ? "default" : "secondary"}>{member.role}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{member.contract.weeklyHours}h / week</TableCell>
                            <TableCell>{getLoggedHours(member.id)}h</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Toggle menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem>View Report</DropdownMenuItem>
                                        <DropdownMenuItem>Edit Contract</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
