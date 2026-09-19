import type { ReactElement } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authenticationReducer } from "@features/authentication";
import { CATALOGUES, type Catalogue } from "@shared/copy";
import { setupLocalisation } from "@shared/localisation";
import { ThemeProvider, useDocumentLanguage } from "@shared/preferences";
import { sessionActions, sessionReducer } from "@shared/session";
import { server } from "@testing/server";
import { journeyRefuses } from "@testing/handlers/journey";
import { recoveryPositionIs, recoveryPositionRefuses } from "@testing/handlers/recovery";
import { verificationIs } from "@testing/handlers/verification";
import { JourneyLayout } from "./layout";
import { authRoute } from "./routes/authRoutes";
import { Onboarding } from "./screens/Onboarding";
import { Profile } from "./screens/Profile";
import { VerifyAsk, VerifyCode } from "./screens/Verify";
import { stepStates } from "./services";

// A stand-in language made from English by parting every character, so no English line can survive
// inside it; registered through the same seam the composition root uses.
const standIn = (text: string) => `⟦${[...text].join("·")}⟧`;

const translate = (value: unknown): unknown => {
  if (typeof value === "string") return standIn(value);
  if (typeof value === "function")
    return (...args: unknown[]) => translate((value as (...values: unknown[]) => unknown)(...args));
  if (Array.isArray(value)) return value.map(translate);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, line]) => [key, translate(line)]));
  return value;
};

const STAND_IN = translate(CATALOGUES.en) as Catalogue;

// A line built by a function is asked with a marker for every value, and the words around it kept, so
// a count or an address the screen supplies cannot hide English that stayed.
const MARKER = 987654;

const linesOf = (value: unknown): string[] =>
  typeof value === "string"
    ? value.split(String(MARKER))
    : typeof value === "function"
      ? linesOf((value as (...values: number[]) => unknown)(...Array<number>(value.length).fill(MARKER)))
      : value && typeof value === "object"
        ? Object.values(value).flatMap(linesOf)
        : [];

const ENGLISH = linesOf(CATALOGUES.en)
  .map((line) => line.trim())
  .filter((line) => line.length >= 4);

const renderedWords = (root: HTMLElement) =>
  [
    root.textContent ?? "",
    ...[...root.querySelectorAll("*")].flatMap((element) =>
      ["aria-label", "placeholder", "title", "alt"].map((name) => element.getAttribute(name) ?? ""),
    ),
  ].join("\n");

const englishIn = (root: HTMLElement) => ENGLISH.filter((line) => renderedWords(root).includes(line));

const browserPrefers = (...languages: string[]) =>
  Object.defineProperty(window.navigator, "languages", { value: languages, configurable: true });

const DocumentLanguage = () => {
  useDocumentLanguage();
  return null;
};

const mount = (element: ReactElement, path = "/auth/onboarding", signedIn = false) => {
  const store = configureStore({ reducer: { session: sessionReducer, authentication: authenticationReducer } });
  store.dispatch(signedIn ? sessionActions.sessionSettled() : sessionActions.sessionEnded());

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <DocumentLanguage />
          {element}
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
};

const atRoute = (path: string) => () => mount(<Routes>{authRoute}</Routes>, path);
const noop = () => {};

const switchTo = (language: string) =>
  act(() => {
    browserPrefers(language);
    window.dispatchEvent(new Event("languagechange"));
  });

beforeEach(() => {
  browserPrefers("en");
  setupLocalisation({ en: CATALOGUES.en, xx: STAND_IN });
});

afterEach(() => {
  delete (window.navigator as { languages?: unknown }).languages;
  setupLocalisation(CATALOGUES);
});

// A state reached after a read settles is waited for, so the switch is proven on it and not on the wait.
const failed = () => screen.findByRole("alert");

const SURFACES: [string, () => ReturnType<typeof render>, () => void, (() => Promise<unknown>)?][] = [
  ["sign-in, inside the auth layout", atRoute("/auth/signin"), noop],
  ["registration, inside the journey's layout", atRoute("/auth/signup"), noop],
  ["recovery's request step", atRoute("/auth/recovery"), () => server.use(recoveryPositionIs({ step: "request" }))],
  [
    "recovery's code step",
    atRoute("/auth/recovery"),
    () => server.use(recoveryPositionIs({ step: "code", maskedEndpoint: "h•••••@example.test", canResend: true })),
  ],
  ["recovery's password step", atRoute("/auth/recovery"), () => server.use(recoveryPositionIs({ step: "password" }))],
  ["recovery's retry", atRoute("/auth/recovery"), () => server.use(recoveryPositionRefuses()), failed],
  ["the journey's retry", () => mount(<Onboarding />, "/auth/onboarding", true), () => server.use(journeyRefuses()), failed],
  ["the profile step", () => mount(<Profile onSettled={noop} />), noop],
  ["verification's ask", () => mount(<VerifyAsk onSent={noop} onLater={noop} />), noop],
  ["verification's code", () => mount(<VerifyCode onVerified={noop} onLater={noop} />), () => server.use(verificationIs("pending", 30))],
  ["the journey's stepper", () => mount(<JourneyLayout states={stepStates("profile", null)}>{null}</JourneyLayout>), noop],
];

describe("a change of language", () => {
  it.each(SURFACES)("re-renders %s in the new language, without a reload", async (_, show, answer, ready) => {
    answer();
    const { container } = show();
    await ready?.();
    await waitFor(() => expect(englishIn(container).length).toBeGreaterThan(0));

    await switchTo("xx");

    await waitFor(() => expect(englishIn(container)).toEqual([]));
    expect(renderedWords(container)).toContain("⟦");
    expect(document.documentElement.getAttribute("lang")).toBe("xx");
  });

  it("words a field error in the language active when the error is produced", async () => {
    atRoute("/auth/signin")();
    await switchTo("xx");

    fireEvent.click(await screen.findByRole("button", { name: STAND_IN.auth.signIn.submit }));

    expect(await screen.findByText(STAND_IN.validation.required.identifier)).toBeTruthy();
  });
});
