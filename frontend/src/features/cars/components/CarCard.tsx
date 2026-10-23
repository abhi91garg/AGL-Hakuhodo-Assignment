import { Card, CardContent, Typography } from "@mui/material";
import type { Car } from "../types";

export function CarCard({ car }: { car: Car }) {
  return (
    <Card component="article" variant="outlined" sx={{ height: "100%" }}>
      <picture>
        <source media="(max-width: 639px)" srcSet={car.mobile} />
        <source media="(min-width: 640px) and (max-width: 1023px)" srcSet={car.tablet} />
        <source media="(min-width: 1024px)" srcSet={car.desktop} />
        <img
          className="car-image"
          src={car.desktop}
          alt={`${car.year} ${car.make} ${car.model}`}
          loading="lazy"
        />
      </picture>
      <CardContent>
        <Typography variant="h6" component="h3">
          {car.make} {car.model}
        </Typography>
        <Typography color="text.secondary">
          {car.year} · {car.color || "Color not specified"}
        </Typography>
      </CardContent>
    </Card>
  );
}