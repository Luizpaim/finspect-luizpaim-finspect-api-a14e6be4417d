import * as Hapi from "hapi";
import * as Joi from "joi";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import AccountantController from "./accountant-controller";
import * as AccountantValidator from "./accountant-validator";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const accountantController = new AccountantController(configs, database);

  server.bind(accountantController);
  server.route({
    method: "POST",
    path: "/accountants",
    options: {
      handler: accountantController.createAccoutant,
      auth: false,
      tags: ["api", "accountants"],
      description: "Create an accountant.",
      validate: {
        payload: AccountantValidator.createAccountantModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Created accountant."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "GET",
    path: "/accountants/{id?}",
    options: {
      handler: accountantController.listAccountants,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accountants"],
      description: "List accountants.",
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
              description: "List of accountants."
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
    path: "/accountants/{id}/basicinfo",
    options: {
      handler: accountantController.getAccountantBasicInfo,
      auth: 'jwt',
      tags: ["api", "accountants"],
      description: "Get accountant basic info.",
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
              description: "Accountant info."
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
    path: "/accountants/{id}",
    options: {
      handler: accountantController.editAccountant,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accountants"],
      description: "Update an accountant.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required()
        },
        payload: AccountantValidator.editAccountantModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Accountant updated."
            },
            "400": {
              description: "CNPJ is already registered."
            },
            "404": {
              description: "Accountant does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/accountants/{id}",
    options: {
      handler: accountantController.deleteAccountant,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accoutants"],
      description: "Delete accountant by id.",
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
              description: "Deleted accountant."
            },
            "404": {
              description: "Accountant does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "POST",
    path: "/accountants/{id}/cards",
    options: {
      handler: accountantController.addCreditCard,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accountants"],
      description: "Save payment method.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required()
        },
        payload: AccountantValidator.addCreditCardModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Accountant updated."
            },
            "404": {
              description: "Accountant does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "GET",
    path: "/accountants/{id}/cards",
    options: {
      handler: accountantController.listCreditCards,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accountants"],
      description: "List accountant`s credit cards.",
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
              description: "List of accountant`s credit cards."
            },
            "404": {
              description: "Accountant does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/accountants/{id}/cards/{cardId}",
    options: {
      handler: accountantController.deleteCreditCard,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accountants"],
      description: "Delete a credit cards.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required(),
          cardId: Joi.string().alphanum().length(24).required()
        },
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Delete a credit cards."
            },
            "404": {
              description: "Accountant does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "PUT",
    path: "/accountants/{id}/payment/{paymentId?}",
    options: {
      handler: accountantController.changePaymentMethod,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accountants"],
      description: "Select payment method.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required(),
          paymentId: Joi.string().alphanum().length(24)
        },
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Payment method selected."
            },
            "404": {
              description: "Accountant does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "POST",
    path: "/accountants/{id}/subscribe/{planId}",
    options: {
      handler: accountantController.subscribeToPremium,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accountants"],
      description: "Subscribe to plan.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required(),
          planId: Joi.string().alphanum().length(24).required(),
        },
        payload: AccountantValidator.subscribeToPlanModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Subscribed succesfully."
            },
            "404": {
              description: "Accountant does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "POST",
    path: "/accountants/{id}/unsubscribe",
    options: {
      handler: accountantController.cancelSubscription,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accountants"],
      description: "Unsubscribe to finspect.",
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
              description: "Unsubscribed!."
            },
            "404": {
              description: "Accountant does not exist."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "GET",
    path: "/accountants/{id}/subscription",
    options: {
      handler: accountantController.getSubscriptionInfo,
      auth: {
        strategy: "jwt",
        scope: ['admin', 'accountant-{params.id}']
      },
      tags: ["api", "accountants"],
      description: "Get subscription info.",
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
              description: "Subscription info."
            },
            "404": {
              description: "Accountant does not exist."
            }
          }
        }
      }
    }
  });
}