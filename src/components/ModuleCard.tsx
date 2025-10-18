import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  completed?: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export const ModuleCard = ({
  title,
  description,
  icon: Icon,
  iconColor,
  completed = false,
  onClick,
  className,
  disabled = false,
}: ModuleCardProps) => {
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      disabled && "opacity-50 cursor-not-allowed hover:shadow-none hover:translate-y-0",
      className
    )}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${iconColor} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {completed && (
            <Badge className="bg-success text-success-foreground">
              ✓ Completado
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          variant="outline" 
          onClick={onClick}
          disabled={disabled}
          className="w-full transition-colors duration-300 hover:bg-primary hover:text-primary-foreground"
        >
          {disabled ? "Sin datos cargados" : "Abrir módulo"}
        </Button>
      </CardContent>
    </Card>
  );
};
