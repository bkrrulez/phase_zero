
'use client';
import * as React from 'react';
import { type Project } from "@/lib/types";
import useLocalStorage from '@/hooks/useLocalStorage';
import { initialData } from '@/lib/mock-data';

interface ProjectsContextType {
  projects: Project[];
  addProject: (newProjectData: Omit<Project, 'id'>) => void;
  updateProject: (projectId: string, data: Omit<Project, 'id'>) => void;
  deleteProject: (projectId: string) => void;
}

export const ProjectsContext = React.createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', initialData.projects);

  const addProject = (projectData: Omit<Project, 'id'>) => {
      const newProject: Project = { ...projectData, id: `project-${Date.now()}` };
      setProjects(prev => [...prev, newProject]);
  }

  const updateProject = (projectId: string, data: Omit<Project, 'id'>) => {
      setProjects(prevProjects => 
          prevProjects.map(project => 
              project.id === projectId ? { 
                  ...project, 
                  ...data
              } : project
          )
      );
  }

  const deleteProject = (projectId: string) => {
      setProjects(prev => prev.filter(p => p.id !== projectId));
  }

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, deleteProject }}>
        {children}
    </ProjectsContext.Provider>
  );
}

export const useProjects = () => {
  const context = React.useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
};
