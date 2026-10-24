import { useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CreateCarInput } from "../types";
import { validateCarForm, type CarFormErrors, type CarFormValues } from "../utils";

const initialValues: CarFormValues & { color: string } = {
  make: "",
  model: "",
  year: "",
  color: "",
};

type CarFormProps = {
  onCreate: (input: CreateCarInput) => Promise<unknown>;
  creating: boolean;
  error?: Error;
};

export function CarForm({ onCreate, creating, error }: CarFormProps) {
  const [values, setValues] = useState(initialValues);
  const [validationErrors, setValidationErrors] = useState<CarFormErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateCarForm(values);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await onCreate({
        make: values.make.trim(),
        model: values.model.trim(),
        year: Number(values.year),
        color: values.color.trim(),
      });
      setValues(initialValues);
      setValidationErrors({});
    } catch {
      return;
    }
  };

  return (
    <Paper component="section" variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Add a car
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.5}>
          {error && <Alert severity="error">{error.message}</Alert>}
          <TextField
            label="Make"
            value={values.make}
            onChange={(event) => setValues({ ...values, make: event.target.value })}
            error={Boolean(validationErrors.make)}
            helperText={validationErrors.make}
            required
          />
          <TextField
            label="Model"
            value={values.model}
            onChange={(event) => setValues({ ...values, model: event.target.value })}
            error={Boolean(validationErrors.model)}
            helperText={validationErrors.model}
            required
          />
          <TextField
            label="Year"
            type="number"
            value={values.year}
            onChange={(event) => setValues({ ...values, year: event.target.value })}
            error={Boolean(validationErrors.year)}
            helperText={validationErrors.year}
            required
          />
          <TextField
            label="Color"
            value={values.color}
            onChange={(event) => setValues({ ...values, color: event.target.value })}
          />
          <Button type="submit" variant="contained" disabled={creating}>
            {creating ? "Adding…" : "Add car"}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}