'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/lib/mock-data';

interface EditContractDialogProps {
  user: User;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (updatedUser: User) => void;
}

export function EditContractDialog({ user, isOpen, onOpenChange, onSave }: EditContractDialogProps) {
  const [contract, setContract] = useState(user.contract);

  useEffect(() => {
    setContract(user.contract);
  }, [user]);

  const handleSave = () => {
    onSave({ ...user, contract });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Contract for {user.name}</DialogTitle>
          <DialogDescription>
            Update the contract details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="weeklyHours" className="text-right">
              Weekly Hours
            </Label>
            <Input
              id="weeklyHours"
              type="number"
              value={contract.weeklyHours}
              onChange={(e) => setContract({ ...contract, weeklyHours: parseInt(e.target.value, 10) || 0 })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={contract.startDate}
              onChange={(e) => setContract({ ...contract, startDate: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="text-right">
              End Date
            </Label>
            <Input
              id="endDate"
              type="date"
              value={contract.endDate ?? ''}
              onChange={(e) => setContract({ ...contract, endDate: e.target.value || null })}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
