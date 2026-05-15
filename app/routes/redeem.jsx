import { supabase } from "../supabase.server";

export const action = async ({ request }) => {
  const body = await request.json();
  const { customer_id, shop, reward_id, reward_title, points_cost } = body;

  if (!customer_id || !reward_id) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get current points
  const { data: ledger } = await supabase
    .from("points_ledger")
    .select("points")
    .eq("customer_id", String(customer_id));

  const totalPoints = (ledger || []).reduce((sum, row) => sum + row.points, 0);

  if (totalPoints < points_cost) {
    return Response.json({
      error: `You need ${points_cost} points. You have ${totalPoints}.`
    }, { status: 400 });
  }

  // Generate unique code
  const code = `LOYAL${String(customer_id).slice(-4)}${Date.now().toString(36).toUpperCase()}`.slice(0, 20);

  // Save to redeemed_rewards
  await supabase.from("redeemed_rewards").insert({
    shop,
    customer_id: String(customer_id),
    reward_id,
    reward_title,
    points_spent: points_cost,
    discount_code: code,
    used: false
  });

  // Deduct points
  await supabase.from("points_ledger").insert({
    shop,
    customer_id: String(customer_id),
    points: -points_cost,
    reason: `Redeemed: ${reward_title}`
  });

  return Response.json({ success: true, code });
};
