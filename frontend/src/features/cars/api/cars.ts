import { gql } from "@apollo/client";

export const GET_CARS = gql`
  query GetCars {
    cars {
      id
      make
      model
      year
      color
      mobile
      tablet
      desktop
    }
  }
`;

export const CREATE_CAR = gql`
  mutation CreateCar($input: CreateCarInput!) {
    createCar(input: $input) {
      id
      make
      model
      year
      color
      mobile
      tablet
      desktop
    }
  }
`;