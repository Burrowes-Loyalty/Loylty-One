export const action = async ({ request }) => {
  const body = await request.json();
  const { customer_id, shop, reward_id, reward_title, points_cost } = body;

  if (!customer_id || !reward_id) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  try {
    // Get current points
    const ledgerRes = await fetch(
      `${supabaseUrl}/rest/v1/points_ledger?customer_id=eq.${customer_id}&select=points`,
      { headers }
    );
    const ledger = await ledgerRes.json();
    const totalPoints = (ledger || []).reduce((sum, row) => sum + row.points, 0);

    if (totalPoints < points_cost) {
      return Response.json({
        error: `You need ${points_cost} points. You have ${totalPoints}.`
      }, { status: 400 });
    }

    // Generate unique code
    const code = `LOYAL${String(customer_id).slice(-4)}${Date.now().toString(36).toUpperCase()}`.slice(0, 20);

    // Save redeemed reward
    await fetch(`${supabaseUrl}/rest/v1/redeemed_rewards`, {
      method: "POST",
      headers: { ...headers, "Prefer": "return=minimal" },
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
      headers: { ...headers, "Prefer": "return=minimal" },
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
