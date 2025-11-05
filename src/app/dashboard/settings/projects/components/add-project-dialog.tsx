
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type User } from '@/lib/types';
import { useAuth } from '@/app/dashboard/contexts/AuthContext';
import { useMembers } from '@/app/dashboard/contexts/MembersContext';
import { useLanguage } from '@/app/dashboard/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { addProjectAnalysis } from '@/app/dashboard/actions';

const projectSchema = z.object({
  projectName: z.string().min(1, 'Project name is required.'),
  projectManager: z.string().min(1, 'Project Manager is required.'),
  address: z.string().min(1, 'Address is required.'),
  projectOwner: z.string().min(1, 'Project Owner is required.'),
  creator: z.string().min(1, 'Creator is required.'),
  yearOfConstruction: z.coerce.number().int().min(0).max(9999).optional(),
  numberOfFloors: z.coerce.number().int().min(0).max(9999).optional(),
  escapeLevel: z.coerce.number().min(0).max(999.99).optional(),
  listedBuilding: z.enum(['Yes', 'No']),
  protectionZone: z.enum(['Yes', 'No']),
  currentUse: z.string().min(1, "Current use is required."),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

interface AddProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddProject: (data: ProjectFormValues) => Promise<string | undefined>;
}

export function AddProjectDialog({ isOpen, onOpenChange, onAddProject }: AddProjectDialogProps) {
    const { currentUser } = useAuth();
    const { teamMembers } = useMembers();
    const { t, language } = useLanguage();
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            projectName: '',
            projectManager: '',
            creator: currentUser?.id || '',
            address: '',
            projectOwner: '',
            yearOfConstruction: undefined,
            numberOfFloors: undefined,
            escapeLevel: undefined,
            listedBuilding: 'No',
            protectionZone: 'No',
            currentUse: 'General',
        },
    });
    
    const canChangeCreator = currentUser.role === 'Super Admin' || currentUser.role === 'Team Lead';

    const currentUseOptions = [
        { value: 'General', label: 'General' },
        { value: 'Residential', label: 'Residential' },
        { value: 'Office', label: 'Office' },
        { value: 'Accommodation/ Guest House/ Hotel/ Dormitory', label: 'Accommodation/ Guest House/ Hotel/ Dormitory' },
        { value: 'Inn/ Restaurant/ Cafe', label: 'Inn/ Restaurant/ Cafe' },
        { value: 'Retail Outlet/ Shopping Center', label: 'Retail Outlet/ Shopping Center' },
        { value: 'Educational Institution/ School/ Kindergarten', label: 'Educational Institution/ School/ Kindergarten' },
        { value: 'Business Premises', label: 'Business Premises' },
        { value: 'Garage/ Covered Parking, Parking Deck', label: 'Garage/ Covered Parking, Parking Deck' },
        { value: 'Gas Station', label: 'Gas Station' },
        { value: 'Special Buildings: Hospital/ Nursing Home/ Assembly Halls/ Shelters', label: 'Special Buildings: Hospital/ Nursing Home/ Assembly Halls/ Shelters' },
        { value: 'Non Residential', label: 'Non Residential' },
    ];
    
    async function onSubmit(data: ProjectFormValues) {
        await onAddProject(data);
        form.reset({
            ...form.formState.defaultValues,
            creator: currentUser?.id || ''
        });
    }

    async function handleAnalysis() {
        const data = form.getValues();
        const { isDirty, isValid } = form.formState;
        
        // Ensure form is filled and valid before proceeding
        if (!isValid && !isDirty) {
             form.trigger(); // Manually trigger validation to show errors
             toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill out all required project details first."});
             return;
        }
        if (!isValid) {
            toast({ variant: 'destructive', title: "Invalid Data", description: "Please correct the errors before proceeding."});
            return;
        }

        const projectId = await onAddProject(data);
        if (projectId) {
            const { analysis } = await addProjectAnalysis(projectId);
            if (analysis) {
                onOpenChange(false);
                router.push(`/dashboard/project-analysis/${analysis.id}`);
            } else {
                 toast({
                    variant: 'destructive',
                    title: "Error",
                    description: "Could not start analysis for the new project.",
                });
            }
        }
    }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('addProject')}</DialogTitle>
          <DialogDescription>
            {t('fillProjectDetails')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[70vh]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">{t('projectData')}</h3>
                         <FormField
                            control={form.control}
                            name="projectName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('projectName')}</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="projectManager"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('projectManager')}</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="creator"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('creator')}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!canChangeCreator}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('selectCreator')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {teamMembers.map(member => (
                                                <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('address')}</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="projectOwner"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('projectOwner')}</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    {/* Right Column */}
                    <div className="space-y-4">
                         <h3 className="font-semibold text-lg">{t('buildingData')}</h3>
                         <FormField
                            control={form.control}
                            name="yearOfConstruction"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('yearOfConstruction')}</FormLabel>
                                <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="numberOfFloors"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('geschosse')}</FormLabel>
                                <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="escapeLevel"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('fluchtniveau')}</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}/></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="listedBuilding"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('denkmalschutz')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Yes">{t('yes')}</SelectItem>
                                        <SelectItem value="No">{t('no')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="protectionZone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('schutzzone')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Yes">{t('yes')}</SelectItem>
                                        <SelectItem value="No">{t('no')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="currentUse"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('aktuelleNutzung')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <ScrollArea className="h-48">
                                            {currentUseOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {language === 'de' ? t(opt.value as any) : opt.label}
                                                </SelectItem>
                                            ))}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                 </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
                <Button type="submit">{t('save')}</Button>
                <Button type="button" variant="secondary" onClick={handleAnalysis}>{t('analysis')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
