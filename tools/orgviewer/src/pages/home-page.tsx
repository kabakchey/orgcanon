import { Link } from "react-router-dom";
import { views } from "../views/registry";
import { viewHref } from "../lib/view-query-memory";

export function HomePage() {
  return (
    <main className="page">
      <h1>Org Viewer</h1>
      <ul>
        {views.map((view) => (
          <li key={view.slug}>
            <Link to={viewHref(view.slug)}>{view.title}</Link> — {view.description}
          </li>
        ))}
      </ul>
    </main>
  );
}
