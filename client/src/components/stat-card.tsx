import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
    label?: string;
  };
  icon?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export default function StatCard({
  title,
  value,
  change,
  icon,
  loading = false,
  onClick,
  hoverEffect = false
}: StatCardProps) {
  
  const cardClasses = `
    ${hoverEffect ? 'hover:bg-gray-50 transition-colors cursor-pointer' : ''}
    ${onClick ? 'cursor-pointer' : ''}
  `;
  
  return (
    <Card className={cardClasses} onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm text-gray-600">{title}</h3>
          {icon && <div className="text-gray-400">{icon}</div>}
        </div>
        
        <div className="flex items-end justify-between">
          {loading ? (
            <div className="w-16 h-8 bg-gray-200 animate-pulse rounded" />
          ) : (
            <p className="text-2xl font-semibold">{value}</p>
          )}
          
          {change && (
            <div className={`flex items-center text-sm ${
              change.trend === "up" 
                ? "text-green-600" 
                : change.trend === "down" 
                ? "text-red-600" 
                : "text-gray-600"
            }`}>
              {change.trend === "up" && <ArrowUpIcon className="mr-1 h-3 w-3" />}
              {change.trend === "down" && <ArrowDownIcon className="mr-1 h-3 w-3" />}
              <span>{change.value}% {change.label || ""}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
