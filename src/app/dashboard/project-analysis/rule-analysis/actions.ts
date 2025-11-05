
'use server';

import { db } from '@/lib/db';
import { getRuleBookDetails, getRuleBooks } from '../../rule-books/actions';
import { type RuleBookEntry } from '@/lib/types';
import { getProjectAnalysisDetails } from '../../actions';

type RuleAnalysisResult = {
    id: string;
    projectAnalysisId: string;
    ruleBookEntryId: string;
    checklistStatus: string;
    revisedFulfillability: string | null;
}

export async function getFilteredRuleBooks(projectAnalysisId: string) {
    const analysisDetails = await getProjectAnalysisDetails(projectAnalysisId);
    if (!analysisDetails) {
        throw new Error('Analysis details not found');
    }

    const { newUse, fulfillability } = analysisDetails.analysis;

    if (!newUse || !fulfillability || fulfillability.length === 0) {
        return [];
    }

    const allRuleBooks = await getRuleBooks();
    const filteredRuleBooksData = [];

    for (const book of allRuleBooks) {
        const details = await getRuleBookDetails(book.id);
        if (!details) continue;

        const filteredEntries = details.entries.filter(entry => {
            const nutzung = entry.data['Nutzung'] || '';
            const erfullbarkeit = entry.data['Erfüllbarkeit'] || '';

            const nutzungMatch = nutzung === newUse || nutzung === '' || nutzung === 'Bitte auswaehlen';
            if (!nutzungMatch) return false;

            const erfullbarkeitMatch = fulfillability.includes(erfullbarkeit) || erfullbarkeit === '';
            return erfullbarkeitMatch;
        });

        if (filteredEntries.length > 0) {
            filteredRuleBooksData.push({
                ruleBook: book,
                entries: filteredEntries,
            });
        }
    }
    return filteredRuleBooksData;
}


const getSegmentKey = (gliederung: string): string | null => {
    if (!gliederung || typeof gliederung !== 'string') return null;
    const match = gliederung.match(/^\d+/);
    return match ? match[0] : null;
};

export async function getSegmentedRuleBookData(projectAnalysisId: string) {
    const filteredData = await getFilteredRuleBooks(projectAnalysisId);
    const analysisResults = await getAnalysisResults(projectAnalysisId);

    const resultsMap = new Map<string, RuleAnalysisResult>();
    analysisResults.forEach(r => resultsMap.set(r.ruleBookEntryId, r));

    return filteredData.map(({ ruleBook, entries }) => {
        let lastSegmentKey: string | null = null;
        const segments = entries.reduce((acc, entry) => {
            const gliederung = String(entry.data['Gliederung'] || '');
            let currentSegmentKey = getSegmentKey(gliederung);
            
            if (currentSegmentKey) {
                lastSegmentKey = currentSegmentKey;
            } else {
                currentSegmentKey = lastSegmentKey;
            }

            if (currentSegmentKey) {
                if (!acc[currentSegmentKey]) {
                    acc[currentSegmentKey] = [];
                }
                acc[currentSegmentKey].push(entry);
            }
            
            return acc;
        }, {} as Record<string, RuleBookEntry[]>);

        const segmentStats = Object.keys(segments).map(key => {
            const segmentEntries = segments[key];
            const completedCount = segmentEntries.filter(e => resultsMap.has(e.id)).length;
            return {
                key,
                total: segmentEntries.length,
                completed: completedCount,
            };
        });

        return {
            ruleBook,
            segments: segmentStats,
            totalEntries: entries.length,
            totalCompleted: analysisResults.filter(r => entries.some(e => e.id === r.ruleBookEntryId)).length
        };
    });
}

export async function getAnalysisResults(projectAnalysisId: string): Promise<RuleAnalysisResult[]> {
    const res = await db.query('SELECT * FROM rule_analysis_results WHERE project_analysis_id = $1', [projectAnalysisId]);
    return res.rows;
}

export async function getSegmentDetails({ projectAnalysisId, ruleBookId, segmentKey }: { projectAnalysisId: string, ruleBookId: string, segmentKey: string }) {
    const analysisDetails = await getProjectAnalysisDetails(projectAnalysisId);
    if (!analysisDetails) throw new Error('Analysis details not found');
    
    const ruleBookDetails = await getRuleBookDetails(ruleBookId);
    if (!ruleBookDetails) throw new Error('Rule book details not found');

    // First, filter based on New Use and Fulfillability
    const filteredEntries = ruleBookDetails.entries.filter(entry => {
        const nutzung = entry.data['Nutzung'] || '';
        const erfullbarkeit = entry.data['Erfüllbarkeit'] || '';
        const nutzungMatch = nutzung === analysisDetails.analysis.newUse || nutzung === '' || nutzung === 'Bitte auswaehlen';
        if (!nutzungMatch) return false;
        const erfullbarkeitMatch = analysisDetails.analysis.fulfillability?.includes(erfullbarkeit) || erfullbarkeit === '';
        return erfullbarkeitMatch;
    });

    // Then, get all entries for the requested segment
    const segmentEntries: RuleBookEntry[] = [];
    let lastSegmentKey: string | null = null;
    for (const entry of filteredEntries) {
        const gliederung = String(entry.data['Gliederung'] || '');
        let currentSegmentKey = getSegmentKey(gliederung);

        if (currentSegmentKey) {
            lastSegmentKey = currentSegmentKey;
        } else {
            currentSegmentKey = lastSegmentKey;
        }

        if (currentSegmentKey === segmentKey) {
            segmentEntries.push(entry);
        }
    }
    
    const analysisResults = await getAnalysisResults(projectAnalysisId);
    const resultsMap = new Map<string, RuleAnalysisResult>();
    analysisResults.forEach(r => resultsMap.set(r.ruleBookEntryId, r));

    return {
        projectAnalysis: analysisDetails.analysis,
        ruleBook: ruleBookDetails.ruleBook,
        segmentKey,
        entries: segmentEntries.map(entry => ({
            ...entry,
            analysis: resultsMap.get(entry.id)
        }))
    };
}

export async function saveAnalysisResult({ projectAnalysisId, ruleBookEntryId, checklistStatus, revisedFulfillability }: Omit<RuleAnalysisResult, 'id'>) {
    const existingResult = await db.query('SELECT id FROM rule_analysis_results WHERE project_analysis_id = $1 AND rule_book_entry_id = $2', [projectAnalysisId, ruleBookEntryId]);
    
    if (existingResult.rows.length > 0) {
        // Update
        await db.query(
            'UPDATE rule_analysis_results SET checklist_status = $1, revised_fulfillability = $2, last_updated = NOW() WHERE id = $3',
            [checklistStatus, revisedFulfillability, existingResult.rows[0].id]
        );
    } else {
        // Insert
        const newId = `rar-${Date.now()}-${Math.random()}`;
        await db.query(
            'INSERT INTO rule_analysis_results (id, project_analysis_id, rule_book_entry_id, checklist_status, revised_fulfillability) VALUES ($1, $2, $3, $4, $5)',
            [newId, projectAnalysisId, ruleBookEntryId, checklistStatus, revisedFulfillability]
        );
    }
}
