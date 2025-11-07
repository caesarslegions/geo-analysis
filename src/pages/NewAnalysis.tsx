import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRealReport } from '@/services/analysisService';

export default function NewAnalysis() {
  const [businessName, setBusinessName] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [businessPhone, setBusinessPhone] = useState(''); // NEW: Phone number state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // NEW: Optional phone number formatter
  const formatPhoneNumber = (value: string): string => {
    const phoneNumber = value.replace(/\D/g, '');
    
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !fullAddress || !websiteUrl) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Pass phone number to the report generation function
      const newReportId: string = await generateRealReport(
        businessName, 
        fullAddress, 
        websiteUrl,
        businessPhone // NEW: Pass phone number
      );
      
      navigate(`/analysis/${newReportId}`);

    } catch (err: any) {
      setError(`Failed to generate report: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">New GEO Analysis</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 shadow-md rounded-lg">
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
            Business Name *
          </label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g., Joe's Pizza"
            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="fullAddress" className="block text-sm font-medium text-gray-700">
            Full Address *
          </label>
          <input
            id="fullAddress"
            type="text"
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            placeholder="e.g., 123 Main St, Anytown, USA 12345"
            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            required
          />
          <p className="mt-1 text-xs text-gray-500">Format: Street, City, State ZIP</p>
        </div>

        {/* NEW: Phone Number Field */}
        <div>
          <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            id="businessPhone"
            type="tel"
            value={businessPhone}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value);
              setBusinessPhone(formatted);
            }}
            placeholder="(512) 555-1234"
            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional - Helps verify your business listings are consistent
          </p>
        </div>

        <div>
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
            Website URL *
          </label>
          <input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://www.joespizza.com"
            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            required
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
    </div>
  );
}