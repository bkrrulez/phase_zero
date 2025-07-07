
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { currentUser } from "@/lib/mock-data";
import { useAccessControl } from "../contexts/AccessControlContext";
import { useProjects } from "../contexts/ProjectsContext";
import { useTasks } from "../contexts/TasksContext";
import { useTimeTracking } from "../contexts/TimeTrackingContext";

const logTimeSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  startTime: z.string().min(1, { message: "Start time is required." }),
  endTime: z.string().min(1, { message: "End time is required." }),
  project: z.string().min(1, { message: "Please select a project." }),
  task: z.string().min(1, { message: "Please select a task." }),
  remarks: z.string().optional(),
}).refine(data => data.endTime > data.startTime, {
  message: "End time cannot be earlier than start time.",
  path: ["endTime"],
});

export type LogTimeFormValues = z.infer<typeof logTimeSchema>;

interface LogTimeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function LogTimeDialog({ isOpen, onOpenChange }: LogTimeDialogProps) {
  const { logTime } = useTimeTracking();
  const form = useForm<LogTimeFormValues>({
    resolver: zodResolver(logTimeSchema),
    defaultValues: {
      date: new Date(),
      startTime: '',
      endTime: '',
      project: '',
      task: '',
      remarks: '',
    }
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>();

  const { freezeRules } = useAccessControl();
  const { projects } = useProjects();
  const { tasks } = useTasks();

  const availableProjects = projects.filter(p => currentUser.associatedProjectIds?.includes(p.id));

  const isDateFrozen = (date: Date) => {
    for (const rule of freezeRules) {
      const ruleAppliesToAll = rule.teamId === 'all-teams';
      const ruleAppliesToUserTeam = currentUser.teamId && rule.teamId === currentUser.teamId;

      if (ruleAppliesToAll || ruleAppliesToUserTeam) {
        const startDate = new Date(rule.startDate);
        const endDate = new Date(rule.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        if (date >= startDate && date <= endDate) {
          return true;
        }
      }
    }
    return false;
  };

  function onSubmit(data: LogTimeFormValues) {
    const { success } = logTime(data);
    if(success) {
        onOpenChange(false);
        form.reset();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
          <DialogDescription>
            Fill in the details below to log your work time. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                           onClick={() => {
                              setTempDate(field.value);
                              setIsDatePickerOpen(true);
                           }}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tempDate}
                        onSelect={setTempDate}
                        toDate={new Date()}
                        disabled={(date) => date > new Date() || isDateFrozen(date)}
                        initialFocus
                      />
                       <div className="p-2 border-t flex justify-end">
                            <Button size="sm" onClick={() => {
                                if (tempDate) {
                                    field.onChange(tempDate);
                                }
                                setIsDatePickerOpen(false);
                            }}>Ok</Button>
                        </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="project"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableProjects.length > 0 ? (
                        availableProjects.map((project) => (
                          <SelectItem key={project.id} value={project.name}>{project.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No projects assigned</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="task"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.name}>{task.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks <span className="text-muted-foreground">(Optional)</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any extra details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">Log Time</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
