import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { EntityPicker, useSelectParam } from "../../src/components/entity-picker";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

describe("EntityPicker", () => {
  it("sets the selected option as a query param, keeping the current path", async () => {
    render(
      <MemoryRouter initialEntries={["/views/chain-of-command"]}>
        <EntityPicker
          paramName="personId"
          options={[
            { id: "alice-nguyen", label: "Alice Nguyen" },
            { id: "bob-diaz", label: "Bob Diaz" },
          ]}
        />
        <LocationDisplay />
      </MemoryRouter>
    );

    await userEvent.selectOptions(screen.getByRole("combobox"), "bob-diaz");

    expect(screen.getByTestId("location").textContent).toBe(
      "/views/chain-of-command?personId=bob-diaz"
    );
  });
});

function SelectParamProbe({ paramName, id }: { paramName: string; id: string }) {
  const select = useSelectParam(paramName);
  return (
    <button type="button" onClick={() => select(id)}>
      select
    </button>
  );
}

describe("EntityPicker fallbackId", () => {
  it("shows fallbackId as selected when the param is absent from the URL", () => {
    render(
      <MemoryRouter initialEntries={["/views/org-tree"]}>
        <EntityPicker
          paramName="teamId"
          options={[
            { id: "potuto", label: "Potuto" },
            { id: "r-and-d", label: "R&D" },
          ]}
          fallbackId="potuto"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("combobox")).toHaveValue("potuto");
  });

  it("prefers the param over fallbackId once one is set", () => {
    render(
      <MemoryRouter initialEntries={["/views/org-tree?teamId=r-and-d"]}>
        <EntityPicker
          paramName="teamId"
          options={[
            { id: "potuto", label: "Potuto" },
            { id: "r-and-d", label: "R&D" },
          ]}
          fallbackId="potuto"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("combobox")).toHaveValue("r-and-d");
  });
});

describe("useSelectParam", () => {
  it("sets the given param to the given id, keeping the current path and other params", async () => {
    render(
      <MemoryRouter initialEntries={["/views/chain-of-command?other=x"]}>
        <SelectParamProbe paramName="personId" id="carol-lee" />
        <LocationDisplay />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "select" }));

    expect(screen.getByTestId("location").textContent).toBe(
      "/views/chain-of-command?other=x&personId=carol-lee"
    );
  });
});
