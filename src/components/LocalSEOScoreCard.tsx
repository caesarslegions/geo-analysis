import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, MapPin, FileText, CheckCircle2 } from 'lucide-react';
import { GeoReport } from '@/services/analysisService';
import { calculateLocalSEOScore } from '@/lib/localSEOCalculator';

interface LocalSEOScoreCardProps {
  report: GeoReport;
}

const LocalSEOScoreCard = ({ report }: LocalSEOScoreCardProps) => {
  const scoreData = calculateLocalSEOScore(report);
  const { overall, categories, recommendations } = scoreData;

  // Determine grade and color
  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' };
    if (score >= 80) return { grade: 'A', color: 'bg-green-400', textColor: 'text-green-700', bgColor: 'bg-green-50' };
    if (score >= 70) return { grade: 'B', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' };
    if (score >= 60) return { grade: 'C', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    if (score >= 50) return { grade: 'D', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' };
    return { grade: 'F', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
  };

  const gradeInfo = getGrade(overall);

  const categoryIcons = {
    gbpOptimization: Trophy,
    citationPresence: MapPin,
    onPageSEO: FileText,
    napConsistency: CheckCircle2
  };

  const categoryNames = {
    gbpOptimization: 'Google Business Profile',
    citationPresence: 'Directory Citations',
    onPageSEO: 'On-Page SEO',
    napConsistency: 'NAP Consistency'
  };

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-lg">
              <TrendingUp className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">Local SEO Health Score</CardTitle>
              <CardDescription className="text-base">
                Comprehensive analysis of your local search optimization
              </CardDescription>
            </div>
            <div className={`text-center p-4 rounded-lg ${gradeInfo.bgColor} border-2 border-${gradeInfo.color}`}>
              <div className={`text-5xl font-bold ${gradeInfo.textColor}`}>{overall}</div>
              <div className="text-sm font-semibold text-gray-600 mt-1">out of 100</div>
              <Badge className={`mt-2 ${gradeInfo.color} text-white`}>{gradeInfo.grade}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(categories).map(([key, data]) => {
                const Icon = categoryIcons[key as keyof typeof categoryIcons];
                const name = categoryNames[key as keyof typeof categoryNames];
                const percentage = (data.score / data.maxScore) * 100;
                const categoryGrade = getGrade(percentage);

                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={20} className="text-gray-600" />
                        <span className="font-medium">{name}</span>
                        <span className="text-sm text-gray-500">
                          ({Math.round(data.weight * 100)}% weight)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${categoryGrade.textColor}`}>
                          {data.score}/{data.maxScore}
                        </span>
                        <Badge variant="outline" className={categoryGrade.textColor}>
                          {Math.round(percentage)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                Priority Actions
              </h3>
              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <div 
                    key={index} 
                    className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-800">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score Interpretation */}
          <div className={`p-4 rounded-lg border-2 ${gradeInfo.bgColor}`}>
            <h4 className={`font-semibold mb-2 ${gradeInfo.textColor}`}>
              What does this score mean?
            </h4>
            <p className="text-sm text-gray-700">
              {overall >= 80 && "Excellent! Your local SEO is strong. Focus on maintaining your online presence and growing your review count."}
              {overall >= 60 && overall < 80 && "Good foundation! Address the priority actions above to improve your local search visibility."}
              {overall >= 40 && overall < 60 && "Needs improvement. Focus on the priority actions to boost your local search rankings significantly."}
              {overall < 40 && "Critical issues detected. Implementing the priority actions will dramatically improve your local search presence."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalSEOScoreCard;