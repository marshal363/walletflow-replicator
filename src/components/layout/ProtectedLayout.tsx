import { Navigation } from "./Navigation";
import { Outlet } from "react-router-dom";
import { SignedIn, RedirectToSignIn } from "@clerk/clerk-react";

export function ProtectedLayout() {
  return (
    <SignedIn>
      <div className="min-h-screen">
        <main className="pb-20">
          <Outlet />
        </main>
        <Navigation />
      </div>
    </SignedIn>
  );
} 