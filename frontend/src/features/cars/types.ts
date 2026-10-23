export type Car = {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  mobile: string;
  tablet: string;
  desktop: string;
};

export type CreateCarInput = {
  make: string;
  model: string;
  year: number;
  color: string;
  mobile?: string;
  tablet?: string;
  desktop?: string;
};

export type GetCarsQuery = {
  cars: Car[];
};

export type CreateCarMutation = {
  createCar: Car;
};

export type CreateCarVariables = {
  input: CreateCarInput;
};