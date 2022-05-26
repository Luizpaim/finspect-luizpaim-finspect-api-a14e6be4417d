import * as Hapi from "hapi";
import * as Joi from "joi";
import PlanController from "./plan-controller";
import * as PlanValidator from "./plan-validator";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const planController = new PlanController(configs, database);

  server.bind(planController);
  server.route({
    method: "POST",
    path: "/plans",
    options: {
      handler: planController.createPlan,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "plans"],
      description: "Create a Plan.",
      validate: {
        payload: PlanValidator.planModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Created Plan."
            },
            "400": {
              description: "Invalid Plan."
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
    path: "/plans/{id?}",
    options: {
      handler: planController.listPlans,
      auth: {
        strategy: "jwt"
      },
      tags: ["api", "plans"],
      description: "List Plans.",
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
              description: "List of Plans."
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
    path: "/plans/{id}",
    options: {
      handler: planController.editPlan,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "plans"],
      description: "Update plan by id.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required()
        },
        headers: jwtValidator,
        payload: PlanValidator.planModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Plan updated."
            },
            "400": {
              description: "Invalid Plan."
            },
            "404": {
              description: "Plan does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/plans/{id}",
    options: {
      handler: planController.deletePlan,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "plans"],
      description: "Delete plan by id.",
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
              description: "Deleted plan."
            },
            "404": {
              description: "Plan does not exist."
            }
          }
        }
      }
    }
  });
}