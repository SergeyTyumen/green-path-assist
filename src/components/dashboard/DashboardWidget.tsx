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
        "transition-all hover:shadow-md cursor-pointer h-full flex flex-col",
        highlight && "ring-2 ring-primary animate-pulse",
        onClick && "hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("rounded-full p-2", bgColor)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">{description}</p>
            {trend !== undefined && trend !== 0 && (
              <Badge variant={trend > 0 ? "default" : "secondary"} className="text-xs">
                {trend > 0 ? '+' : ''}{trend}%
              </Badge>
            )}
          </div>
        )}
        {children && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  );
}
