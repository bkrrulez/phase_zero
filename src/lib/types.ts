

export type Contract = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
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

export type RuleBook = {
  id: string;
  name: string; // This will now store the unique name (e.g., "OIB-RL-2-v1")
  versionName: string; // This will store the user-provided name (e.g., "OIB-RL-2")
  version: number;
  importedAt: Date;
  rowCount: number;
}

export type RuleBookEntry = {
  id: string;
  ruleBookId: string;
  data: Record<string, any>;
};

export type ReferenceTable = {
  id: string;
  ruleBookId: string;
  name: string;
  data: Record<string, any>[];
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
