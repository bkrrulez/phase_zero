
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useHolidays } from '@/app/dashboard/contexts/HolidaysContext';

const annualLeaveSchema = z.object({
  allowance: z.coerce.number().int().min(0, 'Allowance cannot be less than 0.').max(60, 'Allowance cannot exceed 60 days.'),
});

type AnnualLeaveFormValues = z.infer<typeof annualLeaveSchema>;

export function AnnualLeavesTab() {
  const { toast } = useToast();
  const { annualLeaveAllowance, setAnnualLeaveAllowance } = useHolidays();
  
  const form = useForm<AnnualLeaveFormValues>({
    resolver: zodResolver(annualLeaveSchema),
    values: {
      allowance: annualLeaveAllowance,
    },
  });

  const onSubmit = (data: AnnualLeaveFormValues) => {
    setAnnualLeaveAllowance(data.allowance);
    toast({
      title: 'Success',
      description: `Annual leave allowance has been updated to ${data.allowance} days.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Leave Allowance</CardTitle>
        <CardDescription>
          Set the default number of annual leave days for all employees. This will be reflected in their holiday balance.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FormField
              control={form.control}
              name="allowance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yearly Allowance (Days)</FormLabel>
                  <FormControl>
                    <Input type="number" className="max-w-xs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit">Save Changes</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
