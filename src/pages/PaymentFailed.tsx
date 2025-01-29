import { Header } from "@/components/Header";
import { ActionButton } from "@/components/ActionButton";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PaymentFailed = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Payment Failed" />

      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
        <div className="h-20 w-20 rounded-full border-4 border-destructive flex items-center justify-center">
          <X className="h-10 w-10 text-destructive" />
        </div>
        
        <h1 className="text-2xl font-bold">Unable to send</h1>
        <p className="text-muted-foreground">insufficient account balance</p>
      </div>

      <div className="p-4">
        <ActionButton variant="secondary" onClick={() => navigate("/")}>
          Close
        </ActionButton>
      </div>
    </div>
  );
};

export default PaymentFailed;