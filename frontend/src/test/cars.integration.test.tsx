import { graphql, HttpResponse } from "msw";
import { userEvent } from "@testing-library/user-event";
import { CarsPage } from "@/features/cars/pages/CarsPage";
import { server } from "@/mocks/server";
import { db } from "@/mocks/db";
import { renderWithProviders, screen } from "./renderWithProviders";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(async () => {
  server.resetHandlers();
  db.reset();
});
afterAll(() => server.close());

describe("car inventory", () => {
  it("lists cars and provides sources for each responsive breakpoint", async () => {
    renderWithProviders(<CarsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading cars");
    const q5Image = await screen.findByRole("img", { name: "2023 Audi Q5" });
    expect(screen.getByRole("heading", { name: "Audi Q5" })).toBeInTheDocument();
    expect(q5Image.closest("picture")?.querySelector('source[media="(max-width: 639px)"]'))
      .toHaveAttribute("srcset", "/images/q5-mobile.svg");
    expect(q5Image.closest("picture")?.querySelector('source[media="(min-width: 640px) and (max-width: 1023px)"]'))
      .toHaveAttribute("srcset", "/images/q5-tablet.svg");
    expect(q5Image.closest("picture")?.querySelector('source[media="(min-width: 1024px)"]'))
      .toHaveAttribute("srcset", "/images/q5-desktop.svg");
  });

  it("creates a car and shows it from the updated Apollo cache", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CarsPage />);

    await screen.findByRole("heading", { name: "Audi Q5" });
    await user.type(screen.getByRole("textbox", { name: /Make/ }), "Subaru");
    await user.type(screen.getByRole("textbox", { name: /Model/ }), "Crosstrek");
    await user.type(screen.getByRole("spinbutton", { name: /Year/ }), "2026");
    await user.type(screen.getByLabelText("Color"), "Blue");
    await user.click(screen.getByRole("button", { name: "Add car" }));

    expect(
      await screen.findByRole("heading", { name: "Subaru Crosstrek" })
    ).toBeInTheDocument();
  });

  it("shows validation messages without submitting blank required fields", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CarsPage />);

    await user.click(screen.getByRole("button", { name: "Add car" }));

    expect(await screen.findByText("Make is required.")).toBeInTheDocument();
    expect(screen.getByText("Model is required.")).toBeInTheDocument();
    expect(db.list()).toHaveLength(6);
  });

  it("filters by model and sorts the visible cars", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CarsPage />);
    await screen.findByRole("heading", { name: "Audi Q5" });

    await user.type(screen.getByRole("textbox", { name: "Search by model" }), "Q5");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Audi Q5" })).toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Search by model" }));
    await user.click(screen.getByRole("combobox", { name: "Sort by" }));
    await user.click(await screen.findByRole("option", { name: "Newest year" }));
    expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent(
      "Audi e-tron GT"
    );

    await user.type(screen.getByRole("textbox", { name: "Search by model" }), "unknown");
    expect(await screen.findByText("No cars match that model.")).toBeInTheDocument();
  });

  it("shows an empty state when the API returns no cars", async () => {
    server.use(
      graphql.query("GetCars", () => HttpResponse.json({ data: { cars: [] } }))
    );
    renderWithProviders(<CarsPage />);

    expect(await screen.findByText("No cars yet. Add one to get started."))
      .toBeInTheDocument();
  });

  it("shows a useful message when the list query fails", async () => {
    server.use(
      graphql.query("GetCars", () =>
        HttpResponse.json({ errors: [{ message: "inventory unavailable" }] })
      )
    );
    renderWithProviders(<CarsPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Could not load cars:/);
    expect(alert).toHaveTextContent(/inventory unavailable/);
  });
});
