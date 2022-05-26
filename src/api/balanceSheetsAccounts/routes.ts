import * as Hapi from "hapi";
import * as Joi from "joi";
import BalanceSheetAccountController from "./balanceSheetAccount-controller";
import * as BalanceSheetAccountValidator from "./balanceSheetAccount-validator";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const balanceSheetAccountController = new BalanceSheetAccountController(configs, database);

  server.bind(balanceSheetAccountController);
  server.route({
    method: "POST",
    path: "/balancesheetaccounts",
    options: {
      handler: balanceSheetAccountController.createBalanceSheetAccount,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "balancesheetaccount"],
      description: "Create a balancesheet account.",
      validate: {
        payload: BalanceSheetAccountValidator.balanceSheetAccountModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Balancesheet account created."
            },
            "401": {
              description: "Please login first"
            }
          }
        }
      }
    }
  });

  server.route({
    method: "GET",
    path: "/balancesheetaccounts/{id?}",
    options: {
      handler: balanceSheetAccountController.listBalanceSheetAccounts,
      auth: {
        strategy: "jwt"
      },
      tags: ["api", "balancesheetaccount"],
      description: "List balancesheet accounts.",
      validate: {
        headers: jwtValidator,
        params: {
          id: Joi.string().alphanum().length(24),
        },
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "List of balancesheet accounts."
            },
            "401": {
              description: "Please login first"
            }
          }
        }
      }
    }
  });

  server.route({
    method: "PUT",
    path: "/balancesheetaccounts/{id}",
    options: {
      handler: balanceSheetAccountController.editBalanceSheetAccount,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "balancesheetaccount"],
      description: "Update balancesheet account by id.",
      validate: {
        params: {
          id: Joi.string().required()
        },
        headers: jwtValidator,
        payload: BalanceSheetAccountValidator.balanceSheetAccountModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Balancesheet account updated."
            },
            "404": {
              description: "Balancesheet account does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/balancesheetaccounts/{id}",
    options: {
      handler: balanceSheetAccountController.deleteBalanceSheetAccount,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "balancesheetaccount"],
      description: "Delete balancesheet account by id.",
      validate: {
        params: {
          id: Joi.string().required()
        },
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Deleted balancesheet account."
            },
            "404": {
              description: "Balancesheet account does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "POST",
    path: "/balancesheetaccounts/many",
    options: {
      handler: balanceSheetAccountController.createManyBalanceSheetAccount,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "balancesheetaccount"],
      description: "Clean the collection and create many balancesheet accounts (WARNING THIS ENDPOINT WILL CLEAN EVERY ENTRY OF YOUR COLLECTION)",
      validate: {
        headers: jwtValidator,
        payload: BalanceSheetAccountValidator.manyBalanceSheetAccountModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Created all."
            }
          }
        }
      }
    }
  });
}
