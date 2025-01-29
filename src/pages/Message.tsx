import { useState } from "react";
import { Header } from "@/components/Header";
import { ActionButton } from "@/components/ActionButton";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";

const Message = () => {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { id } = useParams();

  const handleSend = () => {
    // Simulate a failed payment for demo
    navigate("/payment-failed");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Sending To" />

      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <Avatar className="h-20 w-20 avatar-ring" />
        <h2 className="text-xl font-medium">jack</h2>
        <p className="text-muted-foreground">jack@primal.net</p>
        
        <div className="text-center mt-8">
          <h1 className="text-5xl font-bold">1</h1>
          <p className="text-lg text-muted-foreground mt-2">sats</p>
          <p className="text-sm text-muted-foreground">$0 USD</p>
        </div>

        <Input
          placeholder="message for jack"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-8 bg-secondary border-none"
        />
      </div>

      <div className="p-4">
        <ActionButton onClick={handleSend}>
          Send
        </ActionButton>
      </div>
    </div>
  );
};

export default Message;