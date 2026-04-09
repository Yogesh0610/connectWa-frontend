/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Switch } from "@/src/elements/ui/switch";
import { Textarea } from "@/src/elements/ui/textarea";
import { cn } from "@/src/lib/utils";
import { useGetAgentDataQuery } from "@/src/redux/api/agentApi";
import { useFormikContext } from "formik";
import { Bot, User } from "lucide-react";

const StepIdentification = () => {
  const { values, touched, errors, getFieldProps, setFieldValue } = useFormikContext<any>();

  const { data: agentsData } = useGetAgentDataQuery({ page: 1, limit: 100 });
  const agents = agentsData?.data?.agents || [];

  return (
    <div className="mx-auto space-y-8 animate-in slide-in-from-right-4 duration-300">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-lg">
          <User size={22} />
          <span>Identification</span>
        </div>
        <p className="text-sm text-muted-foreground">Basic details about how your agent is identified within the system.</p>
      </div>

      {/* Agent Type Toggle */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Agent Type</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFieldValue("agent_type", "ai")}
            className={cn(
              "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
              values.agent_type !== "human"
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-200 dark:border-(--card-border-color) text-muted-foreground hover:border-slate-300"
            )}
          >
            <Bot size={20} />
            <div className="text-left">
              <div className="font-semibold text-sm">AI Agent</div>
              <div className="text-xs opacity-70">Automated AI response</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFieldValue("agent_type", "human")}
            className={cn(
              "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
              values.agent_type === "human"
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-200 dark:border-(--card-border-color) text-muted-foreground hover:border-slate-300"
            )}
          >
            <User size={20} />
            <div className="text-left">
              <div className="font-semibold text-sm">Human Agent</div>
              <div className="text-xs opacity-70">Route to real operator</div>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Assistant Name</Label>
            <Input
              placeholder="e.g. Real Estate Concierge"
              {...getFieldProps("name")}
              className={cn("h-12 text-base rounded-lg", touched.name && errors.name && "border-red-500")}
            />
            {touched.name && errors.name && <p className="text-xs text-red-500">{errors.name as string}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Internal Status</Label>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-(--page-body-bg) rounded-lg border border-slate-100 dark:border-(--card-border-color)">
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full animate-pulse", values.is_active ? "bg-primary" : "bg-slate-400")} />
                <span className="font-semibold">{values.is_active ? "Live & Ready" : "Paused / Maintenance"}</span>
              </div>
              <Switch checked={values.is_active} onCheckedChange={(val) => setFieldValue("is_active", val)} />
            </div>
          </div>

          {/* Human-only: assigned user + SIP extension */}
          {values.agent_type === "human" && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assigned User</Label>
                <select
                  value={values.assigned_user_id || ""}
                  onChange={(e) => setFieldValue("assigned_user_id", e.target.value)}
                  className="w-full h-12 px-3 rounded-lg border border-slate-200 dark:border-(--card-border-color) bg-background text-sm"
                >
                  <option value="">— Select a user —</option>
                  {agents.map((a: any) => (
                    <option key={a._id} value={a._id}>
                      {a.name} {a.email ? `(${a.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">SIP Extension <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input
                  placeholder="e.g. 101"
                  {...getFieldProps("sip_extension")}
                  className="h-12 text-base rounded-lg"
                />
                <p className="text-xs text-muted-foreground">If SIP is configured, Meta routes calls to this extension automatically.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Ring Timeout (seconds)</Label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  {...getFieldProps("ring_timeout_seconds")}
                  className="h-12 text-base rounded-lg"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Welcome Greeting</Label>
            <Textarea
              placeholder="Hello, I'm your AI assistant. How can I help you today?"
              {...getFieldProps("welcome_message")}
              className={cn("min-h-37 rounded-lg resize-none", touched.welcome_message && errors.welcome_message && "border-red-500")}
            />
            {touched.welcome_message && errors.welcome_message && (
              <p className="text-xs text-red-500">{errors.welcome_message as string}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepIdentification;
