import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentUser } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  return (
    <form className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Profile & Settings</h1>
        <p className="text-muted-foreground">View and manage your personal and contract details.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={currentUser.avatar} data-ai-hint="person avatar" />
                    <AvatarFallback>{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <Button variant="outline" type="button">Change Photo</Button>
           </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={currentUser.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue={currentUser.email} />
            </div>
          </div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
          <CardDescription>Your employment contract information. These fields can only be edited by a team lead or admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Role</Label>
                <Input defaultValue={currentUser.role} disabled />
            </div>
             <div className="space-y-2">
                <Label htmlFor="weekly-hours">Weekly Hours</Label>
                <Input id="weekly-hours" type="number" defaultValue={currentUser.contract.weeklyHours} disabled={currentUser.role !== 'Team Lead'} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">Employment Start Date</Label>
              <Input id="start-date" type="date" defaultValue={currentUser.contract.startDate} disabled={currentUser.role !== 'Team Lead'} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Employment End Date</Label>
              <Input id="end-date" type="date" defaultValue={currentUser.contract.endDate ?? ''} disabled={currentUser.role !== 'Team Lead'} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
            <Button>Save Changes</Button>
        </CardFooter>
      </Card>
    </form>
  )
}
