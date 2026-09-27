import LiveMatchClient from "./LiveMatchClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LiveMatchPage({ params }: PageProps) {
  const { id } = await params;

  return <LiveMatchClient matchId={id} />;
}