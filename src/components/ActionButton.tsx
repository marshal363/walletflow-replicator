import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export const ActionButton = ({ 
  children, 
  variant = "primary",
  className,
  ...props 
}: ActionButtonProps) => {
  return (
    <button
      className={cn(
        "w-full py-4 px-6 rounded-full text-lg font-medium transition-colors",
        variant === "primary" ? "bg-primary text-white" : "bg-secondary text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};