import prisma from "../db.server";

export const action = async ({ request }) => {
  const body = await request.json();
  const { customer_id, shop, reward_id, reward_title, points_cost } = body;

  if (!customer_id || !reward_id) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const dbHeaders = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
  };

  try {
    // Get access token from session
    const session = await prisma.session.findFirst({
      where: { shop }
    });

    if (!session?.accessToken) {
      return Response.json({ error: "Shop not authenticated" }, { status: 401 });
    }

    const accessToken = session.accessToken;

    // Get current points
    const ledgerRes = await fetch(
      `${supabaseUrl}/rest/v1/points_ledger?customer_id=eq.${customer_id}&select=points`,
      { headers: dbHeaders }
    );
    const ledger = await ledgerRes.json();
    const totalPoints = (ledger || []).reduce((sum, row) => sum + row.points, 0);

    if (totalPoints < points_cost) {
      return Response.json({
        error: `You need ${points_cost} points. You have ${totalPoints}.`
      }, { status: 400 });
    }

    // Get reward details
    const rewardRes = await fetch(
      `${supabaseUrl}/rest/v1/rewards?id=eq.${reward_id}&select=*`,
      { headers: dbHeaders }
    );
    const rewards = await rewardRes.json();
    const reward = rewards[0];

    // Generate unique code
    const code = `LOYAL${String(customer_id).slice(-4)}${Date.now().toString(36).toUpperCase()}`.slice(0, 20);

    // Create Shopify price rule
    const priceRuleRes = await fetch(
      `https://${shop}/admin/api/2026-01/price_rules.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          price_rule: {
            title: code,
            target_type: "line_item",
            target_selection: "all",
            allocation_method: "across",
            value_type: "fixed_amount",
            value: `-${reward?.discount_value || 1.00}`,
            customer_selection: "all",
            starts_at: new Date().toISOString(),
            usage_limit: 1,
          }
        })
      }
    );

    const priceRuleData = await priceRuleRes.json();

    if (priceRuleData.price_rule?.id) {
      await fetch(
        `https://${shop}/admin/api/2026-01/price_rules/${priceRuleData.price_rule.id}/discount_codes.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({ discount_code: { code } })
        }
      );
    }

    // Save to redeemed_rewards
    await fetch(`${supabaseUrl}/rest/v1/redeemed_rewards`, {
      method: "POST",
      headers: dbHeaders,
      body: JSON.stringify({
        shop,
        customer_id: String(customer_id),
        reward_id,
        reward_title,
        points_spent: points_cost,
        discount_code: code,
        used: false
      })
    });

    // Deduct points
    await fetch(`${supabaseUrl}/rest/v1/points_ledger`, {
      method: "POST",
      headers: dbHeaders,
      body: JSON.stringify({
        shop,
        customer_id: String(customer_id),
        points: -points_cost,
        reason: `Redeemed: ${reward_title}`
      })
    });

    return Response.json({ success: true, code });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};
