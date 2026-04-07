export interface AdLeadAutomationLog {
  contact_saved: boolean;
  campaign_added: boolean;
  chatbot_triggered: boolean;
  whatsapp_sent: boolean;
}

export interface AdLeadData {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  company?: string;
  message?: string;
}

export interface AdLead {
  _id: string;
  user_id: string;
  source_id: string | AdLeadSource;
  source_type: "facebook" | "instagram" | "google" | "csv";
  platform_lead_id?: string;
  platform_form_id?: string;
  platform_ad_id?: string;
  platform_campaign_id?: string;
  platform_page_id?: string;
  lead_data: AdLeadData;
  raw_fields: { name: string; values: string[] }[];
  status: "new" | "processing" | "processed" | "failed";
  failure_reason?: string;
  contact_id?: string | null;
  automation_log: AdLeadAutomationLog;
  raw_payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AdLeadAutomation {
  save_as_contact: boolean;
  add_to_campaign_id?: string | null;
  trigger_chatbot_id?: string | null;
  send_whatsapp_template_id?: string | null;
  assign_tag_ids?: string[];
}

export interface AdLeadSource {
  _id: string;
  user_id: string;
  source_type: "facebook" | "instagram" | "google";
  name: string;
  connection_method: "oauth" | "manual" | "webhook";
  fb_page_id?: string;
  fb_page_name?: string;
  fb_form_ids?: string[];
  google_customer_id?: string;
  is_active: boolean;
  last_synced_at?: string;
  automation: AdLeadAutomation;
  stats?: {
    total: number;
    processed: number;
    failed: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdLeadsResponse {
  success: boolean;
  data: AdLead[];
  pagination: Pagination;
}

export interface AdLeadSourcesResponse {
  success: boolean;
  data: AdLeadSource[];
}

export interface ConnectManualPayload {
  page_id: string;
  page_access_token: string;
  name: string;
  source_type: "facebook" | "instagram";
}

export interface ConnectGooglePayload {
  customer_id: string;
  source_name: string;
}

export interface GoogleWebhookInfoResponse {
  success: boolean;
  data: {
    source_id: string;
    webhook_url: string;
    webhook_secret: string;
    customer_id: string;
    instructions: string[];
  };
}

export interface UpdateAutomationPayload {
  save_as_contact?: boolean;
  add_to_campaign_id?: string | null;
  trigger_chatbot_id?: string | null;
  send_whatsapp_template_id?: string | null;
  assign_tag_ids?: string[];
}

export interface AdLeadSourcePayload {
  name: string;
  source_type: "facebook" | "instagram" | "google";
  automation?: UpdateAutomationPayload;
}