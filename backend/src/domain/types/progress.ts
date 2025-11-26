export interface ProgressEvent {
  stepId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  message?: string;
  progress?: number; // 0-100
}

export type ProgressCallback = (event: ProgressEvent) => void;

