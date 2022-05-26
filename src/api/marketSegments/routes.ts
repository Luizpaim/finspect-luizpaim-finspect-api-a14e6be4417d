import * as Hapi from "hapi";
import * as Joi from "joi";
import MarketSegmentController from "./marketSegment-controller";
import * as MarketSegmentValidator from "./marketSegment-validator";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {
  const marketSegmentController = new MarketSegmentController(configs, database);

  server.bind(marketSegmentController);
  server.route({
    method: "POST",
    path: "/marketsegments",
    options: {
      handler: marketSegmentController.createMarketSegment,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "marketsegments"],
      description: "Create a Market Segment.",
      validate: {
        payload: MarketSegmentValidator.marketSegmentModel,
        headers: jwtValidator
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "201": {
              description: "Created Market Segment."
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
    path: "/marketsegments/{id?}",
    options: {
      handler: marketSegmentController.listMarketSegments,
      auth: {
        strategy: "jwt"
      },
      tags: ["api", "marketsegments"],
      description: "List Market Segments.",
      validate: {
        headers: jwtValidator,
        params: {
          id: Joi.string().alphanum().length(24),
        },
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "List of Market Segments."
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
    path: "/marketsegments/{id}",
    options: {
      handler: marketSegmentController.editMarketSegment,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "marketsegments"],
      description: "Update Market Segment by id.",
      validate: {
        params: {
          id: Joi.string().alphanum().length(24).required()
        },
        headers: jwtValidator,
        payload: MarketSegmentValidator.marketSegmentModel
      },
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "Market Segment updated."
            },
            "404": {
              description: "Market Segment does not exists."
            }
          }
        }
      }
    }
  });

  server.route({
    method: "DELETE",
    path: "/marketsegments/{id}",
    options: {
      handler: marketSegmentController.deleteMarketSegment,
      auth: {
        strategy: "jwt",
        scope: ['admin']
      },
      tags: ["api", "marketsegments"],
      description: "Delete Market Segment by id.",
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
              description: "Deleted Market Segment."
            },
            "404": {
              description: "Market Segment does not exists."
            }
          }
        }
      }
    }
  });
}