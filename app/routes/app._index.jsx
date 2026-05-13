import { useLoaderData, useFetcher } from "react-router";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  try {
    await billing.require({
      plans: [MONTHLY_PLAN],
      isTest: true,
      onFailure: async () => {
        await billing.request({
          plan: MONTHLY_PLAN,
          isTest: true,
        });
      },
    });
    return { hasActivePayment: true };
  } catch (error) {
    return { hasActivePayment: false };
  }
};

export default function Index() {
  const { hasActivePayment } = useLoaderData();

  return (
    <s-page heading="Loyalty Programme">
      <s-section heading="📊 Overview">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-text>Total Members</s-text>
            <s-heading>0</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-text>Points Issued</s-text>
            <s-heading>0</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-text>Points Redeemed</s-text>
            <s-heading>0</s-heading>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="⚙️ Points Configuration">
        <s-paragraph>Set how many points customers earn per €1 spent.</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-text>Points earned per €1 spent: <strong>1 point</strong></s-text>
            <s-text>Points value: <strong>100 points = €1 discount</strong></s-text>
            <s-button variant="primary">Update Settings</s-button>
          </s-stack>
        </s-box>
      </s-section>

      <s-section heading="👥 Recent Members">
        <s-paragraph>No members yet. Points will appear here once customers make purchases.</s-paragraph>
      </s-section>

      <s-section slot="aside" heading="💳 Subscription">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <s-stack direction="block" gap="base">
            <s-text>Plan: <strong>Monthly — $29/mo</strong></s-text>
            <s-text>Trial: <strong>14 days free</strong></s-text>
            <s-text>Status: <strong>{hasActivePayment ? '✅ Active' : '⏳ No active plan'}</strong></s-text>
          </s-stack>
        </s-box>
      </s-section>

      <s-section slot="aside" heading="💡 How It Works">
        <s-paragraph>Customers earn 1 point for every €1 they spend. Once they reach 100 points they can redeem them for a €1 discount code at checkout.</s-paragraph>
      </s-section>
    </s-page>
  );
}
