import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumPadProps {
  onNumberPress: (num: string) => void;
  onDelete: () => void;
  className?: string;
  buttonClassName?: string;
}

export const NumPad = ({ 
  onNumberPress, 
  onDelete,
  className,
  buttonClassName 
}: NumPadProps) => {
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {numbers.map((num) => (
        <button
          key={num}
          onClick={() => onNumberPress(num)}
          className={cn(
            "rounded-full py-4 text-xl font-medium transition-colors",
            buttonClassName
          )}
        >
          {num}
        </button>
      ))}
      <button
        onClick={onDelete}
        className={cn(
          "rounded-full py-4 flex items-center justify-center transition-colors",
          buttonClassName
        )}
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
};