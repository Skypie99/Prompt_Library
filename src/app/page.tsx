import { HomeClient } from "@/components/HomeClient";
import { seedPrompts } from "@/lib/prompts";

// Server component: reads the seed prompts at build time and hands them to the
// interactive client shell.
export default function Home() {
  return <HomeClient prompts={seedPrompts} />;
}
