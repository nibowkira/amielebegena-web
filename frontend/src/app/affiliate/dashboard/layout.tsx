import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Portal | Amiele Begena (ዓሚኤል በገና)",
  description: "Official Ambassador and Affiliate Partner Portal for Amiele Begena sacred acoustic instruments.",
};

export default function AffiliateDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
