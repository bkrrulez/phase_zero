

'use server';

import { db } from '@/lib/db';
import { type RuleBook, type RuleBookEntry, type ReferenceTable } from '@/lib/types';
import { revalidatePath } from 'next/cache';

type AddRuleBookPayload = {
    name: string;
    entries: Omit<RuleBookEntry, 'id' | 'ruleBookId'>[];
    referenceTables: Record<string, any[]>;
    isNewVersion: boolean;
}

export async function addRuleBook(payload: AddRuleBookPayload): Promise<{ success: boolean; requiresConfirmation: boolean; existingVersions: number; }> {
    const { name, entries, referenceTables, isNewVersion } = payload;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Check for existing versions
        const existingRes = await client.query(
            `SELECT MAX(version) as max_version FROM rule_books WHERE version_name = $1`,
            [name]
        );

        const latestVersion = existingRes.rows[0]?.max_version || 0;

        if (latestVersion > 0 && !isNewVersion) {
            await client.query('ROLLBACK');
            return { success: false, requiresConfirmation: true, existingVersions: latestVersion };
        }

        const newVersion = latestVersion + 1;
        const ruleBookId = `rb-${Date.now()}`;

        await client.query(
            `INSERT INTO rule_books (id, name, version_name, version, imported_at, row_count) VALUES ($1, $2, $3, $4, NOW(), $5)`,
            [ruleBookId, `${name}-v${newVersion}`, name, newVersion, entries.length]
        );

        for (const entry of entries) {
            const entryId = `rbe-${Date.now()}-${Math.random()}`;
            await client.query(
                `INSERT INTO rule_book_entries (id, rule_book_id, data) VALUES ($1, $2, $3)`,
                [entryId, ruleBookId, entry.data]
            );
        }

        for (const tableName in referenceTables) {
            const tableId = `reft-${Date.now()}-${Math.random()}`;
            const tableData = referenceTables[tableName];
            await client.query(
                `INSERT INTO reference_tables (id, rule_book_id, name, data) VALUES ($1, $2, $3, $4)`,
                [tableId, ruleBookId, tableName, JSON.stringify(tableData)]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding rule book:', error);
        throw new Error('Failed to import rule book to database.');
    } finally {
        client.release();
    }
    
    revalidatePath('/dashboard/rule-books');
    return { success: true, requiresConfirmation: false, existingVersions: 0 };
}

export async function getRuleBooks(): Promise<RuleBook[]> {
    try {
        // This query fetches only the latest version for each rule book name
        const result = await db.query(`
            SELECT id, name, version_name, version, imported_at, row_count
            FROM (
                SELECT *,
                       ROW_NUMBER() OVER (PARTITION BY version_name ORDER BY version DESC) as rn
                FROM rule_books
            ) as ranked_books
            WHERE rn = 1
            ORDER BY imported_at DESC;
        `);
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            versionName: row.version_name,
            version: row.version,
            importedAt: new Date(row.imported_at),
            rowCount: row.row_count,
        }));
    } catch (error) {
        console.error('Failed to get rule books, table might not exist yet.', error);
        return [];
    }
}

export async function deleteRuleBook(ruleBookId: string, deleteAllVersions: boolean = false): Promise<void> {
    const client = await db.connect();
     try {
        await client.query('BEGIN');
        
        const bookRes = await client.query('SELECT version_name, version FROM rule_books WHERE id = $1', [ruleBookId]);
        if (bookRes.rows.length === 0) throw new Error('Rule book not found');
        const { version_name, version } = bookRes.rows[0];

        if (deleteAllVersions) {
            await client.query('DELETE FROM rule_books WHERE version_name = $1', [version_name]);
        } else {
            await client.query('DELETE FROM rule_books WHERE id = $1', [ruleBookId]);
        }
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error deleting rule book(s):`, error);
        throw new Error('Failed to delete rule book(s).');
    } finally {
        client.release();
    }
    revalidatePath('/dashboard/rule-books');
}


export async function getRuleBookDetails(ruleBookId: string): Promise<{ ruleBook: RuleBook, entries: RuleBookEntry[], referenceTables: ReferenceTable[], allVersions: {version: number, id: string}[] } | null> {
    const client = await db.connect();
    try {
        const ruleBookRes = await client.query('SELECT * FROM rule_books WHERE id = $1', [ruleBookId]);
        if (ruleBookRes.rows.length === 0) {
            return null;
        }

        const currentBook = ruleBookRes.rows[0];
        const { version_name } = currentBook;
        
        // Fetch all versions for the dropdown
        const allVersionsRes = await client.query('SELECT id, version FROM rule_books WHERE version_name = $1 ORDER BY version DESC', [version_name]);

        const entriesRes = await client.query('SELECT * FROM rule_book_entries WHERE rule_book_id = $1 ORDER BY id', [ruleBookId]);
        
        const refTablesRes = await client.query('SELECT * FROM reference_tables WHERE rule_book_id = $1', [ruleBookId]);

        return {
            ruleBook: {
                id: currentBook.id,
                name: currentBook.name,
                versionName: currentBook.version_name,
                version: currentBook.version,
                importedAt: new Date(currentBook.imported_at),
                rowCount: currentBook.row_count,
            },
            entries: entriesRes.rows.map(row => ({
                id: row.id,
                ruleBookId: row.rule_book_id,
                data: row.data,
            })),
            referenceTables: refTablesRes.rows.map(row => ({
                ...row,
                data: typeof row.data === 'string' ? JSON.parse(row.data) : [],
            })),
            allVersions: allVersionsRes.rows.map(row => ({ id: row.id, version: row.version })),
        };
    } catch (error) {
        console.error(`Error getting details for rule book with ID ${ruleBookId}:`, error);
        throw new Error('Failed to get rule book details.');
    } finally {
        client.release();
    }
}
