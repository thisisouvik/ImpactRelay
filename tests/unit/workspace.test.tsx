import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Workspace } from "@/components/case/workspace";
import type { CaseRecord } from "@/lib/domain/schemas";

const createdCase: CaseRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Community support request",
  requestText: "Find local public resources and prepare a reviewable support checklist.",
  status: "received",
  mode: "rules",
  budget: { capUsd: "0.05", spentUsd: "0", reservedUsd: "0" },
  createdAt: "2026-10-17T10:00:00.000Z",
  updatedAt: "2026-10-17T10:00:00.000Z",
  events: [],
  evidence: [],
};

const plannedCase: CaseRecord = {
  ...createdCase,
  status: "plan-ready",
  plan: {
    objective: createdCase.title,
    constraints: ["Use only source-backed claims in the final report."],
    steps: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        toolId: "public.source.read",
        purpose: "Read relevant public guidance.",
        input: { requestText: createdCase.requestText },
        requiresPayment: false,
        requiresApproval: false,
        status: "ready",
      },
    ],
  },
  events: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      caseId: createdCase.id,
      eventType: "agent.plan.ready",
      actor: "planner",
      status: "complete",
      message: "Plan ready with 1 executable step.",
      occurredAt: "2026-10-17T10:01:00.000Z",
    },
  ],
};

describe("ImpactRelay workspace", () => {
  it("starts with a real case input form and no scenario fixture", () => {
    render(<Workspace />);

    expect(screen.getByRole("heading", { name: "Turn a messy request into a reviewable plan." })).toBeInTheDocument();
    expect(screen.getByLabelText("Case title")).toBeInTheDocument();
    expect(screen.getByLabelText("Support request")).toBeInTheDocument();
    expect(screen.queryByText("Flood support near Guwahati")).not.toBeInTheDocument();
  });

  it("persists the submitted request and displays the returned plan", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ case: createdCase }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ case: plannedCase, plan: plannedCase.plan }), { status: 200 }));

    render(<Workspace />);
    fireEvent.change(screen.getByLabelText("Case title"), { target: { value: createdCase.title } });
    fireEvent.change(screen.getByLabelText("Support request"), { target: { value: createdCase.requestText } });
    fireEvent.click(screen.getByRole("button", { name: /Save case and prepare plan/i }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Agent plan" })).toBeInTheDocument());
    expect(screen.getByText("public · source · read")).toBeInTheDocument();
    expect(screen.getByText("Case stored in local SQLite. The plan was generated from your request.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
