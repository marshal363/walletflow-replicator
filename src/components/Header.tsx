import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export const Header = ({ title, showBack = true }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-4">
      {showBack && (
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft className="h-6 w-6" />
        </button>
      )}
      <h1 className="text-xl font-semibold flex-1 text-center">{title}</h1>
      <div className="w-6" /> {/* Spacer for alignment */}
    </div>
  );
};