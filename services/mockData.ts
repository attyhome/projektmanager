
import { Project, User, UserRole } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    email: 'admin@projektmester.hu',
    name: 'Kovács Admin János',
    role: UserRole.ADMIN,
    password: 'admin'
  },
  {
    id: 'u2',
    email: 'user@projektmester.hu',
    name: 'Szabó Péter',
    role: UserRole.USER,
    password: 'user123'
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Belvárosi Lakásfelújítás',
    description: '### Projekt Célja\nA teljes elektromos hálózat és vízhálózat cseréje, valamint burkolás.',
    status: 'kivitelezes',
    customer_name: 'Nagy Erzsébet',
    customer_email: 'nagy.erzsi@example.com',
    customer_phone: '+36 30 123 4567',
    location: '1051 Budapest, Sas utca 4.',
    start_date: '2024-03-01',
    end_date: '2024-05-15',
    created_at: '2024-02-15T10:00:00Z',
    created_by: 'Kovács Admin János',
    // Added missing created_by_id to satisfy Project interface
    created_by_id: 'u1',
    attachments: [],
    // Added missing assigned_users to satisfy Project interface
    assigned_users: ['u1', 'u2']
  }
];
