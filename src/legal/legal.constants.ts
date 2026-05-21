import * as path from 'path';

export const CURRENT_LEGAL_VERSION = '2026-05-21';
export const LEGAL_DIRECTORY =
  process.env.LEGAL_DIR || path.resolve(process.cwd(), 'storage', 'legal');

export const LEGAL_DOCUMENTS = {
  privacy: 'privacy_policy.md',
  terms: 'terms_of_service.md',
  retention: 'data_retention_policy.md',
} as const;

export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;
