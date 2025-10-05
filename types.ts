export interface Article {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  isoDate: string;
  feedName: string;
  thumbnailUrl?: string;
  feedColor?: string;
}

export interface Feed {
  url: string;
  name: string;
  articles: Article[];
  tags: string[];
  category?: string;
  color?: string;
}

export interface ParsedRss {
  title: string;
  description: string;
  items: Article[];
}

export interface Filter {
  searchTerm: string;
  tags: string[];
}

export interface SuggestedFeed {
  name: string;
  url: string;
}

export interface FeedStatus {
  lastRefreshed: number | null;
  isRefreshing: boolean;
}

export interface CacheEntry<T> {
  timestamp: number;
  data: T;
}
