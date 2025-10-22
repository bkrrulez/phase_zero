

export type Contract = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  weeklyHours: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "User" | "Team Lead" | "Super Admin" | "Expert";
  avatar: string;
  reportsTo?: string; // User ID of manager
  teamId?: string;
  associatedProjectIds?: string[];
  contract: { // This is now a single object representing the primary contract for simplified access
    startDate: string;
    endDate: string | null;
    weeklyHours: number;
  },
  contracts: Omit<Contract, 'userId'>[];
  contractPdf?: string | null;
};

export type TimeEntry = {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  project: string;
  duration: number; // in hours
  placeOfWork: 'Home Office' | 'In Office';
  remarks?: string;
};

export type Project = {
  id: string;
  name: string;
  projectNumber: string;
  projectCreationDate: string;
  projectManager: string;
  creatorId: string;
  address: string;
  projectOwner: string;
  yearOfConstruction?: number;
  numberOfFloors?: number;
  escapeLevel?: number;
  listedBuilding: boolean;
  protectionZone: boolean;
  currentUse?: string;
};

export type Team = {
  id: string;
  name: string;
  projectIds?: string[];
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

export type AppNotification = {
  id: string;
  type: 'holidayRequest';
  recipientIds: string[];
  readBy: string[]; // array of userIds who have read it
  timestamp: string;
  title: string;
  body: string;
  referenceId: string; // holidayRequest id
};


export type LogEntry = {
  id:string;
  timestamp: string; // ISO string
  message: string;
};

export type ContractEndNotification = {
    id: string;
    teamIds: string[];
    recipientUserIds: string[];
    recipientEmails: string[];
    thresholdDays: number[];
};

export type Absence = {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: 'General Absence' | 'Sick Leave';
};


export type InitialData = {
  teamMembers: Omit<User, 'contract' | 'contracts'>[];
  contracts: Omit<Contract, 'userId'>[];
  timeEntries: TimeEntry[];
  projects: Project[];
  teams: Team[];
  pushMessages: PushMessage[];
  userMessageStates: Record<string, UserMessageState>;
  notifications: AppNotification[];
  systemLogs: LogEntry[];
};
