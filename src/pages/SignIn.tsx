import { SignIn } from "@clerk/clerk-react";

const SignInPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <SignIn 
          afterSignInUrl="/"
          redirectUrl="/"
        />
      </div>
    </div>
  );
};

export default SignInPage; 