export type TierId = "free" | "personal" | "pro" | "scale";

export interface Tier {
  id: TierId;
  name: string;
  priceMo: number;
  proxyGb: number;
  overagePerGb: number | null;
  sessionCapMin: number | null;
  bufferMb: number;
  concurrent: number | "inf";
  handoffsMo: number | "inf";
  agentBrowser: boolean;
  /** Tier includes the LAN tunnel (Pro+). Off by default per user — must be
   *  enabled in Settings even on eligible tiers. */
  lanTunnel: boolean;
}

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    priceMo: 0,
    proxyGb: 0.1,
    overagePerGb: null,
    sessionCapMin: 10,
    bufferMb: 5,
    concurrent: 1,
    handoffsMo: 2,
    agentBrowser: false,
    lanTunnel: false,
  },
  {
    id: "personal",
    name: "Personal",
    priceMo: 9,
    proxyGb: 5,
    overagePerGb: 0.3,
    sessionCapMin: null,
    bufferMb: 100,
    concurrent: 3,
    handoffsMo: 50,
    agentBrowser: true,
    lanTunnel: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceMo: 29,
    proxyGb: 25,
    overagePerGb: 0.25,
    sessionCapMin: null,
    bufferMb: 500,
    concurrent: 10,
    handoffsMo: 500,
    agentBrowser: true,
    lanTunnel: true,
  },
  {
    id: "scale",
    name: "Scale",
    priceMo: 99,
    proxyGb: 100,
    overagePerGb: 0.2,
    sessionCapMin: null,
    bufferMb: 2000,
    concurrent: "inf",
    handoffsMo: "inf",
    agentBrowser: true,
    lanTunnel: true,
  },
];
