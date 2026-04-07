import { baseApi } from "./baseApi";

// ─── Types ────────────────────────────────────────────────

export interface GoogleAdAccount {
  _id: string;
  name: string;
  google_customer_id: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  connection_method: "oauth";
  last_synced_at: string;
}

export interface GoogleCampaign {
  _id: string;
  ad_account_id: string;
  google_campaign_id: string;
  google_customer_id: string;
  name: string;
  campaign_type: "SEARCH" | "DISPLAY" | "SHOPPING" | "VIDEO" | "PERFORMANCE_MAX";
  status: "ENABLED" | "PAUSED" | "REMOVED";
  budget_amount: number;
  budget_type: string;
  bidding_strategy: string;
  start_date?: string;
  end_date?: string;
  stats?: { impressions: number; clicks: number; conversions: number; spend_micros: number; ctr: number };
  createdAt: string;
}

export interface GoogleAdGroup {
  _id: string;
  campaign_id: string;
  ad_account_id: string;
  google_adgroup_id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  ad_group_type: string;
  keywords: { text: string; match_type: string }[];
  createdAt: string;
}

export interface GoogleAd {
  _id: string;
  adgroup_id: string;
  campaign_id: string;
  google_ad_id: string;
  name: string;
  ad_type: "RESPONSIVE_SEARCH_AD" | "RESPONSIVE_DISPLAY_AD" | "PERFORMANCE_MAX_AD" | "LEAD_FORM_AD";
  status: "ENABLED" | "PAUSED" | "REMOVED";
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { total: number; page: number; limit: number };
}

// ─── API ──────────────────────────────────────────────────

export const googleAdsApi = baseApi.enhanceEndpoints({ addTagTypes: ["GoogleAccount", "GoogleCampaign", "GoogleAdGroup", "GoogleAd"] }).injectEndpoints({
  endpoints: (builder) => ({

    // ── Accounts ────────────────────────────────────────
    getGoogleAuthUrl: builder.query<{ success: boolean; url: string }, void>({
      query: () => "/google-ads/oauth/url",
    }),
    getGoogleOAuthAccounts: builder.query<{ success: boolean; data: { customer_id: string; name: string; currency: string; is_manager: boolean; is_test?: boolean }[] }, void>({
      query: () => "/google-ads/oauth/accounts",
    }),
    saveGoogleOAuthAccounts: builder.mutation<{ success: boolean; data: GoogleAdAccount[] }, { selected_customer_ids: string[] }>({
      query: (body) => ({ url: "/google-ads/oauth/accounts", method: "POST", body }),
      invalidatesTags: ["GoogleAccount"],
    }),
    getGoogleAdAccounts: builder.query<{ success: boolean; data: GoogleAdAccount[] }, void>({
      query: () => "/google-ads/accounts",
      providesTags: ["GoogleAccount"],
    }),
    disconnectGoogleAccount: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/google-ads/accounts/${id}`, method: "DELETE" }),
      invalidatesTags: ["GoogleAccount"],
    }),

    // ── Campaigns ───────────────────────────────────────
    getGoogleCampaigns: builder.query<PaginatedResponse<GoogleCampaign>, { ad_account_id?: string; campaign_type?: string; status?: string; search?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/google-ads/campaigns", params: params ?? undefined }),
      providesTags: ["GoogleCampaign"],
    }),
    createGoogleCampaign: builder.mutation<{ success: boolean; data: GoogleCampaign }, Record<string, unknown>>({
      query: (body) => ({ url: "/google-ads/campaigns", method: "POST", body }),
      invalidatesTags: ["GoogleCampaign"],
    }),
    syncGoogleCampaigns: builder.mutation<{ success: boolean; data: GoogleCampaign[] }, string>({
      query: (adAccountId) => ({ url: `/google-ads/campaigns/sync/${adAccountId}`, method: "POST" }),
      invalidatesTags: ["GoogleCampaign"],
    }),
    updateGoogleCampaignStatus: builder.mutation<{ success: boolean; data: GoogleCampaign }, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/google-ads/campaigns/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["GoogleCampaign"],
    }),
    updateGoogleCampaignBudget: builder.mutation<{ success: boolean; data: GoogleCampaign }, { id: string; budget_amount: number }>({
      query: ({ id, budget_amount }) => ({ url: `/google-ads/campaigns/${id}/budget`, method: "PATCH", body: { budget_amount } }),
      invalidatesTags: ["GoogleCampaign"],
    }),
    getGoogleCampaignInsights: builder.query<{ success: boolean; data: Record<string, unknown>[] }, { id: string; date_range?: string }>({
      query: ({ id, date_range }) => ({ url: `/google-ads/campaigns/${id}/insights`, params: { date_range } }),
    }),
    deleteGoogleCampaign: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/google-ads/campaigns/${id}`, method: "DELETE" }),
      invalidatesTags: ["GoogleCampaign"],
    }),
    searchGeoTargets: builder.query<{ success: boolean; data: { criterion_id: string; name: string; country_code: string }[] }, { q: string; ad_account_id: string }>({
      query: (params) => ({ url: "/google-ads/targeting/geo", params }),
    }),

    // ── Ad Groups ───────────────────────────────────────
    getGoogleAdGroups: builder.query<{ success: boolean; data: GoogleAdGroup[]; total: number }, { campaign_id?: string } | void>({
      query: (params) => ({ url: "/google-ads/adgroups", params: params ?? undefined }),
      providesTags: ["GoogleAdGroup"],
    }),
    createGoogleAdGroup: builder.mutation<{ success: boolean; data: GoogleAdGroup }, Record<string, unknown>>({
      query: (body) => ({ url: "/google-ads/adgroups", method: "POST", body }),
      invalidatesTags: ["GoogleAdGroup"],
    }),
    updateGoogleAdGroupStatus: builder.mutation<{ success: boolean; data: GoogleAdGroup }, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/google-ads/adgroups/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["GoogleAdGroup"],
    }),
    addGoogleKeywords: builder.mutation<{ success: boolean; data: GoogleAdGroup }, { id: string; keywords: { text: string; match_type: string }[] }>({
      query: ({ id, keywords }) => ({ url: `/google-ads/adgroups/${id}/keywords`, method: "POST", body: { keywords } }),
      invalidatesTags: ["GoogleAdGroup"],
    }),
    getKeywordIdeas: builder.query<{ success: boolean; data: { text: string; avg_monthly_searches: number; competition: string }[] }, { ad_account_id: string; keywords?: string; url?: string }>({
      query: (params) => ({ url: "/google-ads/targeting/keywords/ideas", params }),
    }),

    // ── Ads ─────────────────────────────────────────────
    getGoogleAds: builder.query<{ success: boolean; data: GoogleAd[] }, { adgroup_id?: string; campaign_id?: string; ad_type?: string } | void>({
      query: (params) => ({ url: "/google-ads/ads", params: params ?? undefined }),
      providesTags: ["GoogleAd"],
    }),
    createGoogleRSA: builder.mutation<{ success: boolean; data: GoogleAd }, Record<string, unknown>>({
      query: (body) => ({ url: "/google-ads/ads/rsa", method: "POST", body }),
      invalidatesTags: ["GoogleAd"],
    }),
    createGoogleDisplayAd: builder.mutation<{ success: boolean; data: GoogleAd }, Record<string, unknown>>({
      query: (body) => ({ url: "/google-ads/ads/display", method: "POST", body }),
      invalidatesTags: ["GoogleAd"],
    }),
    createGooglePMaxAd: builder.mutation<{ success: boolean; data: GoogleAd }, Record<string, unknown>>({
      query: (body) => ({ url: "/google-ads/ads/pmax", method: "POST", body }),
      invalidatesTags: ["GoogleAd"],
    }),
    createGoogleLeadFormAd: builder.mutation<{ success: boolean; data: GoogleAd }, Record<string, unknown>>({
      query: (body) => ({ url: "/google-ads/ads/lead-form", method: "POST", body }),
      invalidatesTags: ["GoogleAd"],
    }),
    updateGoogleAdStatus: builder.mutation<{ success: boolean; data: GoogleAd }, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/google-ads/ads/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["GoogleAd"],
    }),
  }),
});

export const {
  useGetGoogleAuthUrlQuery,
  useGetGoogleOAuthAccountsQuery,
  useSaveGoogleOAuthAccountsMutation,
  useGetGoogleAdAccountsQuery,
  useDisconnectGoogleAccountMutation,
  useGetGoogleCampaignsQuery,
  useCreateGoogleCampaignMutation,
  useSyncGoogleCampaignsMutation,
  useUpdateGoogleCampaignStatusMutation,
  useUpdateGoogleCampaignBudgetMutation,
  useDeleteGoogleCampaignMutation,
  useGetGoogleCampaignInsightsQuery,
  useSearchGeoTargetsQuery,
  useGetGoogleAdGroupsQuery,
  useCreateGoogleAdGroupMutation,
  useUpdateGoogleAdGroupStatusMutation,
  useAddGoogleKeywordsMutation,
  useGetKeywordIdeasQuery,
  useGetGoogleAdsQuery,
  useCreateGoogleRSAMutation,
  useCreateGoogleDisplayAdMutation,
  useCreateGooglePMaxAdMutation,
  useCreateGoogleLeadFormAdMutation,
  useUpdateGoogleAdStatusMutation,
} = googleAdsApi;