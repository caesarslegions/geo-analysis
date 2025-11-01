import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Analysis } from '@/services/analysisService';

interface PerformanceChartProps {
  analysis: Analysis;
}

const PerformanceChart = ({ analysis }: PerformanceChartProps) => {
  // Prepare data for bar chart
  const reviewData = [
    {
      name: 'Your Business',
      reviews: analysis.clientData.reviewCount,
      rating: analysis.clientData.rating
    },
    ...analysis.competitors.map(c => ({
      name: c.name.split(' ').slice(0, 2).join(' '),
      reviews: c.reviewCount,
      rating: c.rating
    }))
  ];

  // Prepare data for radar chart
  const radarData = [
    {
      metric: 'Rating',
      'Your Business': (analysis.clientData.rating / 5) * 100,
      'Avg Competitor': (analysis.competitors.reduce((sum, c) => sum + c.rating, 0) / analysis.competitors.length / 5) * 100
    },
    {
      metric: 'Reviews',
      'Your Business': Math.min((analysis.clientData.reviewCount / 200) * 100, 100),
      'Avg Competitor': Math.min((analysis.competitors.reduce((sum, c) => sum + c.reviewCount, 0) / analysis.competitors.length / 200) * 100, 100)
    },
    {
      metric: 'Location Pages',
      'Your Business': analysis.clientData.hasLocationPages ? 100 : 0,
      'Avg Competitor': (analysis.competitors.filter(c => c.hasLocationPages).length / analysis.competitors.length) * 100
    },
    {
      metric: 'Service Areas',
      'Your Business': Math.min((analysis.clientData.serviceAreas.length / 5) * 100, 100),
      'Avg Competitor': Math.min((analysis.competitors.reduce((sum, c) => sum + c.serviceAreas.length, 0) / analysis.competitors.length / 5) * 100, 100)
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
              <BarChart3 className="text-white" size={24} />
            </div>
            <div>
              <CardTitle>Review Comparison</CardTitle>
              <CardDescription>Your reviews vs. competitors</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reviewData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="reviews" fill="#3b82f6" name="Review Count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
              <BarChart3 className="text-white" size={24} />
            </div>
            <div>
              <CardTitle>Performance Radar</CardTitle>
              <CardDescription>Overall performance metrics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Your Business" dataKey="Your Business" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Radar name="Avg Competitor" dataKey="Avg Competitor" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceChart;