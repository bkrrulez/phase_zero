
'use server';

import { db } from '@/lib/db';
import { getRuleBookDetails, getRuleBooks } from '../../rule-books/actions';
import { type RuleBookEntry, type ProjectAnalysis, type ReferenceTable } from '@/lib/types';
import { getProjectAnalysisDetails } from '../../actions';
import de from '@/locales/de.json';
import en from '@/locales/en.json';

const locales: Record<string, Record<string, string>> = { de, en };

const getGermanTranslation = (key: string, fromLocale: 'en' | 'de' = 'en'): string => {
    if (fromLocale === 'de' || !key) return key;

    const germanKey = Object.keys(locales.de).find(k => locales.en[k as keyof typeof en] === key);
    if (germanKey && locales.de[germanKey as keyof typeof de]) {
        return locales.de[germanKey as keyof typeof de];
    }
    
    const deTranslation = (locales.de as any)[key];
    if (deTranslation) {
        return deTranslation;
    }
    
    return key;
};

// Helper function to clean up corrupted array data from the database
const cleanUpArrayField = (field: any): string[] => {
    if (Array.isArray(field)) {
        // If it's a clean array of strings, just return it.
        if (field.every(item => typeof item === 'string')) {
            return field;
        }
    }
    if (typeof field === 'string') {
        // Handle PostgreSQL array literal format, e.g., '{"Value1","Value2"}'
        if (field.startsWith('{') && field.endsWith('}')) {
            return field.substring(1, field.length - 1).split(',').map(item => item.replace(/"/g, '').trim());
        }
        // Handle simple comma-separated string
        return field.split(',').map(item => item.trim());
    }
    return [];
};

type RuleAnalysisResult = {
    id: string;
    projectAnalysisId: string;
    ruleBookEntryId: string;
    checklistStatus: string;
    revisedFulfillability: string | null;
}

type GetFilteredRuleBooksParams = {
    projectAnalysisId: string;
    newUse?: string[];
    fulfillability?: string[];
}

export async function getFilteredRuleBooks(params: GetFilteredRuleBooksParams) {
    const { projectAnalysisId, newUse: newUseParam, fulfillability: fulfillabilityParam } = params;
    
    let analysisNewUse: string[] | null | undefined = newUseParam;
    let analysisFulfillability: string[] | null | undefined = fulfillabilityParam;

    // If newUse or fulfillability are not passed directly, fetch them.
    if (!analysisNewUse || !analysisFulfillability) {
        const analysisDetails = await getProjectAnalysisDetails(projectAnalysisId);
        if (!analysisDetails) {
            throw new Error('Analysis details not found');
        }
        analysisNewUse = analysisDetails.analysis.newUse;
        analysisFulfillability = analysisDetails.analysis.fulfillability;
    }

    const newUseArray = cleanUpArrayField(analysisNewUse);
    const fulfillabilityArray = cleanUpArrayField(analysisFulfillability);

    if (newUseArray.length === 0 || !fulfillabilityArray || fulfillabilityArray.length === 0) {
        return [];
    }
    
    const germanNewUses = newUseArray.map(use => getGermanTranslation(use));
    const lowerCaseNewUseWords = new Set(germanNewUses.flatMap(use => use.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean)));

    const germanFulfillability = fulfillabilityArray.map(f => getGermanTranslation(f));
    const lowerCaseFulfillability = germanFulfillability.map(f => f.toLowerCase());


    // Always fetch the latest versions of all rule books
    const allRuleBooks = await getRuleBooks();
    const filteredRuleBooksData = [];

    for (const book of allRuleBooks) {
        const details = await getRuleBookDetails(book.id);
        if (!details) continue;

        const filteredEntries = details.entries.filter(entry => {
            const nutzungValue = (entry.data['Nutzung'] || '').trim();
            const erfullbarkeitValue = (entry.data['Erfüllbarkeit'] || '').trim().toLowerCase();

            // --- Fulfillability Check ---
            let erfullbarkeitMatch = false;
            if (erfullbarkeitValue === '' || erfullbarkeitValue === 'bitte auswaehlen') {
                erfullbarkeitMatch = true;
            } else if (lowerCaseFulfillability.includes(erfullbarkeitValue)) {
                erfullbarkeitMatch = true;
            }
            
            // --- Usage Check ---
            let nutzungMatch = false;
            if (nutzungValue === '' || nutzungValue.toLowerCase() === 'bitte auswaehlen') {
                nutzungMatch = true;
            } else {
                const entryNutzungWords = new Set(nutzungValue.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean));
                if (entryNutzungWords.size > 0) {
                    const matchingWords = [...entryNutzungWords].filter(word => lowerCaseNewUseWords.has(word));
                    if (matchingWords.length >= 2 || (entryNutzungWords.size < 2 && matchingWords.length > 0)) {
                        nutzungMatch = true;
                    }
                }
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
    const filteredData = await getFilteredRuleBooks({ projectAnalysisId });
    const analysisResults = await getAnalysisResults(projectAnalysisId);

    // Sort the filtered data by rulebook name alphabetically
    filteredData.sort((a, b) => a.ruleBook.versionName.localeCompare(b.ruleBook.versionName));

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

            // Fallback for entries that still don't have a section key
            const finalSegmentKey = currentSegmentKey || '0';
            
            if (!acc[finalSegmentKey]) {
                acc[finalSegmentKey] = [];
            }
            acc[finalSegmentKey].push(entry);
            
            return acc;
        }, {} as Record<string, RuleBookEntry[]>);

        const segmentStats = Object.keys(segments).map(key => {
            const segmentEntries = segments[key];
            const parameterEntries = segmentEntries.filter(e => e.data['Spaltentyp'] === 'Parameter');
            
            const completedCount = parameterEntries.filter(e => {
                const analysis = resultsMap.get(e.id);
                if (!analysis || !analysis.checklistStatus) {
                    return false; // Not started
                }
                 if (['Not Fulfilled', 'Not verifiable'].includes(analysis.checklistStatus)) {
                    // If it requires fulfillability, it must have a value.
                    return !!analysis.revisedFulfillability;
                }
                // For other statuses, just having the status is enough.
                return true;
            }).length;

            return {
                key,
                totalRows: segmentEntries.length,
                totalParameters: parameterEntries.length,
                completedParameters: completedCount,
                firstRowText: segmentEntries[0]?.data['Text'] || '',
            };
        });

        const totalParameterRows = entries.filter(e => e.data['Spaltentyp'] === 'Parameter').length;

        return {
            ruleBook,
            segments: segmentStats,
            totalRows: entries.length,
            totalParameters: totalParameterRows,
            totalCompleted: segmentStats.reduce((sum, s) => sum + s.completedParameters, 0)
        };
    });
}

export async function getOrderedSegments(projectAnalysisId: string): Promise<{ ruleBookId: string; segmentKey: string; }[]> {
    const segmentedData = await getSegmentedRuleBookData(projectAnalysisId);
    const orderedSegments: { ruleBookId: string; segmentKey: string; }[] = [];

    for (const ruleBookData of segmentedData) {
        for (const segment of ruleBookData.segments) {
            orderedSegments.push({
                ruleBookId: ruleBookData.ruleBook.id,
                segmentKey: segment.key,
            });
        }
    }

    return orderedSegments;
}


export async function getAnalysisResults(projectAnalysisId: string): Promise<RuleAnalysisResult[]> {
    const res = await db.query('SELECT * FROM rule_analysis_results WHERE project_analysis_id = $1', [projectAnalysisId]);
    return res.rows.map(row => ({
        id: row.id,
        projectAnalysisId: row.project_analysis_id,
        ruleBookEntryId: row.rule_book_entry_id,
        checklistStatus: row.checklist_status,
        revisedFulfillability: row.revised_fulfillability,
    }));
}

export async function getSegmentDetails({ projectAnalysisId, ruleBookId, segmentKey }: { projectAnalysisId: string, ruleBookId: string, segmentKey: string }) {
    const analysisDetails = await getProjectAnalysisDetails(projectAnalysisId);
    if (!analysisDetails) throw new Error('Analysis details not found');
    
    const ruleBookDetails = await getRuleBookDetails(ruleBookId);
    if (!ruleBookDetails) throw new Error('Rule book details not found');

    const { newUse, fulfillability } = analysisDetails.analysis;
    const newUseArray = cleanUpArrayField(newUse);
    const fulfillabilityArray = cleanUpArrayField(fulfillability);

    if (newUseArray.length === 0 || !fulfillabilityArray) throw new Error('Analysis criteria not set.');

    const germanNewUses = newUseArray.map(use => getGermanTranslation(use));
    const lowerCaseNewUseWords = new Set(germanNewUses.flatMap(use => use.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean)));
    
    const germanFulfillability = fulfillabilityArray.map(f => getGermanTranslation(f));
    const lowerCaseFulfillability = germanFulfillability.map(f => f.toLowerCase());


    // First, filter based on New Use and Fulfillability
    const filteredEntries = ruleBookDetails.entries.filter(entry => {
        const nutzungValue = (entry.data['Nutzung'] || '').trim();
        const erfullbarkeitValue = (entry.data['Erfüllbarkeit'] || '').trim().toLowerCase();

        // --- Fulfillability Check ---
        let erfullbarkeitMatch = false;
        if (erfullbarkeitValue === '' || erfullbarkeitValue === 'bitte auswaehlen') {
            erfullbarkeitMatch = true;
        } else if (lowerCaseFulfillability.includes(erfullbarkeitValue)) {
            erfullbarkeitMatch = true;
        }
        
        // --- Usage Check ---
        let nutzungMatch = false;
        if (nutzungValue === '' || nutzungValue.toLowerCase() === 'bitte auswaehlen') {
            nutzungMatch = true;
        } else {
            const entryNutzungWords = new Set(nutzungValue.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean));
            if (entryNutzungWords.size > 0) {
                const matchingWords = [...entryNutzungWords].filter(word => lowerCaseNewUseWords.has(word));
                if (matchingWords.length >= 2 || (entryNutzungWords.size < 2 && matchingWords.length > 0)) {
                    nutzungMatch = true;
                }
            }
        }
        
        return nutzungMatch && erfullbarkeitMatch;
    });

    // Then, get all entries for the requested section
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
        
        const finalSegmentKey = currentSegmentKey || '0';

        if (finalSegmentKey === segmentKey) {
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
        })),
        referenceTables: ruleBookDetails.referenceTables || []
    };
}

interface SaveAnalysisResultPayload {
    projectAnalysisId: string;
    ruleBookId: string;
    ruleBookEntryId: string;
    checklistStatus: string;
    revisedFulfillability: string | null;
}

export async function saveAnalysisResult(payload: SaveAnalysisResultPayload) {
    const { projectAnalysisId, ruleBookId, ruleBookEntryId, checklistStatus, revisedFulfillability } = payload;
    
    // This action now requires full context to save a snapshot
    const ruleBookDetails = await getRuleBookDetails(ruleBookId);
    if (!ruleBookDetails) throw new Error("Could not find rulebook details to save context.");

    let sectionKey = '0';
    let topic = 'General';
    let structure = '';
    let text = '';
    
    let lastValidSegmentKey = '0';
    let lastValidTopic = 'General';

    for (const entry of ruleBookDetails.entries) {
        const currentGliederung = entry.data['Gliederung'] as string;
        
        if (entry.data['Spaltentyp'] === 'Abschnitt' && currentGliederung) {
            const currentSegmentKey = getSegmentKey(currentGliederung);
            if(currentSegmentKey) {
                lastValidSegmentKey = currentSegmentKey;
                lastValidTopic = entry.data['Text'] as string || '';
            }
        }
        
        if (entry.id === ruleBookEntryId) {
            sectionKey = lastValidSegmentKey;
            topic = lastValidTopic;
            structure = currentGliederung;
            text = entry.data['Text'] as string;
            break; 
        }
    }
    
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const existingResult = await client.query('SELECT id FROM rule_analysis_results WHERE project_analysis_id = $1 AND rule_book_entry_id = $2', [projectAnalysisId, ruleBookEntryId]);
        
        if (existingResult.rows.length > 0) {
            // Update
            await client.query(
                `UPDATE rule_analysis_results 
                 SET 
                    checklist_status = $1, 
                    revised_fulfillability = $2,
                    rule_book_name = $3,
                    section_key = $4,
                    topic = $5,
                    structure = $6,
                    text = $7,
                    rule_book_id = $8
                 WHERE id = $9`,
                [checklistStatus, revisedFulfillability, ruleBookDetails.ruleBook.versionName, sectionKey, topic, structure, text, ruleBookId, existingResult.rows[0].id]
            );
        } else {
            // Insert
            const newId = `rar-${Date.now()}-${Math.random()}`;
            await client.query(
                `INSERT INTO rule_analysis_results 
                    (id, project_analysis_id, rule_book_entry_id, checklist_status, revised_fulfillability, rule_book_name, section_key, topic, structure, text, rule_book_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [newId, projectAnalysisId, ruleBookEntryId, checklistStatus, revisedFulfillability, ruleBookDetails.ruleBook.versionName, sectionKey, topic, structure, text, ruleBookId]
            );
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving analysis result:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function deleteAnalysisResults(projectAnalysisId: string) {
    await db.query('DELETE FROM rule_analysis_results WHERE project_analysis_id = $1', [projectAnalysisId]);
}
