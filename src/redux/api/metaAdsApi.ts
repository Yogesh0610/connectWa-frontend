import { baseApi } from "./baseApi";

// ─── Types ────────────────────────────────────────────────

export interface AdAccount {
  _id: string;
  name: string;
  platform: "meta";
  meta_ad_account_id: string;
  meta_ad_account_name: string;
  meta_access_token: string;
  meta_pages: { page_id: string; page_name: string; page_access_token: string; instagram_actor_id?: string }[];
  currency: string;
  timezone: string;
  is_active: boolean;
  connection_method: "oauth" | "manual";
  last_synced_at: string;
}

export interface MetaCampaign {
  _id: string;
  ad_account_id: string;
  meta_campaign_id: string;
  name: string;
  objective: string;
  status: "ACTIVE" | "PAUSED" | "DELETED";
  daily_budget?: number;
  lifetime_budget?: number;
  bid_strategy: string;
  start_time?: string;
  end_time?: string;
  stats?: { impressions: number; clicks: number; leads: number; spend: number };
  createdAt: string;
}

export interface MetaAdSet {
  _id: string;
  campaign_id: string;
  ad_account_id: string;
  meta_adset_id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED";
  daily_budget?: number;
  billing_event: string;
  optimization_goal: string;
  targeting: Record<string, unknown>;
  createdAt: string;
}

export interface MetaAd {
  _id: string;
  adset_id: string;
  campaign_id: string;
  meta_ad_id: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  creative: Record<string, unknown>;
  createdAt: string;
}

export interface LeadForm {
  id: string;
  name: string;
  status: string;
  leads_count: number;
  created_time: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { total: number; page: number; limit: number };
}

// ─── API ──────────────────────────────────────────────────

export const metaAdsApi = baseApi.enhanceEndpoints({ addTagTypes: ["MetaAccount", "MetaCampaign", "MetaAdSet", "MetaAd", "MetaLeadForm"] }).injectEndpoints({
  endpoints: (builder) => ({

    // ── Accounts ────────────────────────────────────────
    getMetaAuthUrl: builder.query<{ success: boolean; url: string }, void>({
      query: () => "/meta-ads/oauth/url",
    }),
    getMetaOAuthAccounts: builder.query<{ success: boolean; data: AdAccount[] }, void>({
      query: () => "/meta-ads/oauth/accounts",
    }),
    saveMetaOAuthAccounts: builder.mutation<{ success: boolean; data: AdAccount[] }, { selected_account_ids: string[] }>({
      query: (body) => ({ url: "/meta-ads/oauth/accounts", method: "POST", body }),
      invalidatesTags: ["MetaAccount"],
    }),
    connectMetaManual: builder.mutation<{ success: boolean; data: AdAccount }, { ad_account_id: string; access_token: string; name?: string }>({
      query: (body) => ({ url: "/meta-ads/accounts/manual", method: "POST", body }),
      invalidatesTags: ["MetaAccount"],
    }),
    getMetaAdAccounts: builder.query<{ success: boolean; data: AdAccount[] }, void>({
      query: () => "/meta-ads/accounts",
      providesTags: ["MetaAccount"],
    }),
    disconnectMetaAccount: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/meta-ads/accounts/${id}`, method: "DELETE" }),
      invalidatesTags: ["MetaAccount"],
    }),

    // ── Campaigns ───────────────────────────────────────
    getMetaCampaigns: builder.query<PaginatedResponse<MetaCampaign>, { ad_account_id?: string; status?: string; search?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/meta-ads/campaigns", params: params ?? undefined }),
      providesTags: ["MetaCampaign"],
    }),
    createMetaCampaign: builder.mutation<{ success: boolean; data: MetaCampaign }, Record<string, unknown>>({
      query: (body) => ({ url: "/meta-ads/campaigns", method: "POST", body }),
      invalidatesTags: ["MetaCampaign"],
    }),
    syncMetaCampaigns: builder.mutation<{ success: boolean; data: MetaCampaign[] }, string>({
      query: (adAccountId) => ({ url: `/meta-ads/campaigns/sync/${adAccountId}`, method: "POST" }),
      invalidatesTags: ["MetaCampaign"],
    }),
    updateMetaCampaignStatus: builder.mutation<{ success: boolean; data: MetaCampaign }, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/meta-ads/campaigns/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["MetaCampaign"],
    }),
    getMetaCampaignInsights: builder.query<{ success: boolean; data: Record<string, unknown> }, { id: string; date_preset?: string }>({
      query: ({ id, date_preset }) => ({ url: `/meta-ads/campaigns/${id}/insights`, params: { date_preset } }),
    }),
    deleteMetaCampaign: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/meta-ads/campaigns/${id}`, method: "DELETE" }),
      invalidatesTags: ["MetaCampaign"],
    }),

    // ── Ad Sets ─────────────────────────────────────────
    getMetaAdSets: builder.query<PaginatedResponse<MetaAdSet>, { campaign_id?: string; ad_account_id?: string; status?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/meta-ads/adsets", params: params ?? undefined }),
      providesTags: ["MetaAdSet"],
    }),
    createMetaAdSet: builder.mutation<{ success: boolean; data: MetaAdSet }, Record<string, unknown>>({
      query: (body) => ({ url: "/meta-ads/adsets", method: "POST", body }),
      invalidatesTags: ["MetaAdSet"],
    }),
    updateMetaAdSetStatus: builder.mutation<{ success: boolean; data: MetaAdSet }, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/meta-ads/adsets/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["MetaAdSet"],
    }),
    deleteMetaAdSet: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/meta-ads/adsets/${id}`, method: "DELETE" }),
      invalidatesTags: ["MetaAdSet"],
    }),
    getMetaAdSetInsights: builder.query<{ success: boolean; data: Record<string, unknown> }, { id: string; date_preset?: string }>({
      query: ({ id, date_preset }) => ({ url: `/meta-ads/adsets/${id}/insights`, params: { date_preset } }),
    }),
    searchMetaInterests: builder.query<{ success: boolean; data: { id: string; name: string }[] }, { q: string; ad_account_id: string }>({
      query: (params) => ({ url: "/meta-ads/targeting/interests", params }),
    }),
    getMetaCustomAudiences: builder.query<{ success: boolean; data: { id: string; name: string }[] }, { ad_account_id: string }>({
      query: (params) => ({ url: "/meta-ads/targeting/audiences", params }),
    }),

    // ── Ads ─────────────────────────────────────────────
    getMetaAds: builder.query<{ success: boolean; data: MetaAd[] }, { adset_id?: string; campaign_id?: string } | void>({
      query: (params) => ({ url: "/meta-ads/ads", params: params ?? undefined }),
      providesTags: ["MetaAd"],
    }),
    createMetaAd: builder.mutation<{ success: boolean; data: MetaAd }, Record<string, unknown>>({
      query: (body) => ({ url: "/meta-ads/ads", method: "POST", body }),
      invalidatesTags: ["MetaAd"],
    }),
    uploadMetaImage: builder.mutation<{ success: boolean; data: { hash: string; url: string } }, FormData>({
      query: (body) => ({ url: "/meta-ads/ads/upload-image", method: "POST", body }),
    }),

    // ── Lead Forms ──────────────────────────────────────
    getMetaLeadForms: builder.query<{ success: boolean; data: LeadForm[] }, { ad_account_id: string; page_id: string }>({
      query: (params) => ({ url: "/meta-ads/lead-forms", params }),
      providesTags: ["MetaLeadForm"],
    }),
    createMetaLeadForm: builder.mutation<{ success: boolean; data: LeadForm }, Record<string, unknown>>({
      query: (body) => ({ url: "/meta-ads/lead-forms", method: "POST", body }),
      invalidatesTags: ["MetaLeadForm"],
    }),
    getFormLeads: builder.query<{ success: boolean; data: Record<string, unknown> }, { formId: string; ad_account_id: string; page_id: string }>({
      query: ({ formId, ...params }) => ({ url: `/meta-ads/lead-forms/${formId}/leads`, params }),
    }),
    getMetaAccountPages: builder.query<{ success: boolean; data: { page_id: string; page_name: string }[] }, { ad_account_id: string }>({
      query: (params) => ({ url: "/meta-ads/pages", params }),
    }),
  }),
});

export const {
  useGetMetaAuthUrlQuery,
  useGetMetaOAuthAccountsQuery,
  useSaveMetaOAuthAccountsMutation,
  useConnectMetaManualMutation,
  useGetMetaAdAccountsQuery,
  useDisconnectMetaAccountMutation,
  useGetMetaCampaignsQuery,
  useCreateMetaCampaignMutation,
  useSyncMetaCampaignsMutation,
  useUpdateMetaCampaignStatusMutation,
  useGetMetaCampaignInsightsQuery,
  useDeleteMetaCampaignMutation,
  useGetMetaAdSetsQuery,
  useCreateMetaAdSetMutation,
  useUpdateMetaAdSetStatusMutation,
  useDeleteMetaAdSetMutation,
  useGetMetaAdSetInsightsQuery,
  useSearchMetaInterestsQuery,
  useGetMetaCustomAudiencesQuery,
  useGetMetaAdsQuery,
  useCreateMetaAdMutation,
  useUploadMetaImageMutation,
  useGetMetaLeadFormsQuery,
  useCreateMetaLeadFormMutation,
  useGetFormLeadsQuery,
  useGetMetaAccountPagesQuery,
} = metaAdsApi;