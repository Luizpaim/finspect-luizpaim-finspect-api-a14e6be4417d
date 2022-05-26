import * as Hapi from "hapi";
import * as Joi from "joi";
import IndustryController from "./industry-controller";
import * as IndustryValidator from "./industry-validator";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const industryController = new IndustryController(configs, database);

  server.bind(industryController);
  server.route({
    method: "POST",
    path: "/industries",
    options: {
      handler: industryController.createIndustry,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "industry"],
      description: "Create an industry.",
      validate: {
        payload: IndustryValidator.industryModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Industry created."
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
    path: "/industries/{id?}",
    options: {
      handler: industryController.listIndustries,
      auth: {
        strategy: "jwt"
      },
      tags: ["api", "industry"],
      description: "List industries.",
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
              description: "List of industries."
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
    path: "/industries/{id}",
    options: {
      handler: industryController.editIndustry,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "industry"],
      description: "Update industry by id.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required()
        },
        headers: jwtValidator,
        payload: IndustryValidator.industryModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Industry updated."
            },
            "404": {
              description: "Industry does not exists."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/industries/{id}",
    options: {
      handler: industryController.deleteIndustry,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "industry"],
      description: "Delete industry by id.",
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
              description: "Deleted industry."
            },
            "404": {
              description: "Industry does not exists."
            }
          }
        }
      }
    }
  });
}