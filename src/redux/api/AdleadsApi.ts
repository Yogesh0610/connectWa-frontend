import { baseApi } from "./baseApi";
import { AdLead, AdLeadSource, AdLeadsResponse, AdLeadSourcesResponse, AdLeadSourcePayload, ConnectManualPayload, ConnectGooglePayload, GoogleWebhookInfoResponse, UpdateAutomationPayload, Pagination } from "@/src/types/Adleads";

export const adLeadsApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["AdLead", "AdLeadSource"] })
  .injectEndpoints({
    endpoints: (builder) => ({

      // ─── Sources ────────────────────────────────────────────
      getSources: builder.query<AdLeadSourcesResponse, void>({
        query: () => `/ad-leads/sources`,
        providesTags: ["AdLeadSource"],
      }),

      connectFacebookManual: builder.mutation<{ success: boolean; data: AdLeadSource }, ConnectManualPayload>({
        query: (body) => ({
          url: `/ad-leads/connect/facebook/manual`,
          method: "POST",
          body,
        }),
        invalidatesTags: ["AdLeadSource"],
      }),

      setupGoogleWebhook: builder.mutation<GoogleWebhookInfoResponse, ConnectGooglePayload>({
        query: (body) => ({
          url: `/ad-leads/connect/google`,
          method: "POST",
          body,
        }),
        invalidatesTags: ["AdLeadSource"],
      }),

      updateSourceAutomation: builder.mutation<{ success: boolean; data: AdLeadSource }, { id: string; automation: UpdateAutomationPayload }>({
        query: ({ id, automation }) => ({
          url: `/ad-leads/sources/${id}`,
          method: "PATCH",
          body: { automation },
        }),
        invalidatesTags: ["AdLeadSource"],
      }),

      disconnectSource: builder.mutation<{ success: boolean; message: string }, string>({
        query: (id) => ({
          url: `/ad-leads/sources/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: ["AdLeadSource"],
      }),

      refreshFbToken: builder.mutation<{ success: boolean; message: string }, string>({
        query: (id) => ({
          url: `/ad-leads/sources/${id}/refresh-token`,
          method: "POST",
        }),
        invalidatesTags: ["AdLeadSource"],
      }),

      getFbOAuthUrl: builder.query<{ success: boolean; url: string }, void>({
        query: () => `/ad-leads/oauth/facebook/url`,
      }),

      getFbOAuthPages: builder.query<{ success: boolean; data: FbPage[] }, void>({
        query: () => `/ad-leads/oauth/facebook/pages`,
      }),

      saveFbOAuthPages: builder.mutation<{ success: boolean; data: AdLeadSource[]; message: string }, { selected_page_ids: string[] }>({
        query: (body) => ({
          url: `/ad-leads/oauth/facebook/pages`,
          method: "POST",
          body,
        }),
        invalidatesTags: ["AdLeadSource"],
      }),

      // ─── Leads ──────────────────────────────────────────────
      getLeads: builder.query<AdLeadsResponse, { source_id?: string; status?: string; source_type?: string; page?: number; limit?: number; search?: string }>({
        query: (params) => ({
          url: `/ad-leads`,
          params,
        }),
        providesTags: ["AdLead"],
      }),

      retryLead: builder.mutation<{ success: boolean; message: string }, string>({
        query: (id) => ({
          url: `/ad-leads/${id}/retry`,
          method: "POST",
        }),
        invalidatesTags: ["AdLead"],
      }),
    }),
    overrideExisting: false,
  });

export const {
  useGetSourcesQuery,
  useConnectFacebookManualMutation,
  useSetupGoogleWebhookMutation,
  useUpdateSourceAutomationMutation,
  useDisconnectSourceMutation,
  useRefreshFbTokenMutation,
  useGetFbOAuthUrlQuery,
  useGetFbOAuthPagesQuery,
  useSaveFbOAuthPagesMutation,
  useGetLeadsQuery,
  useRetryLeadMutation,
} = adLeadsApi;

// ─── Types (inline for convenience) ─────────────────────────
export interface FbPage {
  id: string;
  name: string;
  category: string;
  access_token: string;
  picture?: { data: { url: string } };
}