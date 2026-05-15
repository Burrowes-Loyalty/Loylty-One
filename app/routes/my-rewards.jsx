export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer_id");

  if (!customerId) {
    return Response.json({ codes: [] });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/redeemed_rewards?customer_id=eq.${customerId}&select=*&order=created_at.desc`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        }
      }
    );

    const data = await res.json();
    return Response.json({ codes: data || [] });
  } catch (error) {
    return Response.json({ codes: [], error: error.message });
  }
};
