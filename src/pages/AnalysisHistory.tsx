import React, { useState, useEffect } from 'react'; // Import useState/useEffect
import { Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Plus, Calendar, MapPin, TrendingUp, Eye, Loader2 } from 'lucide-react';
// Import the *type* and the *function*
// FIX: Changed from alias '@/' to a relative path to resolve the build error.
import { getAllAnalyses, AnalysisDoc } from '../services/analysisService';

const AnalysisHistory = () => {
  // --- NEW: State for loading and data ---
  const [analyses, setAnalyses] = useState<AnalysisDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: useEffect to fetch data on component mount ---
  useEffect(() => {
    async function loadAnalyses() {
      setIsLoading(true);
      const data = await getAllAnalyses();
      setAnalyses(data);
      setIsLoading(false);
    }
    loadAnalyses();
  }, []); // Empty array [] means this runs once when the component loads

  // --- NEW: Loading State ---
  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-semibold flex-1">Analysis History</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </main>
      </div>
    );
  }

  // --- This is your original code, now it works! ---
  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4">
        <SidebarTrigger />
        <h1 className="text-2xl font-semibold flex-1">Analysis History</h1>
        <Link to="/new-analysis">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="mr-2" size={18} />
            New Analysis
          </Button>
        </Link>
      </header>
      
      <main className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {analyses.length === 0 ? (
            <Card className="border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <TrendingUp className="text-gray-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No analyses yet</h3>
                <p className="text-gray-600 mb-6">Start your first competitor analysis to see results here</p>
                <Link to="/new-analysis">
                  <Button size="lg">
                    <Plus className="mr-2" size={18} />
                    Create First Analysis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {analyses.map((analysis, index) => (
                <motion.div
                  key={analysis.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-2 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{analysis.businessName}</CardTitle>
                          <CardDescription className="space-y-2">
                            {/* FIX: Use analysis.report.onPageAnalysis... or similar. 'location' wasn't in your data. */}
                            {/* I'll comment this out for now. */}
                            {/* <div className="flex items-center gap-2 text-sm">
                              <MapPin size={16} />
                              <span>{analysis.location}</span>
                            </div> */}
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar size={16} />
                              <span>{analysis.createdAt.toLocaleDateString()}</span>
                            </div>
                          </CardDescription>
                        </div>
                        {/* FIX: performanceScore wasn't in your data. Using speedInsights score as an example */}
                        <Badge variant="secondary" className="text-base px-3 py-1">
                          Score: {analysis.report.speedInsights.performance?.toFixed(0) || 'N/A'}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-6 text-sm">
                          <div>
                            <p className="text-gray-600">Your Rating</p>
                            <p className="font-semibold text-lg">{analysis.report.gbpAnalysis.rating || 'N/A'} ⭐</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Reviews</p>
                            <p className="font-semibold text-lg">{analysis.report.gbpAnalysis.reviewCount || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Competitors</p>
                            <p className="font-semibold text-lg">{analysis.report.gbpAnalysis.topCompetitors?.length || 0}</p>
                          </div>
                        </div>
                        <Link to={`/analysis/${analysis.id}`}>
                          <Button>
                            <Eye className="mr-2" size={18} />
                            View Results
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AnalysisHistory;

