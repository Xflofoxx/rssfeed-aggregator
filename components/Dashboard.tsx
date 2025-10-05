
import React, { useState, useEffect, useCallback } from 'react';
import type { Article } from '../types';
import { generateDashboardInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BrainCircuit, Newspaper, TrendingUp } from 'lucide-react';

interface Trend {
  topic: string;
  count: number;
}
interface Insights {
  summary: string;
  trends: Trend[];
}

const DashboardCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center text-gray-500 mb-4">
            {icon}
            <h3 className="ml-3 font-semibold text-lg text-gray-800">{title}</h3>
        </div>
        <div>{children}</div>
    </div>
);

const DashboardSkeleton: React.FC = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
            <div className="h-6 w-1/2 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
        </div>
         <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="h-6 w-1/2 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
        </div>
    </div>
);


export const Dashboard: React.FC<{ articles: Article[] }> = ({ articles }) => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInsights = useCallback(async () => {
    if (articles.length === 0) {
      setInsights(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const articleTitles = articles.slice(0, 50).map(a => a.title);
      const result = await generateDashboardInsights(articleTitles);
      setInsights(result);
    } catch (err) {
      console.error(err);
      setError('Could not generate insights. The model may be unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [articles]);

  useEffect(() => {
    getInsights();
  }, [getInsights]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (!insights || articles.length === 0) {
    return (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
            <BrainCircuit size={48} className="mx-auto text-gray-300 mb-4"/>
            <h3 className="text-xl font-semibold text-gray-800">No Insights Available</h3>
            <p className="text-gray-500 mt-2">There are no articles to analyze. Add some feeds or clear your filters.</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <DashboardCard title="AI News Summary" icon={<Newspaper size={20} />}>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{insights.summary}</p>
        </DashboardCard>
      </div>
      <div className="lg:col-span-2">
         <DashboardCard title="Trending Topics" icon={<TrendingUp size={20} />}>
             <div style={{ width: '100%', height: 300 }}>
                 <ResponsiveContainer>
                    <BarChart data={insights.trends} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="topic" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip cursor={{fill: 'rgba(239, 246, 255, 0.5)'}} contentStyle={{
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem'
                        }}/>
                        <Bar dataKey="count" fill="#3b82f6" name="Mentions" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
             </div>
        </DashboardCard>
      </div>
    </div>
  );
};
