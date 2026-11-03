import Collection from "./Collection";

export const metadata = {
  title: 'Collection',
  alternates: { canonical: '/collection' },
  description: 'Explore our plant collection and filter plants by category.',
};
export default function CollectionPage() { return <Collection />; }
