import { validateContent } from "./validateContent";

describe("content validation", () => {
  it("accepts the shipped content catalog", () => {
    expect(() => validateContent()).not.toThrow();
  });
});
