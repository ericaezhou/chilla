import { ChillaGate } from "@/components/workspace/ChillaHeader";

// Every Chilla app tab (Home, Messages, Directory, …) shares this header.
// Until Chilla is installed, the gate shows its App Directory listing instead.
export default function ChillaAppLayout({ children }: { children: React.ReactNode }) {
  return <ChillaGate>{children}</ChillaGate>;
}
