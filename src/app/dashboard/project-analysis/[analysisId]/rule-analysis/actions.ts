
'use server';

import { db } from '@/lib/db';
import { getRuleBookDetails, getRuleBooks } from '@/app/dashboard/rule-books/actions';
import { type RuleBookEntry, type ProjectAnalysis, type ReferenceTable } from '@/lib/types';
import { getProjectAnalysisDetails } from '@/app/dashboard/actions';
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

/**
 * Filter Logic Engine
 * Determines if a row from a rulebook should be included based on project criteria.
 */
function shouldIncludeEntry(entry: RuleBookEntry, context: { 
    lowerCaseNewUseWords: Set<string>, 
    lowerCaseFulfillability: string[], 
    projectEscapeLevel: number | null | undefined 
}) {
    const data = entry.data;
    const headers = Object.keys(data);

    // 1. Ausschliessen Check (Optional column)
    const ausschliessenVal = String(data['Ausschliessen'] || '').trim().toLowerCase();
    if (['yes', 'ja'].includes(ausschliessenVal)) return false;

    // 2. Fulfillability Check (Inherited from Logic 1)
    const erfullbarkeitValue = String(data['Erfüllbarkeit'] || '').trim().toLowerCase();
    let erfullbarkeitMatch = (erfullbarkeitValue === '' || erfullbarkeitValue === 'bitte auswaehlen');
    if (!erfullbarkeitMatch) {
        erfullbarkeitMatch = context.lowerCaseFulfillability.includes(erfullbarkeitValue);
    }
    if (!erfullbarkeitMatch) return false;

    // 3. Nutzung Check (Logic 2: checks all columns starting with "Nutzung")
    const nutzungHeaders = headers.filter(h => h.toLowerCase().startsWith('nutzung'));
    let nutzungMatch = false;
    
    if (nutzungHeaders.length === 0) {
        nutzungMatch = true; // No filter specified, treated as general
    } else {
        for (const h of nutzungHeaders) {
            const val = String(data[h] || '').trim();
            // If any nutzung column is empty or says "please select", it's a general rule for this row
            if (val === '' || val.toLowerCase() === 'bitte auswaehlen') {
                nutzungMatch = true;
                break;
            }
            // Keyword overlap logic
            const entryWords = new Set(val.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean));
            const matchingWords = [...entryWords].filter(word => context.lowerCaseNewUseWords.has(word));
            if (matchingWords.length >= 2 || (entryWords.size < 2 && matchingWords.length > 0)) {
                nutzungMatch = true;
                break;
            }
        }
    }
    if (!nutzungMatch) return false;

    // 4. Fluchtniveau Check (Logic 2)
    // Only apply if the column exists in the rulebook
    const hasFluchtniveauCol = headers.some(h => h === 'Fluchtniveau');
    if (hasFluchtniveauCol) {
        const fnVal = String(data['Fluchtniveau'] || '').trim().toLowerCase();
        const level = context.projectEscapeLevel;
        
        // Blank cells in this column are treated as Null (always match)
        if (fnVal !== '' && fnVal !== 'bitte auswaehlen') {
            // If the rule specifies a range but the project has no level, we exclude it
            if (level === null || level === undefined) {
                return false;
            }
            
            if (fnVal === 'unter 22') {
                if (level >= 22) return false;
            } else if (fnVal === '22 bis 32') {
                if (level < 22 || level >= 32) return false;
            } else if (fnVal === 'ueber 22') {
                if (level < 22) return false;
            } else if (fnVal === 'ueber 32') {
                if (level < 32) return false;
            }
        }
    }

    return true;
}

export async function getFilteredRuleBooks(params: GetFilteredRuleBooksParams) {
    const { projectAnalysisId, newUse: newUseParam, fulfillability: fulfillabilityParam } = params;
    
    const analysisDetails = await getProjectAnalysisDetails(projectAnalysisId);
    if (!analysisDetails) {
        throw new Error('Analysis details not found');
    }

    const newUseArray = cleanUpArrayField(newUseParam || analysisDetails.analysis.newUse);
    const fulfillabilityArray = cleanUpArrayField(fulfillabilityParam || analysisDetails.analysis.fulfillability);
    const projectEscapeLevel = analysisDetails.project.escapeLevel;

    if (newUseArray.length === 0 || fulfillabilityArray.length === 0) {
        return [];
    }
    
    const germanNewUses = newUseArray.map(use => getGermanTranslation(use));
    const lowerCaseNewUseWords = new Set(germanNewUses.flatMap(use => use.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean)));

    const germanFulfillability = fulfillabilityArray.map(f => getGermanTranslation(f));
    const lowerCaseFulfillability = germanFulfillability.map(f => f.toLowerCase());

    const filterContext = {
        lowerCaseNewUseWords,
        lowerCaseFulfillability,
        projectEscapeLevel
    };

    // Always fetch the latest versions of all rule books
    const allRuleBooks = await getRuleBooks();
    const filteredRuleBooksData = [];

    for (const book of allRuleBooks) {
        const details = await getRuleBookDetails(book.id);
        if (!details) continue;

        const filteredEntries = details.entries.filter(entry => shouldIncludeEntry(entry, filterContext));

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
        const orderedSegmentKeys: string[] = [];
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
                orderedSegmentKeys.push(finalSegmentKey);
            }
            acc[finalSegmentKey].push(entry);
            
            return acc;
        }, {} as Record<string, RuleBookEntry[]>);

        const segmentStats = orderedSegmentKeys.map(key => {
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
                firstRowText: segmentEntries.find(e => e.data['Spaltentyp'] === 'Abschnitt')?.data['Text'] || segmentEntries[0]?.data['Text'] || '',
            };
        });

        // Always show the 1st section box.
        // Additionally show Sections where at least 1 parameter is available.
        const displayedSegments = segmentStats.filter((s, index) => index === 0 || s.totalParameters > 0);

        const totalParameterRows = entries.filter(e => e.data['Spaltentyp'] === 'Parameter').length;

        return {
            ruleBook,
            segments: displayedSegments,
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
    const projectEscapeLevel = analysisDetails.project.escapeLevel;

    if (newUseArray.length === 0 || fulfillabilityArray.length === 0) throw new Error('Analysis criteria not set.');

    const germanNewUses = newUseArray.map(use => getGermanTranslation(use));
    const lowerCaseNewUseWords = new Set(germanNewUses.flatMap(use => use.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean)));
    
    const germanFulfillability = fulfillabilityArray.map(f => getGermanTranslation(f));
    const lowerCaseFulfillability = germanFulfillability.map(f => f.toLowerCase());

    const filterContext = {
        lowerCaseNewUseWords,
        lowerCaseFulfillability,
        projectEscapeLevel
    };

    // First, filter all entries from the rulebook based on the context
    const filteredEntries = ruleBookDetails.entries.filter(entry => shouldIncludeEntry(entry, filterContext));

    // Then, extract only those that belong to the requested segment
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
    segmentKey: string;
    checklistStatus: string;
    revisedFulfillability: string | null;
}

export async function saveAnalysisResult(payload: SaveAnalysisResultPayload) {
    const { projectAnalysisId, ruleBookId, ruleBookEntryId, segmentKey, checklistStatus, revisedFulfillability } = payload;
    
    const ruleBookDetails = await getRuleBookDetails(ruleBookId);
    if (!ruleBookDetails) throw new Error("Could not find rulebook details to save context.");

    const targetEntry = ruleBookDetails.entries.find(e => e.id === ruleBookEntryId);
    if (!targetEntry) throw new Error("Could not find the specific rule book entry.");
    
    // Correctly find the topic for the given segmentKey
    const sectionHeaderEntry = ruleBookDetails.entries.find(e => {
        const gliederung = String(e.data['Gliederung'] || '');
        // Find the first entry that IS a section header and whose Gliederung matches the segmentKey.
        return e.data['Spaltentyp'] === 'Abschnitt' && gliederung.trim() === segmentKey;
    });

    const topic = sectionHeaderEntry ? String(sectionHeaderEntry.data['Text'] || 'General') : 'General';
    
    const structure = (targetEntry.data['Gliederung'] as string) || '';
    const text = (targetEntry.data['Text'] as string) || '';
    
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const existingResult = await client.query('SELECT id FROM rule_analysis_results WHERE project_analysis_id = $1 AND rule_book_entry_id = $2', [projectAnalysisId, ruleBookEntryId]);
        
        const dataToSave = {
            checklist_status: checklistStatus,
            revised_fulfillability: revisedFulfillability,
            rule_book_name: ruleBookDetails.ruleBook.versionName,
            section_key: segmentKey,
            topic: topic,
            structure: structure,
            text: text,
            rule_book_id: ruleBookId
        };
        
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
                [dataToSave.checklist_status, dataToSave.revised_fulfillability, dataToSave.rule_book_name, dataToSave.section_key, dataToSave.topic, dataToSave.structure, dataToSave.text, dataToSave.rule_book_id, existingResult.rows[0].id]
            );
        } else {
            // Insert
            const newId = `rar-${Date.now()}-${Math.random()}`;
            await client.query(
                `INSERT INTO rule_analysis_results 
                    (id, project_analysis_id, rule_book_entry_id, checklist_status, revised_fulfillability, rule_book_name, section_key, topic, structure, text, rule_book_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [newId, projectAnalysisId, ruleBookEntryId, dataToSave.checklist_status, dataToSave.revised_fulfillability, dataToSave.rule_book_name, dataToSave.section_key, dataToSave.topic, dataToSave.structure, dataToSave.text, dataToSave.rule_book_id]
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
