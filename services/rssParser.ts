
import type { Article, ParsedRss } from '../types';

// Using a CORS proxy to fetch RSS feeds from the client-side
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export async function fetchAndParseRss(feedUrl: string): Promise<ParsedRss> {
  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(feedUrl)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const parser = new window.DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) {
        throw new Error('Failed to parse XML');
    }

    const title = xmlDoc.querySelector('channel > title')?.textContent || 'Untitled Feed';
    const description = xmlDoc.querySelector('channel > description')?.textContent || '';
    const items: Article[] = [];
    
    xmlDoc.querySelectorAll('item, entry').forEach(item => {
      const articleTitle = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href') || '';
      const pubDate = item.querySelector('pubDate, published')?.textContent || new Date().toISOString();
      const contentSnippet = item.querySelector('description, summary, content')?.textContent?.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...' || '';
      const isoDate = new Date(pubDate).toISOString();

      items.push({
        title: articleTitle,
        link,
        pubDate,
        contentSnippet,
        isoDate,
        feedName: title
      });
    });

    return { title, description, items };
  } catch (error) {
    console.error('Error fetching or parsing RSS feed:', error);
    throw new Error('Could not fetch or parse the RSS feed. Please check the URL.');
  }
}
