
import React, { useState, useEffect, useMemo } from 'react';
import type { Article } from '../types';
import { ExternalLink, Rss, ChevronLeft, ChevronRight } from 'lucide-react';

interface ArticleItemProps {
  article: Article;
}

const ArticleItemGrid: React.FC<ArticleItemProps> = ({ article }) => (
  <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col" style={{ borderTop: `4px solid ${article.feedColor || '#ccc'}`}}>
    <div className="p-5 flex-grow">
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate pr-2">{article.feedName}</p>
        <p className="text-xs text-gray-500 flex-shrink-0">{new Date(article.pubDate).toLocaleDateString()}</p>
      </div>
      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-3">{article.title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">{article.contentSnippet}</p>
    </div>
    <div className="bg-gray-50 p-4 border-t border-gray-100 mt-auto">
        <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
            Read More <ExternalLink size={14} className="ml-2" />
        </a>
    </div>
  </div>
);

const ArticleItemList: React.FC<ArticleItemProps> = ({ article }) => (
  <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex" style={{ borderLeft: `5px solid ${article.feedColor || '#ccc'}` }}>
    {article.thumbnailUrl && (
      <div className="w-24 md:w-32 flex-shrink-0">
        <img src={article.thumbnailUrl} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
      </div>
    )}
    <div className="p-4 flex flex-col justify-between flex-grow min-w-0">
      <div>
        <p className="text-xs text-gray-500 mb-1 truncate">{article.feedName}</p>
        <h3 className="font-bold text-md text-gray-900 mb-2 line-clamp-2">
           <a href={article.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">{article.title}</a>
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-1">{article.contentSnippet}</p>
      </div>
      <div className="flex justify-between items-center mt-2 text-xs">
         <p className="text-gray-400">{new Date(article.pubDate).toLocaleDateString()}</p>
         <a href={article.link} target="_blank" rel="noopener noreferrer" className="flex items-center font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Read <ExternalLink size={12} className="ml-1.5"/>
         </a>
      </div>
    </div>
  </div>
);


interface ArticleListProps {
  articles: Article[];
  isLoading: boolean;
  viewMode: 'grid' | 'list';
}

const GRID_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 100;

const LoadingSkeletonGrid: React.FC = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
        <div className="h-1 bg-gray-200"></div>
        <div className="p-5">
            <div className="flex justify-between items-start mb-3">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/5"></div>
            </div>
            <div className="h-5 bg-gray-300 rounded w-full mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
        <div className="bg-gray-50 p-4 border-t border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
        </div>
    </div>
);

const LoadingSkeletonList: React.FC = () => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex animate-pulse">
        <div className="w-32 flex-shrink-0 bg-gray-200"></div>
        <div className="p-4 flex-grow">
            <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-full mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
    </div>
);

const Pagination: React.FC<{ currentPage: number; totalPages: number; onPageChange: (page: number) => void; }> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    
    return (
        <div className="flex justify-center items-center mt-8 space-x-2">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-600">
                Page {currentPage} of {totalPages}
            </span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronRight size={20} />
            </button>
        </div>
    );
};


export const ArticleList: React.FC<ArticleListProps> = ({ articles, isLoading, viewMode }) => {
  const [visibleGridItems, setVisibleGridItems] = useState(GRID_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setVisibleGridItems(GRID_PAGE_SIZE);
    setCurrentPage(1);
  }, [articles, viewMode]);

  const NoArticlesMessage = () => (
    <div className="text-center py-20 bg-white rounded-lg shadow-md col-span-full">
        <Rss size={48} className="mx-auto text-gray-300 mb-4"/>
        <h3 className="text-xl font-semibold text-gray-800">No articles to show</h3>
        <p className="text-gray-500 mt-2">Add a feed or adjust your filters to get started.</p>
    </div>
  );

  if (isLoading && articles.length === 0) {
    if (viewMode === 'list') {
        return <div className="space-y-4">{Array.from({ length: 5 }).map((_, index) => <LoadingSkeletonList key={index} />)}</div>;
    }
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
           {Array.from({ length: 6 }).map((_, index) => <LoadingSkeletonGrid key={index} />)}
        </div>
    );
  }

  if (!isLoading && articles.length === 0) {
    return <NoArticlesMessage />;
  }

  if (viewMode === 'list') {
    const totalPages = Math.ceil(articles.length / LIST_PAGE_SIZE);
    const listArticles = articles.slice((currentPage - 1) * LIST_PAGE_SIZE, currentPage * LIST_PAGE_SIZE);
    return (
        <div>
            <div className="space-y-4">
                {listArticles.map((article, index) => <ArticleItemList key={`${article.link}-${index}`} article={article} />)}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
    );
  }
  
  // Grid View
  const gridArticles = articles.slice(0, visibleGridItems);
  const canLoadMore = visibleGridItems < articles.length;

  return (
    <div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {gridArticles.map((article, index) => (
            <ArticleItemGrid key={`${article.link}-${index}`} article={article} />
        ))}
        </div>
        {canLoadMore && (
            <div className="text-center mt-8">
                <button 
                    onClick={() => setVisibleGridItems(prev => prev + GRID_PAGE_SIZE)}
                    className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-6 border border-gray-300 rounded-lg shadow-sm transition-colors"
                >
                    Load More
                </button>
            </div>
        )}
    </div>
  );
};
