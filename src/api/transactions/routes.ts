import * as Hapi from "hapi";
import TransactionController from "./transaction-controller";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const transactionController = new TransactionController(configs, database);

  server.bind(transactionController);
  server.route({
    method: "POST",
    path: "/transactions",
    options: {
      handler: transactionController.onSubscriptionStatusChange,
      auth: false,
      tags: ["api", "transactions"],
      payload: {
        allow: 'application/x-www-form-urlencoded',
        parse: false,
      },
      description: "Subscription status change postback.",
    }
  });

  server.route({
    method: "GET",
    path: "/transactions",
    options: {
      handler: transactionController.listTransactions,
      auth: {
        strategy: 'jwt',
        scope: ['admin']
      },
      validate: {
        headers: jwtValidator
      },
      tags: ["api", "transactions"],
      description: "List transactions.",
    }
  });
}