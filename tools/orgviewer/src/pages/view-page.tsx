import { useParams } from "react-router-dom";
import { getViewBySlug } from "../views/registry";

export function ViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const view = slug ? getViewBySlug(slug) : undefined;

  if (!view) {
    return <main style={{ padding: 24 }}>Not found.</main>;
  }

  const View = view.component;
  return (
    <main
      style={{
        padding: 24,
        boxSizing: "border-box",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <View />
    </main>
  );
}
