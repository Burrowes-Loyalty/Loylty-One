import { supabase } from "../supabase.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer_id");

  const { data, error } = await supabase
    .from("redeemed_rewards")
    .select("*")
    .eq("customer_id", String(customerId));

  return Response.json({ codes: data || [] });
};
