import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { getViewBySlug, views } from "../views/registry";
import { rememberViewQuery, viewHref } from "../lib/view-query-memory";
import { useTheme } from "../lib/theme/use-theme";
import { OrgapiUrlSetting } from "./orgapi-url-setting";
import mascotIcon from "../assets/mascot-icon.png";

function navLinkClassName(isActive: boolean): string {
  return isActive ? "app-nav-link active" : "app-nav-link";
}

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const currentSlug = location.pathname.match(/^\/views\/([^/]+)$/)?.[1];
  const currentView = currentSlug ? getViewBySlug(currentSlug) : undefined;

  useEffect(() => {
    if (currentView) rememberViewQuery(currentView.slug, location.search);
  }, [currentView, location.search]);

  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link to="/" className={`app-brand ${navLinkClassName(location.pathname === "/")}`}>
          <img src={mascotIcon} alt="" className="app-brand-icon" />
          Org Viewer
        </Link>
        <nav className="app-nav-links">
          {views.map((view) => {
            const isActive = view === currentView;
            const href = isActive ? `${location.pathname}${location.search}` : viewHref(view.slug);
            return (
              <Link key={view.slug} to={href} className={navLinkClassName(isActive)}>
                {view.title}
              </Link>
            );
          })}
        </nav>
        <div className="app-nav-orgapi">
          <OrgapiUrlSetting />
        </div>
        <button type="button" className="theme-toggle" onClick={toggleTheme}>
          {theme === "dark" ? "☀ Light" : "☾ Dark"}
        </button>
      </header>
      <div className="app-content">{children}</div>
    </div>
  );
}
