
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ArticleList } from './components/ArticleList';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { fetchAndParseRss } from './services/rssParser';
import { generateTagsForFeed } from './services/geminiService';
import type { Feed, Article, Filter } from './types';

const App: React.FC = () => {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'articles' | 'dashboard'>('articles');
  const [filters, setFilters] = useState<Filter>({ searchTerm: '', tags: [] });

  useEffect(() => {
    const savedFeeds = localStorage.getItem('rss-feeds');
    if (savedFeeds) {
      const parsedFeeds: Omit<Feed, 'articles'>[] = JSON.parse(savedFeeds);
      if (parsedFeeds.length > 0) {
        refreshAllFeeds(parsedFeeds);
      }
    }
  }, []);

  const saveFeedsToLocalStorage = (feedsToSave: Omit<Feed, 'articles'>[]) => {
    localStorage.setItem('rss-feeds', JSON.stringify(feedsToSave.map(({ url, name, tags }) => ({ url, name, tags }))));
  };
  
  const refreshAllFeeds = useCallback(async (feedsToRefresh: Omit<Feed, 'articles'>[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const allFeedData = await Promise.all(
        feedsToRefresh.map(async (feed) => {
          try {
            const feedData = await fetchAndParseRss(feed.url);
            return {
              ...feed,
              name: feedData.title,
              articles: feedData.items,
            };
          } catch (e) {
            console.error(`Failed to refresh feed: ${feed.url}`, e);
            return null; // Return null for failed feeds
          }
        })
      );

      const successfulFeeds = allFeedData.filter((feed): feed is Feed => feed !== null);
      
      setFeeds(successfulFeeds);
      const allArticles = successfulFeeds.flatMap(feed => feed.articles);
      allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setArticles(allArticles);
    } catch (err) {
      setError('Failed to refresh feeds.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);


  const addFeed = async (url: string) => {
    if (feeds.some(feed => feed.url === url)) {
      setError('Feed already exists.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const feedData = await fetchAndParseRss(url);
      const tags = await generateTagsForFeed(feedData.title, feedData.description, feedData.items.slice(0, 5));
      const newFeed: Feed = {
        url,
        name: feedData.title,
        articles: feedData.items,
        tags,
      };
      const updatedFeeds = [...feeds, newFeed];
      setFeeds(updatedFeeds);
      const allArticles = updatedFeeds.flatMap(f => f.articles).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setArticles(allArticles);
      saveFeedsToLocalStorage(updatedFeeds);
    } catch (err) {
      setError('Failed to add feed. Check the URL and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFeed = (url: string) => {
    const updatedFeeds = feeds.filter(feed => feed.url !== url);
    setFeeds(updatedFeeds);
    const allArticles = updatedFeeds.flatMap(f => f.articles).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    setArticles(allArticles);
    saveFeedsToLocalStorage(updatedFeeds);
  };
  
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    feeds.forEach(feed => {
      feed.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [feeds]);

  useEffect(() => {
    let tempArticles = [...articles];

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      tempArticles = tempArticles.filter(
        article =>
          article.title.toLowerCase().includes(searchTerm) ||
          article.contentSnippet?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.tags.length > 0) {
        const selectedTags = new Set(filters.tags);
        const feedsWithTags = new Set(feeds.filter(feed => feed.tags.some(tag => selectedTags.has(tag))).map(f => f.name));
        tempArticles = tempArticles.filter(article => feedsWithTags.has(article.feedName));
    }

    setFilteredArticles(tempArticles);
  }, [articles, filters, feeds]);

  const exportFeeds = () => {
    const feedsToExport = feeds.map(({ url, name, tags }) => ({ url, name, tags }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(feedsToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "gemini_rss_feeds.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importFeeds = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        if (typeof content === 'string') {
          const importedFeeds: Omit<Feed, 'articles'>[] = JSON.parse(content);
          // Basic validation
          if (Array.isArray(importedFeeds) && importedFeeds.every(f => f.url && f.name && Array.isArray(f.tags))) {
            await refreshAllFeeds(importedFeeds);
            saveFeedsToLocalStorage(importedFeeds);
          } else {
             setError('Invalid file format.');
          }
        }
      } catch (e) {
        setError('Failed to parse file.');
        console.error(e);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-gray-100 min-h-screen text-gray-800">
      <div className="flex">
        <Sidebar
          feeds={feeds}
          addFeed={addFeed}
          removeFeed={removeFeed}
          allTags={allTags}
          filters={filters}
          setFilters={setFilters}
          isLoading={isLoading}
        />
        <main className="flex-1 lg:ml-80">
          <Header
            currentView={currentView}
            setCurrentView={setCurrentView}
            onImport={importFeeds}
            onExport={exportFeeds}
            onRefresh={() => refreshAllFeeds(feeds)}
          />
          <div className="p-4 md:p-6 lg:p-8">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
                  <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </span>
              </div>
            )}
            {currentView === 'articles' ? (
              <ArticleList articles={filteredArticles} isLoading={isLoading} />
            ) : (
              <Dashboard articles={filteredArticles} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
