
export enum TaskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

export enum ProjectStatus {
  FELMERES = 'felmeres',
  ARAJANLAT = 'arajanlat',
  KIVITELEZES = 'kivitelezes',
  KESZ = 'kesz'
}

export enum CostType {
  ANYAG = 'anyag',
  MUNKADIJ = 'munkadij',
  EGYEB = 'egyeb'
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string;
  created_at: string;
}

export interface AppFile {
  id: string;
  filename: string;
  file_path: string; 
  file_type: string;
  uploaded_by: string;
  project_id: string;
  task_id?: string;
  created_at: string;
}

export interface Material {
  id: string;
  project_id: string;
  name: string;
  quantity: number;
  unit: string; 
  unit_price: number;
  supplier: string;
  note: string;
}

export interface Cost {
  id: string;
  project_id: string;
  type: CostType;
  description: string;
  amount: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  start_date: string;
  due_date: string;
  order: number;
  attachments: Attachment[];
  created_by: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  location: string;
  start_date: string;
  end_date: string;
  created_at: string;
  created_by: string;
  created_by_id: string; // Új mező a pontos azonosításhoz
  attachments: Attachment[];
  assigned_users: string[]; // Felhasználói ID-k listája, akik látják a projektet
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
