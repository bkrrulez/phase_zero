

'use client';
import * as React from 'react';
import { type Project } from "@/lib/types";
import { getProjects, addProject as addProjectAction, updateProject as updateProjectAction, deleteProject as deleteProjectAction } from '../actions';
import { useSystemLog } from './SystemLogContext';
import { useAuth } from './AuthContext';

interface ProjectsContextType {
  projects: Project[];
  addProject: (newProjectData: Omit<Project, 'id' | 'projectNumber' | 'projectCreationDate'>) => Promise<string | undefined>;
  updateProject: (projectId: string, data: Omit<Project, 'id'>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  isLoading: boolean;
  getNextProjectNumber: () => Promise<string>;
}

export const ProjectsContext = React.createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { currentUser } = useAuth();
  const { logAction } = useSystemLog();

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

  const addProject = async (projectData: Omit<Project, 'id' | 'projectNumber' | 'projectCreationDate'>): Promise<string | undefined> => {
      if (!currentUser) return;
      const newProjectId = await addProjectAction(projectData);
      if (newProjectId) {
          await logAction(`User '${currentUser.name}' created project '${projectData.name}' (ID: ${newProjectId}).`);
          await fetchProjects(); // Re-fetch to get the new project with its ID and number
      }
      return newProjectId;
  }

  const updateProject = async (projectId: string, data: Omit<Project, 'id'>) => {
      if (!currentUser) return;
      await updateProjectAction(projectId, data);
      await logAction(`User '${currentUser.name}' updated project '${data.name}' (ID: ${projectId}).`);
      await fetchProjects();
  }

  const deleteProject = async (projectId: string) => {
      if (!currentUser) return;
      const projectToDelete = projects.find(p => p.id === projectId);
      await deleteProjectAction(projectId);
      if (projectToDelete) {
        await logAction(`User '${currentUser.name}' deleted project '${projectToDelete.name}' (ID: ${projectId}).`);
      }
      setProjects(prev => prev.filter(p => p.id !== projectId));
  }

  const getNextProjectNumber = async (): Promise<string> => {
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
