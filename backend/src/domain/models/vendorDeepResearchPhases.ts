export type VendorDeepResearchPhaseCategory =
  | 'overview'
  | 'portfolio'
  | 'proofPoints'
  | 'signals';

export type VendorDeepResearchSubPhaseId =
  | 'summary'
  | 'portfolio'
  | 'evidence-cases'
  | 'evidence-partnerships'
  | 'evidence-awards'
  | 'signals-news'
  | 'signals-videos'
  | 'signals-social';

export interface VendorDeepResearchPhaseMeta {
  phase: VendorDeepResearchPhaseCategory;
  phaseLabel: string;
  subPhaseLabel: string;
}

export const vendorDeepResearchPhaseLabels: Record<
  VendorDeepResearchPhaseCategory,
  string
> = {
  overview: 'Overview ejecutivo',
  portfolio: 'Portfolio y posicionamiento',
  proofPoints: 'Proof points',
  signals: 'Market signals',
};

export const vendorDeepResearchPhaseCatalog: Record<
  VendorDeepResearchSubPhaseId,
  VendorDeepResearchPhaseMeta
> = {
  summary: {
    phase: 'overview',
    phaseLabel: vendorDeepResearchPhaseLabels.overview,
    subPhaseLabel: 'Executive overview',
  },
  portfolio: {
    phase: 'portfolio',
    phaseLabel: vendorDeepResearchPhaseLabels.portfolio,
    subPhaseLabel: 'Portfolio & differentiators',
  },
  'evidence-cases': {
    phase: 'proofPoints',
    phaseLabel: vendorDeepResearchPhaseLabels.proofPoints,
    subPhaseLabel: 'Proof points · Case studies',
  },
  'evidence-partnerships': {
    phase: 'proofPoints',
    phaseLabel: vendorDeepResearchPhaseLabels.proofPoints,
    subPhaseLabel: 'Proof points · Partnerships',
  },
  'evidence-awards': {
    phase: 'proofPoints',
    phaseLabel: vendorDeepResearchPhaseLabels.proofPoints,
    subPhaseLabel: 'Proof points · Awards',
  },
  'signals-news': {
    phase: 'signals',
    phaseLabel: vendorDeepResearchPhaseLabels.signals,
    subPhaseLabel: 'Market signals · News',
  },
  'signals-videos': {
    phase: 'signals',
    phaseLabel: vendorDeepResearchPhaseLabels.signals,
    subPhaseLabel: 'Market signals · Videos',
  },
  'signals-social': {
    phase: 'signals',
    phaseLabel: vendorDeepResearchPhaseLabels.signals,
    subPhaseLabel: 'Market signals · Social',
  },
};

export const vendorDeepResearchPhaseOrder: VendorDeepResearchPhaseCategory[] = [
  'overview',
  'portfolio',
  'proofPoints',
  'signals',
];

export const vendorDeepResearchSubPhaseOrder: VendorDeepResearchSubPhaseId[] = [
  'summary',
  'portfolio',
  'evidence-cases',
  'evidence-partnerships',
  'evidence-awards',
  'signals-news',
  'signals-videos',
  'signals-social',
];

