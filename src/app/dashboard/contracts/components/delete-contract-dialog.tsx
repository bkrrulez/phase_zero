
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type Contract } from '@/lib/types';
import { useAuth } from '../../contexts/AuthContext';
import { startOfDay } from 'date-fns';

interface DeleteContractDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  contract: Contract | null;
}

export function DeleteContractDialog({ isOpen, onOpenChange, onConfirm, contract }: DeleteContractDialogProps) {
  const { currentUser } = useAuth();
  if (!contract) return null;

  const isPast = contract.endDate ? new Date(contract.endDate) < startOfDay(new Date()) : false;
  const canDelete = currentUser.role === 'Super Admin' || !isPast;


  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete access period #{contract.id}. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!canDelete}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
