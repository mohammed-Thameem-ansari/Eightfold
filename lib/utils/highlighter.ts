/**
 * Text Highlighter Utility
 * Highlights search terms and keywords in text content
 */

export interface HighlightMatch {
  text: string;
  isHighlight: boolean;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlight search terms in text
 */
export function highlightText(
  text: string,
  searchTerms: string | string[],
  caseSensitive: boolean = false
): HighlightMatch[] {
  if (!text || !searchTerms) {
    return [{ text, isHighlight: false }];
  }

  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
  
  // Filter out empty terms and escape special characters
  const validTerms = terms
    .filter(term => term.trim().length > 0)
    .map(term => escapeRegex(term.trim()));

  if (validTerms.length === 0) {
    return [{ text, isHighlight: false }];
  }

  // Create regex pattern
  const pattern = validTerms.join('|');
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(`(${pattern})`, flags);

  // Split text by matches
  const parts = text.split(regex);
  
  return parts.map(part => ({
    text: part,
    isHighlight: validTerms.some(term => {
      const termRegex = new RegExp(`^${term}$`, caseSensitive ? '' : 'i');
      return termRegex.test(part);
    })
  }));
}

/**
 * Extract keywords from query for highlighting
 */
export function extractKeywords(query: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'what', 'when', 'where', 'who', 'why',
    'how', 'research', 'analyze', 'generate', 'about', 'tell', 'me'
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // Limit to 10 keywords
}

/**
 * Count total matches in text
 */
export function countMatches(
  text: string,
  searchTerms: string | string[],
  caseSensitive: boolean = false
): number {
  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
  const validTerms = terms.filter(term => term.trim().length > 0);
  
  if (validTerms.length === 0) {
    return 0;
  }

  const pattern = validTerms.map(term => escapeRegex(term.trim())).join('|');
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(pattern, flags);
  
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}
