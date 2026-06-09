import { FilteredWalletPage } from "@/components/wallet/FilteredWalletPage";
import { ShoppingBag } from "lucide-react";

export default function Page() {
  return (
    <FilteredWalletPage
      type="order"
      title="Orders"
      description="Manage your orders."
      icon={ShoppingBag}
    />
  );
}
