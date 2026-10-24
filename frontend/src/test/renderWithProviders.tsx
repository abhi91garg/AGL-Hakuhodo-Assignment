import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  const testClient = new ApolloClient({
    uri: "/graphql",
    cache: new InMemoryCache(),
  });
  const Providers = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={testClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </ApolloProvider>
  );

  return render(ui, { wrapper: Providers, ...options });
};

export * from "@testing-library/react";
