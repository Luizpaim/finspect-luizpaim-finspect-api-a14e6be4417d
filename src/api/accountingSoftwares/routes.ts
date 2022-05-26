import * as Hapi from "hapi";
import * as Joi from "joi";
import AccountingSoftwareController from "./accountingSoftware-controller";
import * as AccountingSoftwareValidator from "./accountingSoftware-validator";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const accountingSoftwareController = new AccountingSoftwareController(configs, database);

  server.bind(accountingSoftwareController);
  server.route({
    method: "POST",
    path: "/accountingsoftwares",
    options: {
      handler: accountingSoftwareController.createAccountingSoftware,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "accountingsoftwares"],
      description: "Create an Accounting Software record.",
      validate: {
        payload: AccountingSoftwareValidator.accountingSoftwareModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Created Accounting Software."
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
    path: "/accountingsoftwares/{id?}",
    options: {
      handler: accountingSoftwareController.listAccountingSoftwares,
      auth: {
        strategy: "jwt"
      },
      tags: ["api", "accountingsoftwares"],
      description: "List Accounting Softwares.",
      validate: {
        headers: jwtValidator,
        params: {
          id: Joi.string().alphanum().length(24),
        },
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "List of Accounting Softwares."
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
    path: "/accountingsoftwares/{id}",
    options: {
      handler: accountingSoftwareController.editAccountingSoftware,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "accountingsoftwares"],
      description: "Update accountingSoftware by id.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required()
        },
        headers: jwtValidator,
        payload: AccountingSoftwareValidator.accountingSoftwareModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Accounting Software updated."
            },
            "404": {
              description: "Accounting Software does not exists."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/accountingsoftwares/{id}",
    options: {
      handler: accountingSoftwareController.deleteAccountingSoftware,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "accountingsoftwares"],
      description: "Delete accountingSoftware by id.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required()
        },
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Deleted Accounting Software."
            },
            "404": {
              description: "Accounting Software does not exists."
            }
          }
        }
      }
    }
  });
}