import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export function findPickerTrigger(pickerLabel: string): Promise<HTMLElement> {
  return screen.findByRole("button", { name: new RegExp(`^${pickerLabel}:`) });
}

export async function pickFromTree(pickerLabel: string, itemLabel: string): Promise<void> {
  await userEvent.click(await findPickerTrigger(pickerLabel));
  await userEvent.type(screen.getByRole("combobox", { name: `Filter ${pickerLabel.toLowerCase()}s` }), itemLabel);
  await userEvent.click(screen.getByRole("treeitem", { name: itemLabel }));
}
