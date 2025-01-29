import { X } from "lucide-react";

interface NumPadProps {
  onNumberPress: (num: string) => void;
  onDelete: () => void;
}

export const NumPad = ({ onNumberPress, onDelete }: NumPadProps) => {
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

  return (
    <div className="numpad-grid p-4">
      {numbers.map((num) => (
        <button
          key={num}
          onClick={() => onNumberPress(num)}
          className="bg-secondary rounded-full py-4 text-xl font-medium"
        >
          {num}
        </button>
      ))}
      <button
        onClick={onDelete}
        className="bg-secondary rounded-full py-4 flex items-center justify-center"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
};