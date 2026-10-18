import type { Metadata } from "next";
import { Workspace } from "@/components/case/workspace";

export const metadata: Metadata = { title: "New case" };

export default function NewCasePage() {
  return <Workspace forceNew />;
}
