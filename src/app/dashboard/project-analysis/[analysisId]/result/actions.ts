
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
  achievable: '#16a34a',     // green-600
  unachievable: '#dc2626',   // red-600
  notRelevant: '#9ca3af',   // gray-400
  notVerifiable: '#f97316', // orange-500
};

const fulfillabilityColors = {
  'Light': '#84cc16',  // lime-500
  'Medium': '#f59e0b', // amber-500
  'Heavy': '#ef4444',  // red-500
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
