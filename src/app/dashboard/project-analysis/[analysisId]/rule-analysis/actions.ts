
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

type GetFilteredRuleBooksParams = {
    projectAnalysisId: string;
    newUse?: string[];
    fulfillability?: string[];
}

/**
 * Filter Logic Engine (Logic 1 + Logic 2)
 */
function shouldIncludeEntry(entry: RuleBookEntry, context: { 
    lowerCaseNewUseWords: Set<string>, 
    lowerCaseFulfillability: string[], 
    projectEscapeLevel: number | null | undefined 
}) {
    const data = entry.data;
    const headers = Object.keys(data);

    // 1. Ausschliessen Check (Logic 2 specific)
    const ausschliessenVal = String(data['Ausschliessen'] || '').trim().toLowerCase();
    if (['yes', 'ja'].includes(ausschliessenVal)) return false;

    // 2. Fulfillability Check
    const erfullbarkeitValue = String(data['Erfüllbarkeit'] || '').trim().toLowerCase();
    let erfullbarkeitMatch = (erfullbarkeitValue === '' || erfullbarkeitValue === 'bitte auswaehlen');
    if (!erfullbarkeitMatch) {
        erfullbarkeitMatch = context.lowerCaseFulfillability.includes(erfullbarkeitValue);
    }
    if (!erfullbarkeitMatch) return false;

    // 3. Nutzung Check (Scan all columns starting with "Nutzung")
    const nutzungHeaders = headers.filter(h => h.toLowerCase().startsWith('nutzung'));
    let nutzungMatch = false;
    
    if (nutzungHeaders.length === 0) {
        nutzungMatch = true; 
    } else {
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
    }
    if (!nutzungMatch) return false;

    // 4. Fluchtniveau Check (Logic 2 specific)
    const hasFluchtniveauCol = headers.some(h => h === 'Fluchtniveau');
    if (hasFluchtniveauCol) {
        const fnVal = String(data['Fluchtniveau'] || '').trim().toLowerCase();
        const level = context.projectEscapeLevel;
        
        if (fnVal !== '' && fnVal !== 'bitte auswaehlen') {
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

const getSegmentKey = (gliederung: string): string | null => {
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

    return filteredData.map(({ ruleBook, entries }) => {
        let lastSegmentKey: string | null = null;
        const orderedSegmentKeys: string[] = [];
        const segments = entries.reduce((acc, entry) => {
            const gliederung = String(entry.data['Gliederung'] || '');
            let currentSegmentKey = getSegmentKey(gliederung);
            if (currentSegmentKey) { lastSegmentKey = currentSegmentKey; } else { currentSegmentKey = lastSegmentKey; }
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
                if (!analysis || !analysis.checklistStatus) return false;
                if (['Not Fulfilled', 'Not verifiable'].includes(analysis.checklistStatus)) return !!analysis.revisedFulfillability;
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

        const displayedSegments = segmentStats.filter((s, index) => index === 0 || s.totalParameters > 0);
        return {
            ruleBook,
            segments: displayedSegments,
            totalRows: entries.length,
            totalParameters: entries.filter(e => e.data['Spaltentyp'] === 'Parameter').length,
            totalCompleted: segmentStats.reduce((sum, s) => sum + s.completedParameters, 0)
        };
    });
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

    const filteredEntries = ruleBookDetails.entries.filter(entry => shouldIncludeEntry(entry, filterContext));

    const segmentEntries: RuleBookEntry[] = [];
    let lastSegmentKey: string | null = null;
    for (const entry of filteredEntries) {
        const gliederung = String(entry.data['Gliederung'] || '');
        let currentSegmentKey = getSegmentKey(gliederung);
        if (currentSegmentKey) { lastSegmentKey = currentSegmentKey; } else { currentSegmentKey = lastSegmentKey; }
        if ((currentSegmentKey || lastSegmentKey || '0') === segmentKey) segmentEntries.push(entry);
    }
    
    const analysisResults = await getAnalysisResults(projectAnalysisId);
    const resultsMap = new Map<string, RuleAnalysisResult>();
    analysisResults.forEach(r => resultsMap.set(r.ruleBookEntryId, r));

    return {
        projectAnalysis: analysisDetails.analysis,
        ruleBook: ruleBookDetails.ruleBook,
        segmentKey,
        entries: segmentEntries.map(entry => ({ ...entry, analysis: resultsMap.get(entry.id) })),
        referenceTables: ruleBookDetails.referenceTables || []
    };
}

export async function saveAnalysisResult(payload: { projectAnalysisId: string, ruleBookId: string, ruleBookEntryId: string, segmentKey: string, checklistStatus: string, revisedFulfillability: string | null }) {
    const { projectAnalysisId, ruleBookId, ruleBookEntryId, segmentKey, checklistStatus, revisedFulfillability } = payload;
    const ruleBookDetails = await getRuleBookDetails(ruleBookId);
    if (!ruleBookDetails) throw new Error("Rulebook details not found.");
    const targetEntry = ruleBookDetails.entries.find(e => e.id === ruleBookEntryId);
    if (!targetEntry) throw new Error("Rule book entry not found.");
    
    const sectionHeaderEntry = ruleBookDetails.entries.find(e => {
        const gliederung = String(e.data['Gliederung'] || '');
        return e.data['Spaltentyp'] === 'Abschnitt' && gliederung.trim() === segmentKey;
    });

    const topic = sectionHeaderEntry ? String(sectionHeaderEntry.data['Text'] || 'General') : 'General';
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
