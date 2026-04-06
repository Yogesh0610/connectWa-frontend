/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Mail, Plus, X } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function SendEmailNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);
  const [newCc, setNewCc] = useState("");
  const [smtpOpen, setSmtpOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const ccList: string[] = data.cc || [];

  const updateNodeData = (field: string, value: any) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };

  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (!data.smtpHost?.trim()) errors.push("SMTP host is required");
    if (!data.smtpUser?.trim()) errors.push("SMTP username is required");
    if (!data.toEmail?.trim()) errors.push("Recipient email is required");
    if (!data.subject?.trim()) errors.push("Subject is required");
    if (!data.body?.trim()) errors.push("Email body is required");
  }

  const addCc = () => {
    if (!newCc.trim()) return;
    if (!ccList.includes(newCc.trim())) updateNodeData("cc", [...ccList, newCc.trim()]);
    setNewCc("");
  };

  const removeCc = (email: string) =>
    updateNodeData("cc", ccList.filter((e) => e !== email));

  const isSmtpConfigured = !!(data.smtpHost?.trim() && data.smtpUser?.trim());

  return (
    <BaseNode
      id={id}
      title="Send Email"
      icon={<Mail size={18} />}
      iconBgColor="bg-sky-100"
      iconColor="text-sky-600"
      borderColor="border-sky-200"
      handleColor="bg-sky-500!"
      errors={errors}
    >
      {/* ── SMTP Configuration collapsible ── */}
      <div className="rounded-lg border border-sky-100 dark:border-(--card-border-color) overflow-hidden">
        <button
          type="button"
          onClick={() => setSmtpOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-sky-50 dark:bg-(--dark-sidebar) hover:bg-sky-100 dark:hover:bg-(--table-hover) transition-colors"
        >
          <div className="flex items-center gap-2">
            <Mail size={12} className="text-sky-500" />
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
              SMTP Configuration
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                isSmtpConfigured
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {isSmtpConfigured ? "✓ Set" : "Required"}
            </span>
          </div>
          {smtpOpen ? <ChevronUp size={13} className="text-sky-500" /> : <ChevronDown size={13} className="text-sky-500" />}
        </button>

        {smtpOpen && (
          <div className="p-3 space-y-3 bg-white dark:bg-(--card-color) border-t border-sky-100 dark:border-(--card-border-color)">
            {/* Host + Port */}
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <NodeField
                  label="SMTP Host"
                  required
                  error={(touched || data.forceValidation) && !data.smtpHost?.trim() ? "Required" : ""}
                >
                  <Input
                    value={data.smtpHost || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateNodeData("smtpHost", e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>
              </div>
              <div className="w-[72px] shrink-0">
                <NodeField label="Port">
                  <Input
                    type="number"
                    value={data.smtpPort || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateNodeData("smtpPort", e.target.value)}
                    placeholder="587"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>
              </div>
            </div>

            {/* Encryption */}
            <NodeField label="Encryption">
              <Select
                value={data.smtpEncryption || "tls"}
                onValueChange={(v) => updateNodeData("smtpEncryption", v)}
                onOpenChange={() => setTouched(true)}
              >
                <SelectTrigger className="h-8 text-xs bg-(--input-color) dark:bg-(--page-body-bg)">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-(--page-body-bg)">
                  <SelectItem value="tls" className="dark:hover:bg-(--card-color)">TLS (STARTTLS) — port 587</SelectItem>
                  <SelectItem value="ssl" className="dark:hover:bg-(--card-color)">SSL — port 465</SelectItem>
                  <SelectItem value="none" className="dark:hover:bg-(--card-color)">None — port 25</SelectItem>
                </SelectContent>
              </Select>
            </NodeField>

            {/* Username */}
            <NodeField
              label="SMTP Username"
              required
              error={(touched || data.forceValidation) && !data.smtpUser?.trim() ? "Required" : ""}
            >
              <Input
                value={data.smtpUser || ""}
                onFocus={() => setTouched(true)}
                onChange={(e) => updateNodeData("smtpUser", e.target.value)}
                placeholder="you@gmail.com"
                className="h-8 text-xs bg-(--input-color)"
              />
            </NodeField>

            {/* Password */}
            <NodeField label="Password / App Password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={data.smtpPassword || ""}
                  onFocus={() => setTouched(true)}
                  onChange={(e) => updateNodeData("smtpPassword", e.target.value)}
                  placeholder="••••••••••••"
                  className="h-8 text-xs bg-(--input-color) pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 italic">
                Gmail users: use an{" "}
                <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-sky-500 underline">
                  App Password
                </a>
              </p>
            </NodeField>

            {/* From Name + From Email */}
            <div className="flex gap-2">
              <NodeField label="From Name" className="flex-1 min-w-0">
                <Input
                  value={data.fromName || ""}
                  onFocus={() => setTouched(true)}
                  onChange={(e) => updateNodeData("fromName", e.target.value)}
                  placeholder="Acme Support"
                  className="h-8 text-xs bg-(--input-color)"
                />
              </NodeField>
              <NodeField label="From Email" className="flex-1 min-w-0">
                <Input
                  value={data.fromEmail || ""}
                  onFocus={() => setTouched(true)}
                  onChange={(e) => updateNodeData("fromEmail", e.target.value)}
                  placeholder="support@acme.com"
                  className="h-8 text-xs bg-(--input-color)"
                />
              </NodeField>
            </div>

            {/* Quick presets */}
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Quick Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Gmail", host: "smtp.gmail.com", port: "587", enc: "tls" },
                  { label: "Outlook", host: "smtp.office365.com", port: "587", enc: "tls" },
                  { label: "Yahoo", host: "smtp.mail.yahoo.com", port: "465", enc: "ssl" },
                  { label: "SendGrid", host: "smtp.sendgrid.net", port: "587", enc: "tls" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      updateNodeData("smtpHost", preset.host);
                      updateNodeData("smtpPort", preset.port);
                      updateNodeData("smtpEncryption", preset.enc);
                      setTouched(true);
                    }}
                    className="text-[10px] px-2 py-1 rounded border border-gray-200 dark:border-(--card-border-color) hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-(--table-hover) transition-colors text-gray-600 dark:text-gray-400"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Email Content ── */}
      <NodeField
        label="To"
        required
        description="Recipient email or {{variable}}"
        error={(touched || data.forceValidation) && !data.toEmail?.trim() ? "Recipient email is required" : ""}
      >
        <Input
          value={data.toEmail || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("toEmail", e.target.value)}
          placeholder="{{contact_email}} or email@example.com"
          className="h-9 text-sm bg-(--input-color)"
        />
      </NodeField>

      <NodeField label="CC">
        <div className="flex gap-2">
          <Input
            value={newCc}
            onChange={(e) => setNewCc(e.target.value)}
            onFocus={() => setTouched(true)}
            onKeyDown={(e) => e.key === "Enter" && addCc()}
            placeholder="cc@example.com"
            className="h-8 text-xs bg-(--input-color) flex-1"
          />
          <Button onClick={addCc} size="icon" variant="outline" className="h-8 w-8 shrink-0">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {ccList.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {ccList.map((email, i) => (
              <div
                key={i}
                className="flex items-center gap-1 text-[10px] bg-sky-50 dark:bg-(--dark-sidebar) text-sky-700 border border-sky-100 dark:border-(--card-border-color) rounded px-1.5 py-0.5"
              >
                {email}
                <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => removeCc(email)} />
              </div>
            ))}
          </div>
        )}
      </NodeField>

      <NodeField
        label="Subject"
        required
        error={(touched || data.forceValidation) && !data.subject?.trim() ? "Subject is required" : ""}
      >
        <Input
          value={data.subject || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("subject", e.target.value)}
          placeholder="Your order {{order_id}} has shipped!"
          className="h-9 text-sm bg-(--input-color)"
        />
      </NodeField>

      <NodeField
        label="Email Body"
        required
        error={(touched || data.forceValidation) && !data.body?.trim() ? "Email body is required" : ""}
      >
        <Textarea
          value={data.body || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("body", e.target.value)}
          placeholder={"Hi {{contact_name}},\n\nYour order is confirmed.\n\nThanks!"}
          className="min-h-28 resize-none text-sm font-mono dark:bg-(--page-body-bg) bg-(--input-color)"
        />
        <div className="mt-1 text-right text-[10px] text-gray-400">{data.body?.length || 0} chars</div>
      </NodeField>
    </BaseNode>
  );
}