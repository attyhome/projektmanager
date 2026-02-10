
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthState, User, Project, Task, TaskStatus, Material, Cost, CostType, AppFile, UserRole } from './types';
import { db } from './services/db';
import { ICONS, STATUS_LABELS, STATUS_COLORS } from './constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.OPEN]: 'Nyitott',
  [TaskStatus.IN_PROGRESS]: 'Folyamatban',
  [TaskStatus.DONE]: 'Kész'
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.OPEN]: 'bg-slate-100 text-slate-600 border-slate-200',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700 border-blue-200',
  [TaskStatus.DONE]: 'bg-green-100 text-green-700 border-green-200'
};

const COST_TYPE_LABELS: Record<CostType, string> = {
  [CostType.ANYAG]: 'Anyag',
  [CostType.MUNKADIJ]: 'Munkadíj',
  [CostType.EGYEB]: 'Egyéb'
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(amount);
};

// --- PDF Export Kliensoldali implementáció ---
const exportProjectPDF = (project: Project, tasks: Task[], materials: Material[], costs: Cost[]) => {
  const total = materials.reduce((s, m) => s + (m.quantity * m.unit_price), 0) + costs.reduce((s, c) => s + c.amount, 0);
  
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo-600

  // Fejléc
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJEKT ADATLAP', 15, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generalva: ${new Date().toLocaleString('hu-HU')}`, 15, 30);
  doc.text('ProjektMester Management System', 140, 30);

  // Projekt Alapadatok
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Projekt Informaciok', 15, 55);
  doc.setLineWidth(0.5);
  doc.line(15, 57, 195, 57);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nev: ${project.name}`, 15, 65);
  doc.text(`Statusz: ${STATUS_LABELS[project.status] || project.status}`, 15, 72);
  doc.text(`Helyszin: ${project.location || '-'}`, 15, 79);
  doc.text(`Kezdes: ${project.start_date || '-'}`, 110, 65);
  doc.text(`Hatarido: ${project.end_date || '-'}`, 110, 72);

  // Ügyfél adatok
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ugyfel Adatok', 15, 95);
  doc.line(15, 97, 195, 97);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nev: ${project.customer_name || '-'}`, 15, 105);
  doc.text(`Email: ${project.customer_email || '-'}`, 15, 112);
  doc.text(`Telefon: ${project.customer_phone || '-'}`, 110, 105);

  // Projekt Leírás
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Projekt Leiras', 15, 125);
  doc.line(15, 127, 195, 127);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitDescription = doc.splitTextToSize(project.description || '-', 180);
  doc.text(splitDescription, 15, 135);

  const descHeight = splitDescription.length * 5;
  const tasksStartY = 145 + descHeight;

  // Feladatok táblázat
  autoTable(doc, {
    startY: tasksStartY,
    head: [['Feladat', 'Statusz', 'Hatarido']],
    body: tasks.map((t) => [t.title, TASK_STATUS_LABELS[t.status], t.due_date || '-']),
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    margin: { left: 15, right: 15 }
  });

  // Anyagok táblázat
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Anyag megnevezese', 'Mennyiseg', 'Egysegar', 'Osszesen']],
    body: materials.map((m) => [
      m.name, 
      `${m.quantity} ${m.unit}`, 
      `${m.unit_price} Ft`, 
      `${m.quantity * m.unit_price} Ft`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85] },
    margin: { left: 15, right: 15 }
  });

  // Költségek táblázat
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Koltseg megnevezese', 'Tipus', 'Osszeg']],
    body: costs.map((c) => [c.description, COST_TYPE_LABELS[c.type], `${c.amount} Ft`]),
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85] },
    margin: { left: 15, right: 15 }
  });

  // Összesítés
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJEKT MINDOSSZESEN:', 15, finalY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${total.toLocaleString('hu-HU')} Ft`, 120, finalY);

  doc.save(`${project.name.replace(/\s+/g, '_')}_adatlap.pdf`);
};

// --- Komponensek ---

const TaskItem: React.FC<{ 
  task: Task, 
  projectId: string, 
  userName: string, 
  onUpdate: () => void,
  onMoveUp?: () => void,
  onMoveDown?: () => void,
  isFirst: boolean,
  isLast: boolean
}> = ({ task, projectId, userName, onUpdate, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [taskFiles, setTaskFiles] = useState<AppFile[]>([]);
  
  useEffect(() => {
    const allFiles = db.getFiles(projectId);
    setTaskFiles(allFiles.filter(f => f.task_id === task.id));
  }, [projectId, task.id]);

  const updateStatus = (status: TaskStatus) => {
    db.saveTask({ ...task, status });
    onUpdate();
  };

  const handleFileUpload = (newFiles: AppFile[]) => {
    setTaskFiles([...taskFiles, ...newFiles]);
  };

  const isOverdue = task.due_date && task.status !== TaskStatus.DONE && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0));

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden ${isExpanded ? 'ring-2 ring-indigo-500' : ''}`}>
      <div className="flex items-stretch">
        <div className="bg-slate-50 border-r flex flex-col items-center justify-center p-1 gap-1">
          <button 
            disabled={isFirst} 
            onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
            className={`p-1 rounded hover:bg-white transition-colors ${isFirst ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg>
          </button>
          <button 
            disabled={isLast} 
            onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
            className={`p-1 rounded hover:bg-white transition-colors ${isLast ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>

        <div className="flex-1 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full shrink-0 ${task.status === TaskStatus.DONE ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-slate-300'}`} />
            <div>
              <div className="font-bold text-slate-800 leading-tight">{task.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{TASK_STATUS_LABELS[task.status]}</div>
                {task.due_date && (
                  <div className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                    Határidő: {task.due_date}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {taskFiles.length > 0 && <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full">{taskFiles.length} DB</span>}
            <svg className={`w-5 h-5 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t bg-slate-50/30 space-y-5 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Leírás</label>
              <div className="text-sm text-slate-600 whitespace-pre-wrap bg-white p-4 rounded-xl border min-h-[80px] leading-relaxed shadow-inner">
                {task.description || <span className="italic text-slate-300">Nincs megadott leírás.</span>}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Státusz frissítése</label>
                <div className="flex gap-2">
                  {(Object.keys(TaskStatus) as Array<keyof typeof TaskStatus>).map((key) => {
                    const statusVal = TaskStatus[key];
                    const active = task.status === statusVal;
                    return (
                      <button 
                        key={statusVal}
                        onClick={() => updateStatus(statusVal)} 
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-400'}`}
                      >
                        {TASK_STATUS_LABELS[statusVal]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Csatolt dokumentumok</label>
                <div className="flex justify-between items-center mb-2">
                  <FileUpload onUpload={handleFileUpload} projectId={projectId} taskId={task.id} userName={userName} variant="compact" label="Dokumentum hozzáadása" />
                </div>
                <FileGrid files={taskFiles} compact />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectTasks: React.FC<{ projectId: string, user: User }> = ({ projectId, user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' });
  
  const refreshTasks = () => {
    const sortedTasks = db.getTasks(projectId);
    setTasks(sortedTasks);
  };

  useEffect(refreshTasks, [projectId]);

  const handleAddTask = () => {
    if (!newTask.title) return;
    const task: Task = { 
      id: `t${Date.now()}`, 
      project_id: projectId, 
      title: newTask.title, 
      description: newTask.description, 
      status: TaskStatus.OPEN, 
      start_date: new Date().toISOString().split('T')[0], 
      due_date: newTask.due_date, 
      order: tasks.length, 
      attachments: [], 
      created_by: user.name 
    };
    db.saveTask(task);
    refreshTasks();
    setIsAdding(false);
    setNewTask({ title: '', description: '', due_date: '' });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newTasks = [...tasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTasks.length) return;

    const currentOrder = newTasks[index].order;
    newTasks[index].order = newTasks[targetIndex].order;
    newTasks[targetIndex].order = currentOrder;

    db.saveTask(newTasks[index]);
    db.saveTask(newTasks[targetIndex]);
    
    refreshTasks();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Feladatlista</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sorrendezhető és határidőzhető feladatok</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
          <ICONS.Plus /> Új Feladat
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border shadow-2xl space-y-4 animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Feladat megnevezése</label>
              <input type="text" placeholder="Pl. Burkolat rendelése..." className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-indigo-600 transition-colors" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Határidő</label>
              <input type="date" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-indigo-600 transition-colors" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Leírás (opcionális)</label>
              <textarea placeholder="További részletek..." className="w-full border-2 border-slate-100 rounded-2xl p-4 h-24 outline-none focus:border-indigo-600 resize-none transition-colors" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase text-xs hover:bg-slate-200 transition-colors">Mégsem</button>
            <button onClick={handleAddTask} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl uppercase text-xs hover:bg-indigo-700 transition-all">Feladat rögzítése</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map((t, idx) => (
          <TaskItem 
            key={t.id} 
            task={t} 
            projectId={projectId} 
            userName={user.name} 
            onUpdate={refreshTasks}
            onMoveUp={() => handleMove(idx, 'up')}
            onMoveDown={() => handleMove(idx, 'down')}
            isFirst={idx === 0}
            isLast={idx === tasks.length - 1}
          />
        ))}
        {tasks.length === 0 && !isAdding && (
          <div className="p-16 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-300 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><ICONS.Project /></div>
            <div className="text-sm font-bold italic">Nincsenek még feladatok rögzítve ebben a projektben.</div>
            <button onClick={() => setIsAdding(true)} className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline">Első feladat hozzáadása</button>
          </div>
        )}
      </div>
    </div>
  );
};

const Lightbox: React.FC<{ file: AppFile; onClose: () => void }> = ({ file, onClose }) => (
  <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
    <div className="flex justify-end text-white mb-4"><button onClick={onClose} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors font-bold">Bezárás ✕</button></div>
    <div className="flex-1 flex items-center justify-center overflow-hidden">
      {file.file_type.startsWith('image/') ? <img src={file.file_path} alt={file.filename} className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" onClick={e => e.stopPropagation()} /> : <iframe src={file.file_path} className="w-full h-full max-w-5xl bg-white rounded-xl shadow-2xl" title={file.filename} />}
    </div>
  </div>
);

const FileGrid: React.FC<{ files: AppFile[], onDelete?: (id: string) => void, compact?: boolean }> = ({ files, onDelete, compact }) => {
  const [lightboxFile, setLightboxFile] = useState<AppFile | null>(null);
  if (files.length === 0) return compact ? null : <div className="text-center py-8 text-slate-300 italic text-xs">Nincs dokumentum.</div>;
  return (
    <div className={`grid ${compact ? 'grid-cols-4 sm:grid-cols-6 gap-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'}`}>
      {files.map((file) => (
        <div key={file.id} className="group relative">
          <div onClick={() => (file.file_type.startsWith('image/') || file.file_type === 'application/pdf') && setLightboxFile(file)} className="aspect-square rounded-xl border overflow-hidden bg-slate-50 shadow-sm transition-all hover:scale-[1.02] cursor-pointer">
            {file.file_type.startsWith('image/') ? <img src={file.file_path} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex flex-col items-center justify-center p-2"><div className="text-[8px] font-black uppercase text-slate-400 truncate w-full text-center">{file.filename}</div><div className="text-[10px] font-black uppercase text-indigo-500">PDF</div></div>}
          </div>
          {onDelete && <button onClick={(e) => { e.stopPropagation(); if(confirm('Törli?')) onDelete(file.id); }} className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">✕</button>}
        </div>
      ))}
      {lightboxFile && <Lightbox file={lightboxFile} onClose={() => setLightboxFile(null)} />}
    </div>
  );
};

const FileUpload: React.FC<{ onUpload: (files: AppFile[]) => void, projectId: string, taskId?: string, userName: string, label?: string, variant?: 'default' | 'compact' }> = ({ onUpload, projectId, taskId, userName, label = "Feltöltés", variant = 'default' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    const newFiles: AppFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const promise = new Promise<void>((resolve) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            const newFile: AppFile = { id: `f-${Date.now()}-${i}`, filename: file.name, file_path: event.target.result as string, file_type: file.type, uploaded_by: userName, project_id: projectId, task_id: taskId, created_at: new Date().toISOString() };
            db.saveFile(newFile); newFiles.push(newFile);
          }
          resolve();
        };
      });
      reader.readAsDataURL(file); await promise;
    }
    onUpload(newFiles);
    if (inputRef.current) inputRef.current.value = '';
  };
  return (
    <div>
      <input type="file" multiple className="hidden" ref={inputRef} onChange={handleFileChange} />
      <button onClick={() => inputRef.current?.click()} className={`${variant === 'compact' ? 'p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 text-[9px] font-black uppercase' : 'px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black shadow-lg flex items-center gap-1 uppercase'}`}>
        <ICONS.Plus /> {label}
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ user: null, token: null });
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState<'projects' | 'users'>('projects');

  useEffect(() => {
    const saved = localStorage.getItem('pm_auth');
    if (saved) {
      const user = JSON.parse(saved);
      setAuthState({ user, token: 'mock' });
      setProjects(db.getProjects(user));
    }
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('pm_auth', JSON.stringify(user));
    setAuthState({ user, token: 'mock' });
    setProjects(db.getProjects(user));
  };

  const handleLogout = () => {
    localStorage.removeItem('pm_auth');
    setAuthState({ user: null, token: null });
    setProjects([]);
    setSelectedProjectId(null);
  };

  const handleSaveProject = (p: Project) => {
    db.saveProject(p);
    setProjects(db.getProjects(authState.user!));
    setIsEditing(false);
  };

  const currentProject = useMemo(() => {
    const p = projects.find(p => p.id === (selectedProjectId || (projects.length > 0 ? projects[0].id : null)));
    return p || null;
  }, [projects, selectedProjectId]);

  const handleExport = () => {
    if (!currentProject) return;
    const tasks = db.getTasks(currentProject.id);
    const materials = db.getMaterials(currentProject.id);
    const costs = db.getCosts(currentProject.id);
    exportProjectPDF(currentProject, tasks, materials, costs);
  };

  if (!authState.user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        projects={projects} 
        selectedId={selectedProjectId || (projects.length > 0 ? projects[0].id : null)} 
        onSelect={(id) => { setSelectedProjectId(id); setIsEditing(false); setActiveTab('overview'); setIsSidebarOpen(false); setView('projects'); }} 
        onNew={() => { 
          if (authState.user?.role !== UserRole.ADMIN) { alert('Admin jog szükséges!'); return; }
          const id = `p${Date.now()}`; 
          const p: Project = { id, name: 'Új Projekt', description: '', status: 'felmeres', customer_name: 'Új Ügyfél', customer_email: '', customer_phone: '', location: '', start_date: new Date().toISOString().split('T')[0], end_date: '', created_at: new Date().toISOString(), created_by: authState.user!.name, created_by_id: authState.user!.id, attachments: [], assigned_users: [authState.user!.id] }; 
          db.saveProject(p); setProjects(db.getProjects(authState.user!)); setSelectedProjectId(id); setIsEditing(true); setView('projects');
        }} 
        onManageUsers={() => { setView('users'); setIsSidebarOpen(false); }}
        onLogout={handleLogout} user={authState.user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 shrink-0 z-30 sticky top-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 text-indigo-600" onClick={() => setIsSidebarOpen(true)}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <div className="text-sm font-black truncate">{view === 'users' ? 'Rendszerkezelés' : (currentProject?.name || 'Válassz projektet')}</div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && currentProject && view === 'projects' && (
              <button onClick={handleExport} className="bg-slate-100 text-slate-700 p-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hidden sm:flex">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                PDF Export
              </button>
            )}
            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-3 rounded-full border border-slate-100">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">{authState.user.name.charAt(0)}</div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black leading-none">{authState.user.name}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{authState.user.role}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {view === 'users' ? <UserManagement onUserAdded={() => {}} /> : currentProject ? (
            <>
              {!isEditing && (
                <nav className="bg-white border-b px-4 md:px-8 flex gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0 z-20 sticky top-0 no-scrollbar shadow-sm">
                  {[{ id: 'overview', label: 'Áttekintés' }, { id: 'tasks', label: 'Feladatok' }, { id: 'files', label: 'Fájlok' }, { id: 'materials', label: 'Anyagok' }, { id: 'costs', label: 'Költségek' }, { id: 'summary', label: 'Összegzés' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-4 text-[11px] font-black uppercase transition-all border-b-2 tracking-widest ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{tab.label}</button>
                  ))}
                </nav>
              )}
              <div className="pb-24">
                {isEditing ? <ProjectEdit project={currentProject} onSave={handleSaveProject} onCancel={() => setIsEditing(false)} onDelete={(id) => { db.deleteProject(id); setProjects(db.getProjects(authState.user!)); setSelectedProjectId(null); setIsEditing(false); }} currentUser={authState.user} /> : (
                  <>
                    {activeTab === 'overview' && <ProjectOverview project={currentProject} onEdit={() => setIsEditing(true)} userName={authState.user.name} setActiveTab={setActiveTab} onExport={handleExport} />}
                    {activeTab === 'tasks' && <ProjectTasks projectId={currentProject.id} user={authState.user} />}
                    {activeTab === 'files' && <ProjectFilesTab projectId={currentProject.id} userName={authState.user.name} />}
                    {activeTab === 'materials' && <MaterialManagement projectId={currentProject.id} />}
                    {activeTab === 'costs' && <CostManagement projectId={currentProject.id} />}
                    {activeTab === 'summary' && <FinanceSummary projectId={currentProject.id} onExport={handleExport} />}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mb-4 animate-pulse"><ICONS.Project /></div>
              <p className="text-slate-400 font-bold italic text-sm">Válassz egy projektet a munkavégzéshez...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const Sidebar: React.FC<{ projects: Project[], selectedId: string | null, onSelect: (id: string) => void, onNew: () => void, onLogout: () => void, user: User, isOpen: boolean, onClose: () => void, onManageUsers: () => void }> = ({ projects, selectedId, onSelect, onNew, onLogout, user, isOpen, onClose, onManageUsers }) => (
  <>
    <div className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[40] md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
    <aside className={`fixed md:relative inset-y-0 left-0 w-72 bg-slate-900 text-slate-100 flex flex-col z-[50] transition-transform duration-500 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} shadow-2xl`}>
      <div className="p-8 border-b border-slate-800 flex items-center gap-3 font-black text-xl tracking-tighter">
        <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-900/40"><ICONS.Project /></div> 
        ProjektMester
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-1 custom-scrollbar">
        <div className="text-[10px] font-black uppercase text-slate-500 mb-4 px-2 tracking-widest">Saját Projektek</div>
        {projects.map(p => (
          <button key={p.id} onClick={() => onSelect(p.id)} className={`w-full text-left px-4 py-4 rounded-2xl transition-all group relative mb-2 ${selectedId === p.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'hover:bg-slate-800 text-slate-400'}`}>
            <div className="font-bold truncate text-sm">{p.name}</div>
            <div className={`text-[9px] uppercase tracking-tighter mt-1 truncate ${selectedId === p.id ? 'text-indigo-100' : 'text-slate-500'}`}>{p.customer_name}</div>
            {selectedId === p.id && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>}
          </button>
        ))}
        {user.role === UserRole.ADMIN && (
          <button onClick={onManageUsers} className="w-full text-left px-4 py-4 mt-8 rounded-2xl hover:bg-slate-800 text-slate-500 flex items-center gap-3 transition-all">
            <ICONS.Settings /> <span className="text-[11px] font-black uppercase tracking-widest">Rendszer</span>
          </button>
        )}
      </div>
      <div className="p-6 space-y-4 bg-slate-950/20 border-t border-slate-800">
        {user.role === UserRole.ADMIN && (
          <button onClick={onNew} className="w-full bg-indigo-600 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest active:scale-95">
            <ICONS.Plus /> Új Projekt
          </button>
        )}
        <div className="bg-slate-800/40 p-3 rounded-2xl flex items-center gap-3 border border-slate-700/50">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-[10px] font-black shadow-inner">{user.name.charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-black truncate text-xs">{user.name}</div>
            <div className="text-[8px] font-black text-slate-500 uppercase">{user.role}</div>
          </div>
          <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors p-2" title="Kilépés">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </aside>
  </>
);

const UserManagement: React.FC<{ onUserAdded: () => void }> = ({ onUserAdded }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: UserRole.USER });

  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) return;
    const user: User = { id: `u${Date.now()}`, ...newUser };
    db.saveUser(user);
    setUsers([...users, user]);
    setShowForm(false);
    setNewUser({ name: '', email: '', password: '', role: UserRole.USER });
    onUserAdded();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-tight">Tagok Kezelése</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">{showForm ? 'Bezárás' : 'Új Tag Hozzáadása'}</button>
      </div>
      {showForm && (
        <form onSubmit={handleAddUser} className="bg-white p-8 rounded-[2.5rem] border shadow-2xl space-y-5 animate-in zoom-in-95">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Teljes Név</label>
              <input type="text" placeholder="Pl. Szabó Gábor" className="w-full border-2 border-slate-100 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-600 transition-colors" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail Cím</label>
              <input type="email" placeholder="email@projektmester.hu" className="w-full border-2 border-slate-100 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-600 transition-colors" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Jelszó</label>
              <input type="password" placeholder="••••••••" className="w-full border-2 border-slate-100 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-600 transition-colors" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Szerepkör</label>
              <select className="w-full border-2 border-slate-100 rounded-xl p-3.5 font-black uppercase text-xs outline-none focus:border-indigo-600 transition-colors" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                <option value={UserRole.USER}>Munkatárs (User)</option>
                <option value={UserRole.ADMIN}>Adminisztrátor</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Felhasználó Létrehozása</button>
        </form>
      )}
      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400"><tr><th className="p-6">Név</th><th className="p-6">E-mail</th><th className="p-6">Szerepkör</th></tr></thead>
          <tbody className="divide-y">{users.map(u => (<tr key={u.id} className="hover:bg-slate-50/80 transition-colors"><td className="p-6 font-black text-slate-900">{u.name}</td><td className="p-6 font-medium text-slate-500">{u.email}</td><td className="p-6"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{u.role}</span></td></tr>))}</tbody>
        </table>
      </div>
      <StatusManager />
    </div>
  );
};

const StatusManager: React.FC = () => {
  const [statuses, setStatuses] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState('');
  useEffect(() => { setStatuses(db.getCustomStatuses()); }, []);
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus.trim()) return;
    db.addCustomStatus(newStatus.trim());
    setStatuses(db.getCustomStatuses());
    setNewStatus('');
  };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-5">
      <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest"><ICONS.Settings /> Egyedi Projektstátuszok</h3>
      <form onSubmit={handleAdd} className="flex gap-3">
        <input type="text" placeholder="Új státusz megnevezése..." className="flex-1 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-600" value={newStatus} onChange={e => setNewStatus(e.target.value)} />
        <button type="submit" className="bg-indigo-600 text-white px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Felvétel</button>
      </form>
      <div className="flex flex-wrap gap-2 pt-2">
        {statuses.map(s => (<div key={s} className="bg-slate-100 border border-slate-200 rounded-full px-4 py-1.5 text-[9px] font-black uppercase text-slate-500 tracking-wider">{STATUS_LABELS[s] || s}</div>))}
      </div>
    </div>
  );
};

const ProjectEdit: React.FC<{ project: Project, onSave: (p: Project) => void, onCancel: () => void, onDelete: (id: string) => void, currentUser: User }> = ({ project, onSave, onCancel, onDelete, currentUser }) => {
  const [form, setForm] = useState<Project>({ ...project });
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  useEffect(() => { setCustomStatuses(db.getCustomStatuses()); }, []);
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 pb-32">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <h1 className="text-xl font-black truncate max-w-md">Projekt: {project.name}</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          {currentUser.role === UserRole.ADMIN && <button onClick={() => { if(confirm('Véglegesen törli a projektet?')) onDelete(project.id); }} className="px-5 py-3 text-red-600 font-black text-[10px] uppercase tracking-widest border border-red-100 rounded-xl hover:bg-red-50">Törlés</button>}
          <button onClick={onCancel} className="px-5 py-3 bg-slate-100 font-black text-[10px] uppercase tracking-widest rounded-xl">Mégsem</button>
          <button onClick={() => onSave(form)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200">Mentés</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Megnevezés</label>
            <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-lg outline-none focus:border-indigo-600" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Név" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Státusz</label>
              <select className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black uppercase text-xs outline-none focus:border-indigo-600" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{customStatuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}</select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Átadási Határidő</label>
              <input type="date" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-xs outline-none focus:border-indigo-600" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Helyszín</label>
            <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-indigo-600" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Helyszín" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Leírás</label>
            <textarea className="w-full border-2 border-slate-100 rounded-2xl p-4 h-48 outline-none focus:border-indigo-600 resize-none leading-relaxed" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Leírás" />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl space-y-6 flex flex-col">
          <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-4 mb-2">Ügyfél kapcsolattartási adatok</h2>
          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Név / Cég</label>
              <input type="text" placeholder="Pl. Lakatos Éva" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-indigo-600" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Telefonszám</label>
              <input type="text" placeholder="+36 ..." className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-indigo-600" value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email cím</label>
              <input type="email" placeholder="pelda@ugyfel.hu" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-indigo-600" value={form.customer_email} onChange={e => setForm({...form, customer_email: e.target.value})} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectOverview: React.FC<{ project: Project, onEdit: () => void, userName: string, setActiveTab: (tab: string) => void, onExport: () => void }> = ({ project, onEdit, userName, setActiveTab, onExport }) => {
  const [files, setFiles] = useState<AppFile[]>([]);
  useEffect(() => setFiles(db.getFiles(project.id)), [project.id]);
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in pb-32">
      <div className="flex flex-col lg:flex-row justify-between gap-8 bg-white p-10 rounded-[3rem] border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-40"></div>
        <div className="relative z-10 flex-1 min-w-0">
          <div className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 mb-6 ${STATUS_COLORS[project.status] || 'bg-slate-100 text-slate-600'}`}>
            {STATUS_LABELS[project.status] || project.status}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4 tracking-tighter">{project.name}</h1>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[11px] text-slate-400 font-black uppercase tracking-widest">
            <span className="flex items-center gap-2"><ICONS.Location /> {project.location || '-'}</span>
            <span className="flex items-center gap-2 text-indigo-500"><ICONS.Calendar /> Létrehozva: {new Date(project.created_at).toLocaleDateString('hu-HU')}</span>
          </div>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <button onClick={onEdit} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Projekt Szerkesztése</button>
          <button onClick={onExport} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            PDF Adatlap
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-8 border-b pb-4">Projekt Részletes Leírása</h2>
            <div className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">{project.description || 'Nincs leírás.'}</div>
          </section>
          <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">Kiemelt Dokumentumok</h2>
              <button onClick={() => setActiveTab('files')} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-200">Összes nézése ({files.length})</button>
            </div>
            <FileGrid files={files.slice(0, 4)} compact />
            {files.length === 0 && <div className="text-center py-6 text-slate-300 italic text-xs">Még nincs fájl feltöltve.</div>}
          </section>
        </div>
        <div className="space-y-8">
          <section className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl space-y-8 border border-slate-800">
            <h2 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest border-b border-slate-800 pb-4">Ügyfélkapcsolat</h2>
            <div className="space-y-1">
              <div className="text-[8px] uppercase text-slate-500 font-black tracking-widest">Megnevezés</div>
              <div className="font-black text-2xl tracking-tight">{project.customer_name || '-'}</div>
            </div>
            <div className="space-y-4 pt-2">
              <a href={`tel:${project.customer_phone}`} className="flex items-center gap-4 text-sm font-bold text-slate-400 hover:text-white transition-all group">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all"><ICONS.Phone /></div> 
                {project.customer_phone || '-'}
              </a>
              <a href={`mailto:${project.customer_email}`} className="flex items-center gap-4 text-sm font-bold text-slate-400 hover:text-white transition-all group">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all"><ICONS.Email /></div> 
                <span className="truncate">{project.customer_email || '-'}</span>
              </a>
            </div>
          </section>
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex flex-col items-center text-center gap-4">
             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><ICONS.Calendar /></div>
             <div>
               <div className="text-[9px] font-black uppercase tracking-widest opacity-60">Átadási Határidő</div>
               <div className="text-xl font-black">{project.end_date || '-'}</div>
             </div>
             <div className="w-full h-px bg-white/10 my-1"></div>
             <div>
               <div className="text-[9px] font-black uppercase tracking-widest opacity-60">Projekt Felelős</div>
               <div className="text-sm font-black">{project.created_by}</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectFilesTab: React.FC<{ projectId: string, userName: string }> = ({ projectId, userName }) => {
  const [files, setFiles] = useState<AppFile[]>([]);
  useEffect(() => setFiles(db.getFiles(projectId)), [projectId]);
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Dokumentumtár</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Projekt összes csatolt fájlja egy helyen</p>
        </div>
        <FileUpload onUpload={(newFiles) => setFiles([...files, ...newFiles])} projectId={projectId} userName={userName} label="Új fájl feltöltése" />
      </div>
      <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
        <FileGrid files={files} onDelete={(id) => { db.deleteFile(id); setFiles(files.filter(f => f.id !== id)); }} />
      </div>
    </div>
  );
};

const MaterialManagement: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newItem, setNewItem] = useState<Partial<Material>>({ name: '', quantity: 1, unit: 'db', unit_price: 0 });
  useEffect(() => setMaterials(db.getMaterials(projectId)), [projectId]);
  const handleAdd = () => {
    if (!newItem.name) return;
    const m: Material = { id: `m${Date.now()}`, project_id: projectId, name: newItem.name, quantity: newItem.quantity!, unit: newItem.unit!, unit_price: newItem.unit_price!, supplier: '', note: '' };
    db.saveMaterial(m); setMaterials([...materials, m]); setNewItem({ name: '', quantity: 1, unit: 'db', unit_price: 0 });
  };
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <h2 className="text-xl font-black uppercase tracking-tight ml-2">Anyagszükséglet</h2>
      <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr><th className="p-8">Anyag / Eszköz</th><th className="p-8">Mennyiség</th><th className="p-8 text-right">Becsült Érték</th></tr>
            </thead>
            <tbody className="divide-y">
              {materials.map(m => (<tr key={m.id} className="hover:bg-slate-50/50"><td className="p-8 font-black text-slate-900">{m.name}</td><td className="p-8 font-bold text-slate-500">{m.quantity} {m.unit}</td><td className="p-8 font-black text-indigo-600 text-right">{formatCurrency(m.quantity * m.unit_price)}</td></tr>))}
              {materials.length === 0 && <tr><td colSpan={3} className="p-20 text-center text-slate-300 italic text-sm">Nincsenek még rögzített tételek.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-8 bg-slate-50/80 border-t flex flex-col lg:flex-row gap-4">
          <input type="text" placeholder="Megnevezés..." className="flex-[3] border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold shadow-inner focus:border-indigo-600 outline-none transition-colors" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
          <div className="flex flex-[3] gap-3">
            <input type="number" placeholder="Menny." className="w-20 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black focus:border-indigo-600 outline-none transition-colors" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
            <select className="w-24 border-2 border-slate-100 rounded-2xl p-4 text-[10px] font-black uppercase outline-none focus:border-indigo-600 transition-colors bg-white" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
              <option value="db">db</option>
              <option value="m">m</option>
              <option value="m2">m2</option>
              <option value="m3">m3</option>
              <option value="kg">kg</option>
              <option value="t">t</option>
              <option value="fm">fm</option>
              <option value="csomag">csomag</option>
            </select>
            <input type="number" placeholder="Egységár" className="flex-1 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black focus:border-indigo-600 outline-none transition-colors" value={newItem.unit_price || ''} onChange={e => setNewItem({...newItem, unit_price: Number(e.target.value)})} />
            <button onClick={handleAdd} className="bg-indigo-600 text-white p-4 px-8 rounded-2xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"><ICONS.Plus /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CostManagement: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [newCost, setNewCost] = useState<Partial<Cost>>({ type: CostType.MUNKADIJ, description: '', amount: 0 });
  useEffect(() => setCosts(db.getCosts(projectId)), [projectId]);
  const handleAdd = () => {
    if (!newCost.description || !newCost.amount) return;
    const c: Cost = { id: `c${Date.now()}`, project_id: projectId, type: newCost.type!, description: newCost.description!, amount: Number(newCost.amount) };
    db.saveCost(c); setCosts([...costs, c]); setNewCost({ type: CostType.MUNKADIJ, description: '', amount: 0 });
  };
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <h2 className="text-xl font-black uppercase tracking-tight ml-2">Egyéb Költségek & Díjak</h2>
      <div className="space-y-4">
        {costs.map(c => (
          <div key={c.id} className="bg-white p-8 rounded-[2rem] border shadow-sm flex justify-between items-center transition-all hover:translate-x-1 border-l-4 border-l-indigo-500">
            <div>
              <div className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">{COST_TYPE_LABELS[c.type]}</div>
              <div className="font-black text-slate-800 text-lg">{c.description}</div>
            </div>
            <div className="font-black text-2xl text-slate-900">{formatCurrency(c.amount)}</div>
          </div>
        ))}
        <div className="bg-slate-900 p-8 rounded-[3rem] flex flex-col gap-5 shadow-2xl mt-10 border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Költség Típusa</label>
              <select className="w-full bg-slate-800 text-white border-none rounded-2xl p-4 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500" value={newCost.type} onChange={e => setNewCost({...newCost, type: e.target.value as CostType})}>
                <option value={CostType.MUNKADIJ}>Munkadíj</option>
                <option value={CostType.ANYAG}>Anyagköltség (Külön)</option>
                <option value={CostType.EGYEB}>Egyéb</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Megnevezés</label>
              <input type="text" placeholder="Leírás..." className="w-full bg-slate-800 text-white border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={newCost.description} onChange={e => setNewCost({...newCost, description: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-4">
            <input type="number" placeholder="Nettó Összeg" className="flex-1 bg-slate-800 text-white border-none rounded-2xl p-4 text-xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={newCost.amount || ''} onChange={e => setNewCost({...newCost, amount: Number(e.target.value)})} />
            <button onClick={handleAdd} className="bg-indigo-600 text-white p-4 rounded-2xl px-12 font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-500 transition-all active:scale-95">Rögzítés</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FinanceSummary: React.FC<{ projectId: string, onExport: () => void }> = ({ projectId, onExport }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  useEffect(() => { setMaterials(db.getMaterials(projectId)); setCosts(db.getCosts(projectId)); }, [projectId]);
  const matTotal = materials.reduce((s, m) => s + (m.quantity * m.unit_price), 0);
  const costTotal = costs.reduce((s, c) => s + c.amount, 0);
  const total = matTotal + costTotal;
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-6">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] border shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-center sm:text-left">Pénzügyi Mérleg</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center sm:text-left">Összesített projektköltségek</p>
        </div>
        <button onClick={onExport} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Exportál PDF-be
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border shadow-sm flex flex-col justify-between h-48 border-b-8 border-b-slate-200">
          <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Anyagköltség Összesen</div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(matTotal)}</div>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border shadow-sm flex flex-col justify-between h-48 border-b-8 border-b-slate-200">
          <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Díjak & Munkadíjak</div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(costTotal)}</div>
        </div>
        <div className="bg-indigo-600 text-white p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between h-48 md:col-span-2 lg:col-span-1 shadow-indigo-900/20 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full"></div>
          <div className="text-[11px] font-black uppercase text-indigo-100 tracking-[0.2em] relative z-10">Projekt Mindösszesen</div>
          <div className="text-4xl font-black text-white tracking-tighter relative z-10">{formatCurrency(total)}</div>
        </div>
      </div>
    </div>
  );
};

const LoginPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@projektmester.hu');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); const u = db.getUsers().find(x => x.email === email && x.password === password); if (u) onLogin(u); else setError('Hibás bejelentkezési adatok!'); };
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-50 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[100px]"></div>
      </div>
      <form onSubmit={handleLogin} className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-md border relative z-10 animate-in zoom-in-95 duration-500">
        <div className="flex justify-center mb-10"><div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200"><ICONS.Project /></div></div>
        <h1 className="text-4xl font-black mb-12 text-center tracking-tighter text-slate-900">ProjektMester</h1>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Admin hozzáférés</label>
            <input type="email" placeholder="Email cím..." className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4.5 text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Biztonsági jelszó</label>
            <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4.5 text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-red-500 text-[10px] font-black uppercase text-center tracking-widest animate-pulse">{error}</p>}
          <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-2xl hover:bg-black hover:-translate-y-1 transition-all uppercase text-[11px] tracking-[0.3em]">Bejelentkezés</button>
        </div>
        <div className="mt-10 text-center text-slate-400 text-[9px] font-black uppercase tracking-widest">© 2024 ProjektMester Management System</div>
      </form>
    </div>
  );
};

export default App;
