import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardWidgetProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  trend?: number;
  highlight?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

export function DashboardWidget({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-primary",
  bgColor = "bg-primary/10",
  trend,
  highlight,
  onClick,
  children
}: DashboardWidgetProps) {
  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        highlight && "ring-2 ring-primary animate-pulse",
        onClick && "hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("rounded-full p-1.5", bgColor)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="text-2xl font-bold mb-1">{value}</div>
        {description && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{description}</p>
            {trend !== undefined && trend !== 0 && (
              <Badge variant={trend > 0 ? "default" : "secondary"} className="text-xs">
                {trend > 0 ? '+' : ''}{trend}%
              </Badge>
            )}
          </div>
        )}
        {children && <div className="mt-3">{children}</div>}
      </CardContent>
    </Card>
  );
}
