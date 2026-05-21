import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  CURRENT_LEGAL_VERSION,
  LEGAL_DIRECTORY,
  LEGAL_DOCUMENTS,
  LegalDocumentKey,
} from './legal.constants';

@Injectable()
export class LegalService {
  private readonly legalRoot = path.resolve(LEGAL_DIRECTORY);

  async getDocument(type: LegalDocumentKey) {
    const filename = LEGAL_DOCUMENTS[type];
    const filePath = path.resolve(this.legalRoot, filename);
    const relative = path.relative(this.legalRoot, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new NotFoundException('Legal document not found');
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        filename,
        version: CURRENT_LEGAL_VERSION,
        content,
      };
    } catch (error) {
      throw new NotFoundException('Legal document not found');
    }
  }

  getVersions() {
    return Object.values(LEGAL_DOCUMENTS).map((filename) => ({
      filename,
      version: CURRENT_LEGAL_VERSION,
    }));
  }
}
