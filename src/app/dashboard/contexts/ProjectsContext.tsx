
'use client';
import * as React from 'react';
import { type Project } from "@/lib/types";
import { getProjects, addProject as addProjectAction, updateProject as updateProjectAction, deleteProject as deleteProjectAction } from '../actions';

interface ProjectsContextType {
  projects: Project[];
  addProject: (newProjectData: Omit<Project, 'id'>) => Promise<string | undefined>;
  updateProject: (projectId: string, data: Omit<Project, 'id'>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  isLoading: boolean;
  getNextProjectNumber: () => Promise<string>;
}

export const ProjectsContext = React.createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchProjects = React.useCallback(async () => {
      setIsLoading(true);
      try {
          const fetchedProjects = await getProjects();
          setProjects(fetchedProjects);
      } catch (error) {
          console.error("Failed to fetch projects", error);
      } finally {
          setIsLoading(false);
      }
  }, []);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (projectData: Omit<Project, 'id'>): Promise<string | undefined> => {
      const newProjectId = await addProjectAction(projectData);
      await fetchProjects(); // Re-fetch to get the new project with its ID
      return newProjectId;
  }

  const updateProject = async (projectId: string, data: Omit<Project, 'id'>) => {
      await updateProjectAction(projectId, data);
      await fetchProjects();
  }

  const deleteProject = async (projectId: string) => {
      await deleteProjectAction(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
  }

  const getNextProjectNumber = async (): Promise<string> => {
    // This is now handled on the backend, but we can keep a client-side estimation
    // to avoid waiting for the backend response if needed for UI purposes.
    // For now, we'll just return a placeholder as the backend is the source of truth.
    return "auto";
  }

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, deleteProject, isLoading, getNextProjectNumber }}>
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
