
'use server';

import { db } from '@/lib/db';
import { getRuleBookDetails, getRuleBooks } from '@/app/dashboard/rule-books/actions';
import { type RuleBookEntry, type ReferenceTable } from '@/lib/types';

interface ParameterDetail {
  entryId: string;
  ruleBookId: string;
  ruleBookName: string;
  segmentKey: string;
  topic: string;
  structure: string;
  fulfillability: string | null;
}

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

export interface AnalysisResultData {
  checklistData: ChartData[];
  fulfillabilityData: ChartData[];
  notFulfilledParameters: ParameterDetail[];
  notVerifiableParameters: ParameterDetail[];
}

const checklistColors = {
  fulfilled: '#4E79A7',
  notFulfilled: '#E15759',
  notRelevant: '#BAB0AC',
  notVerifiable: '#B07AA1',
};

const fulfillabilityColors = {
  'Light': '#A0CBE8',
  'Medium': '#4E79A7',
  'Heavy': '#B07AA1',
};

// Helper to get the correct segment key for an entry.
// It looks for the first sequence of digits at the start of the string.
const getSegmentKey = (gliederung: string): string => {
  if (!gliederung || typeof gliederung !== 'string') return '0';
  const match = gliederung.trim().match(/^(\d+)/);
  return match ? match[0] : '0';
};


export async function getAnalysisResultData(projectAnalysisId: string): Promise<AnalysisResultData> {
  const analysisResults = await db.query('SELECT * FROM rule_analysis_results WHERE project_analysis_id = $1', [projectAnalysisId]);
  
  if (analysisResults.rows.length === 0) {
    return {
      checklistData: [],
      fulfillabilityData: [],
      notFulfilledParameters: [],
      notVerifiableParameters: [],
    };
  }

  const allRuleBooks = await getRuleBooks();
  const ruleBookMap = new Map(allRuleBooks.map(book => [book.id, book]));

  const entryIds = analysisResults.rows.map(r => r.rule_book_entry_id);
  // Fetch entries and their rule book IDs
  const entryRes = await db.query('SELECT id, rule_book_id, data FROM rule_book_entries WHERE id = ANY($1::text[])', [entryIds]);
  
  const entryDetailsMap = new Map<string, { ruleBookName: string; segmentKey: string; topic: string; structure: string; ruleBookId: string }>();

  // Group entries by rule book to process them efficiently
  const entriesByBook = new Map<string, any[]>();
  entryRes.rows.forEach(row => {
      if (!entriesByBook.has(row.rule_book_id)) {
          entriesByBook.set(row.rule_book_id, []);
      }
      entriesByBook.get(row.rule_book_id)!.push(row);
  });

  // Process each rule book's entries
  for (const [bookId, entries] of entriesByBook.entries()) {
      const book = ruleBookMap.get(bookId);
      if (!book) continue;

      const ruleBookDetails = await getRuleBookDetails(bookId);
      if (!ruleBookDetails) continue;
      
      const segmentTopics = new Map<string, string>();
      let lastSegmentKey = '0';
      
      // First pass to find the topic for each segment
      for(const entry of ruleBookDetails.entries) {
        const gliederung = entry.data['Gliederung'] as string;
        const segmentKey = getSegmentKey(gliederung);
        if(segmentKey !== '0' && !segmentTopics.has(segmentKey)) {
          segmentTopics.set(segmentKey, entry.data['Text'] as string);
        }
      }

      // Second pass to associate each entry with its correct segment and topic
      lastSegmentKey = '0';
      for (const entry of ruleBookDetails.entries) {
          const gliederung = entry.data['Gliederung'] as string;
          const segmentKey = getSegmentKey(gliederung);
          
          if(segmentKey !== '0') {
            lastSegmentKey = segmentKey;
          }
          
          const topic = segmentTopics.get(lastSegmentKey) || '';

          entryDetailsMap.set(entry.id, {
              ruleBookId: bookId,
              ruleBookName: book.versionName,
              segmentKey: lastSegmentKey,
              topic: topic,
              structure: gliederung,
          });
      }
  }

  const checklistCounts: Record<keyof typeof checklistColors, number> = { 'fulfilled': 0, 'notFulfilled': 0, 'notRelevant': 0, 'notVerifiable': 0 };
  const fulfillabilityCounts: Record<string, number> = { 'Light': 0, 'Medium': 0, 'Heavy': 0 };

  const notFulfilledParameters: ParameterDetail[] = [];
  const notVerifiableParameters: ParameterDetail[] = [];

  const checklistTranslationMap: Record<string, keyof typeof checklistColors> = {
    'Fulfilled': 'fulfilled',
    'Not Fulfilled': 'notFulfilled',
    'Not relevant': 'notRelevant',
    'Not verifiable': 'notVerifiable',
  };

  for (const result of analysisResults.rows) {
    const statusKey = checklistTranslationMap[result.checklist_status];
    if (statusKey) {
      checklistCounts[statusKey]++;
    }

    if (result.revised_fulfillability && fulfillabilityCounts.hasOwnProperty(result.revised_fulfillability)) {
      fulfillabilityCounts[result.revised_fulfillability]++;
    }

    const entryDetails = entryDetailsMap.get(result.rule_book_entry_id);
    
    if (entryDetails) {
      const parameterDetail: ParameterDetail = {
        entryId: result.rule_book_entry_id,
        ruleBookId: entryDetails.ruleBookId,
        ruleBookName: entryDetails.ruleBookName,
        segmentKey: entryDetails.segmentKey,
        topic: entryDetails.topic,
        structure: entryDetails.structure,
        fulfillability: result.revised_fulfillability,
      };

      if (result.checklist_status === 'Not Fulfilled') {
        notFulfilledParameters.push(parameterDetail);
      } else if (result.checklist_status === 'Not verifiable') {
        notVerifiableParameters.push(parameterDetail);
      }
    }
  }

  const checklistData = (Object.entries(checklistCounts) as [keyof typeof checklistColors, number][])
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value, fill: checklistColors[name] }));

  const fulfillabilityData = Object.entries(fulfillabilityCounts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value, fill: fulfillabilityColors[name as keyof typeof fulfillabilityColors] }));
  
  return { checklistData, fulfillabilityData, notFulfilledParameters, notVerifiableParameters };
}
