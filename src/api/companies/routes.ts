import * as Hapi from "hapi";
import * as Joi from "joi";
import CompanyController from "./company-controller";
import * as CompanyValidator from "./company-validator";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const companyController = new CompanyController(configs, database);

  server.bind(companyController);
  server.route({
    method: "POST",
    path: "/companies",
    options: {
      handler: companyController.createCompanies,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant']
      },
      tags: ["api", "company"],
      description: "Create one or many companies.",
      validate: {
        payload: CompanyValidator.createCompanyModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Created Companies."
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
    path: "/companies/{id?}",
    options: {
      handler: companyController.listCompanies,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant', 'company-{params.id}']
      },
      tags: ["api", "company"],
      description: "List companies.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24)
        },
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "List of companies."
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
    path: "/companies/{id}",
    options: {
      handler: companyController.editCompany,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{payload.accountantId}']
      },
      tags: ["api", "companies"],
      description: "Update company by id.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required(),
        },
        headers: jwtValidator,
        payload: CompanyValidator.editCompanyModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Company updated."
            },
            "404": {
              description: "Company does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "PUT",
    path: "/companies/{id}/toggleactive",
    options: {
      handler: companyController.toggleCompany,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant']
      },
      tags: ["api", "companies"],
      description: "Toggle company active property.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required(),
        },
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Company toggled."
            },
            "404": {
              description: "Company does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/companies/{id}",
    options: {
      handler: companyController.deleteCompany,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant']
      },
      tags: ["api", "companies"],
      description: "Delete company by id.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required(),
        },
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Deleted company."
            },
            "404": {
              description: "Company does not exist."
            }
          }
        }
      }
    }
  });
}