/**
 * Long-form ("verbose") report generator.
 *
 * This is 95 % the original narrative code, wrapped in a pure function so
 * `evaluation.ts` can import it on-demand.  No side effects here – we just
 * build a markdown string and hand it back.
 */
import { ScenarioEvaluation, PROMPT_TEST_SCENARIOS } from './types.js';
export function generateVerboseReport(evals: ScenarioEvaluation[]): string {
  // ── A · Aggregate top-level metrics ────────────────────────────────────────
  let overallTotal = 0;
  const skillTotals: Record<string, { total: number; count: number }> = {
    branching: { total: 0, count: 0 },
    revision:  { total: 0, count: 0 },
    parameters:{ total: 0, count: 0 },
    depth:     { total: 0, count: 0 },
    completion:{ total: 0, count: 0 },
    multiple:  { total: 0, count: 0 },
  };
  const validationErrors: Record<string, number> = {};
  evals.forEach(ev => {
    overallTotal += ev.percentageScore;
    // skill bucket bookkeeping
    const scenario = PROMPT_TEST_SCENARIOS.find(s => s.id === ev.scenarioId);
    if (scenario?.targetSkill && skillTotals[scenario.targetSkill]) {
      skillTotals[scenario.targetSkill].total += ev.percentageScore;
      skillTotals[scenario.targetSkill].count += 1;
    }
    // error aggregation
    ev.objectiveMetrics.validationResults.errors.forEach(err => {
      validationErrors[err] = (validationErrors[err] || 0) + 1;
    });
  });
  const overallAvg = Math.round(overallTotal / evals.length);
  // helper to compute per-skill averages
  const skillAverage = (skill: string) => {
    const s = skillTotals[skill];
    return s.count ? Math.round(s.total / s.count) : 0;
  };
  // ── B · Start constructing markdown ────────────────────────────────────────
  let md = `## Executive Summary (verbose)\n\n`;
  md += `Overall weighted score across ${evals.length} evaluations: **${overallAvg}%**\n\n`;
  // Strengths & weaknesses by skill
  const strengths = Object.keys(skillTotals).filter(k => skillAverage(k) >= 70);
  const weaknesses = Object.keys(skillTotals).filter(k => skillAverage(k) < 70);
  if (strengths.length)  md += `**Strengths:** ${strengths.map(s => `${s} (${skillAverage(s)}%)`).join(', ')}\n\n`;
  if (weaknesses.length) md += `**Weaknesses:** ${weaknesses.map(s => `${s} (${skillAverage(s)}%)`).join(', ')}\n\n`;
  // ── C · Detailed table per skill ───────────────────────────────────────────
  md += '| Skill | Avg Score |\n|-------|-----------|\n';
  Object.keys(skillTotals).forEach(skill => {
    md += `| ${skill} | ${skillAverage(skill)}% |\n`;
  });
  md += '\n';
  // ── D · Top recurring validation errors ────────────────────────────────────
  const topErrors = Object.entries(validationErrors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (topErrors.length) {
    md += '### Most Frequent Validation Errors\n\n';
    topErrors.forEach(([err, count]) => {
      md += `* **${err}** — ${count}×\n`;
    });
    md += '\n';
  }
  // (You can keep expanding this section with model comparisons,
  //  recommendations, etc. – the old code can be pasted here verbatim
  //  without impacting the concise report.)
  return md;
}