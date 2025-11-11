
'use server';

import { db } from '@/lib/db';
import { getAnalysisResults as getAllResults } from '../../rule-analysis/actions';

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

export interface AnalysisResultData {
  checklistData: ChartData[];
  fulfillabilityData: ChartData[];
}

const checklistColors = {
  achievable: '#4E79A7',        // Steel Blue
  unachievable: '#E15759',      // Muted Red
  notRelevant: '#BAB0AC',       // Soft Grey
  notVerifiable: '#B07AA1',     // Muted Purple
};

const fulfillabilityColors = {
  'Light': '#A0CBE8',  // Light Blue
  'Medium': '#4E79A7', // Steel Blue
  'Heavy': '#B07AA1',  // Muted Purple
};


export async function getAnalysisResultData(projectAnalysisId: string): Promise<AnalysisResultData> {
  const results = await getAllResults(projectAnalysisId);

  const checklistTranslationMap: Record<string, keyof typeof checklistColors> = {
    'Achievable': 'achievable',
    'Unachievable': 'unachievable',
    'Not relevant': 'notRelevant',
    'Not verifiable': 'notVerifiable',
  };

  const checklistCounts: Record<keyof typeof checklistColors, number> = {
    'achievable': 0,
    'unachievable': 0,
    'notRelevant': 0,
    'notVerifiable': 0,
  };

  const fulfillabilityCounts: Record<string, number> = {
    'Light': 0,
    'Medium': 0,
    'Heavy': 0,
  };

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
  });

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

  return { checklistData, fulfillabilityData };
}
