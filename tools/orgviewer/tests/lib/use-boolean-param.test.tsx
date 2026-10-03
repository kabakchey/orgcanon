import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useBooleanParam } from "../../src/lib/use-boolean-param";

function Harness({ defaultValue }: { defaultValue: boolean }) {
  const [value, setValue] = useBooleanParam("flag", defaultValue);
  const location = useLocation();
  return (
    <>
      <input type="checkbox" aria-label="flag" checked={value} onChange={(event) => setValue(event.target.checked)} />
      <output aria-label="search">{location.search}</output>
      <output aria-label="navigation type">{useNavigationType()}</output>
    </>
  );
}

function renderAt(url: string, defaultValue: boolean) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Harness defaultValue={defaultValue} />
    </MemoryRouter>
  );
}

describe("useBooleanParam", () => {
  it("falls back to the default when the param is absent", () => {
    renderAt("/?other=x", true);
    expect(screen.getByRole("checkbox", { name: "flag" })).toBeChecked();
  });

  it("writes the default into the URL in place of the current entry when the param is absent", () => {
    renderAt("/?other=x", false);
    expect(screen.getByLabelText("search")).toHaveTextContent("?other=x&flag=false");
    expect(screen.getByLabelText("navigation type")).toHaveTextContent("REPLACE");
  });

  it("reads 'true' / 'false' from the query string and leaves it alone", () => {
    renderAt("/?flag=false", true);
    expect(screen.getByRole("checkbox", { name: "flag" })).not.toBeChecked();
    expect(screen.getByLabelText("navigation type")).toHaveTextContent("POP");
  });

  it("writes both values and keeps other params", async () => {
    renderAt("/?other=x&flag=false", false);
    const flag = screen.getByRole("checkbox", { name: "flag" });

    await userEvent.click(flag);
    expect(screen.getByLabelText("search")).toHaveTextContent("?other=x&flag=true");

    await userEvent.click(flag);
    expect(screen.getByLabelText("search")).toHaveTextContent("?other=x&flag=false");
  });
});

function Flag({ name, defaultValue }: { name: string; defaultValue: boolean }) {
  useBooleanParam(name, defaultValue);
  return null;
}

describe("useBooleanParam defaults written by several hooks at once", () => {
  it("keeps every default instead of the last write winning", () => {
    function Search() {
      return <output aria-label="search">{useLocation().search}</output>;
    }
    render(
      <MemoryRouter initialEntries={["/?other=x"]}>
        <Flag name="a" defaultValue={true} />
        <Flag name="b" defaultValue={false} />
        <Search />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("search")).toHaveTextContent("?other=x&a=true&b=false");
  });
});
