import React, { useState, useEffect } from 'react'; // Import useState/useEffect
import { useParams, useNavigate } from 'react-router-dom';
// FIX: Changed from alias '@/' to relative paths to resolve build errors.
import { SidebarTrigger } from '../components/ui/sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Star, TrendingUp, AlertCircle, CheckCircle2, MapPin, Globe, Loader2 } from 'lucide-react';
// Import the *type* and the *function*
import { getAnalysisById, AnalysisDoc } from '../services/analysisService'; 
import CompetitorTable from '../components/CompetitorTable';
import RecommendationCard from '../components/RecommendationCard';
import PerformanceChart from '../components/PerformanceChart';

const AnalysisResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- NEW: State for loading and data ---
  const [analysis, setAnalysis] = useState<AnalysisDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: useEffect to fetch data on component mount ---
  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    async function loadAnalysis() {
      setIsLoading(true);
      const data = await getAnalysisById(id);
      setAnalysis(data);
      setIsLoading(false);
    }
    loadAnalysis();
  }, [id]); // Re-run this if the 'id' parameter changes

  const handleDownload = () => {
    if (!analysis) return;
    console.log('Downloading analysis report...');
    const dataStr = JSON.stringify(analysis.report, null, 2); // Download the report part
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-${analysis.id}.json`;
    link.click();
  };

  // --- NEW: Loading State ---
  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-semibold">Loading Analysis...</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </main>
      </div>
    );
  }

  // --- NEW: Not Found State ---
  if (!analysis) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-semibold">Analysis Not Found</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Could not find an analysis with ID: {id}</p>
            <Button onClick={() => navigate('/history')}>View All Analyses</Button>
          </div>
        </main>
      </div>
    );
  }

  // --- This is your original code, now it works! ---
  // I've updated the data access to use `analysis.report.gbpAnalysis.rating` etc.
  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4">
        <SidebarTrigger />
        <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
          <ArrowLeft className="mr-2" size={18} />
          Back
        </Button>
        <h1 className="text-2xl font-semibold flex-1">{analysis.businessName} - Analysis Results</h1>
        <Button onClick={handleDownload} variant="outline">
          <Download className="mr-2" size={18} />
          Export Report
        </Button>
      </header>
      
      <main className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Your Rating</p>
                      <p className="text-3xl font-bold">{analysis.report.gbpAnalysis.rating || 'N/A'}</p>
                    </div>
                    <Star className="text-yellow-500" size={32} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Your Reviews</p>
                      <p className="text-3xl font-bold">{analysis.report.gbpAnalysis.reviewCount || 'N/A'}</p>
                    </div>
                    <TrendingUp className="text-blue-500" size={32} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Competitors</p>
                      <p className="text-3xl font-bold">{analysis.report.gbpAnalysis.topCompetitors?.length || 0}</p>
                    </div>
                    <MapPin className="text-purple-500" size={32} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Performance</p>
                      <p className="text-3xl font-bold">{analysis.report.speedInsights.performance?.toFixed(0) || 'N/A'}%</p>
                    </div>
                    <Globe className="text-green-500" size={32} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Performance Chart - This component will need to be updated to accept the `analysis.report` object */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {/* <PerformanceChart report={analysis.report} /> */}
            <Card><CardHeader><CardTitle>Performance Chart (Placeholder)</CardTitle></CardHeader><CardContent>You'll need to pass the `analysis.report` prop to your chart component.</CardContent></Card>
          </motion.div>

          {/* AI Recommendations */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
                    <TrendingUp className="text-white" size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">AI-Powered Recommendations</CardTitle>
                    <CardDescription className="text-base">
                      Prioritized action plan to improve your local SEO performance
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* This assumes recommendations are part of your report object, which wasn't in the gemini prompt. */}
                {/* You may need to add another Gemini call in `api/get-analysis.ts` to generate these! */}
                <p>Recommendations placeholder. You'll need to generate these.</p>
                {/* {analysis.report.recommendations.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} index={index} />
                ))} */}
              </CardContent>
            </Card>
          </motion.div>

          {/* Competitor Comparison Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            {/* <CompetitorTable report={analysis.report} /> */}
            <Card><CardHeader><CardTitle>Competitor Table (Placeholder)</CardTitle></CardHeader><CardContent>You'll need to pass the `analysis.report` prop to your table component.</CardContent></Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AnalysisResults;

