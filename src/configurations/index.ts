import * as nconf from "nconf";
import * as path from "path";

//Read Configurations
const configs = new nconf.Provider({
  env: true,
  argv: true,
  store: {
    type: "file",
    file: path.join(__dirname, `./config.${process.env.NODE_ENV || "development"}.json`)
  }
});

export interface IServerConfigurations {
  port: number;
  plugins: Array<string>;
  jwtSecret: string;
  jwtExpiration: string;
  routePrefix: string;
}

export interface IDataConfiguration {
  connectionString: string;
}

export function getDatabaseConfig(): IDataConfiguration {
  let dbconfig = configs.get("database");
  dbconfig.connectionString = process.env.MONGO_URL || dbconfig.connectionString;
  return dbconfig;
}

export function getServerConfigs(): IServerConfigurations {
  let config = configs.get("server");
  config.jwtSecret = process.env.JWT_SECRET || config.jwtSecret;
  return config;
}
