import { Module } from "@nestjs/common";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { loadConfig } from "./config.js";
import { MakesResolver } from "./graphql/makes.resolver.js";
import { DatabaseService, openSqlite } from "./storage/database.js";

export const APP_CONFIG = Symbol("APP_CONFIG");

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
    }),
  ],
  providers: [
    { provide: APP_CONFIG, useFactory: loadConfig },
    {
      provide: DatabaseService,
      useFactory: (config: ReturnType<typeof loadConfig>) =>
        new DatabaseService(openSqlite(config.databasePath)),
      inject: [APP_CONFIG],
    },
    MakesResolver,
  ],
})
export class AppModule {}