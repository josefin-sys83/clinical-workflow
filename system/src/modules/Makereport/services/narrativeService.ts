import { DataAsset, ReportSection } from '../types';

/**
 * AI service to generate narrative text suggestions for inserted data assets
 */
export function generateAssetNarrative(asset: DataAsset, section: ReportSection): string {
  // Generate context-aware narrative based on asset type and section
  
  if (asset.id === 'table-1') {
    return 'A total of 300 patients were randomized in a 2:1 ratio to receive either Investigational Product X (n=200) or placebo (n=100). Baseline demographics and disease characteristics were well-balanced between treatment groups. Mean age was 52.3 years in the IP-X group and 51.8 years in the placebo group. The majority of patients were female (68% in both groups) and had moderate to severe disease activity at baseline (mean DAS: 5.4 in IP-X, 5.3 in placebo).';
  }
  
  if (asset.id === 'table-2') {
    return 'The primary efficacy endpoint was met. Treatment with Investigational Product X resulted in a statistically significant improvement in Disease Activity Score (DAS) at Week 24 compared to placebo. The mean change from baseline in DAS was -2.4 points in the IP-X group versus -0.8 points in the placebo group, yielding a treatment difference of -1.6 points (95% CI: -2.1 to -1.1; p<0.001). The ANCOVA analysis adjusted for baseline DAS score and stratification factors confirmed the robustness of this finding.';
  }
  
  if (asset.id === 'table-3') {
    return 'The overall incidence of treatment-emergent adverse events (TEAEs) was comparable between treatment groups: 78.5% (157/200) in the IP-X group versus 75.0% (75/100) in the placebo group. The most common TEAEs in the IP-X group were headache (18.5%), nasopharyngitis (15.0%), and nausea (12.5%). Serious adverse events (SAEs) occurred in 8.0% of patients in the IP-X group and 9.0% in the placebo group. No deaths occurred during the study period. The safety profile was consistent with the known mechanism of action of Investigational Product X.';
  }
  
  if (asset.id === 'graph-1') {
    return 'The Kaplan-Meier analysis demonstrated sustained efficacy of Investigational Product X over the 24-week treatment period. Separation of the survival curves was evident from Week 4 onwards, with the treatment benefit maintained throughout the study duration. The hazard ratio for time to clinical response was 0.58 (95% CI: 0.42 to 0.79), indicating a 42% reduction in the hazard of event in the IP-X group relative to placebo.';
  }
  
  if (asset.id === 'graph-2') {
    return 'Improvement in the Disease Activity Score was observed as early as Week 4 in the Investigational Product X group and progressively increased through Week 24. In contrast, the placebo group showed minimal improvement over time. The between-group difference in mean change from baseline became statistically significant at Week 8 (p=0.012) and remained significant at all subsequent time points, demonstrating consistent treatment effect across the study duration.';
  }
  
  if (asset.id === 'stat-1') {
    return 'The ANCOVA model for the primary efficacy endpoint confirmed the treatment effect of Investigational Product X. After adjusting for baseline Disease Activity Score and stratification factors (disease duration and prior treatment), the least squares mean difference between IP-X and placebo was -1.58 points (SE: 0.23; p<0.001). Baseline DAS was a significant covariate (p<0.001), confirming the appropriateness of the statistical model. Residual diagnostics supported the assumptions of normality and homogeneity of variance.';
  }
  
  // Generic fallback
  return `This ${asset.type} presents ${asset.description?.toLowerCase() || 'relevant data'} for ${section.title}. The findings support the interpretation that [describe key observation or conclusion based on the data].`;
}
