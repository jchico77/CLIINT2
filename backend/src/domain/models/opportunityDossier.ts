export type DossierSourceType =
  | 'rfp'
  | 'brief'
  | 'email'
  | 'meeting_notes'
  | 'other';

export interface DossierTextChunk {
  id: string;
  sourceType: DossierSourceType;
  title?: string;
  content: string;
  createdAt: string;
}

export interface OpportunityDossier {
  opportunityId: string;
  textChunks: DossierTextChunk[];
  openAiFileIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDossierTextChunkInput {
  sourceType: DossierSourceType;
  title?: string;
  content: string;
}


