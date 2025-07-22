
"use client";

import { useState, useEffect } from "react";
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
import { useAccessControl } from "../contexts/AccessControlContext";
import { useProjects } from "../contexts/ProjectsContext";
import { useTasks } from "../contexts/TasksContext";
import { useAuth } from "../contexts/AuthContext";
import type { TimeEntry } from "@/lib/types";
import { useMembers } from "../contexts/MembersContext";

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
  onSave: (data: LogTimeFormValues, entryId?: string) => Promise<{ success: boolean }>;
  entryToEdit?: TimeEntry | null;
  userId?: string; // The ID of the user whose time is being logged/edited
}

export function LogTimeDialog({ isOpen, onOpenChange, onSave, entryToEdit, userId }: LogTimeDialogProps) {
  const { currentUser } = useAuth();
  const { teamMembers } = useMembers();
  const isEditMode = !!entryToEdit;
  
  const targetUser = teamMembers.find(m => m.id === (userId || currentUser.id));

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
  
  const { freezeRules } = useAccessControl();

  const isDateFrozen = (date: Date) => {
    if (!targetUser) return false;
    for (const rule of freezeRules) {
      const ruleAppliesToAll = rule.teamId === 'all-teams';
      const ruleAppliesToUserTeam = targetUser?.teamId && rule.teamId === targetUser.teamId;

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
  
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  useEffect(() => {
    if (isEditMode && entryToEdit) {
      const [project, ...taskParts] = entryToEdit.task.split(' - ');
      const task = taskParts.join(' - ');
      const entryDate = new Date(entryToEdit.date);
      
      form.reset({
        date: entryDate,
        startTime: entryToEdit.startTime,
        endTime: entryToEdit.endTime,
        project: project.trim(),
        task: task.trim(),
        remarks: entryToEdit.remarks || '',
      });
      
      if (isDateFrozen(entryDate)) {
        setIsFormDisabled(true);
      } else {
        setIsFormDisabled(false);
      }

    } else {
      setIsFormDisabled(false);
      form.reset({
        date: new Date(),
        startTime: '',
        endTime: '',
        project: '',
        task: '',
        remarks: '',
      });
    }
  }, [entryToEdit, isOpen, form, isEditMode, targetUser]);


  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>();

  const { projects } = useProjects();
  const { tasks: allTasks } = useTasks();

  const availableProjects = projects.filter(p => targetUser?.associatedProjectIds?.includes(p.id));

  const selectedProjectName = form.watch("project");
  
  const availableTasks = React.useMemo(() => {
    if (!selectedProjectName) return [];
    const selectedProject = availableProjects.find(p => p.name === selectedProjectName);
    if (!selectedProject || !selectedProject.taskIds) return [];
    return allTasks.filter(task => selectedProject.taskIds?.includes(task.id));
  }, [selectedProjectName, availableProjects, allTasks]);

  useEffect(() => {
    form.setValue('task', '');
  }, [selectedProjectName, form]);

  async function onSubmit(data: LogTimeFormValues) {
    const { success } = await onSave(data, entryToEdit?.id);
    if(success) {
        onOpenChange(false);
    }
  }

  if (!targetUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Time Entry' : 'Log Time'}</DialogTitle>
          <DialogDescription>
            {isFormDisabled 
              ? `This entry cannot be modified because the date is within a frozen period.`
              : isEditMode 
                ? `Editing entry for ${targetUser.name}.` 
                : "Fill in the details below to log your work time. Click save when you're done."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={isFormDisabled} className="space-y-4">
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
                            disabled={isEditMode} // Cannot change date in edit mode
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
                              <Button size="sm" type="button" onClick={() => {
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProjectName}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableTasks.map((task) => (
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
            </fieldset>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isFormDisabled}>{isEditMode ? 'Save Changes' : 'Log Time'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
