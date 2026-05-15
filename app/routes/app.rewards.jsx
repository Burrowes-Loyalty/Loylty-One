import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { useState } from "react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rewards?shop=eq.${shop}&select=*&order=created_at.asc`,
    { headers }
  );
  const rewards = await res.json();

  return { rewards: rewards || [], shop };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
  };

  if (intent === "create") {
    await fetch(`${supabaseUrl}/rest/v1/rewards`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        shop,
        title: formData.get("title"),
        description: formData.get("description"),
        points_cost: parseInt(formData.get("points_cost")),
        reward_type: formData.get("reward_type"),
        discount_value: parseFloat(formData.get("discount_value")),
        active: true,
      })
    });
    return { success: true, intent };
  }

  if (intent === "delete") {
    const id = formData.get("id");
    await fetch(`${supabaseUrl}/rest/v1/rewards?id=eq.${id}`, {
      method: "DELETE",
      headers,
    });
    return { success: true, intent };
  }

  if (intent === "toggle") {
    const id = formData.get("id");
    const active = formData.get("active") === "true";
    await fetch(`${supabaseUrl}/rest/v1/rewards?id=eq.${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ active: !active })
    });
    return { success: true, intent };
  }

  return null;
};

export default function RewardsPage() {
  const { rewards } = useLoaderData();
  const fetcher = useFetcher();
  const [showForm, setShowForm] = useState(false);

  const inputStyle = {
    width: "100%",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    marginTop: "4px",
    boxSizing: "border-box",
  };

  return (
    <s-page heading="🎁 Rewards Catalogue">

      <s-section heading="Active Rewards">
        {rewards.length === 0 ? (
          <s-paragraph>No rewards yet. Create your first reward below!</s-paragraph>
        ) : (
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "sans-serif", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Reward</th>
                  <th style={{ padding: "10px" }}>Points Cost</th>
                  <th style={{ padding: "10px" }}>Value</th>
                  <th style={{ padding: "10px" }}>Type</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map(reward => (
                  <tr key={reward.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px" }}>
                      <strong>{reward.title}</strong>
                      <div style={{ fontSize: "12px", color: "#666" }}>{reward.description}</div>
                    </td>
                    <td style={{ padding: "10px" }}>🏆 {reward.points_cost}</td>
                    <td style={{ padding: "10px" }}>€{reward.discount_value}</td>
                    <td style={{ padding: "10px" }}>{reward.reward_type}</td>
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        background: reward.active ? "#d1fae5" : "#fee2e2",
                        color: reward.active ? "#065f46" : "#991b1b",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        fontSize: "12px",
                      }}>
                        {reward.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => fetcher.submit(
                            { intent: "toggle", id: reward.id, active: String(reward.active) },
                            { method: "post" }
                          )}
                          style={{
                            background: reward.active ? "#fee2e2" : "#d1fae5",
                            color: reward.active ? "#991b1b" : "#065f46",
                            border: "none", padding: "4px 10px",
                            borderRadius: "6px", cursor: "pointer", fontSize: "12px"
                          }}
                        >
                          {reward.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this reward?")) {
                              fetcher.submit(
                                { intent: "delete", id: reward.id },
                                { method: "post" }
                              );
                            }
                          }}
                          style={{
                            background: "#fee2e2", color: "#991b1b",
                            border: "none", padding: "4px 10px",
                            borderRadius: "6px", cursor: "pointer", fontSize: "12px"
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </s-box>
        )}
      </s-section>

      <s-section heading="➕ Create New Reward">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold" }}>Title *</label>
                <input id="r-title" type="text" placeholder="€5 Discount" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold" }}>Points Cost *</label>
                <input id="r-points" type="number" placeholder="500" min="1" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold" }}>Description</label>
                <input id="r-desc" type="text" placeholder="Get €5 off your next order" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold" }}>Discount Value (€)</label>
                <input id="r-value" type="number" placeholder="5.00" min="0" step="0.01" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold" }}>Type</label>
                <select id="r-type" style={inputStyle}>
                  <option value="discount">Discount</option>
                  <option value="shipping">Free Shipping</option>
                  <option value="product">Free Product</option>
                </select>
              </div>
            </div>
            <s-button
              variant="primary"
              onClick={() => {
                const title = document.getElementById("r-title").value;
                const points = document.getElementById("r-points").value;
                if (!title || !points) {
                  alert("Title and Points Cost are required!");
                  return;
                }
                fetcher.submit({
                  intent: "create",
                  title,
                  description: document.getElementById("r-desc").value,
                  points_cost: points,
                  discount_value: document.getElementById("r-value").value || "0",
                  reward_type: document.getElementById("r-type").value,
                }, { method: "post" });
                document.getElementById("r-title").value = "";
                document.getElementById("r-points").value = "";
                document.getElementById("r-desc").value = "";
                document.getElementById("r-value").value = "";
              }}
            >
              {fetcher.state !== "idle" ? "Creating..." : "Create Reward"}
            </s-button>
            {fetcher.data?.success && fetcher.data?.intent === "create" && (
              <s-text>✅ Reward created!</s-text>
            )}
          </s-stack>
        </s-box>
      </s-section>

    </s-page>
  );
}
