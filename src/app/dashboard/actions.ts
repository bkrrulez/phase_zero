
'use server';

import { db } from '@/lib/db';
import {
  type User,
  type TimeEntry,
  type HolidayRequest,
  type Project,
  type Task,
  type Team,
  type PublicHoliday,
  type CustomHoliday,
  type FreezeRule,
  type PushMessage,
  type UserMessageState,
  type AppNotification,
  type LogEntry,
} from '@/lib/types';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';

// ========== Mappers ==========
// Map DB rows to application types

const mapDbUserToUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email,
  role: dbUser.role,
  avatar: dbUser.avatar,
  reportsTo: dbUser.reports_to,
  teamId: dbUser.team_id,
  associatedProjectIds: dbUser.associated_project_ids || [],
  contract: {
    startDate: format(new Date(dbUser.contract_start_date), 'yyyy-MM-dd'),
    endDate: dbUser.contract_end_date ? format(new Date(dbUser.contract_end_date), 'yyyy-MM-dd') : null,
    weeklyHours: dbUser.contract_weekly_hours,
  },
});

const mapDbProjectToProject = (dbProject: any): Project => ({
  id: dbProject.id,
  name: dbProject.name,
  budget: dbProject.budget ? Number(dbProject.budget) : undefined,
  details: dbProject.details,
  taskIds: dbProject.task_ids || [],
});

const mapDbTaskToTask = (dbTask: any): Task => ({
  id: dbTask.id,
  name: dbTask.name,
  details: dbTask.details,
});

const mapDbTeamToTeam = (dbTeam: any): Team => ({
    id: dbTeam.id,
    name: dbTeam.name,
    projectIds: dbTeam.project_ids || [],
});

const mapDbHolidayRequestToHolidayRequest = (row: any): HolidayRequest => ({
  id: row.id,
  userId: row.user_id,
  startDate: format(new Date(row.start_date), 'yyyy-MM-dd'),
  endDate: format(new Date(row.end_date), 'yyyy-MM-dd'),
  status: row.status,
});

// ========== Users & Auth ==========

export async function verifyUserCredentials(email: string, password_input: string): Promise<User | null> {
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    // Special case for Super Admin login via environment variables
    if (email === adminEmail) {
        if (password_input === adminPassword) {
            const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length > 0) {
                return mapDbUserToUser(result.rows[0]);
            }
            return null; 
        } else {
            return null; // Incorrect password for admin
        }
    }

    // Standard user login
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password_input]);
    if (result.rows.length > 0) {
        return mapDbUserToUser(result.rows[0]);
    }
    
    return null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
        return mapDbUserToUser(result.rows[0]);
    }
    return null;
}

export async function getUsers(): Promise<User[]> {
    const result = await db.query(`
        SELECT u.*, COALESCE(array_agg(up.project_id) FILTER (WHERE up.project_id IS NOT NULL), '{}') as associated_project_ids
        FROM users u
        LEFT JOIN user_projects up ON u.id = up.user_id
        GROUP BY u.id
        ORDER BY u.name
    `);
    return result.rows.map(mapDbUserToUser);
}

export async function addUser(newUserData: Omit<User, 'id' | 'avatar'>): Promise<User | null> {
    const { name, email, role, reportsTo, teamId, associatedProjectIds, contract } = newUserData;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const id = `user-${Date.now()}`;
        const password = 'password';
        const avatar = `https://placehold.co/100x100.png`;

        const insertedUserRes = await client.query(
            `INSERT INTO users (id, name, email, password, role, avatar, reports_to, team_id, contract_start_date, contract_end_date, contract_weekly_hours)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [id, name, email, password, role, avatar, reportsTo, teamId, contract.startDate, contract.endDate, contract.weeklyHours]
        );

        if (associatedProjectIds && associatedProjectIds.length > 0) {
            for (const projectId of associatedProjectIds) {
                await client.query('INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)', [id, projectId]);
            }
        }
        await client.query('COMMIT');
        
        revalidatePath('/dashboard/settings/members');
        revalidatePath('/dashboard/team');
        const newUser = mapDbUserToUser(insertedUserRes.rows[0]);
        newUser.associatedProjectIds = associatedProjectIds;
        return newUser;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding user:', error);
        return null;
    } finally {
        client.release();
    }
}

export async function updateUser(updatedUser: User): Promise<User | null> {
    const { id, name, email, role, reportsTo, teamId, associatedProjectIds, contract } = updatedUser;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        const res = await client.query(
            `UPDATE users SET
                name = $1, email = $2, role = $3, reports_to = $4, team_id = $5,
                contract_start_date = $6, contract_end_date = $7, contract_weekly_hours = $8
             WHERE id = $9 RETURNING *`,
            [name, email, role, reportsTo, teamId, contract.startDate, contract.endDate, contract.weeklyHours, id]
        );

        await client.query('DELETE FROM user_projects WHERE user_id = $1', [id]);
        if (associatedProjectIds && associatedProjectIds.length > 0) {
            for (const projectId of associatedProjectIds) {
                await client.query('INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)', [id, projectId]);
            }
        }
        
        await client.query('COMMIT');
        
        revalidatePath('/dashboard/settings/members');
        revalidatePath('/dashboard/team');
        revalidatePath('/dashboard/profile');
        
        const finalUser = mapDbUserToUser(res.rows[0]);
        finalUser.associatedProjectIds = associatedProjectIds;
        return finalUser;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user:', error);
        return null;
    } finally {
        client.release();
    }
}

// ========== Time Tracking ==========

export async function getTimeEntries(): Promise<TimeEntry[]> {
    const result = await db.query(`
      SELECT te.*, p.name as project_name, t.name as task_name
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      JOIN tasks t ON te.task_id = t.id
      ORDER BY te.date DESC, te.start_time DESC
    `);
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      date: format(new Date(row.date), 'yyyy-MM-dd'),
      startTime: row.start_time,
      endTime: row.end_time,
      task: `${row.project_name} - ${row.task_name}`,
      duration: Number(row.duration),
      remarks: row.remarks
    }));
}

export async function logTime(entry: Omit<TimeEntry, 'id'|'duration'> & {projectId: string, taskId: string}): Promise<TimeEntry | null> {
    const { userId, date, startTime, endTime, projectId: projectName, taskId: taskName, remarks } = entry;
    const client = await db.connect();
    try {
        const projectResult = await client.query('SELECT id FROM projects WHERE name = $1', [projectName]);
        const taskResult = await client.query('SELECT id FROM tasks WHERE name = $1', [taskName]);

        if (projectResult.rows.length === 0) throw new Error(`Project not found: ${projectName}`);
        if (taskResult.rows.length === 0) throw new Error(`Task not found: ${taskName}`);

        const projectId = projectResult.rows[0].id;
        const taskId = taskResult.rows[0].id;

        const start = new Date(`1970-01-01T${startTime}`);
        const end = new Date(`1970-01-01T${endTime}`);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        const id = `te-${Date.now()}`;
        const result = await client.query(
            `INSERT INTO time_entries (id, user_id, project_id, task_id, date, start_time, end_time, duration, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [id, userId, projectId, taskId, date, startTime, endTime, duration, remarks]
        );
        revalidatePath('/dashboard');
        
        const inserted = result.rows[0];
        return {
            id: inserted.id,
            userId: inserted.user_id,
            date: format(new Date(inserted.date), 'yyyy-MM-dd'),
            startTime: inserted.start_time,
            endTime: inserted.end_time,
            task: `${projectName} - ${taskName}`,
            duration: Number(inserted.duration),
            remarks: inserted.remarks,
        };
    } catch (error) {
        console.error('Error logging time:', error);
        return null;
    } finally {
        client.release();
    }
}

export async function updateTimeEntry(entryId: string, entry: Omit<TimeEntry, 'id' | 'duration'> & { projectId: string; taskId: string }): Promise<TimeEntry | null> {
  const { userId, date, startTime, endTime, projectId: projectName, taskId: taskName, remarks } = entry;
  const client = await db.connect();
  try {
    const projectResult = await client.query('SELECT id FROM projects WHERE name = $1', [projectName]);
    const taskResult = await client.query('SELECT id FROM tasks WHERE name = $1', [taskName]);

    if (projectResult.rows.length === 0) throw new Error(`Project not found: ${projectName}`);
    if (taskResult.rows.length === 0) throw new Error(`Task not found: ${taskName}`);

    const projectId = projectResult.rows[0].id;
    const taskId = taskResult.rows[0].id;

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const result = await client.query(
      `UPDATE time_entries 
       SET project_id = $1, task_id = $2, date = $3, start_time = $4, end_time = $5, duration = $6, remarks = $7
       WHERE id = $8 RETURNING *`,
      [projectId, taskId, date, startTime, endTime, duration, remarks, entryId]
    );
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/reports');

    const updated = result.rows[0];
    return {
      id: updated.id,
      userId: updated.user_id,
      date: format(new Date(updated.date), 'yyyy-MM-dd'),
      startTime: updated.start_time,
      endTime: updated.end_time,
      task: `${projectName} - ${taskName}`,
      duration: Number(updated.duration),
      remarks: updated.remarks,
    };
  } catch (error) {
    console.error('Error updating time entry:', error);
    return null;
  } finally {
    client.release();
  }
}

export async function deleteTimeEntry(entryId: string): Promise<void> {
    await db.query('DELETE FROM time_entries WHERE id = $1', [entryId]);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/reports');
}


// ========== Projects ==========

export async function getProjects(): Promise<Project[]> {
    const result = await db.query(`
        SELECT p.*, COALESCE(array_agg(pt.task_id) FILTER (WHERE pt.task_id IS NOT NULL), '{}') as task_ids
        FROM projects p
        LEFT JOIN project_tasks pt ON p.id = pt.project_id
        GROUP BY p.id
        ORDER BY p.name
    `);
    return result.rows.map(mapDbProjectToProject);
}

export async function addProject(projectData: Omit<Project, 'id'>): Promise<void> {
    const { name, budget, details, taskIds } = projectData;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const id = `proj-${Date.now()}`;
        await client.query('INSERT INTO projects (id, name, budget, details) VALUES ($1, $2, $3, $4)', [id, name, budget, details]);
        if (taskIds && taskIds.length > 0) {
            for (const taskId of taskIds) {
                await client.query('INSERT INTO project_tasks (project_id, task_id) VALUES ($1, $2)', [id, taskId]);
            }
        }
        await client.query('COMMIT');
        revalidatePath('/dashboard/settings/projects');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding project:', error);
    } finally {
        client.release();
    }
}

export async function updateProject(projectId: string, data: Omit<Project, 'id'>): Promise<void> {
    const { name, budget, details, taskIds } = data;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE projects SET name = $1, budget = $2, details = $3 WHERE id = $4', [name, budget, details, projectId]);
        await client.query('DELETE FROM project_tasks WHERE project_id = $1', [projectId]);
        if (taskIds && taskIds.length > 0) {
            for (const taskId of taskIds) {
                await client.query('INSERT INTO project_tasks (project_id, task_id) VALUES ($1, $2)', [projectId, taskId]);
            }
        }
        await client.query('COMMIT');
        revalidatePath('/dashboard/settings/projects');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating project:', error);
    } finally {
        client.release();
    }
}

export async function deleteProject(projectId: string): Promise<void> {
    await db.query('DELETE FROM projects WHERE id = $1', [projectId]);
    revalidatePath('/dashboard/settings/projects');
}

// ========== Tasks ==========

export async function getTasks(): Promise<Task[]> {
    const result = await db.query('SELECT * FROM tasks ORDER BY name');
    return result.rows.map(mapDbTaskToTask);
}

export async function addTask(taskData: Omit<Task, 'id'>): Promise<void> {
    const id = `task-${Date.now()}`;
    await db.query('INSERT INTO tasks (id, name, details) VALUES ($1, $2, $3)', [id, taskData.name, taskData.details]);
    revalidatePath('/dashboard/settings/tasks');
}

export async function updateTask(taskId: string, data: Omit<Task, 'id'>): Promise<void> {
    await db.query('UPDATE tasks SET name = $1, details = $2 WHERE id = $3', [data.name, data.details, taskId]);
    revalidatePath('/dashboard/settings/tasks');
}

export async function deleteTask(taskId: string): Promise<void> {
    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    revalidatePath('/dashboard/settings/tasks');
}

// ========== Teams ==========

export async function getTeams(): Promise<Team[]> {
    const result = await db.query(`
        SELECT t.*, COALESCE(array_agg(tp.project_id) FILTER (WHERE tp.project_id IS NOT NULL), '{}') as project_ids
        FROM teams t
        LEFT JOIN team_projects tp ON t.id = tp.team_id
        GROUP BY t.id
        ORDER BY t.name
    `);
    return result.rows.map(mapDbTeamToTeam);
}

export async function addTeam(teamData: Omit<Team, 'id'>): Promise<void> {
    const { name, projectIds } = teamData;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const id = `team-${Date.now()}`;
        await client.query('INSERT INTO teams (id, name) VALUES ($1, $2)', [id, name]);

        if (projectIds && projectIds.length > 0) {
            for (const projectId of projectIds) {
                await client.query('INSERT INTO team_projects (team_id, project_id) VALUES ($1, $2)', [id, projectId]);
            }
        }
        await client.query('COMMIT');
        revalidatePath('/dashboard/settings/teams');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding team:', error);
    } finally {
        client.release();
    }
}

export async function updateTeam(teamId: string, teamData: Omit<Team, 'id'>): Promise<void> {
    const { name, projectIds } = teamData;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE teams SET name = $1 WHERE id = $2', [name, teamId]);
        await client.query('DELETE FROM team_projects WHERE team_id = $1', [teamId]);
        if (projectIds && projectIds.length > 0) {
            for (const projectId of projectIds) {
                await client.query('INSERT INTO team_projects (team_id, project_id) VALUES ($1, $2)', [teamId, projectId]);
            }
        }
        await client.query('COMMIT');
        revalidatePath('/dashboard/settings/teams');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating team:', error);
    } finally {
        client.release();
    }
}

// ========== Holidays ==========

export async function getPublicHolidays(): Promise<PublicHoliday[]> {
    const result = await db.query('SELECT * FROM public_holidays ORDER BY date');
    return result.rows.map(row => ({ ...row, date: format(new Date(row.date), 'yyyy-MM-dd')}));
}

export async function getCustomHolidays(): Promise<CustomHoliday[]> {
    const result = await db.query('SELECT * FROM custom_holidays ORDER BY date');
    return result.rows.map(row => ({ ...row, date: format(new Date(row.date), 'yyyy-MM-dd')}));
}

export async function getHolidayRequests(): Promise<HolidayRequest[]> {
    const result = await db.query('SELECT * FROM holiday_requests ORDER BY start_date DESC');
    return result.rows.map(mapDbHolidayRequestToHolidayRequest);
}

export async function getAnnualLeaveAllowance(): Promise<number> {
    // This is not in the db schema, so we'll return a static value as before.
    // In a real app, this would be in a settings table.
    return 25;
}

export async function setAnnualLeaveAllowance(allowance: number): Promise<void> {
    // No DB table for this, so this is a no-op.
    console.log(`Annual leave allowance set to ${allowance} (in-memory only).`);
}

export async function addHolidayRequest(request: Omit<HolidayRequest, 'id'>): Promise<HolidayRequest | null> {
    const id = `hr-${Date.now()}`;
    const result = await db.query(
        'INSERT INTO holiday_requests (id, user_id, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, request.userId, request.startDate, request.endDate, request.status]
    );
    revalidatePath('/dashboard/holidays');
    return mapDbHolidayRequestToHolidayRequest(result.rows[0]);
}

export async function updateHolidayRequestStatus(requestId: string, status: 'Approved' | 'Rejected'): Promise<void> {
    await db.query('UPDATE holiday_requests SET status = $1 WHERE id = $2', [status, requestId]);
    revalidatePath('/dashboard/holidays');
}

export async function deleteHolidayRequest(requestId: string): Promise<void> {
    await db.query('DELETE FROM holiday_requests WHERE id = $1', [requestId]);
    revalidatePath('/dashboard/holidays');
}

// ========== Access Control ==========

export async function getFreezeRules(): Promise<FreezeRule[]> {
    const result = await db.query('SELECT * FROM freeze_rules ORDER BY start_date DESC');
    return result.rows.map(row => ({
        id: row.id,
        teamId: row.team_id,
        startDate: format(new Date(row.start_date), 'yyyy-MM-dd'),
        endDate: format(new Date(row.end_date), 'yyyy-MM-dd'),
    }));
}

export async function addFreezeRule(newRuleData: Omit<FreezeRule, 'id'>): Promise<FreezeRule | null> {
    const { teamId, startDate, endDate } = newRuleData;
    const id = `freeze-${Date.now()}`;
    const result = await db.query(
        'INSERT INTO freeze_rules (id, team_id, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, teamId, startDate, endDate]
    );
    revalidatePath('/dashboard/settings/access-control');
    return {
        id: result.rows[0].id,
        teamId: result.rows[0].team_id,
        startDate: format(new Date(result.rows[0].start_date), 'yyyy-MM-dd'),
        endDate: format(new Date(result.rows[0].end_date), 'yyyy-MM-dd'),
    }
}

export async function removeFreezeRule(ruleId: string): Promise<void> {
    await db.query('DELETE FROM freeze_rules WHERE id = $1', [ruleId]);
    revalidatePath('/dashboard/settings/access-control');
}

// ========== Notifications & Messages ==========

export async function getNotifications(): Promise<AppNotification[]> {
    const result = await db.query(`
        SELECT 
            n.*, 
            COALESCE(array_agg(DISTINCT nr.user_id) FILTER (WHERE nr.user_id IS NOT NULL), '{}') as recipient_ids,
            COALESCE(array_agg(DISTINCT nrb.user_id) FILTER (WHERE nrb.user_id IS NOT NULL), '{}') as read_by
        FROM app_notifications n
        LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
        LEFT JOIN notification_read_by nrb ON n.id = nrb.notification_id
        GROUP BY n.id
        ORDER BY n.timestamp DESC
    `);
    return result.rows.map(row => ({
        ...row,
        timestamp: new Date(row.timestamp).toISOString(),
        readBy: row.read_by,
        recipientIds: row.recipient_ids
    }));
}

export async function addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'readBy'>): Promise<AppNotification | null> {
    const { type, recipientIds, title, body, referenceId } = notification;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const id = `notif-${Date.now()}`;
        const timestamp = new Date().toISOString();
        
        const res = await client.query(
            'INSERT INTO app_notifications (id, type, timestamp, title, body, reference_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [id, type, timestamp, title, body, referenceId]
        );

        for (const userId of recipientIds) {
            await client.query('INSERT INTO notification_recipients (notification_id, user_id) VALUES ($1, $2)', [id, userId]);
        }
        
        await client.query('COMMIT');
        revalidatePath('/dashboard');

        const newNotif = res.rows[0];
        return {
            id: newNotif.id,
            type: newNotif.type,
            recipientIds: recipientIds,
            readBy: [],
            timestamp: newNotif.timestamp.toISOString(),
            title: newNotif.title,
            body: newNotif.body,
            referenceId: newNotif.reference_id,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding notification:', error);
        return null;
    } finally {
        client.release();
    }
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    // Use ON CONFLICT DO NOTHING to prevent duplicate entries
    await db.query('INSERT INTO notification_read_by (notification_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [notificationId, userId]);
    revalidatePath('/dashboard');
}

export async function getPushMessages(): Promise<PushMessage[]> {
    const result = await db.query(`
        SELECT 
            pm.*, 
            CASE 
                WHEN pm.receivers = 'individual-teams' THEN COALESCE(array_agg(pmt.team_id), '{}')
                ELSE NULL
            END as team_ids
        FROM push_messages pm
        LEFT JOIN push_message_teams pmt ON pm.id = pmt.push_message_id AND pm.receivers = 'individual-teams'
        GROUP BY pm.id
        ORDER BY pm.start_date DESC
    `);
    return result.rows.map(row => ({
        id: row.id,
        context: row.context,
        messageBody: row.message_body,
        startDate: new Date(row.start_date).toISOString(),
        endDate: new Date(row.end_date).toISOString(),
        receivers: row.receivers === 'individual-teams' ? row.team_ids : row.receivers,
    }));
}

export async function addPushMessage(messageData: Omit<PushMessage, 'id'>): Promise<void> {
    const { context, messageBody, startDate, endDate, receivers } = messageData;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const id = `msg-${Date.now()}`;
        const receiversType = Array.isArray(receivers) ? 'individual-teams' : receivers;
        
        await client.query('INSERT INTO push_messages (id, context, message_body, start_date, end_date, receivers) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, context, messageBody, startDate, endDate, receiversType]
        );

        if (Array.isArray(receivers)) {
            for (const teamId of receivers) {
                await client.query('INSERT INTO push_message_teams (push_message_id, team_id) VALUES ($1, $2)', [id, teamId]);
            }
        }
        await client.query('COMMIT');
        revalidatePath('/dashboard/settings/push-messages');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding push message:', error);
    } finally {
        client.release();
    }
}

export async function updatePushMessage(messageId: string, data: Omit<PushMessage, 'id'>): Promise<void> {
    const { context, messageBody, startDate, endDate, receivers } = data;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const receiversType = Array.isArray(receivers) ? 'individual-teams' : receivers;
        
        await client.query('UPDATE push_messages SET context=$1, message_body=$2, start_date=$3, end_date=$4, receivers=$5 WHERE id=$6',
            [context, messageBody, startDate, endDate, receiversType, messageId]
        );
        
        await client.query('DELETE FROM push_message_teams WHERE push_message_id = $1', [messageId]);
        if (Array.isArray(receivers)) {
            for (const teamId of receivers) {
                await client.query('INSERT INTO push_message_teams (push_message_id, team_id) VALUES ($1, $2)', [messageId, teamId]);
            }
        }
        
        await client.query('COMMIT');
        revalidatePath('/dashboard/settings/push-messages');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating push message:', error);
    } finally {
        client.release();
    }
}

export async function deletePushMessage(messageId: string): Promise<void> {
    await db.query('DELETE FROM push_messages WHERE id = $1', [messageId]);
    revalidatePath('/dashboard/settings/push-messages');
}

export async function getUserMessageStates(): Promise<Record<string, UserMessageState>> {
    const result = await db.query('SELECT * FROM push_message_read_by');
    const states: Record<string, UserMessageState> = {};
    for (const row of result.rows) {
        if (!states[row.user_id]) {
            states[row.user_id] = { readMessageIds: [] };
        }
        states[row.user_id].readMessageIds.push(row.push_message_id);
    }
    return states;
}

export async function markMessageAsRead(userId: string, messageId: string): Promise<void> {
    await db.query('INSERT INTO push_message_read_by (push_message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [messageId, userId]);
    revalidatePath('/dashboard');
}

// ========== System Logs ==========

export async function getSystemLogs(): Promise<LogEntry[]> {
    const result = await db.query('SELECT * FROM system_logs ORDER BY timestamp DESC');
    return result.rows.map(row => ({
        id: row.id,
        timestamp: new Date(row.timestamp).toISOString(),
        message: row.message,
    }));
}

export async function addSystemLog(message: string): Promise<LogEntry | null> {
    const id = `log-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const result = await db.query('INSERT INTO system_logs (id, timestamp, message) VALUES ($1, $2, $3) RETURNING *', [id, timestamp, message]);
    revalidatePath('/dashboard/settings/system-logs');
    return {
        id: result.rows[0].id,
        timestamp: new Date(result.rows[0].timestamp).toISOString(),
        message: result.rows[0].message
    };
}
