
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


export async function getRuleBookDetails(ruleBookId: string): Promise<{ ruleBook: RuleBook, entries: RuleBookEntry[], referenceTables: ReferenceTable[] } | null> {
    const client = await db.connect();
    try {
        const ruleBookRes = await client.query('SELECT * FROM rule_books WHERE id = $1', [ruleBookId]);
        if (ruleBookRes.rows.length === 0) {
            return null;
        }

        const entriesRes = await client.query(`
            SELECT 
                rbe.*,
                (SELECT translated_data FROM rule_book_entry_translations WHERE rule_book_entry_id = rbe.id AND language = 'en') as translation
            FROM rule_book_entries rbe 
            WHERE rbe.rule_book_id = $1
        `, [ruleBookId]);
        
        const refTablesRes = await client.query('SELECT * FROM reference_tables WHERE rule_book_id = $1', [ruleBookId]);

        return {
            ruleBook: {
                id: ruleBookRes.rows[0].id,
                name: ruleBookRes.rows[0].name,
                importedAt: new Date(ruleBookRes.rows[0].imported_at),
                rowCount: ruleBookRes.rows[0].row_count,
            },
            entries: entriesRes.rows.map(row => ({
                id: row.id,
                ruleBookId: row.rule_book_id,
                data: row.data,
                translation: row.translation || null,
            })),
            referenceTables: refTablesRes.rows.map(row => ({
                ...row,
                data: row.data
            })),
        };
    } catch (error) {
        console.error(`Error getting details for rule book with ID ${ruleBookId}:`, error);
        throw new Error('Failed to get rule book details.');
    } finally {
        client.release();
    }
}
