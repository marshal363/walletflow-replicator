import { Navigation } from "./Navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen pb-16">
      <main className="container mx-auto px-4">
        {children}
      </main>
      <Navigation />
    </div>
  );
} 