/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const pages = [
  { name: 'payments', type: 'payment', title: 'Payments', icon: 'CreditCard' },
  { name: 'travel', type: 'travel', title: 'Travel', icon: 'Plane' },
  { name: 'tickets', type: 'ticket', title: 'Tickets', icon: 'Ticket' },
  { name: 'orders', type: 'order', title: 'Orders', icon: 'ShoppingBag' },
  { name: 'calendar', type: 'meeting', title: 'Calendar', icon: 'Calendar' },
  { name: 'reminders', type: 'reminder', title: 'Reminders', icon: 'Bell' },
];

pages.forEach(p => {
  const content = `import { FilteredWalletPage } from "@/components/wallet/FilteredWalletPage";
import { ${p.icon} } from "lucide-react";

export default function Page() {
  return (
    <FilteredWalletPage
      type="${p.type}"
      title="${p.title}"
      description="Manage your ${p.title.toLowerCase()}."
      icon={${p.icon}}
    />
  );
}
`;
  const dir = path.join(__dirname, 'src', 'app', p.name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.tsx'), content);
});

console.log("Pages created.");
