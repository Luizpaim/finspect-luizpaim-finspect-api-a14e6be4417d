import * as Hapi from "hapi";
import * as Joi from "joi";
import IndicatorController from "./indicator-controller";
import * as IndicatorValidator from "./indicator-validator";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const indicatorController = new IndicatorController(configs, database);

  server.bind(indicatorController);
  server.route({
    method: "POST",
    path: "/indicators",
    options: {
      handler: indicatorController.createIndicator,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "indicator"],
      description: "Create an indicator.",
      validate: {
        payload: IndicatorValidator.indicatorModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "indicator created."
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
    path: "/indicators/{id?}",
    options: {
      handler: indicatorController.listIndicators,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "indicator"],
      description: "List indicators.",
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
              description: "List of indicators."
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
    path: "/indicators/{id}",
    options: {
      handler: indicatorController.editIndicator,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "indicator"],
      description: "Update indicator by id.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required()
        },
        headers: jwtValidator,
        payload: IndicatorValidator.indicatorModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "indicator updated."
            },
            "404": {
              description: "Indicator does not exists."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/indicators/{id}",
    options: {
      handler: indicatorController.deleteIndicator,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "indicator"],
      description: "Delete indicator by id.",
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
              description: "Deleted indicator."
            },
            "404": {
              description: "Indicator does not exists."
            }
          }
        }
      }
    }
  });
}