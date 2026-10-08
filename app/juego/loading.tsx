import { PageSkeleton } from "../components/ui/Skeleton";
import { getI18n } from "../i18n/server";

export default async function Loading() {
  const { m } = await getI18n();
  return <PageSkeleton variant="atlas" label={m.loader.page} />;
}
