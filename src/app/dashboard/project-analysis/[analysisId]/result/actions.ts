
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

interface AnalysisResultData {
  checklistData: ChartData[];
  fulfillabilityData: ChartData[];
  notFulfilledParameters: ParameterDetail[];
  notVerifiableParameters: ParameterDetail[];
}

interface ChartData {
  name: string;
  value: number;
  fill: string;
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

const getSegmentKey = (gliederung: string): string | null => {
  if (!gliederung || typeof gliederung !== 'string') return null;
  const match = gliederung.trim().match(/^(\d+|§\s*\d+)/);
  if (match) {
    return match[0].replace(/§\s*/, '');
  }
  return null;
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
  const entryIdsInResults = new Set(analysisResults.rows.map(r => r.rule_book_entry_id));

  const entryDetailsMap = new Map<string, { ruleBookName: string; segmentKey: string; topic: string; structure: string; ruleBookId: string }>();

  // Get all unique rule book IDs from the entries that have results
  const ruleBookIdsInResults = new Set<string>();
  const entryIdToRuleBookIdMap = new Map<string, string>();
  
  // This intermediate query is necessary to know which rule books we need to process
  if (entryIdsInResults.size > 0) {
    const entriesToRuleBooksRes = await db.query('SELECT id, rule_book_id FROM rule_book_entries WHERE id = ANY($1::text[])', [Array.from(entryIdsInResults)]);
    entriesToRuleBooksRes.rows.forEach(row => {
        ruleBookIdsInResults.add(row.rule_book_id);
        entryIdToRuleBookIdMap.set(row.id, row.rule_book_id);
    });
  }

  // Now, for each relevant rule book, process its entire structure once
  for (const bookId of ruleBookIdsInResults) {
      const book = ruleBookMap.get(bookId);
      if (!book) continue;
      
      const ruleBookDetails = await getRuleBookDetails(bookId);
      if (!ruleBookDetails) continue;

      let lastValidSegmentKey = '0';
      let lastValidTopic = '';

      for (const entry of ruleBookDetails.entries) {
          const gliederung = entry.data['Gliederung'] as string;
          const spaltentyp = entry.data['Spaltentyp'] as string;
          
          if (gliederung && spaltentyp === 'Abschnitt') {
              const currentSegmentKey = getSegmentKey(gliederung);
              if(currentSegmentKey) {
                lastValidSegmentKey = currentSegmentKey;
                lastValidTopic = entry.data['Text'] || '';
              }
          }
          
          // If this entry is one of the ones we have a result for, store its structural context
          if (entryIdsInResults.has(entry.id)) {
              entryDetailsMap.set(entry.id, {
                  ruleBookId: bookId,
                  ruleBookName: book.versionName,
                  segmentKey: lastValidSegmentKey,
                  topic: lastValidTopic,
                  structure: gliederung || '',
              });
          }
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
