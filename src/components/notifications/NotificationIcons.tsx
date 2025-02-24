import { 
  Clock, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Shield, 
  Sparkles 
} from "lucide-react";
import { NotificationType } from "@/lib/types/notifications";

export const ICON_MAP: Record<NotificationType, JSX.Element> = {
  payment_request: <Clock className="h-5 w-5 text-white" />,
  payment_sent: <ArrowUpCircle className="h-5 w-5 text-white" />,
  payment_received: <ArrowDownCircle className="h-5 w-5 text-white" />,
  security: <Shield className="h-5 w-5 text-white" />,
  system: <Sparkles className="h-5 w-5 text-white" />,
}; 