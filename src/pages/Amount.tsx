import { useState } from "react";
import { Header } from "@/components/Header";
import { NumPad } from "@/components/NumPad";
import { ActionButton } from "@/components/ActionButton";
import { Avatar } from "@/components/ui/avatar";
import { useNavigate, useParams } from "react-router-dom";

const Amount = () => {
  const [amount, setAmount] = useState("0");
  const navigate = useNavigate();
  const { id } = useParams();

  const handleNumberPress = (num: string) => {
    if (amount === "0" && num !== ".") {
      setAmount(num);
    } else {
      setAmount(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Sending To" />

      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <Avatar className="h-20 w-20 avatar-ring" />
        <h2 className="text-xl font-medium">jack</h2>
        <p className="text-muted-foreground">jack@primal.net</p>
        
        <div className="text-center mt-8">
          <h1 className="text-5xl font-bold">{amount}</h1>
          <p className="text-lg text-muted-foreground mt-2">sats</p>
          <p className="text-sm text-muted-foreground">$0 USD</p>
        </div>
      </div>

      <NumPad onNumberPress={handleNumberPress} onDelete={handleDelete} />

      <div className="p-4 space-y-4">
        <ActionButton
          variant="secondary"
          onClick={() => navigate(-1)}
        >
          Cancel
        </ActionButton>
        <ActionButton
          onClick={() => navigate(`/message/${id}`)}
          disabled={amount === "0"}
        >
          Next
        </ActionButton>
      </div>
    </div>
  );
};

export default Amount;