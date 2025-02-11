import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  children?: React.ReactNode;
}

export function Header({ 
  title, 
  subtitle,
  showBack = false,
  children 
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/75">
      <div className="flex items-center min-h-[60px] px-4 border-b border-zinc-800">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="mr-2 p-2 hover:bg-zinc-800/50 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-zinc-400 truncate">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}