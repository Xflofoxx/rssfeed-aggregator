import type { Article, ParsedRss, CacheEntry } from '../types';

// Using a CORS proxy to fetch RSS feeds from the client-side
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const CACHE_PREFIX = 'rss-cache-';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function fetchAndParseRss(
  feedUrl: string,
  options: { forceRefresh?: boolean } = {}
): Promise<ParsedRss> {
  const { forceRefresh = false } = options;
  const cacheKey = `${CACHE_PREFIX}${feedUrl}`;

  if (!forceRefresh) {
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      try {
        const cacheEntry: CacheEntry<ParsedRss> = JSON.parse(cachedItem);
        const isCacheValid = (Date.now() - cacheEntry.timestamp) < CACHE_DURATION_MS;
        if (isCacheValid) {
          // Re-assign feedName to articles from cache as it might not be stored with each article
          cacheEntry.data.items.forEach(item => {
              item.feedName = cacheEntry.data.title;
          });
          return cacheEntry.data;
        }
      } catch (e) {
        console.warn('Failed to parse cache, fetching fresh data.', e);
        localStorage.removeItem(cacheKey);
      }
    }
  }

  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(feedUrl)}`);
    
    if (response.status === 404) throw new Error('Invalid URL: The requested feed was not found (404).');
    if (response.status === 429) throw new Error('The feed might be rate-limiting requests, try refreshing later.');
    if (!response.ok) {
      throw new Error(`Invalid URL or network error (status: ${response.status}).`);
    }
    
    const text = await response.text();
    const parser = new window.DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) {
        console.error('Parser Error:', errorNode.textContent);
        throw new Error('Feed content is empty or malformed.');
    }

    const title = xmlDoc.querySelector('channel > title')?.textContent || 'Untitled Feed';
    const description = xmlDoc.querySelector('channel > description')?.textContent || '';
    const items: Article[] = [];
    
    xmlDoc.querySelectorAll('item, entry').forEach(item => {
      const articleTitle = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href') || '';
      const pubDate = item.querySelector('pubDate, published')?.textContent || new Date().toISOString();
      const contentSnippetRaw = item.querySelector('description, summary, content, content\\:encoded')?.textContent || '';
      
      let thumbnailUrl: string | undefined;
      const mediaNamespace = (ns: string) => `http://search.yahoo.com/mrss/`;
      const mediaThumbnail = item.querySelector('media\\:thumbnail, thumbnail');
      if (mediaThumbnail) {
          thumbnailUrl = mediaThumbnail.getAttribute('url') || undefined;
      }
      if (!thumbnailUrl) {
          const enclosure = item.querySelector('enclosure[url]');
          if (enclosure && enclosure.getAttribute('type')?.startsWith('image/')) {
              thumbnailUrl = enclosure.getAttribute('url') || undefined;
          }
      }
       if (!thumbnailUrl) {
          const imgMatch = contentSnippetRaw.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch && imgMatch[1]) {
              thumbnailUrl = imgMatch[1];
          }
      }

      const contentSnippet = contentSnippetRaw.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...';
      const isoDate = new Date(pubDate).toISOString();

      items.push({
        title: articleTitle,
        link,
        pubDate,
        contentSnippet,
        isoDate,
        feedName: title,
        thumbnailUrl
      });
    });
    
    if (items.length === 0 && !errorNode) {
       throw new Error('Feed content is empty or malformed.');
    }

    const parsedData: ParsedRss = { title, description, items };
    
    const cacheEntry: CacheEntry<ParsedRss> = {
      timestamp: Date.now(),
      data: parsedData,
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));

    return parsedData;
  } catch (error) {
    console.error('Error fetching or parsing RSS feed:', error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('Could not fetch or parse the RSS feed. Please check the URL.');
  }
}
