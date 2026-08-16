import { ExtractedRawData } from './extractor';
import { NormalizedArticleResult } from './normalizer';

export interface ValidationRuleOptions {
  minWordCount?: number;
  minContentLength?: number;
  requireAuthor?: boolean;
  requireImage?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  status: 'valid' | 'rejected';
  rejectionReason: string | null;
  score: number; // 0 to 100 quality score
}

/**
 * Validates the quality and completeness of extracted article data
 */
export function validateArticle(
  metadata: ExtractedRawData,
  normalized: NormalizedArticleResult,
  options: ValidationRuleOptions = {}
): ValidationResult {
  const minWordCount = options.minWordCount || 30;
  const minLength = options.minContentLength || 100;

  if (!metadata.title || metadata.title.trim().length < 5) {
    return {
      isValid: false,
      status: 'rejected',
      rejectionReason: 'Missing or too short title (min 5 chars)',
      score: 10,
    };
  }

  if (normalized.wordCount < minWordCount) {
    return {
      isValid: false,
      status: 'rejected',
      rejectionReason: `Word count too low: ${normalized.wordCount} words (minimum required is ${minWordCount})`,
      score: 30,
    };
  }

  if (normalized.plainText.length < minLength) {
    return {
      isValid: false,
      status: 'rejected',
      rejectionReason: `Content length too short: ${normalized.plainText.length} chars (minimum required is ${minLength})`,
      score: 35,
    };
  }

  if (normalized.blocks.length === 0) {
    return {
      isValid: false,
      status: 'rejected',
      rejectionReason: 'No structured content blocks could be extracted',
      score: 20,
    };
  }

  // Calculate quality score
  let score = 70;
  if (metadata.featuredImage) score += 10;
  if (metadata.author && metadata.author !== 'Editorial Staff') score += 5;
  if (metadata.tags && metadata.tags.length > 0) score += 5;
  if (normalized.blocks.length >= 3) score += 10;

  return {
    isValid: true,
    status: 'valid',
    rejectionReason: null,
    score: Math.min(100, score),
  };
}
