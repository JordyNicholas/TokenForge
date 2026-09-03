import { mount } from "cypress/react";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { ThemeAppProvider } from "../../src/theme/ThemeAppProvider";

// Mirror the provider stack from dashboard/src/main.tsx so mounted components
// get the real MUI theme and a router context (many widgets call useNavigate).
Cypress.Commands.add(
  "mount",
  (jsx: ReactNode, options?: Parameters<typeof mount>[1]) =>
    mount(
      <ThemeAppProvider>
        <BrowserRouter>{jsx}</BrowserRouter>
      </ThemeAppProvider>,
      options,
    ),
);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Mount a component wrapped in the app's Theme + Router providers. */
      mount: typeof mount;
    }
  }
}
