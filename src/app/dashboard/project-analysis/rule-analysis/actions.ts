
'use server';

import { db } from '@/lib/db';
import { getRuleBookDetails, getRuleBooks } from '../../rule-books/actions';
import { type RuleBookEntry, type ProjectAnalysis, type ReferenceTable } from '@/lib/types';
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
    
    const germanNewUse = newUse;
    const lowerFulfillabilityOptions = fulfillability.map(f => f.toLowerCase());
    const newUseWords = new Set(germanNewUse.toLowerCase().replace(/[,;]/g, '').split(' ').filter(Boolean));

    const allRuleBooks = await getRuleBooks();
    const filteredRuleBooksData = [];

    for (const book of allRuleBooks) {
        const details = await getRuleBookDetails(book.id);
        if (!details) continue;

        const filteredEntries = details.entries.filter(entry => {
            const nutzung = (entry.data['Nutzung'] || '').trim();
            const erfullbarkeit = (entry.data['Erfüllbarkeit'] || '').trim();

            // Handle Nutzung (Usage) match
            let nutzungMatch = false;
            if (nutzung === '' || nutzung === 'Bitte auswaehlen') {
                nutzungMatch = true;
            } else {
                const entryNutzungWords = new Set(nutzung.toLowerCase().replace(/[,;]/g, '').split(' ').filter(Boolean));
                if (entryNutzungWords.size > 0) {
                    const matchingWords = [...entryNutzungWords].filter(word => newUseWords.has(word));
                    if (matchingWords.length >= 2 || (entryNutzungWords.size < 2 && matchingWords.length > 0)) {
                        nutzungMatch = true;
                    }
                }
            }
            
            // Handle Erfüllbarkeit (Fulfillability) match (case-insensitive)
            let erfullbarkeitMatch = false;
            const lowerErfullbarkeitValue = erfullbarkeit.toLowerCase();
            if (lowerErfullbarkeitValue === '' || lowerErfullbarkeitValue === 'bitte auswaehlen') {
                erfullbarkeitMatch = true;
            } else if (lowerFulfillabilityOptions.includes(lowerErfullbarkeitValue)) {
                erfullbarkeitMatch = true;
            }
            
            return nutzungMatch && erfullbarkeitMatch;
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
    
    // Match the first number sequence at the start of the string
    const match = gliederung.trim().match(/^\d+/);
    if (match) {
        return match[0];
    }

    // Handle cases like '§ 123'
    const paragraphMatch = gliederung.trim().match(/^§\s*(\d+)/);
    if (paragraphMatch && paragraphMatch[1]) {
        return paragraphMatch[1];
    }
    
    return null;
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
                // If there's no segment key for this row, use the last valid one.
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
            const completedCount = segmentEntries.filter(e => {
                const analysis = resultsMap.get(e.id);
                // An entry is "complete" if it's not a parameter type, or if it is and has a status.
                return e.data['Spaltentyp'] !== 'Parameter' || (analysis && analysis.checklistStatus);
            }).length;

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
            totalCompleted: segmentStats.reduce((sum, s) => sum + s.completed, 0)
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

    const germanNewUse = analysisDetails.analysis.newUse || '';
    const lowerFulfillabilityOptions = (analysisDetails.analysis.fulfillability || []).map(f => f.toLowerCase());
    const newUseWords = new Set(germanNewUse.toLowerCase().replace(/[,;]/g, '').split(' ').filter(Boolean));

    // First, filter based on New Use and Fulfillability
    const filteredEntries = ruleBookDetails.entries.filter(entry => {
        const nutzung = (entry.data['Nutzung'] || '').trim();
        const erfullbarkeit = (entry.data['Erfüllbarkeit'] || '').trim();
        
        // Handle Nutzung (Usage) match
        let nutzungMatch = false;
        if (nutzung === '' || nutzung === 'Bitte auswaehlen') {
            nutzungMatch = true;
        } else {
            const entryNutzungWords = new Set(nutzung.toLowerCase().replace(/[,;]/g, '').split(' ').filter(Boolean));
            if (entryNutzungWords.size > 0) {
                const matchingWords = [...entryNutzungWords].filter(word => newUseWords.has(word));
                if (matchingWords.length >= 2 || (entryNutzungWords.size < 2 && matchingWords.length > 0)) {
                    nutzungMatch = true;
                }
            }
        }
        
        // Handle Erfüllbarkeit (Fulfillability) match (case-insensitive)
        let erfullbarkeitMatch = false;
        const lowerErfullbarkeitValue = erfullbarkeit.toLowerCase();
        if (lowerErfullbarkeitValue === '' || lowerErfullbarkeitValue === 'bitte auswaehlen') {
            erfullbarkeitMatch = true;
        } else if (lowerFulfillabilityOptions.includes(lowerErfullbarkeitValue)) {
            erfullbarkeitMatch = true;
        }
        
        return nutzungMatch && erfullbarkeitMatch;
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

export async function deleteAnalysisResults(projectAnalysisId: string) {
    await db.query('DELETE FROM rule_analysis_results WHERE project_analysis_id = $1', [projectAnalysisId]);
}
