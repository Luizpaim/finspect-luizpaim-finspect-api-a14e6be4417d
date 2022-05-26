import * as Hapi from "hapi";
import * as Joi from "joi";
import FileController from './file-controller';
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const fileController = new FileController(configs, database);

  server.bind(fileController);
  server.route({
    method: "POST",
    path: "/files/{accountantId}/{companyId}",
    options: {
      handler: fileController.uploadFiles,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}']
      },
      tags: ["api", "files"],
      description: "Upload file.",
      payload: {
        output: 'stream',
        allow: 'multipart/form-data',
        maxBytes: 5 * 1024 * 1024 // 5MB
      },
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
        },
        payload: {
          file: Joi.any().meta({ swaggerType: 'file' })
        }
      },
      plugins: {
        "hapi-swagger": {
          payloadType: 'form',
          responses: {
            "201": {
              description: "File uploaded."
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
    method: "POST",
    path: "/files/{accountantId}/{companyId}/report",
    options: {
      handler: fileController.registerReport,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}', 'company-{params.companyId}']
      },
      tags: ["api", "files"],
      description: "Register report.",
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
              description: "File uploaded."
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
    path: "/files/{accountantId}/{companyId}",
    options: {
      handler: fileController.listFiles,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}', 'company-{params.companyId}']
      },
      tags: ["api", "files"],
      description: "List files.",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
        },
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "List of files."
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
    path: "/files/{accountantId}/{companyId}/{id}",
    options: {
      handler: fileController.removeFile,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.accountantId}']
      },
      tags: ["api", "files"],
      description: "Delete a file.",
      validate: {
        headers: jwtValidator,
        params: {
          accountantId: Joi.string().alphanum().length(24).required(),
          companyId: Joi.string().alphanum().length(24).required(),
          id: Joi.string().alphanum().length(24).required(),
        },
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "File deleted."
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