export type VehicleType = {
  typeId: number;
  typeName: string;
};

export type Make = {
  makeId: number;
  makeName: string;
};

export type MakeWithVehicleTypes = Make & {
  vehicleTypes: VehicleType[];
};

export type IngestionStatus = {
  lastSuccessfulIngestionAt: string | null;
  makeCount: number;
  vehicleTypeCount: number;
  runId: string | null;
};