import React, { useState } from 'react';
// --- NEW: Import useNavigate ---
import { useNavigate } from 'react-router-dom';
// --- FIX: Using alias path ---
import { generateRealReport } from '@/services/analysisService';

// (You can delete the ResultsDisplay component from this file if you want)
// const ResultsDisplay = ...


export default function NewAnalysis() {
  const [businessName, setBusinessName] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [report, setReport] = useState<GeoReport | null>(null); // We don't need this anymore
  
  // --- NEW: Initialize the navigate function ---
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !fullAddress || !websiteUrl) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError(null);
    // setReport(null); // We don't need this

    try {
      // --- UPDATED: This function now returns the new report ID ---
      const newReportId: string = await generateRealReport(businessName, fullAddress, websiteUrl);
      
      // --- THE FINAL STEP! ---
      // Navigate to the beautiful results page.
      navigate(`/analysis/${newReportId}`);

    } catch (err: any) {
      setError(`Failed to generate report: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Your JSX for the form
  return (
    <div className="p-8 max-w-lg mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">New GEO Analysis</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 shadow-md rounded-lg">
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">Business Name</label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g., Joe's Pizza"
            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="fullAddress" className="block text-sm font-medium text-gray-700">Full Address</label>
          <input
            id="fullAddress"
            type="text"
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            placeholder="e.g., 123 Main St, Anytown, USA 12345"
            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">Website URL</label>
          <input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://www.joespizza.com"
            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full p-3 bg-blue-600 text-white font-bold rounded-md shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Analyzing...' : 'Generate Report'}
        </button>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md border border-red-300">
            {error}
          </div>
        )}
      </form>

      {/* We no longer need to display the raw report here! */}
      {/* {report && <ResultsDisplay report={report} />} */}
    </div>
  );
}

