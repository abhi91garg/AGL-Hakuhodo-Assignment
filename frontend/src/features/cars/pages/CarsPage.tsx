import { useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CarCard } from "../components/CarCard";
import { CarForm } from "../components/CarForm";
import { useCars } from "../hooks/useCars";
import type { Car } from "../types";

type SortOrder = "model" | "newest" | "oldest";

function sortCars(cars: Car[], order: SortOrder) {
  return [...cars].sort((first, second) => {
    if (order === "newest") return second.year - first.year;
    if (order === "oldest") return first.year - second.year;
    return first.model.localeCompare(second.model);
  });
}

export function CarsPage() {
  const { cars, loading, error, createCar, creating, createError } = useCars();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("model");
  const filteredCars = cars.filter((car) =>
    car.model.toLowerCase().includes(search.trim().toLowerCase())
  );
  const visibleCars = sortCars(filteredCars, sortOrder);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Vehicle inventory
          </Typography>
          <Typography variant="h4" component="h1">
            Cars
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 300px" },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Stack component="section" aria-label="Car inventory" spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Search by model"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                size="small"
                fullWidth
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="car-sort-label">Sort by</InputLabel>
                <Select
                  labelId="car-sort-label"
                  label="Sort by"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                >
                  <MenuItem value="model">Model A–Z</MenuItem>
                  <MenuItem value="newest">Newest year</MenuItem>
                  <MenuItem value="oldest">Oldest year</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {loading && (
              <Stack role="status" alignItems="center" sx={{ py: 5 }}>
                <CircularProgress size={28} />
                <Typography sx={{ mt: 1 }}>Loading cars…</Typography>
              </Stack>
            )}
            {error && <Alert severity="error">Could not load cars: {error.message}</Alert>}
            {!loading && !error && cars.length === 0 && (
              <Alert severity="info">No cars yet. Add one to get started.</Alert>
            )}
            {!loading && !error && cars.length > 0 && visibleCars.length === 0 && (
              <Alert severity="info">No cars match that model.</Alert>
            )}
            {!loading && !error && visibleCars.length > 0 && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
                  gap: 2,
                }}
              >
                {visibleCars.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </Box>
            )}
          </Stack>

          <CarForm onCreate={createCar} creating={creating} error={createError} />
        </Box>
      </Stack>
    </Container>
  );
}