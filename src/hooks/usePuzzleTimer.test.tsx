import { act, renderHook } from "@testing-library/react";
import { usePuzzleTimer } from "./usePuzzleTimer";

describe("usePuzzleTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("dispatches timeout exactly once at 45 seconds", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      usePuzzleTimer({
        active: true,
        paused: false,
        bonusSeconds: 0,
        onTimeout,
        onWarning: vi.fn(),
      }),
    );
    expect(result.current).toBe(45);
    act(() => vi.advanceTimersByTime(45_200));
    expect(onTimeout).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(5_000));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not consume time while paused", () => {
    const onTimeout = vi.fn();
    const onWarning = vi.fn();
    const { rerender } = renderHook(
      ({ paused }) =>
        usePuzzleTimer({ active: true, paused, bonusSeconds: 0, onTimeout, onWarning }),
      { initialProps: { paused: false } },
    );
    act(() => vi.advanceTimersByTime(10_000));
    rerender({ paused: true });
    act(() => vi.advanceTimersByTime(60_000));
    expect(onTimeout).not.toHaveBeenCalled();
    rerender({ paused: false });
    act(() => vi.advanceTimersByTime(35_200));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("honors added time and developer speed", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      usePuzzleTimer({
        active: true,
        paused: false,
        bonusSeconds: 15,
        timeScale: 60,
        onTimeout,
        onWarning: vi.fn(),
      }),
    );
    act(() => vi.advanceTimersByTime(1_100));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
