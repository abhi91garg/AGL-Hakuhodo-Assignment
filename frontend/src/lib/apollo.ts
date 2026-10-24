import { ApolloClient, InMemoryCache } from "@apollo/client";

/**
 * Apollo points at /graphql, which MSW intercepts in the browser.
 * There is no real server process to run.
 */
export const apolloClient = new ApolloClient({
  uri: "/graphql",
  cache: new InMemoryCache(),
});
