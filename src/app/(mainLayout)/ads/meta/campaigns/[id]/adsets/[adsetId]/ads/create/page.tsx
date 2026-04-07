import CreateMetaAd from "@/src/components/ads/meta/CreateMetaAd";

const page = async ({ params }: { params: Promise<{ id: string; adsetId: string }> }) => {
  const { id, adsetId } = await params;
  return <CreateMetaAd campaignId={id} adsetId={adsetId} />;
};

export default page;
