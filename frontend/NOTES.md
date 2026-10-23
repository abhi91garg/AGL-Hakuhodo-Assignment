# Notes

## What I completed

- List cars through the `GetCars` query and create through `CreateCar`.
- Responsive image sources, model search, and model/year sorting.
- Loading, query error, empty inventory, no search matches, and form validation states.
- `useCars()` owns Apollo reads and mutations; the cache is updated from the mutation result.
- Component/API integration tests and focused form-validation tests.

## What I left out, and why

- Server-side filtering, debounce, year filtering, and a car detail route were optional and were not needed for the requested workflow.

## Decisions and trade-offs

- Filtering and sorting are derived from the single `GetCars` result, avoiding a second overlapping query.
- Creation writes the mutation result into the existing Apollo query cache rather than refetching the full list.
- New cars receive the starter's local image URLs when optional image URLs are omitted, so the existing non-null list query remains cache-complete.
- Tests use the real Apollo client and MSW handlers for list, create, and error behavior; form validation has a small unit test.

## If I had another day

- Add server-side filtering if the inventory grows enough to justify the extra query behavior.
- Add a detail view only if the product needs a per-car workflow.

## Anything you should know to run it

- Requires Node 20 or newer. Run `npm ci`, `npm run verify`, and `npm run dev` from `frontend/`.
