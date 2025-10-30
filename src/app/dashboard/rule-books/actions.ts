'use server';

import { db } from '@/lib/db';
import { type RuleBook, type RuleBookEntry, type ReferenceTable } from '@/lib/types';
import { revalidatePath } from 'next/cache';

type AddRuleBookPayload = {
    name: string;
    entries: Omit<RuleBookEntry, 'id' | 'ruleBookId'>[];
    referenceTables: Record<string, any[]>;
}

export async function addRuleBook(payload: AddRuleBookPayload): Promise<void> {
    const { name, entries, referenceTables } = payload;
    const client = await db.connect();

    try {
        await client.query('BEGIN');
        
        const ruleBookId = `rb-${Date.now()}`;
        
        // Insert the rule book metadata
        await client.query(
            `INSERT INTO rule_books (id, name, imported_at, row_count) VALUES ($1, $2, NOW(), $3)`,
            [ruleBookId, name, entries.length]
        );

        // Insert the main entries
        for (const entry of entries) {
            const entryId = `rbe-${Date.now()}-${Math.random()}`;
            await client.query(
                `INSERT INTO rule_book_entries (id, rule_book_id, data) VALUES ($1, $2, $3)`,
                [entryId, ruleBookId, entry.data]
            );
        }

        // Insert the reference tables
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
}


export async function getRuleBooks(): Promise<RuleBook[]> {
    try {
        const result = await db.query('SELECT id, name, imported_at, row_count FROM rule_books ORDER BY imported_at DESC');
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            importedAt: new Date(row.imported_at),
            rowCount: row.row_count,
        }));
    } catch (error) {
        console.error('Failed to get rule books, table might not exist yet.', error);
        return [];
    }
}

export async function deleteRuleBook(ruleBookId: string): Promise<void> {
    const client = await db.connect();
     try {
        await client.query('BEGIN');
        // cascade delete will handle entries and tables
        await client.query('DELETE FROM rule_books WHERE id = $1', [ruleBookId]);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error deleting rule book with ID ${ruleBookId}:`, error);
        throw new Error('Failed to delete rule book.');
    } finally {
        client.release();
    }
    revalidatePath('/dashboard/rule-books');
}
