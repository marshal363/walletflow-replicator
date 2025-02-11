import { ChevronLeft, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Header = ({ title, subtitle, showBack = false, children, className }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className={cn("sticky top-0 z-50 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/75", className)}>
      <div className="flex items-center min-h-[60px] px-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="mr-2 p-2 hover:bg-zinc-800/50 rounded-full transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-zinc-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};