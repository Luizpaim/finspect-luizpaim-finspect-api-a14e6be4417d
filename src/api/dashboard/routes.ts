import * as Hapi from "hapi";
import * as Joi from "joi";
import DashboardController from './dashboard-controller';
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const dashboardController = new DashboardController(configs, database);

  server.bind(dashboardController);
  server.route({
    method: "GET",
    path: "/dashboard/{accountantId}/{companyId}",
    options: {
      handler: dashboardController.getDashboardData,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}', 'company-{params.companyId}']
      },
      tags: ["api", "dashboard"],
      description: "Get all dashboards data.",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
        },
        query: {
          from: Joi.string().required(),
          to: Joi.string().required(),
        },
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Dashboard data."
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