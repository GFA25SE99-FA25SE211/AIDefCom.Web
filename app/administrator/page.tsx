// app/administrator/page.tsx
import { redirect } from "next/navigation";

export default function AdminHomePage() {
  redirect("/administrator/dashboard");
}
