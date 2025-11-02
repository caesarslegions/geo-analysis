import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, AlertCircle, Activity } from 'lucide-react';
import { GeoReport } from '@/services/analysisService';

interface PerformanceChartProps {
  analysis: GeoReport;
}

const PerformanceChart = ({ analysis }: PerformanceChartProps) => {
  const gbp = analysis.gbpAnalysis;
  const onPage = analysis.onPageAnalysis;
  const citations = analysis.citationAnalysis;
  
  // Safety checks
  if (!gbp || gbp.error) {
    return (
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="text-red-500" />
            Performance Data Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">
            {gbp?.error || "Could not load performance data."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate SEO score based on available data
  const calculateSEOScore = () => {
    let score = 0;
    let maxScore = 0;

    // Title tag (20 points)
    maxScore += 20;
    if (onPage?.titleTag) score += 20;
    
    // Meta description (15 points)
    maxScore += 15;
    if (onPage?.metaDescription) score += 15;
    
    // Local keywords in title (15 points)
    maxScore += 15;
    if (onPage?.localKeywordsInTitle) score += 15;
    
    // H1 content (10 points)
    maxScore += 10;
    if (onPage?.h1Content) score += 10;
    
    // Address found (10 points)
    maxScore += 10;
    if (onPage?.addressFound) score += 10;
    
    // Phone number found (10 points)
    maxScore += 10;
    if (onPage?.phoneNumberFound) score += 10;
    
    // Local Business Schema (20 points)
    maxScore += 20;
    if (onPage?.hasLocalBusinessSchema) score += 20;

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  };

  // Calculate citation score
  const calculateCitationScore = () => {
    if (!citations) return 0;
    
    let found = 0;
    let total = 0;
    
    if (citations.yelp) {
      total++;
      if (citations.yelp.found) found++;
    }
    if (citations.foursquare) {
      total++;
      if (citations.foursquare.found) found++;
    }
    if (citations.yellowPages) {
      total++;
      if (citations.yellowPages.found) found++;
    }
    
    return total > 0 ? Math.round((found / total) * 100) : 0;
  };

  const seoScore = calculateSEOScore();
  const citationScore = calculateCitationScore();
  const reviewScore = gbp.reviewCount ? Math.min(Math.round((gbp.reviewCount / 100) * 100), 100) : 0;
  const ratingScore = gbp.rating ? Math.round((gbp.rating / 5) * 100) : 0;

  // Prepare data for bar chart
  const performanceData = [
    {
      category: 'GBP Rating',
      score: ratingScore,
      fill: '#3b82f6'
    },
    {
      category: 'Review Count',
      score: reviewScore,
      fill: '#8b5cf6'
    },
    {
      category: 'On-Page SEO',
      score: seoScore,
      fill: '#10b981'
    },
    {
      category: 'Citations',
      score: citationScore,
      fill: '#f59e0b'
    }
  ];

  // Overall score
  const overallScore = Math.round(
    (ratingScore + reviewScore + seoScore + citationScore) / 4
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Overall Score Card */}
      <Card className="border-2 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-lg">
              <Activity className="text-white" size={28} />
            </div>
            <div>
              <CardTitle>Overall Score</CardTitle>
              <CardDescription>Local SEO Performance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-6xl font-bold text-blue-600 mb-2">{overallScore}</div>
            <div className="text-sm text-gray-600">out of 100</div>
            <div className="mt-4">
              {overallScore >= 80 && (
                <Badge className="bg-green-500">Excellent</Badge>
              )}
              {overallScore >= 60 && overallScore < 80 && (
                <Badge className="bg-yellow-500">Good</Badge>
              )}
              {overallScore >= 40 && overallScore < 60 && (
                <Badge className="bg-orange-500">Fair</Badge>
              )}
              {overallScore < 40 && (
                <Badge className="bg-red-500">Needs Improvement</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <Card className="border-2 lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
              <BarChart3 className="text-white" size={24} />
            </div>
            <div>
              <CardTitle>Performance Breakdown</CardTitle>
              <CardDescription>Scores across key metrics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" fontSize={12} />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Score']}
              />
              <Legend />
              <Bar 
                dataKey="score" 
                name="Performance Score" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-gray-600">GBP Rating</p>
              <p className="font-bold text-lg">{gbp.rating || 'N/A'}/5.0</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-gray-600">Total Reviews</p>
              <p className="font-bold text-lg">{gbp.reviewCount || 0}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-gray-600">SEO Elements</p>
              <p className="font-bold text-lg">{seoScore}%</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-gray-600">Citations Found</p>
              <p className="font-bold text-lg">{citationScore}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Badge component (if not imported)
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={`inline-block px-3 py-1 rounded-full text-white text-sm font-semibold ${className}`}>
    {children}
  </span>
);

export default PerformanceChart;