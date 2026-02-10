
import { Project, User, Task, TaskStatus, Material, Cost, AppFile, UserRole } from '../types';
import { MOCK_PROJECTS, MOCK_USERS } from './mockData';

const PROJECTS_KEY = 'pm_projects';
const USERS_KEY = 'pm_users';
const TASKS_KEY = 'pm_tasks';
const MATERIALS_KEY = 'pm_materials';
const COSTS_KEY = 'pm_costs';
const FILES_KEY = 'pm_files';
const STATUS_KEY = 'pm_custom_statuses';

export const db = {
  getProjects: (currentUser: User): Project[] => {
    const data = localStorage.getItem(PROJECTS_KEY);
    let projects: Project[] = data ? JSON.parse(data) : MOCK_PROJECTS;
    
    // Biztosítjuk, hogy az assigned_users tömb létezzen minden projektnél
    projects = projects.map(p => ({
      ...p,
      assigned_users: p.assigned_users || [],
      created_by_id: p.created_by_id || 'u1' // Alapértelmezett mock creator
    }));

    if (currentUser.role === UserRole.ADMIN) {
      return projects;
    }

    // USER szűrés: csak amit létrehozott VAGY amihez hozzá van rendelve
    return projects.filter(p => 
      p.created_by_id === currentUser.id || 
      p.assigned_users.includes(currentUser.id)
    );
  },
  
  saveProject: (project: Project) => {
    const data = localStorage.getItem(PROJECTS_KEY);
    let projects: Project[] = data ? JSON.parse(data) : MOCK_PROJECTS;
    const index = projects.findIndex(p => p.id === project.id);
    if (index > -1) projects[index] = project;
    else projects.push(project);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  },

  deleteProject: (id: string) => {
    const data = localStorage.getItem(PROJECTS_KEY);
    if (!data) return;
    const projects: Project[] = JSON.parse(data);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.filter(p => p.id !== id)));
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) {
      localStorage.setItem(USERS_KEY, JSON.stringify(MOCK_USERS));
      return MOCK_USERS;
    }
    return JSON.parse(data);
  },

  saveUser: (user: User) => {
    const users = db.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) users[index] = user;
    else users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getTasks: (projectId: string): Task[] => {
    const data = localStorage.getItem(TASKS_KEY);
    const allTasks: Task[] = data ? JSON.parse(data) : [];
    return allTasks
      .filter(t => t.project_id === projectId)
      .sort((a, b) => a.order - b.order);
  },

  saveTask: (task: Task) => {
    const data = localStorage.getItem(TASKS_KEY);
    let allTasks: Task[] = data ? JSON.parse(data) : [];
    const index = allTasks.findIndex(t => t.id === task.id);
    if (index > -1) allTasks[index] = task;
    else allTasks.push(task);
    localStorage.setItem(TASKS_KEY, JSON.stringify(allTasks));
  },

  getMaterials: (projectId: string): Material[] => {
    const data = localStorage.getItem(MATERIALS_KEY);
    const allMaterials: Material[] = data ? JSON.parse(data) : [];
    return allMaterials.filter(m => m.project_id === projectId);
  },

  saveMaterial: (material: Material) => {
    const data = localStorage.getItem(MATERIALS_KEY);
    let allMaterials: Material[] = data ? JSON.parse(data) : [];
    const index = allMaterials.findIndex(m => m.id === material.id);
    if (index > -1) allMaterials[index] = material;
    else allMaterials.push(material);
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(allMaterials));
  },

  getCosts: (projectId: string): Cost[] => {
    const data = localStorage.getItem(COSTS_KEY);
    const allCosts: Cost[] = data ? JSON.parse(data) : [];
    return allCosts.filter(c => c.project_id === projectId);
  },

  saveCost: (cost: Cost) => {
    const data = localStorage.getItem(COSTS_KEY);
    let allCosts: Cost[] = data ? JSON.parse(data) : [];
    const index = allCosts.findIndex(c => c.id === cost.id);
    if (index > -1) allCosts[index] = cost;
    else allCosts.push(cost);
    localStorage.setItem(COSTS_KEY, JSON.stringify(allCosts));
  },

  getFiles: (projectId: string): AppFile[] => {
    const data = localStorage.getItem(FILES_KEY);
    const allFiles: AppFile[] = data ? JSON.parse(data) : [];
    return allFiles.filter(f => f.project_id === projectId);
  },

  saveFile: (file: AppFile) => {
    const data = localStorage.getItem(FILES_KEY);
    let allFiles: AppFile[] = data ? JSON.parse(data) : [];
    allFiles.push(file);
    localStorage.setItem(FILES_KEY, JSON.stringify(allFiles));
  },

  // Fix: Added missing deleteFile method to the db service
  deleteFile: (id: string) => {
    const data = localStorage.getItem(FILES_KEY);
    if (!data) return;
    const allFiles: AppFile[] = JSON.parse(data);
    localStorage.setItem(FILES_KEY, JSON.stringify(allFiles.filter(f => f.id !== id)));
  },

  getCustomStatuses: (): string[] => {
    const data = localStorage.getItem(STATUS_KEY);
    return data ? JSON.parse(data) : ['felmeres', 'arajanlat', 'kivitelezes', 'kesz'];
  },

  addCustomStatus: (status: string) => {
    const statuses = db.getCustomStatuses();
    if (!statuses.includes(status)) {
      statuses.push(status);
      localStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
    }
  }
};
