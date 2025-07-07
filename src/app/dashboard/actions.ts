
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


// AUTH
export async function login(email: string, password_input: string) {
    // Special case for admin user from env vars
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (email.toLowerCase() === adminEmail?.toLowerCase()) {
        if (password_input === adminPassword) {
            const users = await query<User>("SELECT * FROM users WHERE email = $1", [email]);
            if (users.length > 0) {
                return { success: true, userId: users[0].id };
            }
        } else {
            return { success: false, error: 'Incorrect password for admin.' };
        }
    }
    
    // Regular user login
    const users = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
    if (users.length === 0) {
        return { success: false, error: "User not found." };
    }
    
    const user = users[0];
    const dbPassword = await query<{password: string}>('SELECT password FROM users WHERE id = $1', [user.id]);
    
    if (password_input === dbPassword[0].password) {
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
        query<User>('SELECT id, name, email, role, avatar, reports_to, team_id, contract_start_date, contract_end_date, contract_weekly_hours FROM users ORDER BY name ASC'),
        query<TimeEntry>('SELECT * FROM time_entries ORDER BY date DESC'),
        query<HolidayRequest>('SELECT * FROM holiday_requests'),
        query<Project>('SELECT p.*, array_agg(pt.task_id) as task_ids FROM projects p LEFT JOIN project_tasks pt ON p.id = pt.project_id GROUP BY p.id ORDER BY p.name ASC'),
        query<Task>('SELECT * FROM tasks ORDER BY name ASC'),
        query<Team>('SELECT t.*, array_agg(tp.project_id) as project_ids FROM teams t LEFT JOIN team_projects tp ON t.id = tp.team_id GROUP BY t.id ORDER BY t.name ASC'),
        query<PublicHoliday>('SELECT * FROM public_holidays'),
        query<CustomHoliday>('SELECT * FROM custom_holidays'),
        query<FreezeRule>('SELECT * FROM freeze_rules'),
        query<PushMessage>('SELECT * FROM push_messages'),
        query<AppNotification>(`
            SELECT 
                an.*,
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

    // This is a placeholder for user-specific message states. In a real app this would be a separate query.
    const userMessageStates: Record<string, UserMessageState> = {};

    return {
        teamMembers, timeEntries, holidayRequests, projects, tasks, teams,
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
    
    const newUser = await query<User>(
        `INSERT INTO users (id, name, email, password, role, reports_to, team_id, avatar, contract_start_date, contract_end_date, contract_weekly_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [id, name, email, password, role, reportsTo, teamId, user.avatar, contract.startDate, contract.endDate, contract.weeklyHours]
    );

    if (associatedProjectIds && associatedProjectIds.length > 0) {
        for (const projectId of associatedProjectIds) {
            await query('INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)', [id, projectId]);
        }
    }
    revalidatePath('/dashboard/settings/members');
    return newUser[0];
}

export async function updateMember(user: User) {
    const { id, name, email, role, reportsTo, teamId, contract, associatedProjectIds } = user;
    await query(
        `UPDATE users SET name = $1, email = $2, role = $3, reports_to = $4, team_id = $5, 
         contract_start_date = $6, contract_end_date = $7, contract_weekly_hours = $8
         WHERE id = $9`,
        [name, email, role, reportsTo, teamId, contract.startDate, contract.endDate, contract.weeklyHours, id]
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

    const newEntry = await query<TimeEntry>(
        `INSERT INTO time_entries (id, user_id, project_id, task_id, date, start_time, end_time, duration, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [`t-${Date.now()}`, userId, projectResult[0].id, taskResult[0].id, date, startTime, endTime, duration, remarks]
    );

    revalidatePath('/dashboard');
    return newEntry[0];
}


// SYSTEM LOG
export async function logAction(message: string) {
    await query('INSERT INTO system_logs (id, timestamp, message) VALUES ($1, $2, $3)', [`log-${Date.now()}`, new Date().toISOString(), message]);
    revalidatePath('/dashboard/settings/system-logs');
}
