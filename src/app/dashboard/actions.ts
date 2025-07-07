
'use server';

import { query } from "@/lib/db";
import { 
    User,
    TimeEntry,
    HolidayRequest,
    Project,
    Task,
    Team,
    PublicHoliday,
    CustomHoliday,
    FreezeRule,
    PushMessage,
    UserMessageState,
    AppNotification,
    LogEntry,
    InitialData
} from "@/lib/types";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";


// AUTH
export async function login(email: string, password_input: string) {
    // All authentication is now handled by the database for all user roles.
    const users = await query<{id: string, password: string}>('SELECT id, password FROM users WHERE email ILIKE $1', [email]);

    if (users.length === 0) {
        return { success: false, error: "User not found." };
    }
    
    const user = users[0];
    
    // In a real app, passwords should be hashed and compared securely.
    // For this prototype, we are using plaintext passwords from the database.
    if (password_input === user.password) {
        return { success: true, userId: user.id };
    } else {
        return { success: false, error: 'Invalid password.' };
    }
}

export async function getInitialData(): Promise<InitialData> {
    const [
        teamMembers, timeEntries, holidayRequests, projects, tasks, teams,
        publicHolidays, customHolidays, freezeRules, pushMessages,
        notifications, systemLogs
    ] = await Promise.all([
        query<User>('SELECT id, name, email, role, avatar, reports_to as "reportsTo", team_id as "teamId", contract_start_date as "startDate", contract_end_date as "endDate", contract_weekly_hours as "weeklyHours" FROM users ORDER BY name ASC'),
        query<TimeEntry>(`
            SELECT 
                te.id, 
                te.user_id as "userId", 
                te.date, 
                te.start_time as "startTime", 
                te.end_time as "endTime", 
                p.name || ' - ' || t.name as task, 
                te.duration, 
                te.remarks
            FROM time_entries te
            JOIN projects p ON te.project_id = p.id
            JOIN tasks t ON te.task_id = t.id
            ORDER BY te.date DESC
        `),
        query<HolidayRequest>('SELECT id, user_id as "userId", start_date as "startDate", end_date as "endDate", status FROM holiday_requests'),
        query<Project>('SELECT p.*, array_agg(pt.task_id) as "taskIds" FROM projects p LEFT JOIN project_tasks pt ON p.id = pt.project_id GROUP BY p.id ORDER BY p.name ASC'),
        query<Task>('SELECT * FROM tasks ORDER BY name ASC'),
        query<Team>('SELECT t.*, array_agg(tp.project_id) as "projectIds" FROM teams t LEFT JOIN team_projects tp ON t.id = tp.team_id GROUP BY t.id ORDER BY t.name ASC'),
        query<PublicHoliday>('SELECT * FROM public_holidays'),
        query<CustomHoliday>('SELECT id, country, name, date, type, applies_to as "appliesTo" FROM custom_holidays'),
        query<FreezeRule>('SELECT id, team_id as "teamId", start_date as "startDate", end_date as "endDate" FROM freeze_rules'),
        query<PushMessage>('SELECT id, context, message_body as "messageBody", start_date as "startDate", end_date as "endDate", receivers FROM push_messages'),
        query<AppNotification>(`
            SELECT 
                an.id,
                an.type,
                an.timestamp,
                an.title,
                an.body,
                an.reference_id as "referenceId",
                COALESCE(array_agg(DISTINCT nr.user_id) FILTER (WHERE nr.user_id IS NOT NULL), '{}') as "recipientIds",
                COALESCE(array_agg(DISTINCT nrb.user_id) FILTER (WHERE nrb.user_id IS NOT NULL), '{}') as "readBy"
            FROM app_notifications an
            LEFT JOIN notification_recipients nr ON an.id = nr.notification_id
            LEFT JOIN notification_read_by nrb ON an.id = nrb.notification_id
            GROUP BY an.id
            ORDER BY an.timestamp DESC
        `),
        query<LogEntry>('SELECT * FROM system_logs ORDER BY timestamp DESC'),
    ]);
    
    const userProjects = await query<{userId: string, projectId: string}>('SELECT user_id as "userId", project_id as "projectId" FROM user_projects');

    const membersWithProjects = teamMembers.map(member => ({
        ...member,
        contract: {
            startDate: format(new Date(member.startDate), 'yyyy-MM-dd'),
            endDate: member.endDate ? format(new Date(member.endDate), 'yyyy-MM-dd') : null,
            weeklyHours: member.weeklyHours
        },
        associatedProjectIds: userProjects.filter(up => up.userId === member.id).map(up => up.projectId)
    }));


    // This is a placeholder for user-specific message states. In a real app this would be a separate query.
    const userMessageStates: Record<string, UserMessageState> = {};

    return {
        teamMembers: membersWithProjects, timeEntries, holidayRequests, projects, tasks, teams,
        publicHolidays, customHolidays, freezeRules, pushMessages,
        userMessageStates, notifications, systemLogs,
        annualLeaveAllowance: 25 // This could also come from a settings table
    };
}


// MEMBERS
export async function addMember(user: User) {
    const { id, name, email, role, reportsTo, teamId, contract, associatedProjectIds } = user;
    // In a real app, password should be hashed. Here we'll use a default.
    const password = "password"; 
    
    await query(
        `INSERT INTO users (id, name, email, password, role, reports_to, team_id, avatar, contract_start_date, contract_end_date, contract_weekly_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, name, email, password, role, reportsTo, teamId, user.avatar, contract.startDate, contract.endDate, contract.weeklyHours]
    );

    if (associatedProjectIds && associatedProjectIds.length > 0) {
        for (const projectId of associatedProjectIds) {
            await query('INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)', [id, projectId]);
        }
    }
    revalidatePath('/dashboard/settings/members');
    return user;
}

export async function updateMember(user: User) {
    const { id, name, email, role, reportsTo, teamId, contract, associatedProjectIds } = user;
    await query(
        `UPDATE users SET name = $1, email = $2, role = $3, reports_to = $4, team_id = $5, 
         contract_start_date = $6, contract_end_date = $7, contract_weekly_hours = $8, avatar = $9
         WHERE id = $10`,
        [name, email, role, reportsTo, teamId, contract.startDate, contract.endDate, contract.weeklyHours, user.avatar, id]
    );

    await query('DELETE FROM user_projects WHERE user_id = $1', [id]);
    if (associatedProjectIds && associatedProjectIds.length > 0) {
        for (const projectId of associatedProjectIds) {
            await query('INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)', [id, projectId]);
        }
    }
    revalidatePath('/dashboard/settings/members');
    revalidatePath('/dashboard/team');
    revalidatePath(`/dashboard/profile`);
}


// TIME TRACKING
export async function logTime(entry: Omit<TimeEntry, 'id' | 'duration' | 'task'> & {project: string, task: string}) {
    const { userId, date, startTime, endTime, project, task, remarks } = entry;
    
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const projectResult = await query<{id: string}>('SELECT id FROM projects WHERE name = $1', [project]);
    const taskResult = await query<{id: string}>('SELECT id FROM tasks WHERE name = $1', [task]);

    if(projectResult.length === 0 || taskResult.length === 0) {
        throw new Error('Invalid project or task');
    }

    const newEntryResult = await query<{id: string, duration: number}>(
        `INSERT INTO time_entries (id, user_id, project_id, task_id, date, start_time, end_time, duration, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, duration`,
        [`t-${Date.now()}`, userId, projectResult[0].id, taskResult[0].id, date, startTime, endTime, duration, remarks]
    );

    revalidatePath('/dashboard');
    
    const newEntry: TimeEntry = {
        id: newEntryResult[0].id,
        userId: userId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        task: `${project} - ${task}`,
        duration: newEntryResult[0].duration,
        remarks: remarks,
    };

    return newEntry;
}


// SYSTEM LOG
export async function logAction(message: string) {
    await query('INSERT INTO system_logs (id, timestamp, message) VALUES ($1, $2, $3)', [`log-${Date.now()}`, new Date().toISOString(), message]);
    revalidatePath('/dashboard/settings/system-logs');
}
