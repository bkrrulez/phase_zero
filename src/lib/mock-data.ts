
export type User = {
  id: string;
  name: string;
  email: string;
  role: "Employee" | "Team Lead" | "Super Admin";
  avatar: string;
  reportsTo?: string; // User ID of manager
  teamId?: string;
  associatedProjectIds?: string[];
  contract: {
    startDate: string;
    endDate: string | null;
    weeklyHours: number;
  };
};

export type TimeEntry = {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  task: string;
  duration: number; // in hours
  remarks?: string;
};

export type HolidayRequest = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: "Pending" | "Approved" | "Rejected";
};

export type Project = {
  id: string;
  name: string;
  taskIds?: string[];
  budget?: number;
  details?: string;
};

export type Task = {
  id: string;
  name: string;
  details?: string;
};

export type Team = {
  id: string;
  name: string;
  projectIds?: string[];
};

export type PublicHoliday = {
  id: string;
  country: string;
  name: string;
  date: string; // ISO string for simplicity
  type: "Full Day" | "Half Day";
};

export type CustomHoliday = {
  id: string;
  country: string;
  name: string;
  date: string; // ISO string
  type: "Full Day" | "Half Day";
  appliesTo: string; // 'all-teams', 'all-members', or a teamId
};

export type FreezeRule = {
  id: string;
  teamId: string; // 'all-teams' or a specific team id
  startDate: string;
  endDate: string;
};

export type PushMessage = {
  id: string;
  context: string;
  messageBody: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  receivers: 'all-members' | 'all-teams' | string[]; // Array of team IDs if not all
};

export type UserMessageState = {
  readMessageIds: string[];
};

export type LogEntry = {
  id: string;
  timestamp: string; // ISO string
  message: string;
};


export const teams: Team[] = [
    { id: "team-1", name: "Alpha Team", projectIds: ['proj-1', 'proj-2', 'proj-3'] },
    { id: "team-2", name: "Bravo Team", projectIds: ['proj-4'] },
    { id: "team-3", name: "Client Services" },
];

const alexSmithUser: User = {
  id: "user-1",
  name: "Alex Smith",
  email: "alex.smith@example.com",
  role: "Team Lead",
  avatar: "https://placehold.co/100x100.png",
  reportsTo: 'admin-1',
  teamId: 'team-1',
  associatedProjectIds: ['proj-1', 'proj-2', 'proj-3'],
  contract: {
    startDate: "2022-01-01",
    endDate: null,
    weeklyHours: 40,
  },
};

const adminUser: User = {
  id: "admin-1",
  name: "Admin One",
  email: "admin1@example.com",
  role: "Super Admin",
  avatar: "https://placehold.co/100x100.png",
  associatedProjectIds: ['proj-1', 'proj-2', 'proj-3', 'proj-4'],
  contract: {
    startDate: "2020-01-01",
    endDate: null,
    weeklyHours: 40,
  },
};

export const currentUser: User = adminUser;

export const teamMembers: User[] = [
  alexSmithUser,
  {
    id: "user-2",
    name: "Jane Doe",
    email: "jane.doe@example.com",
    role: "Employee",
    avatar: "https://placehold.co/100x100.png",
    reportsTo: 'user-1',
    teamId: 'team-1',
    associatedProjectIds: ['proj-1', 'proj-4'],
    contract: {
      startDate: "2022-03-15",
      endDate: null,
      weeklyHours: 40,
    },
  },
  {
    id: "user-3",
    name: "Peter Jones",
    email: "peter.jones@example.com",
    role: "Employee",
    avatar: "https://placehold.co/100x100.png",
    reportsTo: 'user-1',
    teamId: 'team-1',
    associatedProjectIds: ['proj-2'],
    contract: {
      startDate: "2023-08-01",
      endDate: "2024-08-01",
      weeklyHours: 20,
    },
  },
  {
    id: "user-4",
    name: "Susan Miller",
    email: "susan.miller@example.com",
    role: "Employee",
    avatar: "https://placehold.co/100x100.png",
    reportsTo: 'user-1',
    teamId: 'team-1',
    associatedProjectIds: ['proj-1', 'proj-2', 'proj-3'],
    contract: {
      startDate: "2021-11-20",
      endDate: null,
      weeklyHours: 40,
    },
  },
  adminUser
];

const today = new Date();
export const timeEntries: TimeEntry[] = [
  // Alex Smith (Team Lead) - slight overtime
  { id: "t-1", userId: "user-1", date: new Date(new Date().setDate(1)).toISOString(), startTime: "09:00", endTime: "17:00", task: "Project A - Feature Dev", duration: 8, remarks: "Completed the main logic for the new feature." },
  { id: "t-2", userId: "user-1", date: new Date(new Date().setDate(2)).toISOString(), startTime: "09:00", endTime: "17:30", task: "Project B - Bugfixes", duration: 8.5 },
  { id: "t-3", userId: "user-1", date: new Date(new Date().setDate(3)).toISOString(), startTime: "10:00", endTime: "18:00", task: "Team Meeting", duration: 8, remarks: "Weekly sync with the team." },
  { id: "t-4", userId: "user-1", date: new Date(new Date().setDate(4)).toISOString(), startTime: "09:00", endTime: "17:00", task: "Project A - Code Review", duration: 8 },
  
  // Jane Doe (Employee) - significant overtime
  { id: "t-5", userId: "user-2", date: new Date(new Date().setDate(1)).toISOString(), startTime: "09:00", endTime: "18:00", task: "Documentation", duration: 9, remarks: "Updated the API documentation." },
  { id: "t-6", userId: "user-2", date: new Date(new Date().setDate(2)).toISOString(), startTime: "09:00", endTime: "18:30", task: "Project A - UI Design", duration: 9.5 },
  { id: "t-8", userId: "user-2", date: new Date(new Date().setDate(3)).toISOString(), startTime: "09:00", endTime: "17:00", task: "Project A - UI Design", duration: 8, remarks: "Finalized the mockups." },
  
  // Peter Jones (Employee, part-time) - deficit
  { id: "t-7", userId: "user-3", date: new Date(new Date().setDate(1)).toISOString(), startTime: "13:00", endTime: "16:00", task: "Customer Support", duration: 3 },
  { id: "t-9", userId: "user-3", date: new Date(new Date().setDate(2)).toISOString(), startTime: "13:00", endTime: "17:00", task: "Customer Support", duration: 4 },
  { id: "t-10", userId: "user-3", date: new Date(new Date().setDate(3)).toISOString(), startTime: "13:00", endTime: "15:00", task: "Customer Support", duration: 2, remarks: "Handled a few support tickets." },
  
  // Susan Miller (Employee) - deficit
  { id: "t-11", userId: "user-4", date: new Date(new Date().setDate(1)).toISOString(), startTime: "09:00", endTime: "16:00", task: "Internal - HR Training", duration: 7 },
  { id: "t-12", userId: "user-4", date: new Date(new Date().setDate(2)).toISOString(), startTime: "10:00", endTime: "17:00", task: "Client X - Communication", duration: 7 },
  { id: "t-13", userId: "user-4", date: new Date(new Date().setDate(3)).toISOString(), startTime: "09:00", endTime: "17:00", task: "Client X - Communication", duration: 8 },
  
  // Admin User
  { id: "t-14", userId: "admin-1", date: new Date(new Date().setDate(1)).toISOString(), startTime: "09:00", endTime: "17:00", task: "Admin - System Check", duration: 8, remarks: "All systems operational." },
  { id: "t-15", userId: "admin-1", date: new Date(new Date().setDate(2)).toISOString(), startTime: "09:00", endTime: "17:00", task: "Admin - Payroll", duration: 8 },
  { id: "t-16", userId: "admin-1", date: new Date(new Date().setDate(3)).toISOString(), startTime: "09:00", endTime: "17:00", task: "Admin - User Management", duration: 8 },

];


export const holidayRequests: HolidayRequest[] = [
  { id: "h-1", userId: "user-1", startDate: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(), status: "Approved" },
  { id: "h-2", userId: "user-2", startDate: new Date(today.getFullYear(), today.getMonth() + 1, 12).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 16).toISOString(), status: "Pending" },
  { id: "h-3", userId: "user-4", startDate: new Date(today.getFullYear(), today.getMonth() - 1, 10).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() -1, 10).toISOString(), status: "Rejected" },
];

export const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
    const day = i + 1;
    const entry = timeEntries.find(e => new Date(e.date).getDate() === day && e.userId === currentUser.id);
    return { date: day.toString(), hours: entry ? entry.duration : 0 };
}).map(d => {
    if (d.date === "5" || d.date === "6") d.hours = 0; // weekend
    if (d.date === "8") d.hours = 8;
    if (d.date === "9") d.hours = 8.2;
    if (d.date === "10") d.hours = 7.8;
    if (d.date === "11") d.hours = 8;
    if (d.date === "12") d.hours = 4;
    return d;
});

export const projects: Project[] = [
  { id: "proj-1", name: "Project A", taskIds: ['task-1', 'task-2', 'task-4'], budget: 50000, details: "Development of the new company website." },
  { id: "proj-2", name: "Project B", taskIds: ['task-2', 'task-3'], budget: 75000, details: "Migration of legacy systems to the cloud." },
  { id: "proj-3", name: "Internal", taskIds: ['task-5', 'task-6', 'task-12'], budget: 10000, details: "Internal tools and process improvements." },
  { id: "proj-4", name: "Client X", taskIds: ['task-7'], budget: 120000, details: "Marketing campaign for Client X." },
];

export const tasks: Task[] = [
  { id: "task-1", name: "Feature Development", details: "Developing new features for projects." },
  { id: "task-2", name: "Bug Fixing", details: "Resolving bugs and issues reported." },
  { id: "task-3", name: "UI/UX Design", details: "Designing user interfaces and experiences." },
  { id: "task-4", name: "Code Review", details: "Reviewing pull requests and code quality." },
  { id: "task-5", name: "Documentation", details: "Writing and updating project documentation." },
  { id: "task-6", name: "Team Meeting", details: "Attending and participating in team meetings." },
  { id: "task-7", name: "Client Communication", details: "Communicating with clients and stakeholders." },
  { id: "task-8", name: "Admin - System Check", details: "Performing routine system checks." },
  { id: "task-9", name: "Admin - Payroll", details: "Processing payroll for team members." },
  { id: "task-10", name: "Admin - User Management", details: "Managing user accounts and permissions." },
  { id: "task-11", name: "Customer Support", details: "Providing support to customers." },
  { id: "task-12", name: "Internal - HR Training", details: "Participating in HR training sessions." },
];

const currentYear = new Date().getFullYear();

export let publicHolidays: PublicHoliday[] = [
    { id: 'ph-1', country: 'USA', name: 'New Year\'s Day', date: new Date(currentYear, 0, 1).toISOString(), type: 'Full Day' },
    { id: 'ph-2', country: 'USA', name: 'Martin Luther King, Jr. Day', date: new Date(currentYear, 0, 15).toISOString(), type: 'Full Day' },
    { id: 'ph-3', country: 'USA', name: 'Independence Day', date: new Date(currentYear, 6, 4).toISOString(), type: 'Full Day' },
    { id: 'ph-4', country: 'USA', name: 'Labor Day', date: new Date(currentYear, 8, 2).toISOString(), type: 'Full Day' },
    { id: 'ph-5', country: 'USA', name: 'Thanksgiving Day', date: new Date(currentYear, 10, 28).toISOString(), type: 'Full Day' },
    { id: 'ph-6', country: 'USA', name: 'Christmas Day', date: new Date(currentYear, 11, 25).toISOString(), type: 'Full Day' },
    { id: 'ph-7', country: 'UK', name: 'Good Friday', date: new Date(currentYear, 3, 18).toISOString(), type: 'Full Day' },
    { id: 'ph-8', country: 'UK', name: 'Boxing Day', date: new Date(currentYear, 11, 26).toISOString(), type: 'Full Day' },
];

export let customHolidays: CustomHoliday[] = [
  { id: 'ch-1', country: 'Global', name: 'Company Anniversary', date: new Date(new Date().getFullYear(), 8, 15).toISOString(), type: 'Full Day', appliesTo: 'all-members'},
  { id: 'ch-2', country: 'USA', name: 'Alpha Team Offsite', date: new Date(new Date().getFullYear(), 5, 20).toISOString(), type: 'Full Day', appliesTo: 'team-1'},
];

export let freezeRules: FreezeRule[] = [];

export const pushMessages: PushMessage[] = [];

export const userMessageStates: Record<string, UserMessageState> = {};

export const systemLogs: LogEntry[] = [
    { id: 'log-0', timestamp: new Date().toISOString(), message: 'System initialized.'}
];
