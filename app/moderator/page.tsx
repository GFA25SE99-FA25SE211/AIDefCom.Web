import { redirect } from "next/navigation";

export default function ModeratorHomePage() {
  redirect("/moderator/create-sessions");
}
