import { FilteredWalletPage } from "@/components/wallet/FilteredWalletPage";
import { CreditCard } from "lucide-react";

export default function Page() {
  return (
    <FilteredWalletPage
      type="payment"
      title="Payments"
      description="Manage your payments."
      icon={CreditCard}
    />
  );
}
