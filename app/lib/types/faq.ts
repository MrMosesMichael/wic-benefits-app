/**
 * FAQ Type Definitions for WIC Benefits App
 */

export type FAQCategory =
  | 'eligibility'
  | 'shopping'
  | 'formula'
  | 'benefits'
  | 'stores'
  | 'app';

export interface FAQCategoryInfo {
  id: FAQCategory;
  label: string;
  icon: string;
  color: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  tags: string[];
  priority: number; // Higher = more important, shown first
  relatedIds?: string[]; // Links to related FAQs
}

export interface FAQSearchResult {
  item: FAQItem;
  score: number; // Relevance score for search ranking
}
