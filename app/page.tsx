import { redirect } from "next/navigation";

export default function Home() {
  // Khi mở http://localhost:3000 → tự động vào /login
  redirect("/login");
}
