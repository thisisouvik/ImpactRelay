import type { Metadata } from "next";
import { Workspace } from "@/components/case/workspace";

export const metadata: Metadata = { title: "Case workspace" };
export const instant = false;

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Workspace initialCaseId={id} />;
}
