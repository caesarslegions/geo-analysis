import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // Keep this if you use react-router
import { generateRealReport, GeoReport } from '../services/analysisService';

// This is a simple results display component. You can replace this with
// your 'AnalysisResults.tsx' page navigation.
const ResultsDisplay = ({ report }: { report: GeoReport }) => {
  return (
    <div className="mt-8 p-4 bg-gray-50 rounded-md">
      <h2 className="text-xl font-bold mb-4">Analysis Complete!</h2>
      <pre className="text-sm bg-gray-900 text-white p-4 rounded-md overflow-x-auto">
        {JSON.stringify(report, null, 2)}
      </pre>
    </div>
  );
};


export default function NewAnalysis() {
  const [businessName, setBusinessName] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GeoReport | null>(null); // State to hold the report
  
  // const navigate = useNavigate(); // Uncomment if you use react-router

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !fullAddress || !websiteUrl) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReport(null); // Clear previous report

    try {
      // THIS IS THE KEY: We call the real function now
      const newReport: GeoReport = await generateRealReport(businessName, fullAddress, websiteUrl);
      
      setReport(newReport); // Set the report in state to display it

      // --- OR ---
      // If you want to navigate to a new page:
      // navigate('/analysis-results', { state: { report: newReport } });

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

      {/* Simple display for the results. You can remove this if you navigate to a new page. */}
      {report && <ResultsDisplay report={report} />}
    </div>
  );
}

