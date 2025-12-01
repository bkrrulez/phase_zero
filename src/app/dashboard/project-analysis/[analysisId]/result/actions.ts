
'use server';

import { db } from '@/lib/db';

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
  'Light': '#BAB0AC',
  'Medium': '#7A746F',
  'Heavy': '#000000',
};

export async function getAnalysisResultData(projectAnalysisId: string): Promise<AnalysisResultData> {
  const analysisResultsRes = await db.query('SELECT * FROM rule_analysis_results WHERE project_analysis_id = $1', [projectAnalysisId]);
  const analysisResults = analysisResultsRes.rows;
  
  if (analysisResults.length === 0) {
    return {
      checklistData: [],
      fulfillabilityData: [],
      notFulfilledParameters: [],
      notVerifiableParameters: [],
    };
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

  for (const result of analysisResults) {
    const statusKey = checklistTranslationMap[result.checklist_status];
    if (statusKey) {
      checklistCounts[statusKey]++;
    }

    if (result.revised_fulfillability && fulfillabilityCounts.hasOwnProperty(result.revised_fulfillability)) {
      fulfillabilityCounts[result.revised_fulfillability]++;
    }

    const parameterDetail: ParameterDetail = {
      entryId: result.rule_book_entry_id,
      ruleBookId: result.rule_book_id,
      ruleBookName: result.rule_book_name,
      segmentKey: result.section_key,
      topic: result.topic,
      structure: result.structure,
      fulfillability: result.revised_fulfillability,
    };

    if (result.checklist_status === 'Not Fulfilled') {
      notFulfilledParameters.push(parameterDetail);
    } else if (result.checklist_status === 'Not verifiable') {
      notVerifiableParameters.push(parameterDetail);
    }
  }

  const checklistData = (Object.entries(checklistCounts) as [keyof typeof checklistColors, number][])
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value, fill: checklistColors[name] }));

  const desiredOrder = ['Light', 'Medium', 'Heavy'];
  const fulfillabilityData = desiredOrder
    .filter(name => fulfillabilityCounts[name] > 0)
    .map(name => ({
        name: name,
        value: fulfillabilityCounts[name],
        fill: fulfillabilityColors[name as keyof typeof fulfillabilityColors]
    }));
  
  return { checklistData, fulfillabilityData, notFulfilledParameters, notVerifiableParameters };
}
