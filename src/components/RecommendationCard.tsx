import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { Recommendation } from '@/services/analysisService';

interface RecommendationCardProps {
  recommendation: Recommendation;
  index: number;
}

const RecommendationCard = ({ recommendation, index }: RecommendationCardProps) => {
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

  const Icon = priorityIcons[recommendation.priority];

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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${priorityColors[recommendation.priority]}`}>
                <Icon size={24} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold">{recommendation.title}</h4>
                <Badge className={priorityColors[recommendation.priority]}>
                  {recommendation.priority.toUpperCase()} PRIORITY
                </Badge>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">{recommendation.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-blue-600 font-semibold mb-1">Impact</p>
                  <p className="text-gray-700">{recommendation.impact}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-purple-600 font-semibold mb-1">Effort</p>
                  <p className="text-gray-700">{recommendation.effort}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-green-600 font-semibold mb-1">Category</p>
                  <p className="text-gray-700">{recommendation.category}</p>
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