import { redirect } from "next/navigation";

export default function Home() {
  // Middleware will redirect unauthenticated users to `/login`.
  redirect("/dashboard");
}
