import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useSelectParam } from "../../src/lib/use-select-param";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function SelectParamProbe({ paramName, id }: { paramName: string; id: string }) {
  const select = useSelectParam(paramName);
  return (
    <button type="button" onClick={() => select(id)}>
      select
    </button>
  );
}

describe("useSelectParam", () => {
  it("sets the given param to the given id, keeping the current path and other params", async () => {
    render(
      <MemoryRouter initialEntries={["/views/chain-of-command?other=x"]}>
        <SelectParamProbe paramName="personId" id="carol-lee" />
        <LocationDisplay />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "select" }));

    expect(screen.getByTestId("location").textContent).toBe("/views/chain-of-command?other=x&personId=carol-lee");
  });
});
