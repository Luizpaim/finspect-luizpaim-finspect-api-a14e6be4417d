import * as Hapi from "hapi";
import * as Joi from "joi";
import BalanceSheetAccountLinkController from './balanceSheetAccountLink-controller';
import * as BalanceSheetAccountLinkValidator from './balanceSheetAccountLink-validator';
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const balanceSheetAccountLinkController = new BalanceSheetAccountLinkController(configs, database);

  server.bind(balanceSheetAccountLinkController);
  server.route({
    method: "POST",
    path: "/balancesheets/link/{accountantId}/{companyId}",
    options: {
      handler: balanceSheetAccountLinkController.linkAccount,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}']
      },
      tags: ["api", "balancesheet"],
      description: "Parametrize company balance sheet",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
        },
        payload: BalanceSheetAccountLinkValidator.linkAccount
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Parametrization done."
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
    path: "/balancesheets/link/{accountantId}/{companyId}",
    options: {
      handler: balanceSheetAccountLinkController.getUniqueAccounts,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}']
      },
      tags: ["api", "balancesheet"],
      description: "Get unique balance sheets accounts",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
        }
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Parametrization done."
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