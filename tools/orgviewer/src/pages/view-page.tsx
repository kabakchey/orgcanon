import { useParams } from "react-router-dom";
import { getViewBySlug } from "../views/registry";

export function ViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const view = slug ? getViewBySlug(slug) : undefined;

  if (!view) {
    return <main className="page">Not found.</main>;
  }

  const View = view.component;
  return (
    <main className="page page-view">
      <View />
    </main>
  );
}
