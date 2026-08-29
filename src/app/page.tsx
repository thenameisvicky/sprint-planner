'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  ListTodo, 
  CalendarDays, 
  Plus, 
  FolderPlus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Folder, 
  ChevronRight, 
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { apiService, Project, Sprint, Task } from '../lib/api';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'issues' | 'sprints'>('dashboard');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [showProjModal, setShowProjModal] = useState(false);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [newProjName, setNewProjName] = useState('');
  const [newProjKey, setNewProjKey] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintDesc, setNewSprintDesc] = useState('');
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState<Task['status']>('todo');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('medium');
  const [taskSprintId, setTaskSprintId] = useState<string>('none');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      const projList = await apiService.getProjects();
      setProjects(projList);
      if (projList.length > 0 && !selectedProject) {
        setSelectedProject(projList[0]);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    async function loadProjectData() {
      const sprintList = await apiService.getSprints(selectedProject!.id);
      const taskList = await apiService.getTasks(selectedProject!.id);
      setSprints(sprintList);
      setTasks(taskList);
    }
    loadProjectData();
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjKey) return;
    const newProj = await apiService.createProject({
      name: newProjName,
      key: newProjKey.toUpperCase(),
      description: newProjDesc,
    });
    setProjects([...projects, newProj]);
    setSelectedProject(newProj);
    setShowProjModal(false);
    setNewProjName('');
    setNewProjKey('');
    setNewProjDesc('');
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? All associated sprints and tasks will be permanently removed.')) return;
    const success = await apiService.deleteProject(projectId);
    if (success) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      if (selectedProject?.id === projectId) {
        setSelectedProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
      }
    }
  };


  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newSprintName) return;
    const newSprint = await apiService.createSprint({
      projectId: selectedProject.id,
      name: newSprintName,
      description: newSprintDesc,
      startDate: newSprintStart || null,
      endDate: newSprintEnd || null,
    });
    setSprints([...sprints, newSprint]);
    setShowSprintModal(false);
    // Reset Form
    setNewSprintName('');
    setNewSprintDesc('');
    setNewSprintStart('');
    setNewSprintEnd('');
  };

  // Handle Task Creation or Update
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !taskTitle) return;

    const cycleId = taskSprintId === 'none' ? null : taskSprintId;

    if (editingTask) {
      // Update Task
      const updated = await apiService.updateTask(editingTask.id, {
        title: taskTitle,
        description: taskDesc,
        status: taskStatus,
        priority: taskPriority,
        cycleId: cycleId,
      });
      if (updated) {
        setTasks(tasks.map(t => t.id === editingTask.id ? updated : t));
      }
    } else {
      // Create Task
      const created = await apiService.createTask({
        projectId: selectedProject.id,
        cycleId: cycleId,
        title: taskTitle,
        description: taskDesc,
        status: taskStatus,
        priority: taskPriority,
      });
      setTasks([...tasks, created]);
    }

    setShowTaskModal(false);
    setEditingTask(null);
    // Reset Form
    setTaskTitle('');
    setTaskDesc('');
    setTaskStatus('todo');
    setTaskPriority('medium');
    setTaskSprintId('none');
  };

  const handleEditTaskClick = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskSprintId(task.cycleId || 'none');
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    const success = await apiService.deleteTask(taskId);
    if (success) {
      setTasks(tasks.filter(t => t.id !== taskId));
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    const updated = await apiService.updateTask(taskId, { status: newStatus });
    if (updated) {
      setTasks(tasks.map(t => t.id === taskId ? updated : t));
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    // Complete any other active sprints first for safety
    const updatedSprints = await Promise.all(
      sprints.map(async (s) => {
        if (s.id === sprintId) {
          const res = await apiService.updateSprintStatus(s.id, 'active');
          return res || s;
        } else if (s.status === 'active') {
          const res = await apiService.updateSprintStatus(s.id, 'completed');
          return res || s;
        }
        return s;
      })
    );
    setSprints(updatedSprints);
  };

  const handleCompleteSprint = async (sprintId: string) => {
    const res = await apiService.updateSprintStatus(sprintId, 'completed');
    if (res) {
      setSprints(sprints.map(s => s.id === sprintId ? res : s));
    }
  };

  // Helper Stats calculations
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const backlogTasks = tasks.filter(t => t.status === 'backlog').length;

  const activeSprint = sprints.find(s => s.status === 'active');
  const activeSprintTasks = activeSprint ? tasks.filter(t => t.cycleId === activeSprint.id) : [];
  const activeSprintDone = activeSprintTasks.filter(t => t.status === 'done').length;
  const activeSprintProgress = activeSprintTasks.length > 0 
    ? Math.round((activeSprintDone / activeSprintTasks.length) * 100) 
    : 0;

  // Filtered Tasks for List/Kanban Views
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          `${selectedProject?.key}-${task.sequenceId}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              P
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-none text-slate-200">Planner</h1>
              <span className="text-xs text-indigo-400 font-medium">Self-Hosted</span>
            </div>
          </div>
        </div>

        {/* Project Selector */}
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projects</span>
            <button 
              onClick={() => setShowProjModal(true)}
              className="text-slate-400 hover:text-indigo-400 transition-colors p-1 rounded hover:bg-slate-800"
              title="New Project"
            >
              <Plus size={14} />
            </button>
          </div>
          {projects.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">No projects yet. Create one!</div>
          ) : (
            <div className="space-y-1">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className={`group/proj w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${
                    selectedProject?.id === proj.id 
                      ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 font-medium pl-2.5 font-semibold' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setSelectedProject(proj)}
                    className="flex-1 flex items-center gap-2 truncate text-left cursor-pointer"
                  >
                    <Folder size={15} className={selectedProject?.id === proj.id ? 'text-indigo-400' : 'text-slate-400'} />
                    <span className="truncate">{proj.name}</span>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] bg-slate-850 group-hover/proj:hidden px-1.5 py-0.5 rounded font-mono text-slate-500">
                      {proj.key}
                    </span>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      className="hidden group-hover/proj:block text-slate-500 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === 'dashboard' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('board')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === 'board' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <KanbanSquare size={18} />
            Kanban Board
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === 'issues' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <ListTodo size={18} />
            Issues / Tasks
          </button>
          <button
            onClick={() => setActiveTab('sprints')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === 'sprints' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <CalendarDays size={18} />
            Sprint Planning
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <div className="flex justify-between items-center">
            <span>Project: {selectedProject?.name || 'None'}</span>
            <span className="font-mono text-indigo-500">v1.0-lite</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-200">
              {activeTab === 'dashboard' && 'Project Summary'}
              {activeTab === 'board' && 'Kanban Task Board'}
              {activeTab === 'issues' && 'Backlog & Issues'}
              {activeTab === 'sprints' && 'Sprints & Cycles'}
            </h2>
            {selectedProject && (
              <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-slate-400 font-medium">
                {selectedProject.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingTask(null);
                setTaskTitle('');
                setTaskDesc('');
                setTaskStatus('todo');
                setTaskPriority('medium');
                setTaskSprintId('none');
                setShowTaskModal(true);
              }}
              disabled={!selectedProject}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 disabled:text-slate-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/10 active:scale-95"
            >
              <Plus size={16} />
              Create Issue
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 flex-1">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-xl p-8 bg-slate-900/10">
              <FolderPlus size={48} className="text-slate-600 mb-4" />
              <h3 className="text-base font-semibold text-slate-350 mb-1">No Active Project</h3>
              <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
                Get started by creating your first project where you can plan sprints and write tasks.
              </p>
              <button
                onClick={() => setShowProjModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Create First Project
              </button>
            </div>
          ) : (
            <>
              {/* ----------------- DASHBOARD VIEW ----------------- */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Status Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Backlog</span>
                        <span className="text-xs bg-slate-850 px-2 py-0.5 rounded text-slate-400 font-medium">Draft</span>
                      </div>
                      <div className="text-3xl font-bold mt-2 text-slate-200">{backlogTasks}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">To Do</span>
                        <span className="text-xs bg-indigo-950 px-2 py-0.5 rounded text-indigo-400 font-medium">Planned</span>
                      </div>
                      <div className="text-3xl font-bold mt-2 text-slate-200">{todoTasks}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Progress</span>
                        <span className="text-xs bg-amber-950 px-2 py-0.5 rounded text-amber-400 font-medium">In Flight</span>
                      </div>
                      <div className="text-3xl font-bold mt-2 text-amber-450">{inProgressTasks}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</span>
                        <span className="text-xs bg-emerald-950 px-2 py-0.5 rounded text-emerald-400 font-medium">Done</span>
                      </div>
                      <div className="text-3xl font-bold mt-2 text-emerald-400">{doneTasks} / {totalTasks}</div>
                    </div>
                  </div>

                  {/* Sprint Progress Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active Sprint Section */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-md flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <h3 className="font-semibold text-base text-slate-200">Active Sprint</h3>
                          </div>
                          {activeSprint && (
                            <span className="text-xs text-slate-400 bg-slate-850 px-3 py-1 rounded-full font-medium">
                              Ends: {activeSprint.endDate || 'No Date'}
                            </span>
                          )}
                        </div>

                        {activeSprint ? (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-lg font-bold text-slate-100">{activeSprint.name}</h4>
                              <p className="text-sm text-slate-400 mt-1 max-w-xl">{activeSprint.description}</p>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-2 pt-2">
                              <div className="flex justify-between text-xs font-medium text-slate-400">
                                <span>Sprint Completion</span>
                                <span>{activeSprintProgress}% ({activeSprintDone} / {activeSprintTasks.length} tasks)</span>
                              </div>
                              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${activeSprintProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center">
                            <p className="text-sm text-slate-500 mb-4">No active sprint is running for this project.</p>
                            <button
                              onClick={() => setActiveTab('sprints')}
                              className="text-xs bg-slate-850 hover:bg-slate-800 text-slate-200 font-medium px-4 py-2 rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                            >
                              Go to Sprint Planner <ArrowRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {activeSprint && (
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-800 mt-6">
                          <button
                            onClick={() => setActiveTab('board')}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                          >
                            View Sprint Board
                          </button>
                          <button
                            onClick={() => handleCompleteSprint(activeSprint.id)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-lg transition-colors"
                          >
                            Complete Sprint
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick Stats Panel */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                          <TrendingUp size={18} className="text-indigo-400" />
                          Priority Breakdown
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-slate-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> High Priority
                            </span>
                            <span className="font-semibold text-slate-200">
                              {tasks.filter(t => t.priority === 'high').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-slate-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Medium Priority
                            </span>
                            <span className="font-semibold text-slate-200">
                              {tasks.filter(t => t.priority === 'medium').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-slate-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Low Priority
                            </span>
                            <span className="font-semibold text-slate-200">
                              {tasks.filter(t => t.priority === 'low').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-slate-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> No Priority
                            </span>
                            <span className="font-semibold text-slate-200">
                              {tasks.filter(t => t.priority === 'none').length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-800 mt-6 text-xs text-slate-500">
                        Total Tasks Tracked: <span className="font-semibold text-slate-400">{tasks.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Tasks List */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-semibold text-slate-200">Active Sprint Tasks</h3>
                      <button
                        onClick={() => setActiveTab('issues')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                      >
                        All Issues <ChevronRight size={14} />
                      </button>
                    </div>

                    {activeSprintTasks.length === 0 ? (
                      <div className="text-center py-8 text-sm text-slate-500">
                        No tasks assigned to the active sprint. Use the Kanban Board or Issues List to assign them.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {activeSprintTasks.slice(0, 5).map((task) => (
                          <div key={task.id} className="py-3.5 flex items-center justify-between hover:bg-slate-850/20 px-2 rounded-lg transition-colors">
                            <div className="flex items-center gap-3 truncate">
                              <span className="text-xs font-mono font-bold text-slate-500 min-w-[70px]">
                                {selectedProject?.key}-{task.sequenceId}
                              </span>
                              <span className="text-sm font-medium text-slate-200 truncate max-w-md">
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                task.priority === 'high' ? 'bg-rose-950/50 text-rose-450 border border-rose-800/30' :
                                task.priority === 'medium' ? 'bg-amber-950/50 text-amber-450 border border-amber-800/30' :
                                task.priority === 'low' ? 'bg-blue-950/50 text-blue-450 border border-blue-800/30' :
                                'bg-slate-850 text-slate-455'
                              }`}>
                                {task.priority}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                task.status === 'done' ? 'bg-emerald-950 text-emerald-400' :
                                task.status === 'in_progress' ? 'bg-amber-950 text-amber-450' :
                                task.status === 'todo' ? 'bg-indigo-950 text-indigo-400' :
                                'bg-slate-850 text-slate-400'
                              }`}>
                                {task.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ----------------- KANBAN BOARD VIEW ----------------- */}
              {activeTab === 'board' && (
                <div className="flex flex-col h-[calc(100vh-12rem)] space-y-4">
                  {/* Filters bar */}
                  <div className="flex flex-wrap gap-4 items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500">Priority:</span>
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-xs rounded px-2 py-1 text-slate-350 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="none">None</option>
                      </select>
                      
                      <span className="text-xs font-medium text-slate-500 pl-2">Sprint:</span>
                      <select
                        className="bg-slate-900 border border-slate-800 text-xs rounded px-2 py-1 text-slate-355 focus:outline-none focus:border-indigo-500"
                        defaultValue="active"
                      >
                        <option value="active">Active Sprint</option>
                        <option value="all">All Issues (Including Backlog)</option>
                      </select>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search board tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-xs rounded-lg pl-3 pr-8 py-1.5 w-60 text-slate-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Kanban Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5 flex-1 overflow-x-auto min-h-0 pt-2">
                    {/* BACKLOG COLUMN */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex flex-col min-w-[250px] max-h-full">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Backlog</span>
                        <span className="text-xs bg-slate-850 px-2 py-0.5 rounded text-slate-400 font-mono">
                          {filteredTasks.filter(t => t.status === 'backlog').length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {filteredTasks.filter(t => t.status === 'backlog').map(task => (
                          <KanbanCard 
                            key={task.id} 
                            task={task} 
                            projectKey={selectedProject.key} 
                            onEdit={handleEditTaskClick}
                            onDelete={handleDeleteTask}
                            onStatusChange={handleUpdateTaskStatus}
                          />
                        ))}
                      </div>
                    </div>

                    {/* TODO COLUMN */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex flex-col min-w-[250px] max-h-full">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">To Do</span>
                        <span className="text-xs bg-indigo-950 px-2 py-0.5 rounded text-indigo-400 font-mono">
                          {filteredTasks.filter(t => t.status === 'todo').length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {filteredTasks.filter(t => t.status === 'todo').map(task => (
                          <KanbanCard 
                            key={task.id} 
                            task={task} 
                            projectKey={selectedProject.key} 
                            onEdit={handleEditTaskClick}
                            onDelete={handleDeleteTask}
                            onStatusChange={handleUpdateTaskStatus}
                          />
                        ))}
                      </div>
                    </div>

                    {/* IN PROGRESS COLUMN */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex flex-col min-w-[250px] max-h-full">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">In Progress</span>
                        <span className="text-xs bg-amber-950 px-2 py-0.5 rounded text-amber-400 font-mono">
                          {filteredTasks.filter(t => t.status === 'in_progress').length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {filteredTasks.filter(t => t.status === 'in_progress').map(task => (
                          <KanbanCard 
                            key={task.id} 
                            task={task} 
                            projectKey={selectedProject.key} 
                            onEdit={handleEditTaskClick}
                            onDelete={handleDeleteTask}
                            onStatusChange={handleUpdateTaskStatus}
                          />
                        ))}
                      </div>
                    </div>

                    {/* DONE COLUMN */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex flex-col min-w-[250px] max-h-full">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Done</span>
                        <span className="text-xs bg-emerald-950 px-2 py-0.5 rounded text-emerald-400 font-mono">
                          {filteredTasks.filter(t => t.status === 'done').length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {filteredTasks.filter(t => t.status === 'done').map(task => (
                          <KanbanCard 
                            key={task.id} 
                            task={task} 
                            projectKey={selectedProject.key} 
                            onEdit={handleEditTaskClick}
                            onDelete={handleDeleteTask}
                            onStatusChange={handleUpdateTaskStatus}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- ISSUES LIST VIEW ----------------- */}
              {activeTab === 'issues' && (
                <div className="space-y-6">
                  {/* Filters Bar */}
                  <div className="flex flex-wrap gap-4 items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Search issue title, description or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-xs rounded-lg px-3 py-1.5 w-72 text-slate-350 focus:outline-none focus:border-indigo-500"
                      />
                      
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-xs rounded px-2.5 py-1.5 text-slate-400 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="backlog">Backlog</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>

                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-xs rounded px-2.5 py-1.5 text-slate-400 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="none">None</option>
                      </select>
                    </div>

                    <div className="text-xs text-slate-550 font-medium">
                      Showing {filteredTasks.length} issues
                    </div>
                  </div>

                  {/* Tasks List */}
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-12 border border-slate-850 rounded-xl bg-slate-900/10">
                      <p className="text-sm text-slate-500">No issues match the current search filters.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-850/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              <th className="py-3 px-4 w-28">ID</th>
                              <th className="py-3 px-4">Title</th>
                              <th className="py-3 px-4 w-40">Sprint</th>
                              <th className="py-3 px-4 w-32">Priority</th>
                              <th className="py-3 px-4 w-32">Status</th>
                              <th className="py-3 px-4 w-24 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-sm">
                            {filteredTasks.map((task) => {
                              const taskSprint = sprints.find(s => s.id === task.cycleId);
                              return (
                                <tr key={task.id} className="hover:bg-slate-850/20 transition-colors">
                                  <td className="py-3 px-4 font-mono font-bold text-slate-500">
                                    {selectedProject.key}-{task.sequenceId}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-medium text-slate-200">{task.title}</div>
                                    {task.description && (
                                      <div className="text-xs text-slate-450 truncate max-w-lg mt-0.5">
                                        {task.description}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-xs text-slate-400">
                                    {taskSprint ? (
                                      <span className="flex items-center gap-1.5">
                                        <Layers size={13} className="text-indigo-400" />
                                        {taskSprint.name}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`text-[11px] uppercase font-bold px-2 py-0.5 rounded-full inline-block ${
                                      task.priority === 'high' ? 'bg-rose-950/40 text-rose-400' :
                                      task.priority === 'medium' ? 'bg-amber-950/40 text-amber-400' :
                                      task.priority === 'low' ? 'bg-blue-950/40 text-blue-400' :
                                      'bg-slate-850 text-slate-500'
                                    }`}>
                                      {task.priority}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as Task['status'])}
                                      className={`text-xs font-bold rounded-full px-2.5 py-0.5 border bg-transparent cursor-pointer focus:outline-none ${
                                        task.status === 'done' ? 'border-emerald-800 text-emerald-450' :
                                        task.status === 'in_progress' ? 'border-amber-800 text-amber-450' :
                                        task.status === 'todo' ? 'border-indigo-800 text-indigo-455' :
                                        'border-slate-800 text-slate-450'
                                      }`}
                                    >
                                      <option value="backlog" className="bg-slate-900 text-slate-300">Backlog</option>
                                      <option value="todo" className="bg-slate-900 text-indigo-400">To Do</option>
                                      <option value="in_progress" className="bg-slate-900 text-amber-400">In Progress</option>
                                      <option value="done" className="bg-slate-900 text-emerald-400">Done</option>
                                    </select>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => handleEditTaskClick(task)}
                                        className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
                                        title="Edit Task"
                                      >
                                        <Edit3 size={15} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-800"
                                        title="Delete Task"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------- SPRINTS PLANNER VIEW ----------------- */}
              {activeTab === 'sprints' && (
                <div className="space-y-6">
                  {/* Planner Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <p className="text-sm text-slate-400">
                      Organize tasks into active, planned, or completed sprints.
                    </p>
                    <button
                      onClick={() => setShowSprintModal(true)}
                      className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      <Plus size={15} />
                      Create Sprint
                    </button>
                  </div>

                  {/* Sprints Grid */}
                  {sprints.length === 0 ? (
                    <div className="text-center py-12 border border-slate-850 rounded-xl bg-slate-900/10">
                      <p className="text-sm text-slate-500">No Sprints planned yet. Setup one to start organizing sprints!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {sprints.map((sprint) => {
                        const sprintTasks = tasks.filter(t => t.cycleId === sprint.id);
                        const completed = sprintTasks.filter(t => t.status === 'done').length;
                        const progress = sprintTasks.length > 0 ? Math.round((completed / sprintTasks.length) * 100) : 0;
                        
                        return (
                          <div key={sprint.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm hover:border-slate-750 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-3">
                                  <h3 className="font-bold text-slate-200 text-base">{sprint.name}</h3>
                                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                    sprint.status === 'active' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/30' :
                                    sprint.status === 'completed' ? 'bg-blue-950/60 text-blue-450 border border-blue-800/30' :
                                    'bg-slate-850 text-slate-400'
                                  }`}>
                                    {sprint.status}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">{sprint.description}</p>
                                
                                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 font-medium">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={13} />
                                    {sprint.startDate && sprint.endDate ? `${sprint.startDate} to ${sprint.endDate}` : 'No Dates Configured'}
                                  </span>
                                  <span>•</span>
                                  <span>{sprintTasks.length} tasks assigned</span>
                                </div>
                              </div>

                              <div className="w-full md:w-64 space-y-2 shrink-0">
                                <div className="flex justify-between text-xs font-semibold text-slate-400">
                                  <span>Sprint Completion</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-indigo-500 h-full rounded-full transition-all" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                  {sprint.status === 'draft' && (
                                    <button
                                      onClick={() => handleStartSprint(sprint.id)}
                                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded font-semibold transition-colors"
                                    >
                                      Start Sprint
                                    </button>
                                  )}
                                  {sprint.status === 'active' && (
                                    <button
                                      onClick={() => handleCompleteSprint(sprint.id)}
                                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-350 px-3 py-1.5 rounded font-semibold transition-colors"
                                    >
                                      Complete Sprint
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      // Switch tab and filter board
                                      setActiveTab('board');
                                    }}
                                    className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded transition-colors"
                                  >
                                    View Tasks
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ----------------- MODALS ----------------- */}

      {/* 1. Project Creation Modal */}
      {showProjModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowProjModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-200 mb-4">Create Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phoenix Dashboard"
                  value={newProjName}
                  onChange={(e) => {
                    setNewProjName(e.target.value);
                    if (!newProjKey && e.target.value.length > 2) {
                      setNewProjKey(e.target.value.slice(0, 3).toUpperCase());
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Project Key (Short Prefix)</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="e.g. PHX"
                  value={newProjKey}
                  onChange={(e) => setNewProjKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  placeholder="Short description of what this project focuses on..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjModal(false)}
                  className="text-xs border border-slate-800 hover:bg-slate-800 text-slate-400 font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-md shadow-indigo-600/10"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Sprint Creation Modal */}
      {showSprintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowSprintModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-200 mb-4">Create Sprint / Cycle</h3>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Sprint Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 3 - Core APIs"
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  placeholder="Goals and details for this sprint..."
                  value={newSprintDesc}
                  onChange={(e) => setNewSprintDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={newSprintStart}
                    onChange={(e) => setNewSprintStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={newSprintEnd}
                    onChange={(e) => setNewSprintEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSprintModal(false)}
                  className="text-xs border border-slate-800 hover:bg-slate-800 text-slate-400 font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-md shadow-indigo-600/10"
                >
                  Plan Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Task Creation/Editing Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setShowTaskModal(false);
                setEditingTask(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-200 mb-4">
              {editingTask ? 'Edit Issue' : 'Create New Issue'}
            </h3>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="Short, actionable task name..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  placeholder="Add details, steps to reproduce, acceptance criteria..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as Task['status'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Task['priority'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Sprint</label>
                  <select
                    value={taskSprintId}
                    onChange={(e) => setTaskSprintId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="none">No Sprint (Backlog)</option>
                    {sprints.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                  }}
                  className="text-xs border border-slate-800 hover:bg-slate-800 text-slate-400 font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-md shadow-indigo-600/10"
                >
                  {editingTask ? 'Save Changes' : 'Create Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Kanban Card
interface KanbanCardProps {
  task: Task;
  projectKey: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
}

function KanbanCard({ task, projectKey, onEdit, onDelete, onStatusChange }: KanbanCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-4 shadow-sm hover:border-slate-700 transition-all group flex flex-col justify-between gap-3 select-none">
      <div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono font-bold text-slate-500">
            {projectKey}-{task.sequenceId}
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${
              task.priority === 'high' ? 'bg-rose-500' :
              task.priority === 'medium' ? 'bg-amber-500' :
              task.priority === 'low' ? 'bg-blue-500' :
              'bg-slate-500'
            }`}></span>
            <span className="text-[10px] uppercase font-bold text-slate-400">{task.priority}</span>
          </div>
        </div>
        <h4 className="text-sm font-semibold text-slate-200 mt-2 line-clamp-2 leading-tight group-hover:text-white transition-colors">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-slate-450 mt-1 line-clamp-2 leading-normal">
            {task.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-850 pt-2 mt-1">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
          className="text-[10px] bg-slate-850/60 hover:bg-slate-850 text-slate-350 rounded border border-slate-800 px-2 py-0.5 font-bold cursor-pointer focus:outline-none"
        >
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="text-slate-450 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
            title="Edit"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-slate-450 hover:text-rose-500 p-1 rounded hover:bg-slate-800"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
