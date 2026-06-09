import { FilteredWalletPage } from "@/components/wallet/FilteredWalletPage";
import { Ticket } from "lucide-react";

export default function Page() {
  return (
    <FilteredWalletPage
      type="ticket"
      title="Tickets"
      description="Manage your tickets."
      icon={Ticket}
    />
  );
}
