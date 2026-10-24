import { useMutation, useQuery } from "@apollo/client";
import { CREATE_CAR, GET_CARS } from "../api/cars";
import type {
  CreateCarInput,
  CreateCarMutation,
  CreateCarVariables,
  GetCarsQuery,
} from "../types";

export function useCars() {
  const { data, loading, error } = useQuery<GetCarsQuery>(GET_CARS);
  const [runCreateCar, createState] = useMutation<
    CreateCarMutation,
    CreateCarVariables
  >(CREATE_CAR, {
    update(cache, { data: mutationData }) {
      const createdCar = mutationData?.createCar;
      if (!createdCar) return;

      cache.updateQuery<GetCarsQuery>({ query: GET_CARS }, (currentData) =>
        currentData ? { cars: [createdCar, ...currentData.cars] } : currentData
      );
    },
  });

  const createCar = (input: CreateCarInput) =>
    runCreateCar({
      variables: {
        input: {
          mobile: "/images/q5-mobile.svg",
          tablet: "/images/q5-tablet.svg",
          desktop: "/images/q5-desktop.svg",
          ...input,
        },
      },
    });

  return {
    cars: data?.cars ?? [],
    loading,
    error,
    createCar,
    creating: createState.loading,
    createError: createState.error,
  };
}