import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  console.log("AUTH ROUTE HIT:", request.url);
  try {
    await authenticate.admin(request);
    console.log("AUTH SUCCESS");
    return null;
  } catch (error) {
    console.log("AUTH ERROR:", error.message);
    throw error;
  }
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
