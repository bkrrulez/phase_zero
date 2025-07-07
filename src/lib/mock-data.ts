
export type User = {
  id: string;
  name: string;
  email: string;
  role: "Employee" | "Team Lead" | "Super Admin";
  avatar: string;
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
};

export type Task = {
  id: string;
  name: string;
};

const alexSmithUser: User = {
  id: "user-1",
  name: "Alex Smith",
  email: "alex.smith@example.com",
  role: "Team Lead",
  avatar: "https://placehold.co/100x100.png",
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
  { id: "t-1", userId: "user-1", date: new Date(new Date().setDate(1)).toISOString(), startTime: "09:00", endTime: "17:00", task: "Project A - Feature Dev", duration: 8 },
  { id: "t-2", userId: "user-1", date: new Date(new Date().setDate(2)).toISOString(), startTime: "09:00", endTime: "17:30", task: "Project B - Bugfixes", duration: 8.5 },
  { id: "t-3", userId: "user-1", date: new Date(new Date().setDate(3)).toISOString(), startTime: "10:00", endTime: "16:00", task: "Team Meeting", duration: 6 },
  { id: "t-4", userId: "user-1", date: new Date(new Date().setDate(4)).toISOString(), startTime: "09:00", endTime: "17:00", task: "Project A - Code Review", duration: 8 },
  { id: "t-5", userId: "user-2", date: new Date(new Date().setDate(1)).toISOString(), startTime: "09:05", endTime: "17:00", task: "Documentation", duration: 7.9 },
  { id: "t-6", userId: "user-2", date: new Date(new Date().setDate(2)).toISOString(), startTime: "09:00", endTime: "16:45", task: "Project A - UI Design", duration: 7.75 },
  { id: "t-7", userId: "user-3", date: new Date(new Date().setDate(1)).toISOString(), startTime: "13:00", endTime: "17:00", task: "Customer Support", duration: 4 },
];

export const holidayRequests: HolidayRequest[] = [
  { id: "h-1", userId: "user-1", startDate: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(), status: "Approved" },
  { id: "h-2", userId: "user-2", startDate: new Date(today.getFullYear(), today.getMonth() + 1, 12).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 16).toISOString(), status: "Pending" },
  { id: "h-3", userId: "user-4", startDate: new Date(today.getFullYear(), today.getMonth() - 1, 10).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() -1, 10).toISOString(), status: "Rejected" },
];

export const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
    const day = i + 1;
    const entry = timeEntries.find(e => new Date(e.date).getDate() === day && e.userId === 'user-1');
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
  { id: "proj-1", name: "Project A" },
  { id: "proj-2", name: "Project B" },
  { id: "proj-3", name: "Internal" },
  { id: "proj-4", name: "Client X" },
];

export const tasks: Task[] = [
  { id: "task-1", name: "Feature Development" },
  { id: "task-2", name: "Bug Fixing" },
  { id: "task-3", name: "UI/UX Design" },
  { id: "task-4", "name": "Code Review" },
  { id: "task-5", name: "Documentation" },
  { id: "task-6", name: "Team Meeting" },
  { id: "task-7", name: "Client Communication" },
];
