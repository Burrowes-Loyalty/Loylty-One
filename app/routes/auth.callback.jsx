import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  console.log("CALLBACK HIT:", request.url);
  try {
    const result = await authenticate.admin(request);
    console.log("CALLBACK SUCCESS");
    return result;
  } catch (error) {
    console.log("CALLBACK ERROR:", error.message, error.constructor.name);
    throw error;
  }
};
