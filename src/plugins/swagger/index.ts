import { IPlugin } from "../interfaces";
import * as Hapi from "hapi";

const register = async (server: Hapi.Server): Promise<void> => {
  try {
    return server.register([
      require("inert"),
      require("vision"),
      {
        plugin: require("hapi-swagger"),
        options: {
          info: {
            title: "Finspect Api",
            description: "Finspect Api Documentation",
            version: "1.0"
          },
          tags: [
            {
              name: "users",
              description: "Users Api."
            },
            {
              name: "accountants",
              description: "Accountants Api"
            },
            {
              name: "companies",
              description: "Companies Api."
            },
            {
              name: "industries",
              description: "Industries Api"
            },
            {
              name: "marketsegments",
              description: "MarketSegments Api"
            },
            {
              name: "plans",
              description: "Plans Api"
            },
            {
              name: "accountingsoftwares",
              description: "AccoutingSoftwares Api"
            }
          ],
          swaggerUI: true,
          documentationPage: true,
          documentationPath: "/docs"
        }
      }
    ]);
  } catch (err) {
    console.log(`Error registering swagger plugin: ${err}`);
  }
};

export default (): IPlugin => {
  return {
    register,
    info: () => {
      return { name: "Swagger Documentation", version: "1.0.0" };
    }
  };
};
