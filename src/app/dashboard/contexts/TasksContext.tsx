
'use client';
import * as React from 'react';
import { type Task } from "@/lib/types";
import { getTasks, addTask as addTaskAction, updateTask as updateTaskAction, deleteTask as deleteTaskAction } from '../actions';


interface TasksContextType {
  tasks: Task[];
  addTask: (newTaskData: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (taskId: string, data: Omit<Task, 'id'>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  isLoading: boolean;
}

export const TasksContext = React.createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = React.useState<Task[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchTasks = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedTasks = await getTasks();
            setTasks(fetchedTasks);
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);
    
    const addTask = async (taskData: Omit<Task, 'id'>) => {
        await addTaskAction(taskData);
        await fetchTasks();
    }

    const updateTask = async (taskId: string, data: Omit<Task, 'id'>) => {
        await updateTaskAction(taskId, data);
        await fetchTasks();
    }

    const deleteTask = async (taskId: string) => {
        await deleteTaskAction(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }

    return (
        <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask, isLoading }}>
            {children}
        </TasksContext.Provider>
    );
}

export const useTasks = () => {
  const context = React.useContext(TasksContext);
  if (!context) {
    throw new Error("useTasks must be used within a TasksProvider");
  }
  return context;
};

    