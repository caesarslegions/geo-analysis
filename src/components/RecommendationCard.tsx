import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';

interface RecommendationCardProps {
  recommendation: {
    title: string;
    description: string;
    impact: string;
    difficulty: string;
  };
  index: number;
}

const RecommendationCard = ({ recommendation, index }: RecommendationCardProps) => {
  // Map impact level to priority styling
  const getPriorityLevel = (impact: string): 'high' | 'medium' | 'low' => {
    const normalized = impact.toLowerCase();
    if (normalized === 'high' || normalized === 'critical') return 'high';
    if (normalized === 'medium' || normalized === 'moderate') return 'medium';
    return 'low';
  };

  const priority = getPriorityLevel(recommendation.impact);

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300'
  };

  const priorityIcons = {
    high: AlertCircle,
    medium: TrendingUp,
    low: Zap
  };

  const Icon = priorityIcons[priority];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-2 hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${priorityColors[priority]}`}>
                <Icon size={24} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold">{recommendation.title}</h4>
                <Badge className={priorityColors[priority]}>
                  {recommendation.impact.toUpperCase()} IMPACT
                </Badge>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">{recommendation.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-blue-600 font-semibold mb-1">Impact Level</p>
                  <p className="text-gray-700">{recommendation.impact}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-purple-600 font-semibold mb-1">Implementation</p>
                  <p className="text-gray-700">{recommendation.difficulty}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RecommendationCard;