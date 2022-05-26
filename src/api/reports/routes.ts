import * as Hapi from "hapi";
import * as Joi from "joi";
import ReportController from "./report-controller";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const reportController = new ReportController(configs, database);

  server.bind(reportController);


  server.route({
    method: "GET",
    path: "/reports/{accountantId}/{companyId}",
    options: {
      handler: reportController.getFinancialDemo,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}', 'company-{params.companyId}']
      },
      tags: ["api", "plans"],
      description: "Get financial Demonstration data.",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
        },
        query: {
          from: Joi.number().positive().integer().required()
        }
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Financial Demonstration data."
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
    path: "/reports/{accountantId}/{companyId}/analysis",
    options: {
      handler: reportController.getAnalysis,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}', 'company-{params.companyId}']
      },
      tags: ["api", "plans"],
      description: "Get situations analysis data.",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
        },
        query: {
          frequency: Joi.string().valid('yearly', 'quarterly', 'monthly').required(),
          year: Joi.number().positive().integer().required(),
        }
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Situation analysis."
            },
            "401": {
              description: "Please login first"
            }
          }
        }
      }
    }
  });
}