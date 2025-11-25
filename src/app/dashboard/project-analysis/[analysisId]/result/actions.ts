
'use server';

import { db } from '@/lib/db';
import { getAnalysisResults as getAllResults } from '../../rule-analysis/actions';
import { type RuleBookEntry } from '@/lib/types';


interface ParameterDetail {
    structure: string;
    text: string;
}

interface GroupedParameters {
    Heavy: ParameterDetail[];
    Medium: ParameterDetail[];
    Light: ParameterDetail[];
}

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

export interface AnalysisResultData {
  checklistData: ChartData[];
  fulfillabilityData: ChartData[];
  notFulfilledParameters: GroupedParameters;
  notVerifiableParameters: GroupedParameters;
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


export async function getAnalysisResultData(projectAnalysisId: string): Promise<AnalysisResultData> {
  const results = await getAllResults(projectAnalysisId);

  const checklistTranslationMap: Record<string, keyof typeof checklistColors> = {
    'Fulfilled': 'fulfilled',
    'Not Fulfilled': 'notFulfilled',
    'Not relevant': 'notRelevant',
    'Not verifiable': 'notVerifiable',
  };

  const checklistCounts: Record<keyof typeof checklistColors, number> = {
    'fulfilled': 0,
    'notFulfilled': 0,
    'notRelevant': 0,
    'notVerifiable': 0,
  };

  const fulfillabilityCounts: Record<string, number> = {
    'Light': 0,
    'Medium': 0,
    'Heavy': 0,
  };

  const notFulfilledParameters: GroupedParameters = { Heavy: [], Medium: [], Light: [] };
  const notVerifiableParameters: GroupedParameters = { Heavy: [], Medium: [], Light: [] };

  if (results.length > 0) {
      const entryIds = results.map(r => r.ruleBookEntryId);
      const entryRes = await db.query('SELECT id, data FROM rule_book_entries WHERE id = ANY($1)', [entryIds]);
      const entryMap = new Map<string, RuleBookEntry['data']>();
      entryRes.rows.forEach(row => entryMap.set(row.id, row.data));

      results.forEach(result => {
        if (result.checklistStatus) {
            const key = checklistTranslationMap[result.checklistStatus];
            if (key && checklistCounts.hasOwnProperty(key)) {
                checklistCounts[key]++;
            }
        }
        if (result.revisedFulfillability && fulfillabilityCounts.hasOwnProperty(result.revisedFulfillability)) {
          fulfillabilityCounts[result.revisedFulfillability]++;
        }

        const entryData = entryMap.get(result.ruleBookEntryId);
        if (entryData) {
            const detail: ParameterDetail = {
                structure: entryData['Gliederung'] || 'N/A',
                text: entryData['Text'] || 'N/A',
            };

            const fulfillabilityKey = result.revisedFulfillability as keyof GroupedParameters;

            if (result.checklistStatus === 'Not Fulfilled' && fulfillabilityKey) {
                notFulfilledParameters[fulfillabilityKey]?.push(detail);
            } else if (result.checklistStatus === 'Not verifiable' && fulfillabilityKey) {
                notVerifiableParameters[fulfillabilityKey]?.push(detail);
            }
        }
      });
  }


  const checklistData = (Object.entries(checklistCounts) as [keyof typeof checklistColors, number][])
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      fill: checklistColors[name] || '#cccccc',
    }));

  const fulfillabilityData = Object.entries(fulfillabilityCounts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      fill: fulfillabilityColors[name as keyof typeof fulfillabilityColors] || '#cccccc',
    }));

  return { checklistData, fulfillabilityData, notFulfilledParameters, notVerifiableParameters };
}
