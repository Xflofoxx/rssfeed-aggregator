import React, { useState } from 'react';
import { findFeedsByTopic } from '../services/geminiService';
import type { Feed, Filter, SuggestedFeed, FeedStatus } from '../types';
import { Plus, Rss, Search, Tag, X, Lightbulb, Loader2, Check } from 'lucide-react';

interface SidebarProps {
  feeds: Feed[];
  addFeed: (url: string) => void;
  removeFeed: (url: string) => void;
  allTags: string[];
  filters: Filter;
  setFilters: React.Dispatch<React.SetStateAction<Filter>>;
  isLoading: boolean;
  addMultipleFeeds: (feeds: SuggestedFeed[]) => Promise<void>;
  feedStatus: Record<string, FeedStatus>;
}

const formatTimeAgo = (timestamp: number | null): string => {
    if (!timestamp) return '';
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const FeedFinder: React.FC<{ addMultipleFeeds: (feeds: SuggestedFeed[]) => Promise<void> }> = ({ addMultipleFeeds }) => {
    const [topic, setTopic] = useState('');
    const [suggestedFeeds, setSuggestedFeeds] = useState<SuggestedFeed[]>([]);
    const [selectedFeeds, setSelectedFeeds] = useState<string[]>([]); // store URLs
    const [isFinding, setIsFinding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFindFeeds = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsFinding(true);
        setError(null);
        setSuggestedFeeds([]);
        setSelectedFeeds([]);

        try {
            const results = await findFeedsByTopic(topic);
            setSuggestedFeeds(results);
            if (results.length === 0) {
                setError("No feeds found for this topic.");
            }
        } catch (err) {
            setError("Could not find feeds. Please try again.");
            console.error(err);
        } finally {
            setIsFinding(false);
        }
    };
    
    const handleToggleSelection = (url: string) => {
        setSelectedFeeds(prev => 
            prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
        );
    };

    const handleAddSelectedFeeds = () => {
        const feedsToAdd = suggestedFeeds.filter(f => selectedFeeds.includes(f.url));
        if(feedsToAdd.length > 0) {
            addMultipleFeeds(feedsToAdd);
        }
        setSuggestedFeeds([]);
        setSelectedFeeds([]);
    };

    return (
        <div className="mb-6 border-t border-b border-gray-700 py-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center"><Lightbulb size={16} className="mr-2 text-yellow-400"/>Discover Feeds</h3>
            <form onSubmit={handleFindFeeds} className="mb-4">
                <label htmlFor="find-feed-topic" className="sr-only">Topic</label>
                <div className="flex">
                    <input
                        id="find-feed-topic"
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Artificial Intelligence"
                        className="flex-grow bg-gray-700 text-white rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={isFinding}
                    />
                    <button type="submit" disabled={isFinding || !topic.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 rounded-r-md px-3 py-2 flex items-center justify-center transition-colors">
                        {isFinding ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                    </button>
                </div>
            </form>
            
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

            {suggestedFeeds.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto -mr-4 pr-4 py-2">
                    {suggestedFeeds.map((feed) => (
                        <div
                            key={feed.url}
                            onClick={() => handleToggleSelection(feed.url)}
                            className="flex items-center p-2 rounded-md cursor-pointer transition-colors bg-gray-700/50 hover:bg-gray-600/50"
                        >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-all flex-shrink-0 ${selectedFeeds.includes(feed.url) ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                                {selectedFeeds.includes(feed.url) && <Check size={14} className="text-white"/>}
                            </div>
                            <div className="flex-1 truncate">
                                <p className="text-sm font-medium text-white truncate" title={feed.name}>{feed.name}</p>
                                <p className="text-xs text-gray-400 truncate" title={feed.url}>{feed.url}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedFeeds.length > 0 && (
                <button 
                    onClick={handleAddSelectedFeeds}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors"
                >
                    Add {selectedFeeds.length} Selected Feed{selectedFeeds.length > 1 ? 's' : ''}
                </button>
            )}
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ feeds, addFeed, removeFeed, allTags, filters, setFilters, isLoading, addMultipleFeeds, feedStatus }) => {
  const [newFeedUrl, setNewFeedUrl] = useState('');
  
  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFeedUrl.trim()) {
      addFeed(newFeedUrl.trim());
      setNewFeedUrl('');
    }
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    setFilters(prev => ({ ...prev, tags: newTags }));
  };

  return (
    <aside className="fixed top-0 left-0 h-full w-full lg:w-80 bg-gray-800 text-white p-6 flex flex-col z-20 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">
        <div className="flex items-center space-x-2 mb-8">
            <Rss className="text-blue-400" size={28}/>
            <h2 className="text-2xl font-bold">Feeds</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto -mr-4 pr-4">
            <form onSubmit={handleAddFeed} className="mb-6">
                <label htmlFor="add-feed" className="text-sm font-medium text-gray-400 mb-2 block">Add RSS Feed URL</label>
                <div className="flex">
                    <input
                        id="add-feed"
                        type="url"
                        value={newFeedUrl}
                        onChange={(e) => setNewFeedUrl(e.target.value)}
                        placeholder="https://example.com/rss.xml"
                        className="flex-grow bg-gray-700 text-white rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-r-md px-3 py-2 flex items-center justify-center transition-colors">
                        <Plus size={20} />
                    </button>
                </div>
            </form>
            
            <FeedFinder addMultipleFeeds={addMultipleFeeds} />

            <div className="mb-6">
                <label htmlFor="search" className="text-sm font-medium text-gray-400 mb-2 block">Search Articles</label>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        id="search"
                        type="text"
                        value={filters.searchTerm}
                        onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        placeholder="Search by keyword..."
                        className="w-full bg-gray-700 text-white rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center"><Tag size={16} className="mr-2"/>Filter by Tags</h3>
                <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => handleTagToggle(tag)}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                filters.tags.includes(tag)
                                ? 'bg-blue-500 text-white ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-500'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
            
            <div>
                 <h3 className="text-sm font-medium text-gray-400 mb-3">Your Feeds</h3>
                 <ul className="space-y-2">
                     {feeds.map(feed => {
                        const status = feedStatus[feed.url];
                        const isRefreshing = status?.isRefreshing;
                        const lastRefreshed = status?.lastRefreshed;

                        return (
                            <li key={feed.url} className="flex items-center bg-gray-700/50 rounded-md p-2 group gap-2">
                                <span className="flex-1 text-sm truncate min-w-0" title={feed.name}>
                                    {feed.name}
                                </span>
                                <div className="flex-shrink-0">
                                    {isRefreshing ? (
                                        <Loader2 size={14} className="animate-spin text-gray-400" />
                                    ) : lastRefreshed ? (
                                        <span className="text-xs text-gray-500 whitespace-nowrap" title={new Date(lastRefreshed).toLocaleString()}>
                                            {formatTimeAgo(lastRefreshed)}
                                        </span>
                                    ) : null}
                                </div>
                                <button onClick={() => removeFeed(feed.url)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity flex-shrink-0">
                                    <X size={16} />
                                </button>
                            </li>
                        )
                     })}
                 </ul>
            </div>

        </div>
    </aside>
  );
};