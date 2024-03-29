import * as Hapi from "hapi";

export interface ICredentials extends Hapi.AuthCredentials {
  id: string;
  iat: number;
  scope: string[];
  relatedToId: string;
}

export interface IRequestAuth extends Hapi.RequestAuth {
  credentials: ICredentials;
}

export interface IRequest extends Hapi.Request {
  auth: IRequestAuth;
}

export interface ILoginRequest extends IRequest {
  payload: {
    email: string;
    password: string;
  };
}

export interface IArrayRequest extends IRequest {
  payload: any[];
}
