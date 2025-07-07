
'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { tasks as initialTasks, type Task } from "@/lib/mock-data";
import useLocalStorage from '@/hooks/useLocalStorage';

interface TasksContextType {
  tasks: Task[];
  addTask: (newTaskData: Omit<Task, 'id'>) => void;
  updateTask: (taskId: string, data: Omit<Task, 'id'>) => void;
  deleteTask: (taskId: string) => void;
}

export const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', initialTasks);
    
    const addTask = (taskData: Omit<Task, 'id'>) => {
        const newTask: Task = { ...taskData, id: `task-${Date.now()}` };
        setTasks(prev => [...prev, newTask]);
    }

    const updateTask = (taskId: string, data: Omit<Task, 'id'>) => {
        setTasks(prevTasks => 
            prevTasks.map(task => 
                task.id === taskId ? { 
                    ...task, 
                    ...data
                } : task
            )
        );
    }

    const deleteTask = (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }

    return (
        <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask }}>
            {children}
        </TasksContext.Provider>
    );
}

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasks must be used within a TasksProvider");
  }
  return context;
};
