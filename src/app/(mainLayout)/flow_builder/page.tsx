import { ReactFlowProvider } from "@xyflow/react";
import FlowList from "@/src/components/bot-flow/FlowList";
import { ErrorBoundary } from "@/src/components/common/ErrorBoundary";

export default function Page() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <FlowList />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}