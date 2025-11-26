import accountSnapshotSchema from './accountSnapshot.json';
import opportunitySummarySchema from './opportunitySummary.json';
import marketContextSchema from './marketContext.json';
import opportunityRequirementsSchema from './opportunityRequirements.json';
import stakeholderMapSchema from './stakeholderMap.json';
import competitiveLandscapeSchema from './competitiveLandscape.json';
import vendorFitAndPlaysSchema from './vendorFitAndPlays.json';
import evidencePackSchema from './evidencePack.json';
import gapsAndQuestionsSchema from './gapsAndQuestions.json';
import newsOfInterestSchema from './newsOfInterest.json';
import criticalDatesSchema from './criticalDates.json';
import proposalOutlineSchema from './proposalOutline.json';

type JsonSchema = Record<string, unknown>;

export const dashboardSchemas = {
  accountSnapshot: accountSnapshotSchema,
  opportunitySummary: opportunitySummarySchema,
  marketContext: marketContextSchema,
  opportunityRequirements: opportunityRequirementsSchema,
  stakeholderMap: stakeholderMapSchema,
  competitiveLandscape: competitiveLandscapeSchema,
  vendorFitAndPlays: vendorFitAndPlaysSchema,
  evidencePack: evidencePackSchema,
  gapsAndQuestions: gapsAndQuestionsSchema,
  newsOfInterest: newsOfInterestSchema,
  criticalDates: criticalDatesSchema,
  proposalOutline: proposalOutlineSchema,
} as const satisfies Record<string, JsonSchema>;

export type DashboardSchemaName = keyof typeof dashboardSchemas;

export const loadDashboardSchema = (name: DashboardSchemaName): JsonSchema =>
  dashboardSchemas[name];

