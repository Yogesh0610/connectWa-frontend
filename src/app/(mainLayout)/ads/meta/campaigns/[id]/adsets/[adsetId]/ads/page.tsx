import MetaAdsPage from "@/src/components/ads/meta/MetaAdsPage";

const page = async ({ params }: { params: Promise<{ id: string; adsetId: string }> }) => {
  const { id, adsetId } = await params;
  return <MetaAdsPage campaignId={id} adsetId={adsetId} />;
};

export default page;
