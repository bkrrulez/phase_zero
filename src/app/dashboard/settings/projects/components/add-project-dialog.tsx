
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Project } from '@/lib/types';
import { useAuth } from '@/app/dashboard/contexts/AuthContext';
import { useMembers } from '@/app/dashboard/contexts/MembersContext';
import { useLanguage } from '@/app/dashboard/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { addProjectAnalysis, getLatestProjectAnalysis, addNewProjectAnalysisVersion } from '@/app/dashboard/actions';
import * as React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useProjects } from '@/app/dashboard/contexts/ProjectsContext';


const createProjectSchema = (projects: { name: string }[]) => z.object({
  projectName: z.string().min(1, 'Project name is required.').refine(
    (name) => !projects.some(p => p.name.toLowerCase() === name.toLowerCase()),
    { message: 'A project with this name already exists. Please choose a different name.' }
  ),
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

export type ProjectFormValues = z.infer<ReturnType<typeof createProjectSchema>>;

interface AddProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddProject: (data: ProjectFormValues) => Promise<{id?: string, error?: string} | undefined>;
}

export function AddProjectDialog({ isOpen, onOpenChange, onAddProject }: AddProjectDialogProps) {
    const { currentUser } = useAuth();
    const { teamMembers } = useMembers();
    const { t } = useLanguage();
    const router = useRouter();
    const { toast } = useToast();
    const { projects } = useProjects();
    const [analysisPrompt, setAnalysisPrompt] = React.useState<{projectId: string, latestAnalysisId: string} | null>(null);

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(createProjectSchema(projects)),
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

    React.useEffect(() => {
        if (isOpen && currentUser) {
            form.reset({
                projectName: '',
                projectManager: '',
                creator: currentUser.id,
                address: '',
                projectOwner: '',
                yearOfConstruction: undefined,
                numberOfFloors: undefined,
                escapeLevel: undefined,
                listedBuilding: 'No',
                protectionZone: 'No',
                currentUse: 'General',
            });
        }
    }, [isOpen, currentUser, form]);
    
    const canChangeCreator = currentUser?.role === 'Super Admin' || currentUser?.role === 'Team Lead';

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
        { value: 'Non-residential', label: 'Non Residential' },
    ];
    
    async function onSubmit(data: ProjectFormValues) {
        const result = await onAddProject(data);
        if (result && result.id) {
          onOpenChange(false);
        }
    }

    async function handleAnalysis() {
        const data = form.getValues();
        
        const isFormValid = await form.trigger();
        if (!isFormValid) {
             toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill out all required project details first."});
             return;
        }

        const result = await onAddProject(data);
        if (!result || result.error) {
             // Error toast will be shown by the calling component
             return;
        }
        
        const latestAnalysis = await getLatestProjectAnalysis(result.id!);

        if (latestAnalysis) {
            setAnalysisPrompt({ projectId: result.id!, latestAnalysisId: latestAnalysis.id });
        } else {
            handleNewAnalysis(result.id!);
        }
    }

    const handleNewAnalysis = async (projectId: string) => {
        const newAnalysis = await addNewProjectAnalysisVersion(projectId);
        if (newAnalysis) {
            onOpenChange(false);
            router.push(`/dashboard/project-analysis/${newAnalysis.id}`);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create a new analysis version.'});
        }
        setAnalysisPrompt(null);
    }
    
    const handleOpenLastAnalysis = () => {
        if(analysisPrompt) {
            onOpenChange(false);
            router.push(`/dashboard/project-analysis/${analysisPrompt.latestAnalysisId}`);
        }
        setAnalysisPrompt(null);
    }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('addProject')}</DialogTitle>
          <DialogDescription>
            {t('fillProjectDetails')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="px-6">
              <Form {...form}>
                <form id="add-project-form" onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
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
                                                  {t(opt.label as any) || opt.label}
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
                </form>
              </Form>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button type="submit" form="add-project-form">{t('save')}</Button>
          <Button type="button" variant="secondary" onClick={handleAnalysis}>{t('analysis')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!analysisPrompt} onOpenChange={() => setAnalysisPrompt(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('analysisAlreadyExistsTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('analysisAlreadyExistsDesc')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleOpenLastAnalysis}>{t('openLastAnalysis')}</AlertDialogAction>
                <AlertDialogAction onClick={() => handleNewAnalysis(analysisPrompt!.projectId)}>{t('newAnalysis')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
