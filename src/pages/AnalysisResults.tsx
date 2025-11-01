import { useParams, useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Star, TrendingUp, AlertCircle, CheckCircle2, MapPin, Globe } from 'lucide-react';
import { getAnalysisById } from '@/services/analysisService';
import CompetitorTable from '@/components/CompetitorTable';
import RecommendationCard from '@/components/RecommendationCard';
import PerformanceChart from '@/components/PerformanceChart';

const AnalysisResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const analysis = getAnalysisById(id || '');

  if (!analysis) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-semibold">Analysis Not Found</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Analysis not found</p>
            <Button onClick={() => navigate('/history')}>View All Analyses</Button>
          </div>
        </main>
      </div>
    );
  }

  const handleDownload = () => {
    console.log('Downloading analysis report...');
    // Simulate download
    const dataStr = JSON.stringify(analysis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-${analysis.id}.json`;
    link.click();
  };

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
                      <p className="text-3xl font-bold">{analysis.clientData.rating}</p>
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
                      <p className="text-3xl font-bold">{analysis.clientData.reviewCount}</p>
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
                      <p className="text-3xl font-bold">{analysis.competitors.length}</p>
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
                      <p className="text-3xl font-bold">{analysis.performanceScore}%</p>
                    </div>
                    <Globe className="text-green-500" size={32} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Performance Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <PerformanceChart analysis={analysis} />
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
                {analysis.recommendations.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} index={index} />
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Competitor Comparison Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <CompetitorTable analysis={analysis} />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AnalysisResults;