import appConfigJson from '../../config/app-config.json';

export interface AppConfig {
  features: {
    enableDeepResearch: boolean;
    enableDossierUploads: boolean;
    enableLlmCache: boolean;
    enableLegacyDashboardEndpoint: boolean;
  };
  limits: {
    maxDossierTextCharacters: number;
    maxDossierFileSizeMB: number;
  };
}

export const appConfig: AppConfig = appConfigJson;


