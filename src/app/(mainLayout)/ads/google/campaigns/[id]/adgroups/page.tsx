import GoogleAdGroupsPage from "@/src/components/ads/google/GoogleAdGroupsPage";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <GoogleAdGroupsPage campaignId={id} />;
};

export default page;
