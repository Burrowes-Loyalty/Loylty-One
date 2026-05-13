import { supabase } from "../supabase.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer_id");

  if (!customerId) {
    return Response.json({ points: 0 });
  }

  const { data, error } = await supabase
    .from("points_ledger")
    .select("points")
    .eq("customer_id", customerId);

  if (error || !data) {
    return Response.json({ points: 0 });
  }

  const total = data.reduce((sum, row) => sum + row.points, 0);

  return Response.json({ points: total });
};
