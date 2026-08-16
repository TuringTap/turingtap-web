/**
 * Stripe portal link stub.
 * The real Customer Portal session is created server-side by the `api`
 * service (it holds the secret key + customer id). This module just
 * requests the URL and redirects; falls back to a no-op alert offline.
 */
import { api } from "./api";
import type { TierId } from "./tiers";

export async function openBillingPortal(): Promise<void> {
  try {
    const { url } = await api.billing.portal();
    window.location.assign(url);
  } catch (e) {
    console.warn("billing portal unavailable (stub)", e);
    alert("Billing portal is not configured in this environment.");
  }
}

export async function startCheckout(tier: TierId): Promise<void> {
  if (tier === "free") return;
  try {
    const { url } = await api.billing.checkout(tier);
    window.location.assign(url);
  } catch (e) {
    console.warn("checkout unavailable (stub)", e);
    alert("Checkout is not configured in this environment.");
  }
}
