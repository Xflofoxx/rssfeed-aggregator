import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ArticleList } from './components/ArticleList';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { fetchAndParseRss } from './services/rssParser';
import { generateTagsForFeed } from './services/geminiService';
import type { Feed, Article, Filter, SuggestedFeed, FeedStatus } from './types';

const App: React.FC = () => {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'articles' | 'dashboard'>('articles');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<Filter>({ searchTerm: '', tags: [] });
  const [feedStatus, setFeedStatus] = useState<Record<string, FeedStatus>>({});

  useEffect(() => {
    const savedFeeds = localStorage.getItem('rss-feeds');
    if (savedFeeds) {
      const parsedFeeds: Omit<Feed, 'articles'>[] = JSON.parse(savedFeeds);
      if (parsedFeeds.length > 0) {
        setFeeds(parsedFeeds.map(f => ({...f, articles: []}))); // Set initial feeds
        refreshAllFeeds(parsedFeeds);
      }
    }
  }, []);

  const saveFeedsToLocalStorage = (feedsToSave: Omit<Feed, 'articles'>[]) => {
    localStorage.setItem('rss-feeds', JSON.stringify(feedsToSave.map(({ url, name, tags, category, color }) => ({ url, name, tags, category, color }))));
  };
  
  const refreshAllFeeds = useCallback(async (feedsToRefresh: Omit<Feed, 'articles'>[], forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    setFeedStatus(prev => {
        const newStatus = { ...prev };
        feedsToRefresh.forEach(f => {
          newStatus[f.url] = { ...(newStatus[f.url] || { lastRefreshed: null }), isRefreshing: true };
        });
        return newStatus;
      });
    try {
      const allFeedData = await Promise.all(
        feedsToRefresh.map(async (feed) => {
          try {
            const feedData = await fetchAndParseRss(feed.url, { forceRefresh });
            setFeedStatus(prev => ({ ...prev, [feed.url]: { isRefreshing: false, lastRefreshed: Date.now() } }));
            return {
              ...feed,
              name: feedData.title,
              articles: feedData.items,
            };
          } catch (e) {
            console.error(`Failed to refresh feed: ${feed.url}`, e);
            setError(`Failed to refresh ${feed.name || feed.url}.`);
            setFeedStatus(prev => ({ ...prev, [feed.url]: { ...(prev[feed.url] || { lastRefreshed: null }), isRefreshing: false } }));
            return null; // Return null for failed feeds
          }
        })
      );

      const successfulFeeds = allFeedData.filter((feed): feed is Feed => feed !== null);
      
      const unchangedFeeds = feeds.filter(f => !feedsToRefresh.some(ftr => ftr.url === f.url));
      const updatedFeeds = [...unchangedFeeds, ...successfulFeeds];

      setFeeds(updatedFeeds);
      const allArticles = updatedFeeds.flatMap(feed => 
        feed.articles.map(article => ({
            ...article,
            feedColor: feed.color || '#60A5FA'
        }))
      );
      allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setArticles(allArticles);
      saveFeedsToLocalStorage(updatedFeeds);
    } catch (err) {
      setError('Failed to refresh feeds.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [feeds]);


  const addFeed = async (url: string) => {
    if (feeds.some(feed => feed.url === url)) {
      setError('Feed already exists.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setFeedStatus(prev => ({ ...prev, [url]: { isRefreshing: true, lastRefreshed: null } }));

    try {
      const feedData = await fetchAndParseRss(url, { forceRefresh: true });
      const tags = await generateTagsForFeed(feedData.title, feedData.description, feedData.items.slice(0, 5));
      const newFeed: Feed = {
        url,
        name: feedData.title,
        articles: feedData.items,
        tags,
        category: 'Uncategorized',
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}` // Random color
      };
      const updatedFeeds = [...feeds, newFeed];
      setFeeds(updatedFeeds);
      const allArticles = updatedFeeds.flatMap(f => f.articles.map(a => ({...a, feedColor: f.color}))).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setArticles(allArticles);
      saveFeedsToLocalStorage(updatedFeeds);
      setFeedStatus(prev => ({ ...prev, [url]: { isRefreshing: false, lastRefreshed: Date.now() } }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add feed. Check the URL and try again.';
      setError(errorMessage);
      console.error(err);
      setFeedStatus(prev => ({ ...prev, [url]: { ...prev[url], isRefreshing: false } }));
    } finally {
      setIsLoading(false);
    }
  };

  const addMultipleFeeds = async (feedsToAdd: SuggestedFeed[]) => {
    const newFeedsInfo = feedsToAdd.filter(
      (f) => !feeds.some((existingFeed) => existingFeed.url === f.url)
    );

    if (newFeedsInfo.length === 0) {
      setError('All selected feeds already exist.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);
    setFeedStatus(prev => {
        const newStatus = { ...prev };
        newFeedsInfo.forEach(f => {
            newStatus[f.url] = { lastRefreshed: null, isRefreshing: true };
        });
        return newStatus;
    });

    try {
      const processedFeeds = await Promise.all(
        // Fix: Explicitly type the return value of the map's async function to `Promise<Feed | null>`. This ensures that the type of `processedFeeds` is `(Feed | null)[]`, which allows the type predicate `f is Feed` in the subsequent filter to work correctly.
        newFeedsInfo.map(async (feedInfo): Promise<Feed | null> => {
          try {
            const feedData = await fetchAndParseRss(feedInfo.url, { forceRefresh: true });
            const name = feedInfo.name || feedData.title; 
            const tags = await generateTagsForFeed(name, feedData.description, feedData.items.slice(0, 5));
            setFeedStatus(prev => ({...prev, [feedInfo.url]: { isRefreshing: false, lastRefreshed: Date.now()}}));
            return {
              url: feedInfo.url,
              name: name,
              articles: feedData.items,
              tags,
              category: 'Newly Added',
              color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
            };
          } catch (e) {
            console.error(`Failed to process feed: ${feedInfo.url}`, e);
            setFeedStatus(prev => ({ ...prev, [feedInfo.url]: { ...(prev[feedInfo.url] || { lastRefreshed: null }), isRefreshing: false } }));
            return null;
          }
        })
      );
      
      const successfulNewFeeds = processedFeeds.filter((f): f is Feed => f !== null);

      if (successfulNewFeeds.length > 0) {
        const updatedFeeds = [...feeds, ...successfulNewFeeds];
        setFeeds(updatedFeeds);
        
        const allArticles = updatedFeeds.flatMap(f => f.articles.map(a => ({...a, feedColor: f.color}))).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        setArticles(allArticles);
        
        saveFeedsToLocalStorage(updatedFeeds);
      }

       const failedCount = newFeedsInfo.length - successfulNewFeeds.length;
      if (failedCount > 0) {
        setError(`${failedCount} feed${failedCount > 1 ? 's' : ''} could not be added.`);
        setTimeout(() => setError(null), 4000);
      }

    } catch (err) {
      setError('An error occurred while adding feeds.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFeed = (url: string) => {
    const updatedFeeds = feeds.filter(feed => feed.url !== url);
    setFeeds(updatedFeeds);
    const allArticles = updatedFeeds.flatMap(f => f.articles.map(a => ({...a, feedColor: f.color}))).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    setArticles(allArticles);
    saveFeedsToLocalStorage(updatedFeeds);
    setFeedStatus(prev => {
        const newStatus = {...prev};
        delete newStatus[url];
        return newStatus;
    });
  };
  
  const updateFeedDetails = (url: string, details: { category?: string; color?: string }) => {
    setFeeds(prevFeeds => {
        const newFeeds = prevFeeds.map(feed => {
            if (feed.url === url) {
                return { ...feed, ...details };
            }
            return feed;
        });
        saveFeedsToLocalStorage(newFeeds);
        return newFeeds;
    });
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
    const feedsToExport = feeds.map(({ url, name, tags, category, color }) => ({ url, name, tags, category, color }));
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
          if (Array.isArray(importedFeeds) && importedFeeds.every(f => f.url && f.name)) {
             const uniqueFeeds = importedFeeds.filter(
              (f) => !feeds.some((existing) => existing.url === f.url)
            );
            // Add default category/color if missing
            const feedsToLoad = uniqueFeeds.map(f => ({
                tags: [],
                ...f,
                category: f.category || 'Imported',
                color: f.color || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
            }))
            await refreshAllFeeds([...feeds, ...feedsToLoad], true);
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
      <div className="flex h-screen">
        <main className="flex-1 flex flex-col overflow-y-auto">
          <Header
            currentView={currentView}
            setCurrentView={setCurrentView}
            onImport={importFeeds}
            onExport={exportFeeds}
            onRefresh={() => refreshAllFeeds(feeds, true)}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
          <div className="p-4 md:p-6 lg:p-8 flex-1">
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
              <ArticleList articles={filteredArticles} isLoading={isLoading} viewMode={viewMode} />
            ) : (
              <Dashboard articles={filteredArticles} />
            )}
          </div>
        </main>
        <Sidebar
          feeds={feeds}
          addFeed={addFeed}
          removeFeed={removeFeed}
          allTags={allTags}
          filters={filters}
          setFilters={setFilters}
          isLoading={isLoading}
          addMultipleFeeds={addMultipleFeeds}
          feedStatus={feedStatus}
          updateFeedDetails={updateFeedDetails}
        />
      </div>
    </div>
  );
};

export default App;
