import { baseApi } from "./baseApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SocialPage {
  page_id:      string;
  page_name:    string;
  page_picture: string | null;
  linkedin_urn: string | null;
  account_type: "page" | "company";
  platform:     string;
}

export interface SocialAccount {
  _id:              string;
  platform:         "linkedin" | "facebook" | "instagram" | "twitter";
  account_type:     "profile" | "page" | "company";
  account_id:       string;
  account_name:     string;
  account_username: string | null;
  profile_picture:  string | null;
  linkedin_urn:     string | null;
  token_expires_at: string | null;
  pages:            SocialPage[];
  is_active:        boolean;
  createdAt:        string;
}

export interface PostTarget {
  social_account_id: string;
  platform:          "linkedin" | "facebook" | "instagram" | "twitter";
  account_type:      "profile" | "page" | "company";
  account_id:        string;
  account_name:      string;
  linkedin_urn?:     string;
  status?:           "pending" | "published" | "failed";
  published_at?:     string;
  platform_post_id?: string;
  error_message?:    string;
  analytics?: {
    likes:       number;
    comments:    number;
    shares:      number;
    impressions: number;
    clicks:      number;
  };
}

export interface SocialPost {
  _id:              string;
  title:            string | null;
  content:          string;
  link_url?:        string;
  link_title?:      string;
  link_description?: string;
  hashtags:         string[];
  media: { type: "image" | "video"; url: string; original_filename: string }[];
  targets:          PostTarget[];
  status:           "draft" | "scheduled" | "publishing" | "published" | "partially_published" | "failed";
  scheduled_at?:    string;
  published_at?:    string;
  createdAt:        string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const socialApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["SocialAccount", "SocialPost"] })
  .injectEndpoints({
    endpoints: (builder) => ({

      // ── Accounts ─────────────────────────────────────────────────────────
      getSocialAccounts: builder.query<{ success: boolean; data: SocialAccount[] }, { platform?: string } | void>({
        query: (params) => ({ url: "/social/accounts", params: params || {} }),
        providesTags: ["SocialAccount"],
      }),

      getLinkedInAuthUrl: builder.query<{ success: boolean; data: { url: string } }, void>({
        query: () => "/social/linkedin/auth-url",
      }),

      disconnectSocialAccount: builder.mutation<{ success: boolean }, string>({
        query: (id) => ({ url: `/social/accounts/${id}`, method: "DELETE" }),
        invalidatesTags: ["SocialAccount"],
      }),

      refreshSocialAccount: builder.mutation<{ success: boolean; data: SocialAccount }, string>({
        query: (id) => ({ url: `/social/accounts/${id}/refresh`, method: "POST" }),
        invalidatesTags: ["SocialAccount"],
      }),

      // ── Posts ─────────────────────────────────────────────────────────────
      getSocialPosts: builder.query<
        { success: boolean; data: SocialPost[]; pagination: { total: number; page: number; limit: number } },
        { status?: string; platform?: string; page?: number; limit?: number } | void
      >({
        query: (params) => ({ url: "/social/posts", params: params || {} }),
        providesTags: ["SocialPost"],
      }),

      getSocialPost: builder.query<{ success: boolean; data: SocialPost }, string>({
        query: (id) => `/social/posts/${id}`,
        providesTags: ["SocialPost"],
      }),

      createSocialPost: builder.mutation<{ success: boolean; data: SocialPost }, FormData>({
        query: (body) => ({
          url:    "/social/posts",
          method: "POST",
          body,
        }),
        invalidatesTags: ["SocialPost"],
      }),

      updateSocialPost: builder.mutation<{ success: boolean; data: SocialPost }, { id: string; body: FormData }>({
        query: ({ id, body }) => ({
          url:    `/social/posts/${id}`,
          method: "PATCH",
          body,
        }),
        invalidatesTags: ["SocialPost"],
      }),

      publishSocialPost: builder.mutation<{ success: boolean; data: SocialPost }, string>({
        query: (id) => ({ url: `/social/posts/${id}/publish`, method: "POST" }),
        invalidatesTags: ["SocialPost"],
      }),

      refreshPostAnalytics: builder.mutation<{ success: boolean; data: SocialPost }, string>({
        query: (id) => ({ url: `/social/posts/${id}/analytics`, method: "POST" }),
        invalidatesTags: ["SocialPost"],
      }),

      deleteSocialPost: builder.mutation<{ success: boolean }, string>({
        query: (id) => ({ url: `/social/posts/${id}`, method: "DELETE" }),
        invalidatesTags: ["SocialPost"],
      }),
    }),
  });

export const {
  useGetSocialAccountsQuery,
  useGetLinkedInAuthUrlQuery,
  useDisconnectSocialAccountMutation,
  useRefreshSocialAccountMutation,
  useGetSocialPostsQuery,
  useGetSocialPostQuery,
  useCreateSocialPostMutation,
  useUpdateSocialPostMutation,
  usePublishSocialPostMutation,
  useRefreshPostAnalyticsMutation,
  useDeleteSocialPostMutation,
} = socialApi;
