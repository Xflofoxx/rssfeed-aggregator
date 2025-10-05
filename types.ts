
export interface Article {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  isoDate: string;
  feedName: string;
}

export interface Feed {
  url: string;
  name: string;
  articles: Article[];
  tags: string[];
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
