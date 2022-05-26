import * as Hapi from "hapi";
import * as Joi from "joi";
import BalanceSheetController from './balanceSheet-controller';
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const balanceSheetController = new BalanceSheetController(configs, database);

  server.bind(balanceSheetController);
  server.route({
    method: "POST",
    path: "/balancesheets/{accountantId}/{companyId}",
    options: {
      handler: balanceSheetController.importBalanceSheets,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}']
      },
      tags: ["api", "balancesheet"],
      description: "Import balance sheet.",
      payload: {
        output: 'stream',
        allow: 'multipart/form-data',
        parse: true,
        maxBytes: 10 * 1024 * 1024,
      },
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
        },
      },
      plugins: {
        "hapi-swagger": {
          payloadType: 'form',
          responses: {
            "201": {
              description: "Balance sheet imported."
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
    path: "/balancesheets/{accountantId}/{companyId}/{key?}",
    options: {
      handler: balanceSheetController.listBalanceSheets,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}', 'company-{params.companyId}']
      },
      tags: ["api", "balancesheet"],
      description: "List balance sheets.",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
          key: Joi.string()
        },
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Balance sheets list."
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
    path: "/balancesheets/xlsx/{accountantId}/{companyId}/{key}",
    options: {
      handler: balanceSheetController.exportBalanceSheet,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}', 'company-{params.companyId}']
      },
      tags: ["api", "balancesheet"],
      description: "Export a single balance sheet as xls.",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
          key: Joi.string().required()
        },
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Balance sheet XLS file."
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
    method: "DELETE",
    path: "/balancesheets/{accountantId}/{companyId}/{key}",
    options: {
      handler: balanceSheetController.deleteBalanceSheet,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}']
      },
      tags: ["api", "balancesheet"],
      description: "List balance sheets.",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
          key: Joi.string().required()
        },
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Balance sheets list."
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