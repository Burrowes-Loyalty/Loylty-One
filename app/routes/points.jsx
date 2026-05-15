export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer_id");

  if (!customerId) {
    return Response.json({ points: 0 });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/points_ledger?customer_id=eq.${customerId}&select=points`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        }
      }
    );

    const data = await res.json();
    const total = (data || []).reduce((sum, row) => sum + row.points, 0);
    return Response.json({ points: total });
  } catch (error) {
    return Response.json({ points: 0 });
  }
};
