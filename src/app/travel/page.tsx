import { FilteredWalletPage } from "@/components/wallet/FilteredWalletPage";
import { Plane } from "lucide-react";

export default function Page() {
  return (
    <FilteredWalletPage
      type="travel"
      title="Travel"
      description="Manage your travel."
      icon={Plane}
    />
  );
}
