import { SignUp } from "@clerk/clerk-react";

const SignUpPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <SignUp
          afterSignUpUrl="/wallet"
          redirectUrl="/wallet"
        />
      </div>
    </div>
  );
};

export default SignUpPage; 