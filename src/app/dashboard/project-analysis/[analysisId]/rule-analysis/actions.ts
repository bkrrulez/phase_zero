'use server';

import { db } from '@/lib/db';
import { getRuleBookDetails, getRuleBooks } from '@/app/dashboard/rule-books/actions';
import { type RuleBook, type RuleBookEntry, type ProjectAnalysis, type ReferenceTable } from '@/lib/types';
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
        if (field.every(item => typeof item === 'string')) {
            return field;
        }
    }
    if (typeof field === 'string') {
        if (field.startsWith('{') && field.endsWith('}')) {
            return field.substring(1, field.length - 1).split(',').map(item => item.replace(/"/g, '').trim());
        }
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

const isParameter = (entry: RuleBookEntry) => {
    const val = String(entry.data['Spaltentyp'] || '').trim().toLowerCase();
    return val === 'parameter';
};

const isSectionMarker = (entry: RuleBookEntry) => {
    const val = String(entry.data['Spaltentyp'] || '').trim().toLowerCase();
    return val === 'section';
};

/**
 * Helper to reduce consecutive rows typed as 'header' to only the last one in the sequence.
 */
function reduceConsecutiveHeaders(entries: RuleBookEntry[]) {
    const result = [];
    for (let i = 0; i < entries.length; i++) {
        const current = entries[i];
        const currentType = String(current.data['Spaltentyp'] || '').trim().toLowerCase();
        
        if (currentType === 'header') {
            // Look ahead to see if the next row is also a header
            if (i < entries.length - 1) {
                const next = entries[i + 1];
                const nextType = String(next.data['Spaltentyp'] || '').trim().toLowerCase();
                if (nextType === 'header') {
                    // Skip this header, as it's not the last in a consecutive group
                    continue;
                }
            }
        }
        result.push(current);
    }
    return result;
}

/**
 * Filter Logic Engine (Logic 2)
 */
function shouldIncludeEntry(entry: RuleBookEntry, context: { 
    lowerCaseNewUseWords: Set<string>, 
    lowerCaseFulfillability: string[], 
    projectEscapeLevel: number | null | undefined 
}) {
    const data = entry.data;
    const headers = Object.keys(data);

    // 1. Ausschliessen Check
    const ausschliessenHeader = headers.find(h => h.trim().toLowerCase() === 'ausschliessen');
    if (ausschliessenHeader) {
        const val = String(data[ausschliessenHeader] || '').trim().toLowerCase();
        if (['yes', 'ja'].includes(val)) return false;
    }

    // 2. Erfüllbarkeit Check
    const erfullbarkeitHeader = headers.find(h => h.trim() === 'Erfüllbarkeit');
    if (erfullbarkeitHeader) {
        const val = String(data[erfullbarkeitHeader] || '').trim().toLowerCase();
        if (val !== '' && val !== 'bitte auswaehlen') {
            if (!context.lowerCaseFulfillability.includes(val)) return false;
        }
    }

    // 3. Nutzung Check (Scan all columns starting with "Nutzung")
    const nutzungHeaders = headers.filter(h => h.trim().toLowerCase().startsWith('nutzung'));
    let nutzungMatch = (nutzungHeaders.length === 0); 
    
    for (const h of nutzungHeaders) {
        const val = String(data[h] || '').trim();
        if (val === '' || val.toLowerCase() === 'bitte auswaehlen') {
            nutzungMatch = true;
            break;
        }
        const entryWords = new Set(val.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean));
        const matchingWords = [...entryWords].filter(word => context.lowerCaseNewUseWords.has(word));
        if (matchingWords.length >= 2 || (entryWords.size < 2 && matchingWords.length > 0)) {
            nutzungMatch = true;
            break;
        }
    }
    if (!nutzungMatch) return false;

    // 4. Fluchtniveau Check
    const fluchtniveauHeader = headers.find(h => h.trim() === 'Fluchtniveau');
    if (fluchtniveauHeader) {
        const val = String(data[fluchtniveauHeader] || '').trim().toLowerCase();
        if (val !== '' && val !== 'bitte auswaehlen') {
            const level = context.projectEscapeLevel;
            if (level === null || level === undefined) {
                return false;
            }
            
            if (val === 'unter 22') {
                if (level >= 22) return false;
            } else if (val === '22 bis 32') {
                if (level < 22 || level >= 32) return false;
            } else if (val === 'ueber 22') {
                if (level < 22) return false;
            } else if (val === 'ueber 32') {
                if (level < 32) return false;
            }
        }
    }

    return true;
}

export async function getFilteredRuleBooks(params: { projectAnalysisId: string, newUse?: string[], fulfillability?: string[] }) {
    const { projectAnalysisId, newUse: newUseParam, fulfillability: fulfillabilityParam } = params;
    
    const analysisDetails = await getProjectAnalysisDetails(projectAnalysisId);
    if (!analysisDetails) throw new Error('Analysis details not found');

    const newUseArray = cleanUpArrayField(newUseParam || analysisDetails.analysis.newUse);
    const fulfillabilityArray = cleanUpArrayField(fulfillabilityParam || analysisDetails.analysis.fulfillability);
    const projectEscapeLevel = analysisDetails.project.escapeLevel !== undefined ? Number(analysisDetails.project.escapeLevel) : null;

    if (newUseArray.length === 0 || fulfillabilityArray.length === 0) return [];
    
    const germanNewUses = newUseArray.map(use => getGermanTranslation(use));
    const lowerCaseNewUseWords = new Set(germanNewUses.flatMap(use => use.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean)));
    const germanFulfillability = fulfillabilityArray.map(f => getGermanTranslation(f));
    const lowerCaseFulfillability = germanFulfillability.map(f => f.toLowerCase());

    const filterContext = { lowerCaseNewUseWords, lowerCaseFulfillability, projectEscapeLevel };

    const allRuleBooks = await getRuleBooks();
    const filteredRuleBooksData = [];

    for (const book of allRuleBooks) {
        const details = await getRuleBookDetails(book.id);
        if (!details) continue;
        const filteredEntries = details.entries.filter(entry => shouldIncludeEntry(entry, filterContext));
        if (filteredEntries.length > 0) {
            filteredRuleBooksData.push({ ruleBook: book, entries: filteredEntries });
        }
    }
    return filteredRuleBooksData;
}

const getSegmentKeyFromGliederung = (gliederung: string): string | null => {
    if (!gliederung || typeof gliederung !== 'string') return null;
    const match = gliederung.trim().match(/^\d+/);
    if (match) return match[0];
    const paragraphMatch = gliederung.trim().match(/^§\s*(\d+)/);
    if (paragraphMatch && paragraphMatch[1]) return paragraphMatch[1];
    return null;
};

export async function getSegmentedRuleBookData(projectAnalysisId: string) {
    const filteredData = await getFilteredRuleBooks({ projectAnalysisId });
    const analysisResults = await getAnalysisResults(projectAnalysisId);
    filteredData.sort((a, b) => a.ruleBook.versionName.localeCompare(b.ruleBook.versionName));

    const resultsMap = new Map<string, RuleAnalysisResult>();
    analysisResults.forEach(r => resultsMap.set(r.ruleBookEntryId, r));

    const result = [];

    for (const { ruleBook, entries: filteredEntries } of filteredData) {
        // Fetch ALL entries for this rulebook to build a stable segmentation map
        const allEntriesRes = await db.query(
            'SELECT id, data FROM rule_book_entries WHERE rule_book_id = $1 ORDER BY row_index ASC',
            [ruleBook.id]
        );
        const allEntries = allEntriesRes.rows;

        const usesSectionType = allEntries.some(e => isSectionMarker({ data: e.data } as any));
        
        const entryIdToSegmentKey = new Map<string, string>();
        const segmentKeyToMarkerText = new Map<string, string>();
        
        let currentSectionCounter = 0;
        let lastSegmentKey: string | null = null;
        let currentSegmentKey: string | null = null;

        for (const entry of allEntries) {
            const gliederung = String(entry.data['Gliederung'] || '');
            const type = String(entry.data['Spaltentyp'] || '').trim().toLowerCase();
            
            if (usesSectionType) {
                if (type === 'section') {
                    currentSectionCounter++;
                    currentSegmentKey = String(currentSectionCounter);
                    segmentKeyToMarkerText.set(currentSegmentKey, String(entry.data['Text'] || ''));
                }
            } else {
                const gKey = getSegmentKeyFromGliederung(gliederung);
                if (gKey) {
                    currentSegmentKey = gKey;
                    if (!segmentKeyToMarkerText.has(currentSegmentKey)) {
                        segmentKeyToMarkerText.set(currentSegmentKey, String(entry.data['Text'] || ''));
                    }
                }
            }
            
            if (currentSegmentKey) {
                lastSegmentKey = currentSegmentKey;
            }
            entryIdToSegmentKey.set(entry.id, lastSegmentKey || '0');
        }

        // Group the FILTERED entries using the stable map
        const segmentGroups: Record<string, RuleBookEntry[]> = {};
        const orderedActiveKeys: string[] = [];

        for (const entry of filteredEntries) {
            const key = entryIdToSegmentKey.get(entry.id) || '0';
            if (!segmentGroups[key]) {
                segmentGroups[key] = [];
                orderedActiveKeys.push(key);
            }
            segmentGroups[key].push(entry);
        }

        // Sort keys logically for old-style books (numerical sorting)
        if (!usesSectionType) {
            orderedActiveKeys.sort((a, b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                if (!isNaN(numA)) return -1;
                if (!isNaN(numB)) return 1;
                return a.localeCompare(b);
            });
        }

        const segmentsStats = orderedActiveKeys.map((key) => {
            const group = segmentGroups[key];
            const visibleGroup = reduceConsecutiveHeaders(group); // Apply header reduction logic
            
            const parameterEntries = visibleGroup.filter(isParameter);
            const completedCount = parameterEntries.filter(e => {
                const analysis = resultsMap.get(e.id);
                if (!analysis || !analysis.checklistStatus) return false;
                if (['Not Fulfilled', 'Not verifiable'].includes(analysis.checklistStatus)) return !!analysis.revisedFulfillability;
                return true;
            }).length;

            return {
                key,
                displayIndex: 0, // Placeholder
                totalRows: visibleGroup.length,
                totalParameters: parameterEntries.length,
                completedParameters: completedCount,
                firstRowText: segmentKeyToMarkerText.get(key) || visibleGroup[0]?.data['Text'] || '',
            };
        });

        // Filter out segments with 0 parameters unless it's the very first one (intro)
        const visibleSegments = segmentsStats.filter((s, i) => i === 0 || s.totalParameters > 0);
        
        // Final sequential numbering for display (labels are always 1, 2, 3...)
        const finalSegments = visibleSegments.map((s, i) => ({
            ...s,
            // Sequential numbering for new styled books. Actual paragraph numeric key for old styled books.
            displayIndex: usesSectionType ? (i + 1) : parseInt(s.key, 10)
        }));

        result.push({
            ruleBook,
            segments: finalSegments,
            totalRows: finalSegments.reduce((sum, s) => sum + s.totalRows, 0),
            totalParameters: finalSegments.reduce((sum, s) => sum + s.totalParameters, 0),
            totalCompleted: finalSegments.reduce((sum, s) => sum + s.completedParameters, 0)
        });
    }
    
    return result;
}

export async function getOrderedSegments(projectAnalysisId: string): Promise<{ ruleBookId: string; segmentKey: string; }[]> {
    const segmentedData = await getSegmentedRuleBookData(projectAnalysisId);
    const orderedSegments: { ruleBookId: string; segmentKey: string; }[] = [];
    for (const ruleBookData of segmentedData) {
        for (const segment of ruleBookData.segments) {
            orderedSegments.push({ ruleBookId: ruleBookData.ruleBook.id, segmentKey: segment.key });
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

    const newUseArray = cleanUpArrayField(analysisDetails.analysis.newUse);
    const fulfillabilityArray = cleanUpArrayField(analysisDetails.analysis.fulfillability);
    const projectEscapeLevel = analysisDetails.project.escapeLevel !== undefined ? Number(analysisDetails.project.escapeLevel) : null;

    if (newUseArray.length === 0 || fulfillabilityArray.length === 0) throw new Error('Analysis criteria not set.');

    const germanNewUses = newUseArray.map(use => getGermanTranslation(use));
    const lowerCaseNewUseWords = new Set(germanNewUses.flatMap(use => use.toLowerCase().replace(/[,;/]/g, ' ').split(' ').filter(Boolean)));
    const germanFulfillability = fulfillabilityArray.map(f => getGermanTranslation(f));
    const lowerCaseFulfillability = germanFulfillability.map(f => f.toLowerCase());

    const filterContext = { lowerCaseNewUseWords, lowerCaseFulfillability, projectEscapeLevel };

    // Fetch ALL entries for this rulebook to build a stable segmentation map
    const allEntriesRes = await db.query(
        'SELECT id, data FROM rule_book_entries WHERE rule_book_id = $1 ORDER BY row_index ASC',
        [ruleBookId]
    );
    const allEntries = allEntriesRes.rows;
    const usesSectionType = allEntries.some(e => isSectionMarker({ data: e.data } as any));
    
    const entryIdToSegmentKey = new Map<string, string>();
    let currentSectionCounter = 0;
    let lastSegmentKey: string | null = null;
    let currentSegmentKey: string | null = null;

    for (const entry of allEntries) {
        const gliederung = String(entry.data['Gliederung'] || '');
        const type = String(entry.data['Spaltentyp'] || '').trim().toLowerCase();
        
        if (usesSectionType) {
            if (type === 'section') {
                currentSectionCounter++;
                currentSegmentKey = String(currentSectionCounter);
            }
        } else {
            const gKey = getSegmentKeyFromGliederung(gliederung);
            if (gKey) currentSegmentKey = gKey;
        }
        
        if (currentSegmentKey) lastSegmentKey = currentSegmentKey;
        entryIdToSegmentKey.set(entry.id, lastSegmentKey || '0');
    }

    // Now filter the entries and collect those belonging to our target segmentKey
    const filteredEntries = ruleBookDetails.entries.filter(entry => shouldIncludeEntry(entry, filterContext));
    const segmentEntries = filteredEntries.filter(e => (entryIdToSegmentKey.get(e.id) || '0') === segmentKey);
    const visibleEntries = reduceConsecutiveHeaders(segmentEntries); // Apply header reduction logic
    
    const analysisResults = await getAnalysisResults(projectAnalysisId);
    const resultsMap = new Map<string, RuleAnalysisResult>();
    analysisResults.forEach(r => resultsMap.set(r.ruleBookEntryId, r));

    // Get display index from segmented data to ensure consistency
    const segmentedData = await getSegmentedRuleBookData(projectAnalysisId);
    const bookData = segmentedData.find(b => b.ruleBook.id === ruleBookId);
    const segmentStat = bookData?.segments.find(s => s.key === segmentKey);

    return {
        projectAnalysis: analysisDetails.analysis,
        ruleBook: ruleBookDetails.ruleBook,
        segmentKey,
        displayIndex: segmentStat?.displayIndex || 0,
        entries: visibleEntries.map(entry => ({ ...entry, analysis: resultsMap.get(entry.id) })),
        referenceTables: ruleBookDetails.referenceTables || []
    };
}

export async function saveAnalysisResult(payload: { projectAnalysisId: string, ruleBookId: string, ruleBookEntryId: string, segmentKey: string, checklistStatus: string, revisedFulfillability: string | null }) {
    const { projectAnalysisId, ruleBookId, ruleBookEntryId, segmentKey, checklistStatus, revisedFulfillability } = payload;
    const ruleBookDetails = await getRuleBookDetails(ruleBookId);
    if (!ruleBookDetails) throw new Error("Rulebook details not found.");
    const targetEntry = ruleBookDetails.entries.find(e => e.id === ruleBookEntryId);
    if (!targetEntry) throw new Error("Rule book entry not found.");
    
    // Attempt to find the specific section name for display purposes in results
    const fullEntriesRes = await db.query('SELECT data FROM rule_book_entries WHERE rule_book_id = $1 ORDER BY row_index ASC', [ruleBookId]);
    const fullEntries = fullEntriesRes.rows;
    const sectionRow = fullEntries.find(e => isSectionMarker({ data: e.data } as any) && String(e.data['Gliederung'] || '').startsWith(segmentKey));

    const topic = sectionRow ? String(sectionRow.data['Text'] || `Section ${segmentKey}`) : `Section ${segmentKey}`;
    const structure = (targetEntry.data['Gliederung'] as string) || '';
    const text = (targetEntry.data['Text'] as string) || '';
    
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const existing = await client.query('SELECT id FROM rule_analysis_results WHERE project_analysis_id = $1 AND rule_book_entry_id = $2', [projectAnalysisId, ruleBookEntryId]);
        if (existing.rows.length > 0) {
            await client.query(`UPDATE rule_analysis_results SET checklist_status = $1, revised_fulfillability = $2, rule_book_name = $3, section_key = $4, topic = $5, structure = $6, text = $7, rule_book_id = $8 WHERE id = $9`,
                [checklistStatus, revisedFulfillability, ruleBookDetails.ruleBook.versionName, segmentKey, topic, structure, text, ruleBookId, existing.rows[0].id]);
        } else {
            const newId = `rar-${Date.now()}-${Math.random()}`;
            await client.query(`INSERT INTO rule_analysis_results (id, project_analysis_id, rule_book_entry_id, checklist_status, revised_fulfillability, rule_book_name, section_key, topic, structure, text, rule_book_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [newId, projectAnalysisId, ruleBookEntryId, checklistStatus, revisedFulfillability, ruleBookDetails.ruleBook.versionName, segmentKey, topic, structure, text, ruleBookId]);
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
