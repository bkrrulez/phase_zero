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
  'Achievable': '#22c55e', // green-500
  'Unachievable': '#ef4444', // red-500
  'Not relevant': '#a1a1aa', // zinc-400
  'Not verifiable': '#f97316', // orange-500
};

const fulfillabilityColors = {
  'Light': '#84cc16', // lime-500
  'Medium': '#eab308', // yellow-500
  'Heavy': '#dc2626', // red-600
};


export async function getAnalysisResultData(projectAnalysisId: string): Promise<AnalysisResultData> {
  const results = await getAllResults(projectAnalysisId);

  const checklistCounts: Record<string, number> = {
    'Achievable': 0,
    'Unachievable': 0,
    'Not relevant': 0,
    'Not verifiable': 0,
  };

  const fulfillabilityCounts: Record<string, number> = {
    'Light': 0,
    'Medium': 0,
    'Heavy': 0,
  };

  results.forEach(result => {
    if (result.checklistStatus && checklistCounts.hasOwnProperty(result.checklistStatus)) {
      checklistCounts[result.checklistStatus]++;
    }
    if (result.revisedFulfillability && fulfillabilityCounts.hasOwnProperty(result.revisedFulfillability)) {
      fulfillabilityCounts[result.revisedFulfillability]++;
    }
  });

  const checklistData = Object.entries(checklistCounts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      fill: checklistColors[name as keyof typeof checklistColors] || '#cccccc',
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
