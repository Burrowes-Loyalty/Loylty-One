import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [MONTHLY_PLAN],
    isTest: true,
  });

  return { hasActivePayment, appSubscriptions };
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  await billing.request({
    plan: MONTHLY_PLAN,
    isTest: true,
    returnUrl: "https://example.com/app",
  });

  return null;
};
