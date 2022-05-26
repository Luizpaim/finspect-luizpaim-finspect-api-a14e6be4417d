import { IPlugin, IPluginOptions } from "../interfaces";
import * as Hapi from "hapi";
import { IRequest } from "../../interfaces/request";
import SessionController from '../../session/session-controller';
import * as Jwt from "jsonwebtoken";
import * as Boom from "boom";

const register = async (
  server: Hapi.Server,
  options: IPluginOptions
): Promise<void> => {
  try {
    const database = options.database;
    const serverConfig = options.serverConfigs;
    const sessionController: SessionController = new SessionController(serverConfig, database);

        const validateUser = async (decoded: any, request: IRequest, h: Hapi.ResponseToolkit) => {
            try {
              Jwt.verify(request.headers.authorization, serverConfig.jwtSecret);
            } catch (error) {
              if (error.name === 'TokenExpiredError') {
                await sessionController.invalidateSession(decoded);
                return Boom.unauthorized('Expired Token');
              }
              throw new Error(error);
            }
            const isSessionActive = await sessionController.verifySession(decoded);
            return { isValid: isSessionActive };
        };
    await server.register(require("hapi-auth-jwt2"));

    return setAuthStrategy(server, {
      config: serverConfig,
      validate: validateUser
    });
  } catch (err) {
    console.log(`Error registering jwt plugin: ${err}`);
    throw err;
  }
};

const setAuthStrategy = async (server, { config, validate }) => {
  server.auth.strategy("jwt", "jwt", {
    key: config.jwtSecret,
    validate,
    verifyOptions: {
      algorithms: ["HS256"],
      ignoreExpiration: true
    },
    headless: {
      alg: 'HS256',
      typ: 'JWT'
    }
  });

  server.auth.default("jwt");

  return;
};

export default (): IPlugin => {
  return {
    register,
    info: () => {
      return { name: "JWT Authentication", version: "1.0.0" };
    }
  };
};
