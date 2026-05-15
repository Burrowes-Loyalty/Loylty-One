import { supabase } from "../supabase.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return Response.json({ rewards: [] });
  }

  const { data } = await supabase
    .from("rewards")
    .select("*")
    .eq("shop", shop)
    .eq("active", true);

  return Response.json({ rewards: data || [] });
};
