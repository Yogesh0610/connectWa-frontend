import CreateMetaAdSet from "@/src/components/ads/meta/CreateMetaAdSet";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <CreateMetaAdSet campaignId={id} />;
};

export default page;
