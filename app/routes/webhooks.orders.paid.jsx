import { supabase } from "../supabase.server";

export const action = async ({ request }) => {
  const order = await request.json();
  
  const customerId = order.customer?.id;
  const customerEmail = order.customer?.email;
  const total = parseFloat(order.total_price);
  const pointsEarned = Math.floor(total);
  const shop = request.headers.get("x-shopify-shop-domain");

  if (!customerId) {
    return new Response("No customer", { status: 200 });
  }

  await supabase.from("points_ledger").insert({
    shop,
    customer_id: String(customerId),
    customer_email: customerEmail,
    points: pointsEarned,
    reason: `Order ${order.name}`
  });

  return new Response("OK", { status: 200 });
};
