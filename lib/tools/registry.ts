import { locationLookupTool } from "@/lib/tools/location";
import { publicSourceReadTool } from "@/lib/tools/public-source";
import { currentWeatherTool } from "@/lib/tools/weather";
import { nearbyResourcesTool } from "@/lib/tools/resources";
import type { FreeTool, ToolExecutionContext, ToolResult } from "@/lib/tools/types";

const freeTools = new Map<string, FreeTool>([
  [locationLookupTool.id, locationLookupTool],
  [currentWeatherTool.id, currentWeatherTool],
  [nearbyResourcesTool.id, nearbyResourcesTool],
  [publicSourceReadTool.id, publicSourceReadTool],
]);

export function availableFreeToolIds() {
  return [...freeTools.keys()];
}

export function getFreeTool(toolId: string) {
  return freeTools.get(toolId);
}

export async function executeFreeTool(
  toolId: string,
  input: Record<string, unknown>,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const tool = getFreeTool(toolId);
  if (!tool) {
    return {
      toolId,
      status: "blocked",
      message: `No real free-tool adapter is configured for ${toolId}.`,
    };
  }
  return tool.execute(input, context);
}
