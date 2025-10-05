
import React, { useState } from 'react';
import type { Feed, Filter } from '../types';
import { Plus, Rss, Search, Tag, X } from 'lucide-react';

interface SidebarProps {
  feeds: Feed[];
  addFeed: (url: string) => void;
  removeFeed: (url: string) => void;
  allTags: string[];
  filters: Filter;
  setFilters: React.Dispatch<React.SetStateAction<Filter>>;
  isLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ feeds, addFeed, removeFeed, allTags, filters, setFilters, isLoading }) => {
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
                <label htmlFor="add-feed" className="text-sm font-medium text-gray-400 mb-2 block">Add RSS Feed</label>
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
                     {feeds.map(feed => (
                         <li key={feed.url} className="flex items-center justify-between bg-gray-700/50 rounded-md p-2 group">
                             <span className="text-sm truncate pr-2" title={feed.name}>{feed.name}</span>
                             <button onClick={() => removeFeed(feed.url)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity">
                                 <X size={16} />
                             </button>
                         </li>
                     ))}
                 </ul>
            </div>

        </div>
    </aside>
  );
};
