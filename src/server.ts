import * as Hapi from "hapi";
import { IPlugin } from "./plugins/interfaces";
import { IServerConfigurations } from "./configurations";
import * as Logs from "./plugins/logging";
import * as Users from "./api/users";
import * as Companies from "./api/companies";
import * as Accountants from "./api/accountants";
import * as AccountingSoftwares from "./api/accountingSoftwares";
import * as Industries from "./api/industries";
import * as MarketSegments from "./api/marketSegments";
import * as Plans from "./api/plans";
import * as BalanceSheets from "./api/balanceSheets";
import * as Files from "./api/files";
import * as BalanceSheetsAccounts from "./api/balanceSheetsAccounts";
import * as BalanceSheetAccountLink from "./api/balanceSheetAccountLink";
import * as Dashboard from "./api/dashboard";
import * as Indicators from "./api/indicators";
import * as Situations from "./api/situations";
import * as Transactions from "./api/transactions";
import * as Reports from "./api/reports";
import { IDatabase } from "./database";

export async function init(
  configs: IServerConfigurations,
  database: IDatabase
): Promise<Hapi.Server> {
  try {
    const port = process.env.PORT || configs.port;
    const server = new Hapi.Server({
      debug: { request: ['error'] },
      port: port,
      routes: {
        cors: {
          origin: ["*"]
        },
        validate: {
          failAction: async (request, h, err) => {
            if (err['isJoi']) {
              throw err;
            }
          }
        }
      }
    });

    if (configs.routePrefix) {
      server.realm.modifiers.route.prefix = configs.routePrefix;
    }

    //  Setup Hapi Plugins
    const plugins: Array<string> = configs.plugins;
    const pluginOptions = {
      database: database,
      serverConfigs: configs
    };

    let pluginPromises: Promise<any>[] = [];

    plugins.forEach((pluginName: string) => {
      var plugin: IPlugin = require("./plugins/" + pluginName).default();
      console.log(
        `Register Plugin ${plugin.info().name} v${plugin.info().version}`
      );
      pluginPromises.push(plugin.register(server, pluginOptions));
    });

    await Promise.all(pluginPromises);

    console.log("All plugins registered successfully.");

    console.log("Register Routes");
    Logs.init(server, configs, database);

    Accountants.init(server, configs, database);
    AccountingSoftwares.init(server, configs, database);
    BalanceSheetAccountLink.init(server, configs, database);
    BalanceSheets.init(server, configs, database);
    BalanceSheetsAccounts.init(server, configs, database);
    Companies.init(server, configs, database);
    Dashboard.init(server, configs, database);
    Files.init(server, configs, database);
    Indicators.init(server, configs, database);
    Industries.init(server, configs, database);
    MarketSegments.init(server, configs, database);
    Plans.init(server, configs, database);
    Reports.init(server, configs, database);
    Situations.init(server, configs, database);
    Transactions.init(server, configs, database);
    Users.init(server, configs, database);
    console.log("Routes registered sucessfully.");

    return server;
  } catch (err) {
    console.log("Error starting server: ", err);
    throw err;
  }
}
// comment this
