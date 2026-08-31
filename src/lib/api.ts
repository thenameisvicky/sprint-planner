/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Project {
  id: string;
  name: string;
  description: string;
  key: string;
  createdAt: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: 'draft' | 'active' | 'completed';
}

export interface Task {
  id: string;
  projectId: string;
  cycleId: string | null; // Sprint ID
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'done';
  priority: 'none' | 'low' | 'medium' | 'high';
  sequenceId: number;
  createdAt: string;
  updatedAt: string;
}

// CamelCase (Frontend) to Snake_case (PostgreSQL DB) Mapping Helpers
const mapProjectToFrontend = (p: any): Project => ({
  id: p.id,
  name: p.name,
  description: p.description || '',
  key: p.key,
  createdAt: p.created_at || new Date().toISOString(),
});

const mapProjectToDb = (p: Partial<Project>) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  key: p.key,
  created_at: p.createdAt,
});

const mapSprintToFrontend = (s: any): Sprint => ({
  id: s.id,
  projectId: s.project_id,
  name: s.name,
  description: s.description || '',
  startDate: s.start_date,
  endDate: s.end_date,
  status: s.status,
});

const mapSprintToDb = (s: Partial<Sprint>) => ({
  id: s.id,
  project_id: s.projectId,
  name: s.name,
  description: s.description,
  start_date: s.startDate,
  end_date: s.endDate,
  status: s.status,
});

const mapTaskToFrontend = (t: any): Task => ({
  id: t.id,
  projectId: t.project_id,
  cycleId: t.cycle_id,
  title: t.title,
  description: t.description || '',
  status: t.status,
  priority: t.priority,
  sequenceId: t.sequence_id,
  createdAt: t.created_at || new Date().toISOString(),
  updatedAt: t.updated_at || new Date().toISOString(),
});

const mapTaskToDb = (t: Partial<Task>) => ({
  id: t.id,
  project_id: t.projectId,
  cycle_id: t.cycleId,
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  sequence_id: t.sequenceId,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
});

// Helper for making API calls proxied by Next.js server-side endpoint
const fetchApi = async (path: string, options: RequestInit = {}) => {
  const url = `/api/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response;
};

export const apiService = {
  // Get API URL for debug warnings in UI
  getApiUrl: () => '/api',

  // Project CRUD
  getProjects: async (): Promise<Project[]> => {
    const res = await fetchApi('projects?order=created_at.asc');
    const data = await res.json();
    return data.map(mapProjectToFrontend);
  },

  createProject: async (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
    const newProj: Project = {
      ...project,
      id: 'p_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    const res = await fetchApi('projects', {
      method: 'POST',
      body: JSON.stringify(mapProjectToDb(newProj)),
      headers: { 'Prefer': 'return=representation' }
    });
    const data = await res.json();
    return data.length > 0 ? mapProjectToFrontend(data[0]) : newProj;
  },

  updateProject: async (projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> => {
    const res = await fetchApi(`projects?id=eq.${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(mapProjectToDb(updates)),
      headers: { 'Prefer': 'return=representation' }
    });
    const data = await res.json();
    return data.length > 0 ? mapProjectToFrontend(data[0]) : null;
  },

  deleteProject: async (projectId: string): Promise<boolean> => {
    await fetchApi(`projects?id=eq.${projectId}`, {
      method: 'DELETE'
    });
    return true;
  },

  // Sprint CRUD
  getSprints: async (projectId: string): Promise<Sprint[]> => {
    const res = await fetchApi(`sprints?project_id=eq.${projectId}&order=name.asc`);
    const data = await res.json();
    return data.map(mapSprintToFrontend);
  },

  createSprint: async (sprint: Omit<Sprint, 'id' | 'status'>): Promise<Sprint> => {
    const newSprint: Sprint = {
      ...sprint,
      id: 's_' + Math.random().toString(36).substr(2, 9),
      status: 'draft',
    };
    const res = await fetchApi('sprints', {
      method: 'POST',
      body: JSON.stringify(mapSprintToDb(newSprint)),
      headers: { 'Prefer': 'return=representation' }
    });
    const data = await res.json();
    return data.length > 0 ? mapSprintToFrontend(data[0]) : newSprint;
  },

  updateSprintStatus: async (sprintId: string, status: Sprint['status']): Promise<Sprint | null> => {
    const res = await fetchApi(`sprints?id=eq.${sprintId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      headers: { 'Prefer': 'return=representation' }
    });
    const data = await res.json();
    return data.length > 0 ? mapSprintToFrontend(data[0]) : null;
  },

  // Task CRUD
  getTasks: async (projectId: string): Promise<Task[]> => {
    const res = await fetchApi(`tasks?project_id=eq.${projectId}&order=sequence_id.asc`);
    const data = await res.json();
    return data.map(mapTaskToFrontend);
  },

  createTask: async (task: Omit<Task, 'id' | 'sequenceId' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
    const resGet = await fetchApi(`tasks?project_id=eq.${task.projectId}`);
    const projectTasks = await resGet.json();
    const nextSeq = projectTasks.length > 0 ? Math.max(...projectTasks.map((t: any) => t.sequence_id)) + 1 : 1;

    const newTask: Task = {
      ...task,
      id: 't_' + Math.random().toString(36).substr(2, 9),
      sequenceId: nextSeq,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await fetchApi('tasks', {
      method: 'POST',
      body: JSON.stringify(mapTaskToDb(newTask)),
      headers: { 'Prefer': 'return=representation' }
    });
    const data = await res.json();
    return data.length > 0 ? mapTaskToFrontend(data[0]) : newTask;
  },

  updateTask: async (taskId: string, updates: Partial<Omit<Task, 'id' | 'sequenceId' | 'createdAt'>>): Promise<Task | null> => {
    const res = await fetchApi(`tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(mapTaskToDb(updates)),
      headers: { 'Prefer': 'return=representation' }
    });
    const data = await res.json();
    return data.length > 0 ? mapTaskToFrontend(data[0]) : null;
  },

  deleteTask: async (taskId: string): Promise<boolean> => {
    await fetchApi(`tasks?id=eq.${taskId}`, {
      method: 'DELETE'
    });
    return true;
  }
};
