import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useGameStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    useGameStore.getState().dispatch({ type: "RETURNED_TO_TITLE" });
    useUiStore.setState({ instructionsOpen: false, audioOpen: false, consumableDialogSlot: null });
  });

  it("opens accessible instructions and restores the close action", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Rules of play" }));
    expect(screen.getByRole("dialog", { name: "Rules of play" })).toBeVisible();
    expect(screen.getByText(/Exact = 10 damage/)).toBeVisible();
    const close = screen.getByRole("button", { name: "Got it" });
    expect(close).toHaveFocus();
    await user.click(close);
    expect(screen.queryByRole("dialog", { name: "Rules of play" })).not.toBeInTheDocument();
  });

  it("starts a deterministic in-memory run without URL routing", async () => {
    const user = userEvent.setup();
    render(<App />);
    const seed = screen.getByLabelText("Developer seed");
    await user.clear(seed);
    await user.type(seed, "77");
    await user.click(screen.getByRole("button", { name: "Use seed" }));
    const heading = await screen.findByRole("heading", { name: "Choose your route" });
    await waitFor(() => expect(heading).toBeVisible());
    expect(window.location.pathname).toBe("/");
    expect(useGameStore.getState().game.run?.seed).toBe(77);
  });
});
