import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalysisById, AnalysisDoc, GeoReport } from '@/services/analysisService';
import { ArrowLeft, Download, Star, TrendingUp, AlertCircle, CheckCircle2, MapPin, Globe, Loader2 } from 'lucide-react';
import CompetitorTable from '@/components/CompetitorTable';
import RecommendationCard from '@/components/RecommendationCard';
import LocalSEOScoreCard from '@/components/LocalSEOScoreCard';
import { generateSmartRecommendations } from '@/lib/recommendationEngine';

// Helper to get a value safely
const get = (obj: Record<string, any>, path: string, fallback: any = null) => {
  if (!obj) return fallback;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : fallback), obj);
};

// Helper to render error messages
const ErrorCard = ({ title, error }: { title: string, error: any }) => (
  <Card className="border-red-500">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <AlertCircle className="text-red-500" />
        {title} - Data Unavailable
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-red-700">
        {typeof error === 'string' ? error : (error?.message || "An unknown error occurred.")}
      </p>
    </CardContent>
  </Card>
);

const AnalysisResults = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [analysis, setAnalysis] = useState<AnalysisDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No analysis ID provided.');
      setIsLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAnalysisById(id);
        if (data) {
          setAnalysis(data);
          console.log('Fetched analysis data:', data);
        } else {
          setError('Analysis not found.');
        }
      } catch (err: any) {
        setError(`Failed to fetch analysis: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  const handleDownload = () => {
    if (!analysis) return;
    console.log('Downloading analysis report...');
    const dataStr = JSON.stringify(analysis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-${analysis.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center p-6">
        <Loader2 className="animate-spin text-blue-600" size={64} />
        <p className="text-xl text-gray-700 mt-4">Loading your report...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex flex-col h-full w-full p-6">
        <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
            <ArrowLeft className="mr-2" size={18} />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">Analysis Not Found</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white p-10 rounded-lg shadow-md">
            <AlertCircle className="text-red-500 mx-auto" size={48} />
            <p className="text-gray-700 text-lg mt-4">{error || 'Could not find the requested analysis.'}</p>
            <Button onClick={() => navigate('/history')} className="mt-6">View All Analyses</Button>
          </div>
        </main>
      </div>
    );
  }

  const report = analysis.report;
  
  // CRITICAL FIX: Check for error property, not just existence
  const gbp = report.gbpAnalysis && !report.gbpAnalysis.error ? report.gbpAnalysis : null;
  const citations = report.citationAnalysis && !report.citationAnalysis.error ? report.citationAnalysis : null;
  const onPage = report.onPageAnalysis && !report.onPageAnalysis.error ? report.onPageAnalysis : null;
  const speed = report.speedInsights && !report.speedInsights.error ? report.speedInsights : null;

  // Safely get data with fallbacks
  const rating = get(gbp, 'rating', 'N/A');
  const reviewCount = get(gbp, 'reviewCount', 'N/A');
  const competitorsCount = get(gbp, 'competitors.length', 0);
  
  // Calculate Local SEO Score for the summary card
  const calculateQuickScore = () => {
    if (!onPage && !gbp && !citations) return 'N/A';
    
    let score = 0;
    let checks = 0;
    
    // Quick calculation based on available data
    if (gbp?.rating) {
      score += (gbp.rating / 5) * 25;
      checks++;
    }
    if (onPage?.hasLocalBusinessSchema) score += 25;
    if (onPage?.titleTag) score += 15;
    if (onPage?.localKeywordsInTitle || onPage?.cityInTitle) score += 10;
    if (citations && !citations.error) score += 25;
    
    return Math.round(score);
  };

  const localSEOScore = calculateQuickScore();

  // Generate recommendations only if onPage data exists
  const recommendations = [];
  if (onPage) {
    recommendations.push({
      title: 'Title Tag',
      description: onPage.titleTag ? `Your title tag is: "${onPage.titleTag}"` : "You are missing a title tag.",
      impact: 'High',
      difficulty: 'Easy'
    });
    recommendations.push({
      title: 'Meta Description',
      description: onPage.metaDescription ? `Your meta description is good.` : "You are missing a meta description. This is important for search rankings.",
      impact: 'High',
      difficulty: 'Easy'
    });
    recommendations.push({
      title: 'Local Business Schema',
      description: onPage.hasLocalBusinessSchema ? `Great job including schema!` : "You are missing LocalBusiness schema. This helps Google understand your business.",
      impact: 'Medium',
      difficulty: 'Medium'
    });
  }

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4">
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Your Rating</p>
                    <p className="text-3xl font-bold">{rating}</p>
                  </div>
                  <Star className="text-yellow-500" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Your Reviews</p>
                    <p className="text-3xl font-bold">{reviewCount}</p>
                  </div>
                  <TrendingUp className="text-blue-500" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Competitors</p>
                    <p className="text-3xl font-bold">{competitorsCount}</p>
                  </div>
                  <MapPin className="text-purple-500" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">SEO Score</p>
                    <p className="text-3xl font-bold">{localSEOScore}{localSEOScore !== 'N/A' ? '/100' : ''}</p>
                  </div>
                  <Globe className="text-green-500" size={32} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Local SEO Score Card - Always show, uses all available data */}
          <LocalSEOScoreCard report={analysis.report} />

          {/* AI Recommendations - Only show if onPage data exists */}
          {onPage && recommendations.length > 0 ? (
            <Card>
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
                {recommendations.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} index={index} />
                ))}
              </CardContent>
            </Card>
          ) : (
            <ErrorCard 
              title="AI Recommendations" 
              error={report.onPageAnalysis?.error || 'On-page analysis data could not be loaded.'} 
            />
          )}

          {/* Competitor Table - Only show if GBP data exists */}
          {gbp ? (
            <CompetitorTable analysis={analysis.report} />
          ) : (
            <ErrorCard 
              title="Competitor Analysis" 
              error={report.gbpAnalysis?.error || 'Google Business Profile data could not be loaded.'} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default AnalysisResults;