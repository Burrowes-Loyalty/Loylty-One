import { useLoaderData, useFetcher } from "react-router";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import { supabase } from "../supabase.server";
import { useState } from "react";

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  let hasActivePayment = false;
  try {
    const { hasActivePayment: active } = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: true,
    });
    hasActivePayment = active;
  } catch (e) {}

  // Get settings
  const { data: settingsData } = await supabase
    .from("loyalty_settings")
    .select("*")
    .eq("shop", shop)
    .single();

  const settings = settingsData || {
    points_per_dollar: 1,
    points_to_redeem: 100,
    discount_value: 1.00
  };

  // Get all members with their points
  const { data: ledger } = await supabase
    .from("points_ledger")
    .select("customer_id, customer_email, points")
    .eq("shop", shop);

  // Aggregate points per customer
  const membersMap = {};
  if (ledger) {
    ledger.forEach(row => {
      if (!membersMap[row.customer_id]) {
        membersMap[row.customer_id] = {
          customer_id: row.customer_id,
          customer_email: row.customer_email,
          total_points: 0
        };
      }
      membersMap[row.customer_id].total_points += row.points;
    });
  }
  const members = Object.values(membersMap);

  return { hasActivePayment, settings, members, shop };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_settings") {
    const points_per_dollar = parseInt(formData.get("points_per_dollar"));
    const points_to_redeem = parseInt(formData.get("points_to_redeem"));
    const discount_value = parseFloat(formData.get("discount_value"));

    await supabase.from("loyalty_settings").upsert({
      shop,
      points_per_dollar,
      points_to_redeem,
      discount_value
    }, { onConflict: "shop" });

    return { success: true, intent };
  }

  if (intent === "adjust_points") {
    const customer_id = formData.get("customer_id");
    const customer_email = formData.get("customer_email");
    const adjustment = parseInt(formData.get("adjustment"));
    const reason = formData.get("reason") || "Manual adjustment by merchant";

    await supabase.from("points_ledger").insert({
      shop,
      customer_id,
      customer_email,
      points: adjustment,
      reason
    });

    return { success: true, intent };
  }

  return null;
};

export default function Index() {
  const { hasActivePayment, settings, members, shop } = useLoaderData();
  const fetcher = useFetcher();
  const [adjustingMember, setAdjustingMember] = useState(null);
  const [adjustment, setAdjustment] = useState(0);
  const [reason, setReason] = useState("");

  const handleAdjust = (member) => {
    setAdjustingMember(member);
    setAdjustment(0);
    setReason("");
  };

  const submitAdjustment = () => {
    fetcher.submit({
      intent: "adjust_points",
      customer_id: adjustingMember.customer_id,
      customer_email: adjustingMember.customer_email,
      adjustment: adjustment,
      reason: reason
    }, { method: "post" });
    setAdjustingMember(null);
  };

  const totalPoints = members.reduce((sum, m) => sum + m.total_points, 0);
  const totalRedeemed = members.filter(m => m.total_points < 0).reduce((sum, m) => sum + Math.abs(m.total_points), 0);

  return (
    <s-page heading="Loyalty Programme">

      <s-section heading="📊 Overview">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-text>Total Members</s-text>
            <s-heading>{members.length}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-text>Points Issued</s-text>
            <s-heading>{totalPoints}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-text>Points Redeemed</s-text>
            <s-heading>{totalRedeemed}</s-heading>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="⚙️ Points Configuration">
        <s-paragraph>Configure how customers earn and redeem points.</s-paragraph>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="save_settings" />
          <s-stack direction="block" gap="base">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-stack direction="inline" gap="base">
                  <s-box>
                    <s-text>Points per €1 spent</s-text>
                    <input
                      name="points_per_dollar"
                      type="number"
                      defaultValue={settings.points_per_dollar}
                      min="1"
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        fontSize: "16px",
                        marginTop: "4px"
                      }}
                    />
                  </s-box>
                  <s-box>
                    <s-text>Points needed to redeem</s-text>
                    <input
                      name="points_to_redeem"
                      type="number"
                      defaultValue={settings.points_to_redeem}
                      min="1"
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        fontSize: "16px",
                        marginTop: "4px"
                      }}
                    />
                  </s-box>
                  <s-box>
                    <s-text>Discount value (€)</s-text>
                    <input
                      name="discount_value"
                      type="number"
                      defaultValue={settings.discount_value}
                      min="0.01"
                      step="0.01"
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        fontSize: "16px",
                        marginTop: "4px"
                      }}
                    />
                  </s-box>
                </s-stack>
                <s-button variant="primary" onClick={() => fetcher.submit(
                  {
                    intent: "save_settings",
                    points_per_dollar: document.querySelector('[name=points_per_dollar]').value,
                    points_to_redeem: document.querySelector('[name=points_to_redeem]').value,
                    discount_value: document.querySelector('[name=discount_value]').value
                  },
                  { method: "post" }
                )}>
                  {fetcher.state !== "idle" && fetcher.formData?.get("intent") === "save_settings" ? "Saving..." : "Save Settings"}
                </s-button>
                {fetcher.data?.success && fetcher.data?.intent === "save_settings" && (
                  <s-text>✅ Settings saved!</s-text>
                )}
              </s-stack>
            </s-box>
          </s-stack>
        </fetcher.Form>
      </s-section>

      <s-section heading="👥 Members">
        {members.length === 0 ? (
          <s-paragraph>No members yet. Points will appear here once customers make purchases.</s-paragraph>
        ) : (
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "sans-serif", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "8px" }}>Customer</th>
                  <th style={{ padding: "8px" }}>Points</th>
                  <th style={{ padding: "8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.customer_id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>{member.customer_email || member.customer_id}</td>
                    <td style={{ padding: "8px" }}>
                      <strong style={{ color: member.total_points > 0 ? "green" : "red" }}>
                        {member.total_points}
                      </strong>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <button
                        onClick={() => handleAdjust(member)}
                        style={{
                          background: "#000",
                          color: "#fff",
                          border: "none",
                          padding: "4px 12px",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        Adjust Points
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </s-box>
        )}

        {adjustingMember && (
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="base">
              <s-text>Adjusting points for: <strong>{adjustingMember.customer_email}</strong></s-text>
              <s-text>Current balance: <strong>{adjustingMember.total_points}</strong></s-text>
              <s-stack direction="inline" gap="base">
                <s-box>
                  <s-text>Adjustment (use negative to deduct)</s-text>
                  <input
                    type="number"
                    value={adjustment}
                    onChange={e => setAdjustment(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                      fontSize: "16px",
                      marginTop: "4px"
                    }}
                  />
                </s-box>
                <s-box>
                  <s-text>Reason</s-text>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Bonus points for review"
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                      fontSize: "16px",
                      marginTop: "4px"
                    }}
                  />
                </s-box>
              </s-stack>
              <s-stack direction="inline" gap="base">
                <s-button variant="primary" onClick={submitAdjustment}>Save Adjustment</s-button>
                <s-button onClick={() => setAdjustingMember(null)}>Cancel</s-button>
              </s-stack>
            </s-stack>
          </s-box>
        )}
      </s-section>

      <s-section slot="aside" heading="💳 Subscription">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <s-stack direction="block" gap="base">
            <s-text>Plan: <strong>Monthly — $29/mo</strong></s-text>
            <s-text>Trial: <strong>14 days free</strong></s-text>
            <s-text>Status: <strong>{hasActivePayment ? '✅ Active' : '⏳ Trial'}</strong></s-text>
          </s-stack>
        </s-box>
      </s-section>

      <s-section slot="aside" heading="💡 How It Works">
        <s-paragraph>Customers earn {settings.points_per_dollar} point per €1 spent. Once they reach {settings.points_to_redeem} points they can redeem them for a €{settings.discount_value} discount.</s-paragraph>
      </s-section>

    </s-page>
  );
}
