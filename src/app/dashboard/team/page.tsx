
'use client';

import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teamMembers as initialTeamMembers, currentUser, type User } from "@/lib/mock-data";
import { EditContractDialog } from "./components/edit-contract-dialog";
import { useToast } from "@/hooks/use-toast";
import { AddMemberDialog } from "./components/add-member-dialog";

export default function TeamPage() {
    const { toast } = useToast();
    const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
    
    const handleSaveContract = (updatedUser: User) => {
        setTeamMembers(prevMembers =>
            prevMembers.map(member => member.id === updatedUser.id ? updatedUser : member)
        );
        setEditingUser(null);
        toast({
            title: "Contract Updated",
            description: `Successfully updated contract for ${updatedUser.name}.`,
        });
    }

    const handleAddMember = (newUser: User) => {
        setTeamMembers(prev => [...prev, newUser]);
        setIsAddMemberDialogOpen(false);
        toast({
            title: "Member Added",
            description: `${newUser.name} has been added to the team.`,
        });
    };

    const canEditMember = (member: User) => {
        if (currentUser.id === member.id) return false;
        if (currentUser.role === 'Super Admin') {
            return member.role !== 'Super Admin';
        }
        if (currentUser.role === 'Team Lead') {
            return member.role === 'Employee';
        }
        return false;
    };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Team Overview</h1>
            <p className="text-muted-foreground">Manage your team members and view their progress.</p>
          </div>
          <Button onClick={() => setIsAddMemberDialogOpen(true)}>
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
                          <TableHead className="hidden lg:table-cell">Contract Start</TableHead>
                          <TableHead className="hidden lg:table-cell">Contract End</TableHead>
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
                                  <Badge variant={member.role === 'Team Lead' || member.role === 'Super Admin' ? "default" : "secondary"}>{member.role}</Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">{format(new Date(member.contract.startDate), 'PP')}</TableCell>
                              <TableCell className="hidden lg:table-cell">{member.contract.endDate ? format(new Date(member.contract.endDate), 'PP') : 'N/A'}</TableCell>
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
                                          <DropdownMenuItem 
                                            onClick={() => setEditingUser(member)}
                                            disabled={!canEditMember(member)}
                                          >
                                            Edit Contract
                                          </DropdownMenuItem>
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
      {editingUser && (
        <EditContractDialog 
            user={editingUser}
            isOpen={!!editingUser}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setEditingUser(null);
                }
            }}
            onSave={handleSaveContract}
        />
      )}
      <AddMemberDialog
        isOpen={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        onAddMember={handleAddMember}
        teamMembers={teamMembers}
      />
    </>
  )
}
