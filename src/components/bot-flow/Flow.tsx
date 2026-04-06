/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ROUTES } from "@/src/constants/route";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { useCreateAutomationFlowMutation, useGetAutomationFlowQuery, useUpdateAutomationFlowMutation } from "@/src/redux/api/automationApi";
import { useAppDispatch, useAppSelector } from "@/src/redux/hooks";
import { setSidebarToggle } from "@/src/redux/reducers/layoutSlice";
import { addEdge, Background, BackgroundVariant, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState, useReactFlow, type Connection, type Node } from "@xyflow/react";
import { ChevronLeft, ChevronRight, Save, Search, Target } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NODETEMPLATES } from "@/src/data/SidebarList";
import { CustomEdge } from "./edges/CustomEdge";
import { CustomNode } from "./nodes/CustomNode";

const edgeTypes = { custom: CustomEdge };
const nodeTypes = { custom: CustomNode };

// ─── Backend type map ─────────────────────────────────────────────────────────
const BACKEND_TYPE: Record<string, string> = {
  trigger:          "trigger",
  text_message:     "send_message",
  "send-message":   "send_message",
  button_message:   "send_message",
  list_message:     "send_message",
  "list-message":   "send_message",
  media_message:    "send_message",
  location:         "send_message",
  call_to_action:   "send_message",
  wa_template:      "send_message",
  send_wa_template: "send_message",
  delay:            "delay",
  condition:        "condition",
  user_input:       "user_input",
  set_variable:     "set_variable",
  api_webhook:      "api_webhook",
  jump_to_flow:     "jump_to_flow",
  end_flow:         "end_flow",
  // new nodes
  disable_auto_reply: "disable_auto_reply",
  reset_session:      "reset_session",
  send_email:         "send_email",
  google_sheets:      "google_sheets",
  mysql_query:        "mysql_query",
  agent_transfer:     "agent_transfer",
  ai_transfer:        "ai_transfer",
};

// ─── FlowCanvas ───────────────────────────────────────────────────────────────

const FlowCanvas = () => {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const flowId = params?.id as string;

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [flowName, setFlowName] = useState("New Flow");
  const [forceValidation, setForceValidation] = useState(false);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const { data: flowData, isLoading: isLoadingFlow } = useGetAutomationFlowQuery(flowId, { skip: !flowId });
  const [createFlow, { isLoading: isCreating }] = useCreateAutomationFlowMutation();
  const [updateFlow, { isLoading: isUpdating }] = useUpdateAutomationFlowMutation();

  // ── Layout effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(setSidebarToggle(true));
    return () => { dispatch(setSidebarToggle(false)); };
  }, [dispatch]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsDrawerCollapsed(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({ ...node, data: { ...node.data, forceValidation } }))
    );
  }, [forceValidation, setNodes]);

  // ── Autosave ────────────────────────────────────────────────────────────────
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const handleSaveRef = useRef<() => Promise<void>>(async () => {});

  // Validation ──────────────────────────────────────────────────────────────

  const validateFlow = useCallback(() => {
    if (nodes.length === 0 || edges.length === 0) return false;

    return nodes.every((node) => {
      const t = node.data.nodeType;

      switch (t) {
        case "trigger":
          return (
            node.data.contactType &&
            node.data.triggerType &&
            (node.data.triggerType === "any message" ||
              node.data.triggerType === "order received" ||
              node.data.keywords?.length > 0)
          );

        case "text_message":
          return node.data.message?.trim();

        case "send-message": {
          const d = node.data;
          if (d.messageType === "Media") return !!d.mediaUrl?.trim();
          if (d.messageType === "Interactive") {
            if (!d.message?.trim()) return false;
            if (d.interactiveType === "button") {
              return (d.buttons || []).length > 0 && (d.buttons || []).every((b: any) => b.title?.trim());
            }
            if (d.interactiveType === "list") {
              return (d.listParams?.items || []).length > 0 && (d.listParams?.items || []).every((item: any) => item.title?.trim());
            }
          }
          return !!d.message?.trim();
        }

        case "button_message":
          return (
            node.data.message?.trim() &&
            node.data.buttons?.length > 0 &&
            node.data.buttons.every((b: any) => b.text)
          );

        case "call_to_action":
          return node.data.valueText?.trim() && node.data.buttonText?.trim() && node.data.buttonLink?.trim();

        case "list_message":
        case "list-message":
          return (
            node.data.bodyText?.trim() &&
            node.data.buttonText?.trim() &&
            node.data.sections?.length > 0
          );

        case "media_message":
          return node.data.mediaUrl?.trim();

        case "location":
          return node.data.lat && node.data.lng;

        case "wa_template":
        case "send_wa_template":
          return (
            node.data.templateId?.trim() &&
            (node.data.variableMappings || []).every((m: any) => m.value?.trim())
          );

        case "condition": {
          const cond = node.data.condition || {};
          const hasValues = ["is_empty", "is_not_empty"].includes(cond.operator)
            ? true
            : Array.isArray(cond.value) ? cond.value.length > 0 : !!cond.value;
          return cond.field && cond.operator && hasValues;
        }

        case "user_input":
          return node.data.questionText?.trim() && node.data.variableName?.trim();

        case "set_variable":
          return (
            node.data.variables?.length > 0 &&
            node.data.variables.every((v: any) => v.key?.trim())
          );

        case "api_webhook":
          return node.data.url?.trim();

        case "jump_to_flow":
          return node.data.targetFlowId?.trim();

        // ── New nodes ─────────────────────────────────────────────
        case "disable_auto_reply":
          return node.data.duration > 0;

        case "reset_session":
          return true; // always valid — scope defaults to "variables"

        case "send_email":
          return (
            node.data.smtpHost?.trim() &&
            node.data.smtpUser?.trim() &&
            node.data.toEmail?.trim() &&
            node.data.subject?.trim() &&
            node.data.body?.trim()
          );

        case "google_sheets":
          return (
            node.data.spreadsheetId?.trim() &&
            node.data.sheetName?.trim() &&
            node.data.columnMappings?.length > 0
          );

        case "mysql_query":
          return (
            node.data.dbHost?.trim() &&
            node.data.dbName?.trim() &&
            node.data.dbUser?.trim() &&
            node.data.query?.trim()
          );

        case "agent_transfer":
          return node.data.teamId?.trim();

        case "ai_transfer":
          return node.data.assistantId?.trim();

        case "end_flow":
        case "delay":
          return true;

        default:
          return true;
      }
    });
  }, [nodes, edges]);

  const isSaveDisabled = isCreating || isUpdating || !validateFlow();

  // ── Restore saved flow ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!flowData?.data) return;
    const flow = flowData.data;
    setFlowName(flow.name);

    const restoredNodes = flow.nodes
      .filter((n: any) => n.type !== "condition")
      .map((n: any) => {
        const p = JSON.parse(JSON.stringify(n.parameters || {}));

        // Restore trigger keywords from connected condition node
        let keywords = p.keywords;
        if (n.type === "trigger") {
          const connCond = flow.nodes.find(
            (chk: any) =>
              chk.type === "condition" &&
              chk.id.startsWith("cond-start-") &&
              flow.connections.some((c: any) => c.source === n.id && c.target === chk.id)
          );
          if (connCond?.parameters?.condition?.value) {
            const val = connCond.parameters.condition.value;
            keywords = (Array.isArray(val) ? val : [val]).filter((kw: string) => !kw.includes("___"));
          }
        }

        if (p.buttons?.length) {
          p.buttons = p.buttons.map((btn: any) => ({
            ...btn,
            value: btn.value?.includes("___") ? btn.value.split("___").pop() : btn.value,
          }));
        }
        if (p.sections?.length) {
          p.sections = p.sections.map((sec: any) => ({
            ...sec,
            items: sec.items?.map((item: any) => ({
              ...item,
              title: item.title?.includes("___") ? item.title.split("___").pop() : item.title,
            })),
          }));
        }

        const restoreByType: Record<string, any> = {
          user_input: {
            questionText: p.question || "",
            variableName: p.variable || "",
            inputType: p.input_type || "text",
            validationError: p.validation_error || "",
            timeoutSeconds: p.timeout_seconds || null,
          },
          jump_to_flow: {
            targetFlowId: p.target_flow_id || "",
            jumpMode: p.jump_mode || "replace",
            passVariables: p.pass_variables || [],
          },
          end_flow: {
            goodbyeMessage: p.goodbye_message || "",
            endAction: p.end_action || "close_session",
            tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
          },
          api_webhook: {
            method: p.method || "POST",
            url: p.url || "",
            headers: p.headers || [],
            body: p.body || "",
            responseJsonPath: p.response_json_path || "",
            responseVariable: p.response_variable || "",
          },
          // ── new nodes ──────────────────────────────────────────────
          wa_template: {
            templateId: p.template_id || "",
            templateName: p.template_name || "",
            language: p.language || "",
            variableMappings: p.variable_mappings || [],
            headerMediaUrl: p.header_media_url || "",
          },
          send_wa_template: {
            templateId: p.template_id || "",
            templateName: p.template_name || "",
            language: p.language || "",
            variableMappings: p.variable_mappings || [],
            headerMediaUrl: p.header_media_url || "",
          },
          disable_auto_reply: {
            duration: p.duration || 30,
            durationUnit: p.duration_unit || "minutes",
            scope: p.scope || "all",
          },
          reset_session: {
            resetScope: p.reset_scope || "variables",
            keepVariables: p.keep_variables || [],
          },
          send_email: {
            smtpHost: p.smtp_host || "",
            smtpPort: p.smtp_port || "587",
            smtpEncryption: p.smtp_encryption || "tls",
            smtpUser: p.smtp_user || "",
            smtpPassword: p.smtp_password || "",
            fromName: p.from_name || "",
            fromEmail: p.from_email || "",
            toEmail: p.to_email || "",
            cc: p.cc || [],
            subject: p.subject || "",
            body: p.body || "",
          },
          google_sheets: {
            authMode: p.auth_mode || "service_account",
            serviceAccountEmail: p.service_account_email || "",
            privateKey: p.private_key || "",
            apiKey: p.api_key || "",
            spreadsheetId: p.spreadsheet_id || "",
            sheetName: p.sheet_name || "",
            action: p.action || "append_row",
            columnMappings: p.column_mappings || [],
          },
          mysql_query: {
            dbHost: p.db_host || "",
            dbPort: p.db_port || "3306",
            dbName: p.db_name || "",
            dbUser: p.db_user || "",
            dbPassword: p.db_password || "",
            dbSsl: p.db_ssl || false,
            queryType: p.query_type || "select",
            query: p.query || "",
            resultMappings: p.result_mappings || [],
          },
          agent_transfer: {
            teamId: p.team_id || "",
            assignmentMode: p.assignment_mode || "round_robin",
            priority: p.priority || "normal",
            note: p.note || "",
            queueMessage: p.queue_message || "",
          },
          ai_transfer: {
            assistantId: p.assistant_id || "",
            model: p.model || "gpt-4o",
            systemPrompt: p.system_prompt || "",
            contextVariables: p.context_variables || [],
            maxTurns: p.max_turns || 10,
          },
          "send-message": {
            messageType:
              p.interactive_type === "list" || p.interactive_type === "button"
                ? "Interactive"
                : p.media_url
                ? "Media"
                : "Simple text",
            interactiveType: p.interactive_type || "button",
            message: p.message_template || p.message || "",
            mediaUrl: p.media_url || "",
            buttons: p.button_params
              ? p.button_params.map((b: any, idx: number) => ({
                  id: b.id || `btn_${idx + 1}`,
                  title: b.id?.includes("___") ? b.id.split("___").pop() : b.title || "",
                }))
              : [{ id: "btn_1", title: "" }],
            listParams: p.list_params
              ? {
                  ...p.list_params,
                  items: (p.list_params.items || []).map((item: any) => ({
                    ...item,
                    title: item.id?.includes("___") ? item.id.split("___").pop() : item.title || "",
                  })),
                }
              : { items: [{ id: "item_1", title: "" }] },
          },
        };

        const extraData = restoreByType[n.type] || {};

        return {
          id: n.id,
          type: "custom",
          position: n.position,
          data: {
            ...p,
            nodeType: p.nodeType || (n.type === "send_message" ? "text_message" : n.type),
            message: p.message || p.message_template || "",
            keywords: keywords || [],
            ...(p.location_params
              ? {
                  lat: p.location_params.latitude,
                  lng: p.location_params.longitude,
                  name: p.location_params.name,
                  address: p.location_params.address,
                }
              : {}),
            ...(p.media_url ? { mediaUrl: p.media_url, caption: p.message_template } : {}),
            ...extraData,
            forceValidation: false,
          },
        };
      });

    const restoredEdges = flow.connections
      .filter((c: any) => {
        const src = flow.nodes.find((n: any) => n.id === c.source);
        return src?.type !== "condition";
      })
      .map((c: any) => {
        let source = c.source;
        let sourceHandle = ["default", "source"].includes(c.sourceHandle) ? "src" : c.sourceHandle;
        let target = c.target;
        let targetHandle = ["default", "target"].includes(c.targetHandle) ? "tgt" : c.targetHandle;

        const targetNode = flow.nodes.find((n: any) => n.id === c.target);
        if (targetNode?.type === "condition") {
          const outEdge = flow.connections.find((out: any) => out.source === targetNode.id);
          if (outEdge) {
            target = outEdge.target;
            targetHandle = ["default", "target"].includes(outEdge.targetHandle) ? "tgt" : outEdge.targetHandle;
          }
          if (targetNode.id.startsWith("cond-btn-")) {
            const parts = targetNode.id.split("___");
            if (parts.length >= 3) { source = parts[1]; sourceHandle = `src-btn-${parts[2]}`; }
          } else if (targetNode.id.startsWith("cond-list-")) {
            const parts = targetNode.id.split("___");
            if (parts.length >= 4) { source = parts[1]; sourceHandle = `src-item-${parts[2]}-${parts[3]}`; }
          }
        }

        return { id: c.id, source, target, type: "custom", animated: true, sourceHandle, targetHandle };
      })
      .filter((edge: any, index: number, self: any[]) =>
        index === self.findIndex((t) => t.source === edge.source && t.target === edge.target)
      );

    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setTimeout(() => setViewport({ x: 0, y: 0, zoom: 1 }), 100);
  }, [flowData, setNodes, setEdges, setViewport]);

  // ── Connect ─────────────────────────────────────────────────────────────────

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, type: "custom", animated: true }, eds)),
    [setEdges]
  );

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      if (!flowName.trim()) { toast.error("Please enter a flow name"); return; }

      setForceValidation(true);

      const triggerNodes = nodes.filter((n) => n.data.nodeType === "trigger");
      if (triggerNodes.length === 0) {
        toast.error("Flow must have at least one Start Trigger");
        return;
      }

      const formattedNodes: any[] = [];
      const formattedConnections: any[] = [];

      // ── Backend ID helper ────────────────────────────────────────
      const getBackendId = (node: any) => {
        if (!node) return "";
        const nt = node.data?.nodeType || node.type;
        const prefixes: Record<string, string> = {
          trigger: "trigger",
          delay: "delay",
          condition: "condition",
          user_input: "user_input",
          set_variable: "set_variable",
          api_webhook: "api_webhook",
          jump_to_flow: "jump_to_flow",
          end_flow: "end_flow",
          // new nodes
          wa_template: "wa_template",
          send_wa_template: "wa_template",
          disable_auto_reply: "disable_auto_reply",
          reset_session: "reset_session",
          send_email: "send_email",
          google_sheets: "google_sheets",
          mysql_query: "mysql_query",
          agent_transfer: "agent_transfer",
          ai_transfer: "ai_transfer",
        };
        const prefix = prefixes[nt];
        if (prefix) {
          return node.id.startsWith(`${prefix}-`) ? node.id : `${prefix}-${node.id}`;
        }
        const sm = "send_message-";
        return node.id.startsWith(sm) ? node.id : `${sm}${node.id}`;
      };

      const operatorMap: Record<string, string> = {
        "contains keyword": "contains_any",
        "on exact match": "equals",
        "starts with": "starts_with",
      };

      // ── Add trigger nodes ────────────────────────────────────────
      triggerNodes.forEach((tNode) => {
        formattedNodes.push({
          id: getBackendId(tNode),
          type: "trigger",
          position: tNode.position,
          parameters: { ...tNode.data },
          name: "Incoming Message",
        });
      });

      // ── Build parameters for a single node ──────────────────────
      const buildParameters = (node: any, backendType: string): any => {
        const d = node.data;
        const nt = d.nodeType;
        const base: any = { ...d };

        if (backendType === "send_message") {
          base.recipient = "{{senderNumber}}";
          base.provider_type = "business_api";

          if (nt === "location") {
            base.messageType = "location";
            base.location_params = { latitude: d.lat, longitude: d.lng, name: d.name || "", address: d.address || "" };
          } else if (nt === "list_message" || nt === "list-message") {
            base.messageType = "interactive";
            base.interactive_type = "list";
            const pfx = flowId ? `f${flowId.slice(-6)}` : `new${Math.random().toString(36).substring(7)}`;
            base.list_params = {
              header: d.headerText || "",
              body: d.bodyText || "",
              footer: d.footerText || "",
              buttonTitle: d.buttonText || "Select",
              sectionTitle: (d.sections || [])[0]?.title || "Options",
              items: (d.sections || []).flatMap((sec: any) =>
                (sec.items || []).map((item: any) => ({
                  id: `${pfx}___${item.title}`,
                  title: item.title,
                  description: item.description || "",
                }))
              ),
            };
            base.message_template = d.bodyText || "";
          } else if (nt === "send-message") {
            if (d.messageType === "Interactive") {
              base.messageType = "interactive";
              base.interactive_type = d.interactiveType || "button";
              base.message_template = d.message || "";
              const pfx = flowId ? `f${flowId.slice(-6)}` : `new${Math.random().toString(36).substring(7)}`;
              if (d.interactiveType === "list") {
                const listP = d.listParams || { items: [] };
                base.list_params = {
                  header: listP.header || "",
                  footer: listP.footer || "",
                  buttonTitle: listP.buttonTitle || "Select",
                  sectionTitle: listP.sectionTitle || "Options",
                  body: d.message || "",
                  items: (listP.items || []).map((item: any) => ({
                    id: `${pfx}___${item.title}`,
                    title: item.title,
                    description: item.description || "",
                  })),
                };
              } else {
                base.button_params = (d.buttons || []).map((btn: any) => ({
                  id: `${pfx}___${btn.title}`,
                  title: btn.title,
                }));
              }
            } else if (d.messageType === "Media") {
              base.media_url = d.mediaUrl || "";
              base.message_template = d.message || "";
            } else {
              base.message_template = d.message || "";
            }
          } else if (d.mediaUrl) {
            base.media_url = d.mediaUrl;
            base.message_template = d.caption || "";
          } else if (nt === "button_message") {
            base.messageType = "interactive";
            base.interactive_type = "button";
            const pfx = flowId ? `f${flowId.slice(-6)}` : `new${Math.random().toString(36).substring(7)}`;
            base.button_params = (d.buttons || []).map((btn: any) => ({
              id: `${pfx}___${btn.value || btn.text}`,
              title: btn.text,
            }));
            base.message_template = d.message || "";
          } else if (nt === "call_to_action") {
            base.messageType = "interactive";
            base.interactive_type = "cta_url";
            base.cta_params = {
              header: d.header || "",
              body: d.valueText || "",
              button: { text: d.buttonText || "Click Here", url: d.buttonLink || "" },
            };
            base.message_template = d.valueText || "";
          } else if (nt === "wa_template" || nt === "send_wa_template") {
            base.messageType = "template";
            base.template_id = d.templateId || "";
            base.template_name = d.templateName || "";
            base.language = d.language || "";
            base.variable_mappings = d.variableMappings || [];
            base.header_media_url = d.headerMediaUrl || "";
          } else {
            base.message_template = d.message || d.bodyText || "";
          }
          return base;
        }

        if (backendType === "condition") {
          return { condition: d.condition || { field: "message", operator: "contains_any", value: [] } };
        }
        if (backendType === "user_input") {
          return {
            question: d.questionText || "",
            variable: d.variableName || "",
            input_type: d.inputType || "text",
            validation_error: d.validationError || "",
            timeout_seconds: d.timeoutSeconds || null,
          };
        }
        if (backendType === "set_variable") {
          return { variables: d.variables || [] };
        }
        if (backendType === "api_webhook") {
          return {
            method: d.method || "POST",
            url: d.url || "",
            headers: d.headers || [],
            body: d.body || "",
            response_json_path: d.responseJsonPath || "",
            response_variable: d.responseVariable || "",
          };
        }
        if (backendType === "jump_to_flow") {
          return {
            target_flow_id: d.targetFlowId || "",
            jump_mode: d.jumpMode || "replace",
            pass_variables: d.passVariables || [],
          };
        }
        if (backendType === "end_flow") {
          return {
            goodbye_message: d.goodbyeMessage || "",
            end_action: d.endAction || "close_session",
            tags: d.tags ? d.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
          };
        }
        if (backendType === "delay") {
          return { delay_ms: d.delay_ms || 1000 };
        }

        // ── New node types ───────────────────────────────────────
        if (backendType === "disable_auto_reply") {
          return {
            duration: d.duration || 30,
            duration_unit: d.durationUnit || "minutes",
            scope: d.scope || "all",
          };
        }
        if (backendType === "reset_session") {
          return {
            reset_scope: d.resetScope || "variables",
            keep_variables: d.keepVariables || [],
          };
        }
        if (backendType === "send_email") {
          return {
            smtp_host: d.smtpHost || "",
            smtp_port: d.smtpPort || "587",
            smtp_encryption: d.smtpEncryption || "tls",
            smtp_user: d.smtpUser || "",
            smtp_password: d.smtpPassword || "",
            from_name: d.fromName || "",
            from_email: d.fromEmail || "",
            to_email: d.toEmail || "",
            cc: d.cc || [],
            subject: d.subject || "",
            body: d.body || "",
          };
        }
        if (backendType === "google_sheets") {
          return {
            auth_mode: d.authMode || "service_account",
            service_account_email: d.serviceAccountEmail || "",
            private_key: d.privateKey || "",
            api_key: d.apiKey || "",
            spreadsheet_id: d.spreadsheetId || "",
            sheet_name: d.sheetName || "",
            action: d.action || "append_row",
            column_mappings: d.columnMappings || [],
          };
        }
        if (backendType === "mysql_query") {
          return {
            db_host: d.dbHost || "",
            db_port: d.dbPort || "3306",
            db_name: d.dbName || "",
            db_user: d.dbUser || "",
            db_password: d.dbPassword || "",
            db_ssl: d.dbSsl || false,
            query_type: d.queryType || "select",
            query: d.query || "",
            result_mappings: d.resultMappings || [],
          };
        }
        if (backendType === "agent_transfer") {
          return {
            team_id: d.teamId || "",
            assignment_mode: d.assignmentMode || "round_robin",
            priority: d.priority || "normal",
            note: d.note || "",
            queue_message: d.queueMessage || "",
          };
        }
        if (backendType === "ai_transfer") {
          return {
            assistant_id: d.assistantId || "",
            model: d.model || "gpt-4o",
            system_prompt: d.systemPrompt || "",
            context_variables: d.contextVariables || [],
            max_turns: d.maxTurns || 10,
          };
        }

        return base;
      };

      // Terminal node types (no outgoing edge needed)
      const TERMINAL_TYPES = new Set(["end_flow", "jump_to_flow", "agent_transfer", "ai_transfer"]);

      // ── addBranch — walks a chain of nodes and builds formatted arrays ──
      const addBranch = (
        idPrefix: string,
        condition: any,
        firstTargetNode: any,
        name: string,
        sourceId: string,
        sourceHandle: string = "src"
      ) => {
        const condId = `cond-${idPrefix}-${getBackendId(firstTargetNode)}`;

        if (condition && !formattedNodes.find((n) => n.id === condId)) {
          formattedNodes.push({
            id: condId,
            type: "condition",
            position: { x: firstTargetNode.position.x - 250, y: firstTargetNode.position.y },
            parameters: { condition },
            name: `Is ${name}?`,
          });
        }

        formattedConnections.push({
          id: `c-t-${condition ? condId : getBackendId(firstTargetNode)}`,
          source: sourceId,
          target: condition ? condId : getBackendId(firstTargetNode),
          sourceHandle,
          targetHandle: "tgt",
        });

        let prevNodeId = condition ? condId : sourceId;
        let currentNode = firstTargetNode;
        const visited = new Set<string>();

        while (currentNode && !visited.has(currentNode.id)) {
          visited.add(currentNode.id);
          const nt = currentNode.data.nodeType;
          const backendType = BACKEND_TYPE[nt] || "send_message";
          const payloadNodeId = getBackendId(currentNode);

          if (!formattedNodes.find((n) => n.id === payloadNodeId)) {
            formattedNodes.push({
              id: payloadNodeId,
              type: backendType,
              position: currentNode.position,
              parameters: buildParameters(currentNode, backendType),
              name:
                currentNode.data.label ||
                currentNode.data.name ||
                currentNode.data.questionText?.slice(0, 30) ||
                "Step",
            });
          }

          if (!formattedConnections.find((c) => c.source === prevNodeId && c.target === payloadNodeId)) {
            formattedConnections.push({
              id: `conn-${prevNodeId}-${payloadNodeId}-${Math.random().toString(36).substr(2, 5)}`,
              source: prevNodeId,
              target: payloadNodeId,
              sourceHandle: "src",
              targetHandle: "tgt",
            });
          }

          if (TERMINAL_TYPES.has(backendType)) {
            currentNode = null;
          } else {
            const nextEdge = edges.find(
              (e) =>
                e.source === currentNode.id &&
                (e.sourceHandle === "src" ||
                  (!e.sourceHandle?.startsWith("src-btn-") &&
                    !e.sourceHandle?.startsWith("src-item-")))
            );
            prevNodeId = payloadNodeId;
            currentNode = nextEdge ? nodes.find((n) => n.id === nextEdge.target) : null;
          }
        }
      };

      // 1. Walk from each trigger
      triggerNodes.forEach((tNode) => {
        edges
          .filter((e) => e.source === tNode.id)
          .forEach((edge) => {
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!targetNode) return;

            const isOrder = tNode.data.triggerType === "order received";
            const isAny   = tNode.data.triggerType === "any message";

            const condition = isOrder
              ? { field: "event_type", operator: "equals", value: "order_received" }
              : isAny
              ? { field: "event_type", operator: "equals", value: "message_received" }
              : {
                  field: "message",
                  operator: operatorMap[tNode.data.triggerType] || "contains_any",
                  value: tNode.data.keywords || [],
                };

            addBranch("start", condition, targetNode, isOrder ? "Order Received" : "Greeting", getBackendId(tNode), "src");
          });
      });

      // 2. Button and list-item branches
      edges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        const anchorId    = getBackendId(triggerNodes[0]);
        const pfx = flowId ? `f${flowId.slice(-6)}` : `new${Math.random().toString(36).substring(7)}`;

        if (sourceNode?.data.nodeType === "button_message" && edge.sourceHandle?.startsWith("src-btn-")) {
          const btnIndex = parseInt(edge.sourceHandle.replace("src-btn-", ""));
          const button   = sourceNode.data.buttons?.[btnIndex];
          if (button && targetNode) {
            const uid = `${pfx}___${button.value || button.text}`;
            addBranch(
              `btn-___${getBackendId(sourceNode)}___${btnIndex}___${getBackendId(targetNode)}`,
              { field: "message", operator: "equals", value: uid },
              targetNode, button.text, anchorId, "src"
            );
          }
        }

        if (sourceNode?.data.nodeType === "list_message" && edge.sourceHandle?.startsWith("src-item-")) {
          const [sIdx, iIdx] = edge.sourceHandle.replace("src-item-", "").split("-").map(Number);
          const item = sourceNode.data.sections?.[sIdx]?.items?.[iIdx];
          if (item && targetNode) {
            const uid = `${pfx}___${item.title}`;
            addBranch(
              `list-___${getBackendId(sourceNode)}___${sIdx}___${iIdx}___${getBackendId(targetNode)}`,
              { field: "message", operator: "equals", value: uid },
              targetNode, item.title, anchorId, "src"
            );
          }
        }
      });

      // 3. Build trigger definitions + collect response keywords
      const buttonKeywords: string[] = [];
      nodes.forEach((n: any) => {
        const pfx = flowId ? `f${flowId.slice(-6)}` : `new${Math.random().toString(36).substring(7)}`;
        if (n.data.nodeType === "button_message") {
          (n.data.buttons || []).forEach((b: any) => {
            const uid = `${pfx}___${b.value || b.text}`;
            if (!buttonKeywords.includes(uid)) buttonKeywords.push(uid);
          });
        } else if (n.data.nodeType === "list_message") {
          (n.data.sections || []).forEach((sec: any) =>
            (sec.items || []).forEach((item: any) => {
              const uid = `${pfx}___${item.title}`;
              if (!buttonKeywords.includes(uid)) buttonKeywords.push(uid);
            })
          );
        }
      });

      const triggers: any[] = [];
      triggerNodes.forEach((tNode) => {
        if (tNode.data.triggerType === "any message") {
          triggers.push({ event_type: "message_received", conditions: {} });
        } else if (tNode.data.triggerType === "order received") {
          triggers.push({ event_type: "order_received", conditions: {} });
        } else {
          const userKw = Array.isArray(tNode.data.keywords) ? tNode.data.keywords : [];
          const op = operatorMap[tNode.data.triggerType] || "contains_any";
          if (op === "contains_any") {
            triggers.push({ event_type: "message_received", conditions: { field: "message", operator: "contains_any", value: [...userKw] } });
          } else {
            userKw.forEach((kw: string) =>
              triggers.push({ event_type: "message_received", conditions: { field: "message", operator: op, value: kw } })
            );
          }
        }
      });

      if (buttonKeywords.length > 0) {
        const hasWildcard = triggers.some((t) => t.event_type === "message_received" && !Object.keys(t.conditions).length);
        if (!hasWildcard) {
          const ca = triggers.find((t) => t.event_type === "message_received" && t.conditions?.operator === "contains_any");
          if (ca) {
            const vals = Array.isArray(ca.conditions.value) ? [...ca.conditions.value] : [ca.conditions.value];
            buttonKeywords.forEach((kw) => { if (!vals.includes(kw)) vals.push(kw); });
            ca.conditions.value = vals;
          } else {
            triggers.push({ event_type: "message_received", conditions: { field: "message", operator: "contains_any", value: buttonKeywords } });
          }
        }
      }

      const body = {
        name: flowName,
        description: `Handles ${
          Array.isArray(triggerNodes[0].data.keywords) && triggerNodes[0].data.keywords.length > 0
            ? triggerNodes[0].data.keywords.join(", ")
            : triggerNodes[0].data.triggerType
        } and related interactive menus`,
        is_active: true,
        triggers,
        nodes: formattedNodes,
        connections: formattedConnections,
      };

      if (flowId) {
        await updateFlow({ flowId, ...body }).unwrap();
        toast.success("Flow updated successfully!");
      } else {
        await createFlow(body).unwrap();
        toast.success("Flow saved successfully!");
      }

      router.push(ROUTES.BotFlow);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to save flow");
    }
  };

  // Keep ref in sync with latest handleSave so the autosave interval can call it
  // without capturing stale closures
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });

  // ── Autosave every 30 seconds ──────────────────────────────────────────────
  useEffect(() => {
    if (!flowId || nodes.length === 0) return;
    const timer = setInterval(() => {
      if (validateFlow() && !isUpdating) {
        handleSaveRef.current().then(() => setLastSaved(new Date())).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, nodes, edges, isUpdating]);

  // ── Add node to canvas ──────────────────────────────────────────────────────

  const addNodeToCanvas = useCallback(
    (template: (typeof NODETEMPLATES)[0]) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2 - 100,
        y: window.innerHeight / 2 - 50,
      });

      const defaultData: Record<string, any> = {
        condition:        { condition: { field: "message", operator: "contains_any", value: [] } },
        disable_auto_reply: { duration: 30, durationUnit: "minutes", scope: "all" },
        reset_session:    { resetScope: "variables", keepVariables: [] },
        send_email:       { smtpEncryption: "tls", smtpPort: "587", cc: [] },
        google_sheets:    { authMode: "service_account", action: "append_row", columnMappings: [] },
        mysql_query:      { dbPort: "3306", queryType: "select", dbSsl: false, resultMappings: [] },
        agent_transfer:   { assignmentMode: "round_robin", priority: "normal" },
        ai_transfer:      { model: "gpt-4o", maxTurns: 10, contextVariables: [] },
        wa_template:      { variableMappings: [] },
      };

      const newNode: Node = {
        id: `${template.id}-${Date.now()}`,
        type: "custom",
        data: {
          nodeType: template.id,
          label: template.label,
          description: template.description,
          icon: template.icon,
          color: template.color,
          messageType: "Simple text",
          message: "",
          forceValidation: false,
          ...(defaultData[template.id] || {}),
        },
        position,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  // ── Workspace / sidebar state ───────────────────────────────────────────────

  const { selectedWorkspace } = useAppSelector((state) => state.workspace);
  const isBaileys = selectedWorkspace?.waba_type === "baileys";

  const categories = ["All", ...Array.from(new Set(NODETEMPLATES.map((t) => t.category)))];

  const filteredTemplates = NODETEMPLATES.filter((t) => {
    if (isBaileys && (t.id === "button_message" || t.id === "list_message")) return false;
    if (selectedCategory !== "All" && t.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      return (
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  if (isLoadingFlow)
    return <div className="flex h-screen items-center justify-center">Loading flow...</div>;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex relative h-full w-full overflow-hidden">
      {/* Side Drawer */}
      <div
        className="flex flex-col overflow-hidden border-r border-gray-200 dark:border-(--card-border-color) dark:bg-(--card-color) bg-white transition-all duration-300 shadow-sm z-20 relative top-0 left-0 md:h-auto"
        style={{ width: isDrawerCollapsed ? "72px" : "320px" }}
      >
        <div
          className={`flex items-center border-b border-gray-200 p-3 md:p-4 dark:border-(--card-border-color) ${
            isDrawerCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div className={`flex items-center gap-2 ${isDrawerCollapsed ? "hidden" : ""}`}>
            <Target className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
            <h2 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-300">Components</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
            className="h-9 w-9 md:h-8 md:w-8 hover:bg-gray-100 dark:hover:bg-(--table-hover) transition-colors"
          >
            {isDrawerCollapsed
              ? <ChevronRight className="h-5 w-5 text-gray-600" />
              : <ChevronLeft className="h-5 w-5 text-gray-600" />}
          </Button>
        </div>

        {!isDrawerCollapsed && (
          <div className="p-2 md:p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-sm pl-8 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    selectedCategory === cat
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 dark:border-(--card-border-color) text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 md:px-3 py-3 md:py-4 custom-scrollbar">
          {searchQuery.trim() ? (
            filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <NodeCard key={template.id} template={template} isCollapsed={isDrawerCollapsed} onAdd={addNodeToCanvas} selectedCategory={selectedCategory} />
              ))
            ) : (
              <div className="text-center py-8 text-xs text-gray-400">No components found</div>
            )
          ) : (
            categories
              .filter((cat) => cat !== "All")
              .map((category) => {
                const catTemplates = filteredTemplates.filter((t) => t.category === category);
                if (!catTemplates.length) return null;
                return (
                  <div key={category} className="mb-4 md:mb-6">
                    {!isDrawerCollapsed && (
                      <h3 className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {category}
                      </h3>
                    )}
                    {catTemplates.map((template) => (
                      <NodeCard key={template.id} template={template} isCollapsed={isDrawerCollapsed} onAdd={addNodeToCanvas} selectedCategory={selectedCategory} />
                    ))}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Flow Canvas */}
      <div
        className="relative flex-1"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDrop={(event) => {
          event.preventDefault();
          const raw = event.dataTransfer.getData("application/reactflow");
          if (!raw) return;
          const template = JSON.parse(raw);
          const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
          const defaultData: Record<string, any> = {
            condition:          { condition: { field: "message", operator: "contains_any", value: [] } },
            disable_auto_reply: { duration: 30, durationUnit: "minutes", scope: "all" },
            reset_session:      { resetScope: "variables", keepVariables: [] },
            send_email:         { smtpEncryption: "tls", smtpPort: "587", cc: [] },
            google_sheets:      { authMode: "service_account", action: "append_row", columnMappings: [] },
            mysql_query:        { dbPort: "3306", queryType: "select", dbSsl: false, resultMappings: [] },
            agent_transfer:     { assignmentMode: "round_robin", priority: "normal" },
            ai_transfer:        { model: "gpt-4o", maxTurns: 10, contextVariables: [] },
            wa_template:        { variableMappings: [] },
          };
          setNodes((nds) => [
            ...nds,
            {
              id: `${template.id}-${Date.now()}`,
              type: "custom",
              data: {
                nodeType: template.id, label: template.label,
                description: template.description, icon: template.icon,
                color: template.color, messageType: "Simple text",
                message: "", forceValidation: false,
                ...(defaultData[template.id] || {}),
              },
              position,
            },
          ]);
        }}
      >
        <div className="absolute left-2 md:left-4 top-2 md:top-4 z-10 flex items-center gap-2 rounded-lg bg-white/80 p-1.5 md:p-2 shadow-sm backdrop-blur-sm dark:bg-(--card-color)">
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="h-7 md:h-8 w-32 sm:w-40 md:w-48 border-none bg-transparent shadow-none sticky text-sm md:text-base font-semibold focus-visible:ring-0"
            placeholder="Flow Name"
          />
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Controls />
          <MiniMap className="hidden md:block" />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>

        <div className="absolute right-2 md:right-2.5 top-2 md:top-2.5 z-10 flex items-center gap-2">
          {lastSaved && (
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className={`gap-1.5 md:gap-2 shadow-md transition-all text-xs md:text-sm px-3 md:px-4 h-8 md:h-10 ${
              isSaveDisabled
                ? "bg-gray-400 cursor-not-allowed opacity-70"
                : "bg-primary hover:bg-primary active:scale-95"
            }`}
          >
            <Save className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{isCreating || isUpdating ? "Saving..." : "Save Flow"}</span>
            <span className="sm:hidden">{isCreating || isUpdating ? "..." : "Save"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── NodeCard ─────────────────────────────────────────────────────────────────

function NodeCard({
  template,
  isCollapsed,
  onAdd,
  selectedCategory,
}: {
  template: (typeof NODETEMPLATES)[0];
  isCollapsed: boolean;
  onAdd: (t: (typeof NODETEMPLATES)[0]) => void;
  selectedCategory: string;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/reactflow", JSON.stringify(template));
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onAdd(template)}
      className={`mb-2 md:mb-3 cursor-pointer rounded-lg border border-gray-100 dark:border-(--card-border-color)! dark:bg-(--page-body-bg)! dark:border-none dark:hover:bg-(--table-hover) bg-white transition-all hover:shadow-lg group active:scale-95 ${
        isCollapsed ? "p-1 dark:border-none dark:bg-transparent! flex justify-center" : "p-3"
      }`}
      style={{ borderColor: selectedCategory === template.category ? template.color : undefined }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = template.color;
        e.currentTarget.style.backgroundColor = `${template.color}05`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#f3f4f6";
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div className={`flex items-start gap-3 ${isCollapsed ? "justify-center" : ""}`}>
        <div
          className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg text-base md:text-lg transition-transform group-hover:scale-110"
          style={{ background: `${template.color}15`, color: template.color }}
        >
          {template.icon}
        </div>
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden">
            <div className="mb-0.5 text-xs md:text-sm font-bold text-gray-800 dark:text-gray-300">{template.label}</div>
            <div className="text-[10px] md:text-[11px] leading-snug text-gray-500 line-clamp-2">{template.description}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlowCanvas;