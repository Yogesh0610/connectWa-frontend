import MetaAdsetsPage from "@/src/components/ads/meta/MetaAdsetsPage";
const page = ({ params }: { params: { id: string } }) => <MetaAdsetsPage campaignId={params.id} />;
export default page;
