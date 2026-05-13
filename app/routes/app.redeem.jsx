import { authenticate } from "../shopify.server";
import { supabase } from "../supabase.server";

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.public.appProxy(request);
  const body = await request.json();
  const { customer_id } = body;

  if (!customer_id) {
    return Response.json({ error: "No customer" }, { status: 400 });
  }

  // Get total points
  const { data, error } = await supabase
    .from("points_ledger")
    .select("points")
    .eq("customer_id", String(customer_id))
    .eq("shop", session.shop);

  if (error) {
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  const totalPoints = data.reduce((sum, row) => sum + row.points, 0);

  if (totalPoints < 100) {
    return Response.json({ 
      error: "Not enough points. You need 100 points to redeem." 
    }, { status: 400 });
  }

  // Generate unique discount code
  const code = `LOYALTY-${customer_id}-${Date.now()}`;

  // Create discount code in Shopify
  const response = await admin.graphql(`
    mutation createDiscount($input: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $input) {
        codeDiscountNode {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      input: {
        title: `Loyalty Reward - Customer ${customer_id}`,
        code: code,
        startsAt: new Date().toISOString(),
        customerSelection: { all: true },
        customerGets: {
          value: { discountAmount: { amount: "1.00", appliesOnEachItem: false } },
          items: { all: true }
        },
        usageLimit: 1
      }
    }
  });

  const json = await response.json();
  const errors = json.data?.discountCodeBasicCreate?.userErrors;

  if (errors?.length > 0) {
    return Response.json({ error: errors[0].message }, { status: 500 });
  }

  // Deduct 100 points
  await supabase.from("points_ledger").insert({
    shop: session.shop,
    customer_id: String(customer_id),
    points: -100,
    reason: `Redeemed for discount code ${code}`
  });

  return Response.json({ success: true, code });
};
