import { supabase } from "../supabase.server";

export const action = async ({ request }) => {
  const body = await request.json();
  const { customer_id, shop } = body;

  if (!customer_id) {
    return Response.json({ error: "No customer" }, { status: 400 });
  }

  const shopDomain = shop || request.headers.get("x-shopify-shop-domain");

  // Get total points
  const { data, error } = await supabase
    .from("points_ledger")
    .select("points")
    .eq("customer_id", String(customer_id));

  if (error) {
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  const totalPoints = data.reduce((sum, row) => sum + row.points, 0);

  if (totalPoints < 100) {
    return Response.json({
      error: `You need 100 points to redeem. You have ${totalPoints}.`
    }, { status: 400 });
  }

  // Generate unique discount code
  const code = `LOYAL${customer_id}${Date.now()}`.slice(0, 20).toUpperCase();

  // Deduct 100 points
  await supabase.from("points_ledger").insert({
    shop: shopDomain,
    customer_id: String(customer_id),
    points: -100,
    reason: `Redeemed for discount code ${code}`
  });

  return Response.json({ success: true, code });
};
