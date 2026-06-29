import type { ChangeEvent, ReactElement } from "react";
import { ChevronDown } from "lucide-react";
import { useChat } from "../../context/ChatContext";

export default function VaultSelector(): ReactElement {
  const { activeVaultId, setActiveVaultId, vaultOptions } = useChat();

  const handleVaultChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextValue = event.target.value;
    setActiveVaultId(nextValue ? Number(nextValue) : null);
  };

  return (
    <div className="group relative">
      <select
        className="w-full appearance-none rounded border border-outline-variant bg-surface-container-high px-3 py-2 text-sm text-on-surface transition-colors cursor-pointer focus:border-primary focus:outline-none focus:ring-0"
        onChange={handleVaultChange}
        value={activeVaultId?.toString() ?? ""}
      >
        {vaultOptions.length === 0 ? <option value="">No vaults</option> : null}
        {vaultOptions.map((vault) => (
          <option key={vault.id} value={vault.id.toString()}>
            {vault.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-hover:text-primary">
        <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
      </div>
    </div>
  );
}
