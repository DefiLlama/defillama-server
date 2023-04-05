
export interface GovCache {
  id: string;
  metadata: { [key: string]: any };
  proposals: { [key: string]: Proposal };
  stats?: { [key: string]: any };
}
export interface CompoundCache extends GovCache {
}
export interface Proposal {
  id: string;
  title?: string;
  state: string;
  app: string;
  author?: string;
  description?: string;
  space: any;
  choices?: any[];
  network?: string;
  scores: number[];
  scores_total: number;
  quorum: number;
  votes: number;
  score_skew: number;
  score_curve: number;
  score_curve2: number;
  start: number;
  end: number;
  month?: string;
  strategies?: any;
  executed?: boolean;
}
export interface CompoundProposal extends Proposal {
  canceled: boolean;
  eta?: number;
  startBlock?: number;
  endBlock?: number;
  isInvalid?: boolean;
}