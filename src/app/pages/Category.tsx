import { useParams } from "react-router";
import { CatalogExperience } from "../components/CatalogExperience";

export function Category() {
  const { slug } = useParams();
  const categoryId = Number((slug || "").match(/^(\d+)/)?.[1]);

  return <CatalogExperience fixedCategoryId={Number.isFinite(categoryId) ? categoryId : undefined} />;
}

