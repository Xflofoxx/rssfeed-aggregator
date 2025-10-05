
import React from 'react';
import type { Article } from '../types';
import { ExternalLink, Rss } from 'lucide-react';

interface ArticleItemProps {
  article: Article;
}

const ArticleItem: React.FC<ArticleItemProps> = ({ article }) => (
  <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
    <div className="p-5 flex-grow">
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{article.feedName}</p>
        <p className="text-xs text-gray-500">{new Date(article.pubDate).toLocaleDateString()}</p>
      </div>
      <h3 className="font-bold text-lg text-gray-900 mb-2">{article.title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{article.contentSnippet}</p>
    </div>
    <div className="bg-gray-50 p-4 border-t border-gray-100">
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

interface ArticleListProps {
  articles: Article[];
  isLoading: boolean;
}

const LoadingSkeleton: React.FC = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
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


export const ArticleList: React.FC<ArticleListProps> = ({ articles, isLoading }) => {
  if (isLoading && articles.length === 0) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
           {Array.from({ length: 8 }).map((_, index) => <LoadingSkeleton key={index} />)}
        </div>
    );
  }

  if (!isLoading && articles.length === 0) {
    return (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
            <Rss size={48} className="mx-auto text-gray-300 mb-4"/>
            <h3 className="text-xl font-semibold text-gray-800">No articles to show</h3>
            <p className="text-gray-500 mt-2">Add a feed or adjust your filters to get started.</p>
        </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {articles.map((article, index) => (
        <ArticleItem key={`${article.link}-${index}`} article={article} />
      ))}
    </div>
  );
};
