import * as Hapi from "hapi";
import * as Joi from "joi";
import SituationController from "./situation-controller";
import * as SituationValidator from "./situation-validator";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const situationController = new SituationController(configs, database);

  server.bind(situationController);
  server.route({
    method: "POST",
    path: "/situations",
    options: {
      handler: situationController.createSituation,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "situation"],
      description: "Create an situation.",
      validate: {
        payload: SituationValidator.situationModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "situation created."
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
    path: "/situations/{id?}",
    options: {
      handler: situationController.listSituations,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "situation"],
      description: "List situations.",
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
              description: "List of situations."
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
    path: "/situations/{id}",
    options: {
      handler: situationController.editSituation,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "situation"],
      description: "Update situation by id.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required()
        },
        headers: jwtValidator,
        payload: SituationValidator.situationModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "situation updated."
            },
            "404": {
              description: "Situation does not exists."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/situations/{id}",
    options: {
      handler: situationController.deleteSituation,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "situation"],
      description: "Delete situation by id.",
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
              description: "Deleted situation."
            },
            "404": {
              description: "Situation does not exists."
            }
          }
        }
      }
    }
  });
}