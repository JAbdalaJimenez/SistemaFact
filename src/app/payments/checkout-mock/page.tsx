import { notFound } from "next/navigation";
import { CheckoutMockClient } from "./client";

export default function CheckoutMockPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <CheckoutMockClient />;
}
