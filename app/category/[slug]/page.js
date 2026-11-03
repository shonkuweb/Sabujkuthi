import Storefront from "../../components/Storefront";

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  return <Storefront categorySlug={slug} />;
}
