export type CarFormValues = {
  make: string;
  model: string;
  year: string;
};

export type CarFormErrors = Partial<Record<keyof CarFormValues, string>>;

export function validateCarForm(values: CarFormValues): CarFormErrors {
  const errors: CarFormErrors = {};

  if (!values.make.trim()) errors.make = "Make is required.";
  if (!values.model.trim()) errors.model = "Model is required.";
  if (!values.year.trim() || !Number.isInteger(Number(values.year))) {
    errors.year = "Enter a valid year.";
  }

  return errors;
}