export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return Response.json({ rewards: [] });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/rewards?shop=eq.${encodeURIComponent(shop)}&active=eq.true&select=*`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        }
      }
    );

    const data = await res.json();
    return Response.json({ rewards: data || [] });
  } catch (error) {
    return Response.json({ rewards: [], error: error.message });
  }
};
