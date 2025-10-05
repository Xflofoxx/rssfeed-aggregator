
import React, { useRef } from 'react';
import { BookOpen, BarChart2, Download, Upload, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentView: 'articles' | 'dashboard';
  setCurrentView: (view: 'articles' | 'dashboard') => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, onImport, onExport, onRefresh }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 hidden md:block">
              Gemini RSS Aggregator
            </h1>
             <div className="p-1 bg-gray-200 rounded-lg flex items-center">
              <button
                onClick={() => setCurrentView('articles')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'articles' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-300'
                }`}
              >
                <BookOpen size={16} />
                <span>Articles</span>
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'dashboard' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-300'
                }`}
              >
                <BarChart2 size={16} />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={onRefresh} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Refresh Feeds">
                <RefreshCw size={18} className="text-gray-600"/>
            </button>
             <button onClick={handleImportClick} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Import Feeds">
                <Upload size={18} className="text-gray-600"/>
            </button>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
            />
            <button onClick={onExport} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Export Feeds">
                <Download size={18} className="text-gray-600"/>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
