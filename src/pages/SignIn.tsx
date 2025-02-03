import { SignIn } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";

const SignInPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <SignIn 
          routing="path" 
          path="/sign-in" 
          signUpUrl="/sign-up"
          afterSignInUrl="/"
          redirectUrl="/"
        />
      </div>
    </div>
  );
};

export default SignInPage; 