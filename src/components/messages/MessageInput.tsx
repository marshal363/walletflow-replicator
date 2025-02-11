import React, { KeyboardEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled
}: MessageInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-12 bg-zinc-900 border-none rounded-full text-white"
      />
      <button
        onClick={() => {
          if (value.trim() && !disabled) {
            onSubmit();
          }
        }}
        disabled={!value.trim() || disabled}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2",
          "w-8 h-8 flex items-center justify-center rounded-full",
          "transition-colors",
          value.trim() && !disabled
            ? "text-white hover:bg-white/10"
            : "text-zinc-500"
        )}
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
} 