import { MessageSquare, Search, LucideIcon } from "lucide-react";

const icons = {
  messages: MessageSquare,
  search: Search,
} as const;

interface EmptyStateProps {
  title: string;
  description: string;
  icon: keyof typeof icons;
}

export const EmptyState = ({ title, description, icon }: EmptyStateProps) => {
  const Icon = icons[icon];

  return (
    <div className="h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-zinc-400" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-[250px]">{description}</p>
    </div>
  );
}; 