/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { AgentTransferNode } from "./AgentTransferNode";
import { AiTransferNode } from "./AiTransferNode";
import { ApiWebhookNode } from "./ApiWebhookNode";
import { ButtonMessageNode } from "./ButtonMessageNode";
import { CallToActionNode } from "./CallToActionNode";
import { ConditionNode } from "./ConditionNode";
import { DelayNode } from "./DelayNode";
import { DisableAutoReplyNode } from "./DisableAutoReplyNode";
import { EndFlowNode } from "./EndFlowNode";
import { GenericNode } from "./GenericNode";
import { GoogleSheetsNode } from "./GoogleSheetsNode";
import { JumpToFlowNode } from "./JumpToFlowNode";
import { ListMessageNode } from "./ListMessageNode";
import { LocationNode } from "./LocationNode";
import { MediaMessageNode } from "./MediaMessageNode";
import { MySqlQueryNode } from "./MySqlQueryNode";
import { ResetSessionNode } from "./ResetSessionNode";
import { SendEmailNode } from "./SendEmailNode";
import { SendMessageNode } from "./SendMessageNode";
import { SendWaTemplateNode } from "./SendWaTemplateNode";
import { SetVariableNode } from "./SetVariableNode";
import { TextMessageNode } from "./TextMessageNode";
import { TriggerNode } from "./TriggerNode";
import { UserInputNode } from "./UserInputNode";

export function CustomNode(props: any) {
  switch (props.data.nodeType) {
    // ── Entry point ──────────────────────────────────────
    case "trigger":
      return <TriggerNode {...props} />;

    // ── Messages ─────────────────────────────────────────
    case "text_message":
      return <TextMessageNode {...props} />;
    case "send-message":
      return <SendMessageNode {...props} />;
    case "button_message":
      return <ButtonMessageNode {...props} />;
    case "list-message":
    case "list_message":
      return <ListMessageNode {...props} />;
    case "media_message":
      return <MediaMessageNode {...props} />;
    case "call_to_action":
      return <CallToActionNode {...props} />;
    case "location":
      return <LocationNode {...props} />;
    case "wa_template":
    case "send_wa_template":
      return <SendWaTemplateNode {...props} />;

    // ── Logic & flow control ──────────────────────────────
    case "condition":
      return <ConditionNode {...props} />;
    case "delay":
      return <DelayNode {...props} />;
    case "jump_to_flow":
      return <JumpToFlowNode {...props} />;
    case "disable_auto_reply":
      return <DisableAutoReplyNode {...props} />;
    case "reset_session":
      return <ResetSessionNode {...props} />;

    // ── User interaction ──────────────────────────────────
    case "user_input":
      return <UserInputNode {...props} />;

    // ── Data ─────────────────────────────────────────────
    case "set_variable":
      return <SetVariableNode {...props} />;
    case "api_webhook":
      return <ApiWebhookNode {...props} />;
    case "google_sheets":
      return <GoogleSheetsNode {...props} />;
    case "mysql_query":
      return <MySqlQueryNode {...props} />;

    // ── Notifications ─────────────────────────────────────
    case "send_email":
      return <SendEmailNode {...props} />;

    // ── Handoffs ──────────────────────────────────────────
    case "agent_transfer":
      return <AgentTransferNode {...props} />;
    case "ai_transfer":
      return <AiTransferNode {...props} />;

    // ── Termination ───────────────────────────────────────
    case "end_flow":
      return <EndFlowNode {...props} />;

    // ── Fallback ─────────────────────────────────────────
    default:
      return <GenericNode {...props} />;
  }
}